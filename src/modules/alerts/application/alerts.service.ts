import type { Alert } from '../domain/alert';
import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import type { Actor } from '../../auth/domain/actor';
import { scopedPlant } from '../../auth/domain/actor';
import { isoWeek } from '../../../shared/domain/dates';
import { paginate } from '../../../shared/application/pagination';
@Injectable()
export class AlertsService {
  constructor(private readonly store: PackingStore) {}
  async list(
    query: { plantId?: number; date?: string; page?: number; limit?: number },
    actor: Actor,
  ) {
    if (query.date) isoWeek(query.date);
    const plans = await this.store.find('plans', {
      plantId: scopedPlant(actor, query.plantId),
    });
    const items: Alert[] = [];
    for (const plan of plans)
      for (const day of await this.store.find('planDays', {
        planId: plan.id,
        ...(query.date ? { date: query.date } : {}),
      }))
        items.push(...(await this.store.find('alerts', { planDayId: day.id })));
    return paginate(
      items.sort((a, b) => b.date.getTime() - a.date.getTime()),
      query,
    );
  }
}
