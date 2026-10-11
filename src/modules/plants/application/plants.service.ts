import { plantParameters, resolveParameters } from '../domain/parameter-policy';
import type { ParameterInput } from '../domain/parameter-policy';
import { Inject, Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import { RoleName } from '../../auth/domain/enums';
import type { PlantParameters } from '../domain/plant-parameters';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess, scopedPlant } from '../../auth/domain/actor';
@Injectable()
export class PlantsService {
  constructor(@Inject(PackingStore) private readonly store: PackingStore) {}
  async list(actor: Actor, includeInactive = false) {
    ensure(!includeInactive || actor.role === RoleName.ADMIN, 'Role access denied', 403);
    if (actor.plantIds) {
      const allowed = new Set(actor.plantIds);
      return (await this.store.find('plants')).filter((plant) => allowed.has(plant.id) && (includeInactive || plant.isActive !== false));
    }
    const id = scopedPlant(actor);
    return (await this.store.find('plants', id === undefined ? {} : { id }))
      .filter((plant) => includeInactive || plant.isActive !== false);
  }
  async get(id: number, actor: Actor) {
    assertPlantAccess(actor, id);
    const plant = await this.store.get('plants', id);
    ensure(plant, 'Plant not found', 404);
    return plant;
  }
  async update(id: number, input: ParameterInput, actor: Actor) {
    assertPlantAccess(actor, id);
    return this.store.transaction(async (store) => {
      const plant = await store.get('plants', id, true);
      ensure(plant, 'Plant not found', 404);
      await store.save('plants', {
        id,
        ...resolveParameters(plantParameters(plant), input),
        configurationCompletedAt: new Date(),
      });
      return store.get('plants', id);
    });
  }

  async createCatalog(input: { name: string }) {
    const name = input.name.trim();
    ensure(name.length > 0, 'Plant name must not be blank');
    ensure(!(await this.store.find('plants')).some((plant) => plant.name.toLowerCase() === name.toLowerCase()), 'Plant name already exists', 409);
    const parameters: PlantParameters = {
      cratesPerWorkerHour: '5.9',
      maxWorkers: 300,
      shiftHours: '10',
      maxOvertimeHours: '2',
      startTime: '17:00',
      efficiencyFactor: '0.8',
      volumeTolerancePercent: '5',
    };
    return this.store.save('plants', {
      name,
      ...parameters,
      configurationCompletedAt: null,
      isActive: true,
    });
  }

  async updateCatalog(id: number, input: { name: string; isActive?: boolean }) {
    const name = input.name.trim();
    ensure(name.length > 0, 'Plant name must not be blank');
    return this.store.transaction(async (store) => {
      const plant = await store.get('plants', id, true);
      ensure(plant, 'Plant not found', 404);
      ensure(!(await store.find('plants')).some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase()), 'Plant name already exists', 409);
      return store.save('plants', { id, name, isActive: input.isActive ?? plant.isActive });
    });
  }

  async deactivate(id: number) {
    return this.store.transaction(async (store) => {
      const plant = await store.get('plants', id, true);
      ensure(plant, 'Plant not found', 404);
      return store.save('plants', { id, isActive: false });
    });
  }
}
