import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import { paginate } from '../../../shared/application/pagination';
import { RoleName } from '../../auth/domain/enums';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess } from '../../auth/domain/actor';
@Injectable()
export class CatalogsService {
  constructor(private readonly store: PackingStore) {}
  async fruits(plantId?: number, includeInactive = false, actor?: Actor) {
    ensure(
      !includeInactive || [RoleName.ADMIN, RoleName.SHIFT_MANAGER, RoleName.DEPUTY_MANAGER].includes(actor?.role as RoleName),
      'Role access denied',
      403,
    );
    if (plantId !== undefined)
      ensure(await this.store.get('plants', plantId), 'Plant not found', 404);
    const [fruits, assignments] = await Promise.all([
      this.store.find('fruits'),
      this.store.find('plantFruits', plantId === undefined ? {} : { plantId }),
    ]);
    const plantIdsByFruit = new Map<number, number[]>();
    for (const { fruitId, plantId: assignedPlantId } of assignments) {
      const ids = plantIdsByFruit.get(fruitId) ?? [];
      ids.push(assignedPlantId);
      plantIdsByFruit.set(fruitId, ids);
    }
    return fruits
      .filter((fruit) => includeInactive || fruit.isActive !== false)
      .filter((fruit) => plantId === undefined || (plantIdsByFruit.get(fruit.id) ?? []).includes(plantId))
      .map((fruit) => ({ ...fruit, plantIds: plantIdsByFruit.get(fruit.id) ?? [] }));
  }

  async saveFruit(input: { name: string; plantIds: number[]; isActive?: boolean }, actor: Actor, id?: number) {
    const name = input.name.trim();
    ensure(name.length > 0, 'Fruit name must not be blank');
    ensure(new Set(input.plantIds).size === input.plantIds.length, 'Plant assignments must be unique');
    return this.store.transaction(async (store) => {
      const existing = id === undefined ? null : await store.get('fruits', id, true);
      ensure(id === undefined || existing, 'Fruit not found', 404);
      ensure(!(await store.find('fruits')).some((fruit) => fruit.id !== id && fruit.name.toLowerCase() === name.toLowerCase()), 'Fruit name already exists', 409);
      const oldAssignments = id === undefined ? [] : await store.find('plantFruits', { fruitId: id });
      const preservedPlantIds = oldAssignments
        .filter(({ plantId }) => !canAccessPlant(actor, plantId))
        .map(({ plantId }) => plantId);
      for (const plantId of input.plantIds) {
        assertPlantAccess(actor, plantId);
        const plant = await store.get('plants', plantId);
        ensure(plant && plant.isActive !== false, `Plant ${plantId} is not available`, 400);
      }
      const plantIds = [...new Set([...preservedPlantIds, ...input.plantIds])];
      const fruit = await store.save('fruits', {
        ...(id !== undefined ? { id } : {}),
        name,
        isActive: input.isActive ?? existing?.isActive ?? true,
      });
      if (id !== undefined) await store.remove('plantFruits', { fruitId: id });
      for (const plantId of plantIds)
        await store.save('plantFruits', { fruitId: fruit.id, plantId });
      return { ...fruit, plantIds };
    });
  }

  async deactivateFruit(id: number) {
    return this.store.transaction(async (store) => {
      const fruit = await store.get('fruits', id, true);
      ensure(fruit, 'Fruit not found', 404);
      await store.save('fruits', { id, isActive: false });
    });
  }
  areas() {
    return this.store.find('areas');
  }
  async customers(query: { page?: number; limit?: number }) {
    return paginate(await this.store.find('customers'), query);
  }
  async customer(id: number) {
    const value = await this.store.get('customers', id);
    ensure(value, 'Customer not found', 404);
    return value;
  }
  async save(input: { name?: string; country?: string }, id?: number) {
    if (id !== undefined) await this.customer(id);
    const name = input.name?.trim();
    const country = input.country?.trim();
    ensure(name === undefined || name.length > 0, 'Name must not be blank');
    ensure(
      country === undefined || country.length > 0,
      'Country must not be blank',
    );
    const value = await this.store.save('customers', {
      ...(id ? { id } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(country !== undefined ? { country } : {}),
    });
    return this.customer(value.id);
  }
  async remove(id: number) {
    await this.customer(id);
    await this.store.remove('customers', { id });
  }
}

function canAccessPlant(actor: Actor, plantId: number) {
  return actor.plantId === plantId ||
    actor.plantIds?.includes(plantId) === true ||
    ((actor.role === RoleName.ADMIN || actor.role === RoleName.DEPUTY_MANAGER) && actor.plantId === null);
}
