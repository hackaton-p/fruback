import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AUTH_RUNTIME } from './better-auth.factory';
import type { AuthRuntime } from './better-auth.factory';
import { PackingStore } from '../../../shared/application/packing.store';
import { RoleName } from '../domain/enums';
import type { Actor } from '../domain/actor';
import { assertPlantAccess } from '../domain/actor';
import { ensure } from '../../../shared/domain/domain-error';

@Injectable()
export class AuthService implements OnApplicationShutdown {
  constructor(
    @Inject(AUTH_RUNTIME) public readonly runtime: AuthRuntime,
    private readonly store: PackingStore,
  ) {}
  async onApplicationShutdown() {
    await this.runtime.pool.end();
  }
  async getActor(headers: Headers): Promise<Actor> {
    const session = await this.runtime.auth.api.getSession({ headers });
    ensure(session, 'Authentication required', 401);
    const profile = (
      await this.store.find('users', { authUserId: session.user.id })
    )[0];
    ensure(profile, 'No packing profile assigned', 403);
    const role = await this.store.get('roles', profile.roleId);
    ensure(role, 'Invalid role', 403);
    const assignments = await this.runtime.pool.query<{ plantaId: number }>(
      'SELECT "plantaId" FROM "usuario_planta" WHERE "usuarioId" = $1 ORDER BY "plantaId"',
      [profile.id],
    );
    const plantIds = profile.plantId === null &&
      (role.name === RoleName.ADMIN || role.name === RoleName.DEPUTY_MANAGER)
      ? (await this.store.find('plants')).map((plant) => plant.id)
      : [...new Set([...(profile.plantId === null ? [] : [profile.plantId]), ...assignments.rows.map((row) => Number(row.plantaId))])];
    return {
      id: profile.id,
      authUserId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      plantId: profile.plantId,
      plantIds,
      role: role.name,
    };
  }
  async getPlantAssignments(userIds: number[]) {
    if (!userIds.length) return new Map<number, number[]>();
    const assignments = await this.runtime.pool.query<{
      usuarioId: number;
      plantaId: number;
    }>(
      'SELECT "usuarioId", "plantaId" FROM "usuario_planta" WHERE "usuarioId" = ANY($1::int[]) ORDER BY "plantaId"',
      [userIds],
    );
    const result = new Map<number, number[]>();
    for (const assignment of assignments.rows) {
      const plantIds = result.get(Number(assignment.usuarioId)) ?? [];
      plantIds.push(Number(assignment.plantaId));
      result.set(Number(assignment.usuarioId), plantIds);
    }
    return result;
  }
  async createUser(
    input: {
      name: string;
      email: string;
      password: string;
      role: RoleName;
      plantId?: number;
      plantIds?: number[];
    },
    actor?: Actor,
  ) {
    ensure(
      input.role === RoleName.DEPUTY_MANAGER || input.plantId !== undefined || (input.plantIds?.length ?? 0) > 0,
      'This role requires a plant',
    );
    if (actor) {
      ensure(actor.role === RoleName.DEPUTY_MANAGER, 'Role access denied', 403);
      const assignedPlantIds = [...new Set([...(input.plantIds ?? []), ...(input.plantId ? [input.plantId] : [])])];
      if (assignedPlantIds.length) assignedPlantIds.forEach((plantId) => assertPlantAccess(actor, plantId));
      else ensure(actor.plantId === null, 'Cannot create a global user', 403);
    }
    const assignedPlantIds = [...new Set([...(input.plantIds ?? []), ...(input.plantId ? [input.plantId] : [])])];
    for (const plantId of assignedPlantIds)
      ensure(await this.store.get('plants', plantId), 'Plant not found', 404);
    const primaryPlantId = input.plantId ?? assignedPlantIds[0];
    ensure(input.name.trim().length > 0, 'Name must not be blank');
    ensure(
      Buffer.byteLength(input.password, 'utf8') <= 72,
      'Password must not exceed 72 UTF-8 bytes',
    );
    const email = input.email.trim().toLowerCase();
    ensure(
      !(await this.store.find('users', { email })).length,
      'Email already exists',
      409,
    );
    const role = (await this.store.find('roles', { name: input.role }))[0];
    ensure(role, 'Role not found', 404);
    // Reserve the business profile before creating the identity; both are compensated on failure.
    const profile = await this.store.save('users', {
      name: input.name,
      email,
      roleId: role.id,
      plantId: primaryPlantId ?? null,
      passwordHash: null,
      authUserId: null,
    });
    let authUserId: string | undefined;
    try {
      for (const plantId of assignedPlantIds)
        await this.runtime.pool.query(
          'INSERT INTO "usuario_planta" ("usuarioId", "plantaId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [profile.id, plantId],
        );
      const result = await this.runtime.auth.api.signUpEmail({
        body: { name: input.name, email, password: input.password },
      });
      const identity = await this.runtime.pool.query<{ id: string }>(
        'SELECT id FROM auth_user WHERE email = $1',
        [email],
      );
      ensure(
        identity.rows[0]?.id === result.user.id,
        'Email already exists',
        409,
      );
      authUserId = result.user.id;
      await this.store.save('users', { id: profile.id, authUserId });
      return {
        id: profile.id,
        authUserId,
        name: input.name,
        email,
        role: input.role,
        plantId: primaryPlantId ?? null,
        plantIds: assignedPlantIds,
      };
    } catch (error) {
      if (authUserId)
        await this.runtime.pool.query('DELETE FROM auth_user WHERE id = $1', [
          authUserId,
        ]);
      await this.store.remove('users', { id: profile.id });
      throw error;
    }
  }
}
