import { plantParameters, resolveParameters } from '../domain/parameter-policy';
import type { ParameterInput } from '../domain/parameter-policy';
import { Inject, Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess, scopedPlant } from '../../auth/domain/actor';
@Injectable()
export class PlantsService {
  constructor(@Inject(PackingStore) private readonly store: PackingStore) {}
  async list(actor: Actor) {
    const id = scopedPlant(actor);
    return this.store.find('plants', id === undefined ? {} : { id });
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
}
