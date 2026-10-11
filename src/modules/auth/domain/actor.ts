import { RoleName } from './enums';
import { ensure } from '../../../shared/domain/domain-error';
export interface Actor {
  id: number;
  authUserId: string;
  name: string;
  email: string;
  role: RoleName;
  plantId: number | null;
}
export function assertPlantAccess(actor: Actor, plantId: number) {
  ensure(
    actor.plantId === plantId ||
      (actor.role === RoleName.DEPUTY_MANAGER && actor.plantId === null),
    'Plant access denied',
    403,
  );
}
export function scopedPlant(
  actor: Actor,
  requested?: number,
): number | undefined {
  if (requested !== undefined) {
    assertPlantAccess(actor, requested);
    return requested;
  }
  ensure(
    actor.plantId !== null || actor.role === RoleName.DEPUTY_MANAGER,
    'A plant assignment is required',
    403,
  );
  return actor.plantId ?? undefined;
}
