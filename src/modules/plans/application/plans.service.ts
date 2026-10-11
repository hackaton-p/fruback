import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import { decimal, ratio, weekDates } from '../../../shared/domain/dates';
import { paginate } from '../../../shared/application/pagination';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess, scopedPlant } from '../../auth/domain/actor';
import { PlanStatus, HarvestScenario } from '../domain/enums';
import { ProjectionType } from '../../projections/domain/enums';
import { AlertType } from '../../alerts/domain/enums';
import { PlanCalculatorService } from '../domain/services/plan-calculator.service';
import {
  plantParameters,
  resolveParameters,
  parameterChanges,
} from '../../plants/domain/parameter-policy';
import type { ParameterInput } from '../../plants/domain/parameter-policy';
import type { Plan } from '../domain/plan';
export interface PlanInput {
  plantId: number;
  fruitId: number;
  year: number;
  week: number;
  harvestScenario: HarvestScenario;
  parameters: Required<ParameterInput>;
}
export interface PlanFilter {
  plantId?: number;
  fruitId?: number;
  year?: number;
  week?: number;
  status?: PlanStatus;
  page?: number;
  limit?: number;
}
@Injectable()
export class PlansService {
  private readonly calculator = new PlanCalculatorService();
  constructor(private readonly store: PackingStore) {}
  private async calculate(store: PackingStore, input: PlanInput) {
    weekDates(input.year, input.week);
    const plant = await store.get('plants', input.plantId);
    ensure(plant, 'Plant not found', 404);
    ensure(await store.get('fruits', input.fruitId), 'Fruit not found', 404);
    const parametersSnapshot = resolveParameters(
      plantParameters(plant),
      input.parameters,
    );
    const projections = await store.find('projections', {
      plantId: input.plantId,
      fruitId: input.fruitId,
      year: input.year,
      week: input.week,
    });
    const harvest = projections.filter(
      (p) => p.type === ProjectionType.HARVEST,
    );
    const commercial = projections.filter(
      (p) => p.type === ProjectionType.COMMERCIAL,
    );
    ensure(
      harvest.length && commercial.length,
      'Import both harvest and commercial projections before planning',
      409,
    );
    const multiplier = {
      [HarvestScenario.PROJECTED]: 1,
      [HarvestScenario.PLUS_10]: 1.1,
      [HarvestScenario.PLUS_20]: 1.2,
      [HarvestScenario.MINUS_10]: 0.9,
    }[input.harvestScenario];
    const areas = await store.find('areas');
    const packing = areas.find((a) => a.name === 'Packing');
    ensure(packing, 'Packing area is not configured', 409);
    const days = harvest
      .sort((a, b) => a.date!.localeCompare(b.date!))
      .map((row) => {
        const targetCrates = decimal(Number(row.crates) * multiplier);
        const calculation = this.calculator.calculateDay(
          Number(targetCrates),
          parametersSnapshot,
        );
        const support = areas
          .filter((a) => a.id !== packing.id)
          .map((area) => ({
            areaId: area.id,
            plannedWorkers: Math.round(
              calculation.workers * Number(area.proportion),
            ),
            arrivedWorkers: null,
            startingWorkers: null,
            presentWorkers: null,
          }));
        const packingWorkers =
          calculation.workers -
          support.reduce((sum, a) => sum + a.plannedWorkers, 0);
        ensure(packingWorkers >= 0, 'Area proportions exceed total staff', 409);
        return {
          date: row.date!,
          targetCrates,
          workers: calculation.workers,
          hours: decimal(calculation.hours),
          margin: calculation.margin,
          dayStatus: calculation.dayStatus,
          hasLowMargin: calculation.hasLowMargin,
          areas: [
            ...support,
            {
              areaId: packing.id,
              plannedWorkers: packingWorkers,
              arrivedWorkers: null,
              startingWorkers: null,
              presentWorkers: null,
            },
          ],
        };
      });
    const target = days.reduce((sum, d) => sum + Number(d.targetCrates), 0);
    const demand = commercial.reduce((sum, p) => sum + Number(p.crates), 0);
    const gap = Math.max(0, demand - target);
    return {
      parametersSnapshot,
      hasModifiedParameters:
        parameterChanges(parametersSnapshot, plantParameters(plant)).length > 0,
      parameterChanges: parameterChanges(
        parametersSnapshot,
        plantParameters(plant),
      ),
      plantDefaults: plantParameters(plant),
      days,
      totals: {
        targetCrates: decimal(target),
        commercialCrates: decimal(demand),
        commercialGapCrates: decimal(gap),
        commercialGapPercent: demand ? (gap / demand) * 100 : 0,
        commercialCoverage: ratio(target, demand),
        peakWorkers: Math.max(...days.map((d) => d.workers)),
        averageWorkers:
          days.reduce((sum, d) => sum + d.workers, 0) / days.length,
        operatingHours: decimal(
          days.reduce((sum, d) => sum + Number(d.hours), 0),
        ),
      },
    };
  }
  async simulate(input: PlanInput, actor: Actor) {
    assertPlantAccess(actor, input.plantId);
    return this.calculate(this.store, input);
  }
  async apply(input: PlanInput, actor: Actor) {
    assertPlantAccess(actor, input.plantId);
    return this.store.transaction(async (store) => {
      ensure(
        await store.get('plants', input.plantId, true),
        'Plant not found',
        404,
      );
      const existing = await store.find('plans', {
        plantId: input.plantId,
        fruitId: input.fruitId,
        year: input.year,
        week: input.week,
      });
      ensure(
        !existing.some(
          (p) => ![PlanStatus.DRAFT, PlanStatus.REJECTED].includes(p.status),
        ),
        'This week already has a submitted or approved plan',
        409,
      );
      const previous =
        existing.find((p) => p.status === PlanStatus.DRAFT) ?? existing.at(-1);
      const calculated = await this.calculate(store, input);
      if (previous)
        for (const day of await store.find('planDays', {
          planId: previous.id,
        })) {
          await store.remove('alerts', { planDayId: day.id });
          await store.remove('planDayAreas', { planDayId: day.id });
          await store.remove('planDays', { id: day.id });
        }
      const plan = await store.save('plans', {
        ...(previous ? { id: previous.id } : {}),
        plantId: input.plantId,
        fruitId: input.fruitId,
        year: input.year,
        week: input.week,
        harvestScenario: input.harvestScenario,
        parametersSnapshot: calculated.parametersSnapshot,
        hasModifiedParameters: calculated.hasModifiedParameters,
        status: PlanStatus.DRAFT,
        createdById: actor.id,
        submittedAt: null,
        approvedById: null,
        approvedAt: null,
        approvalComment: null,
      });
      let firstDayId: number | undefined;
      for (const day of calculated.days) {
        const saved = await store.save('planDays', {
          planId: plan.id,
          date: day.date,
          targetCrates: day.targetCrates,
          workers: day.workers,
          hours: day.hours,
          adjustedHours: null,
          adjustmentReason: null,
        });
        firstDayId ??= saved.id;
        for (const area of day.areas)
          await store.save('planDayAreas', { ...area, planDayId: saved.id });
      }
      if (Number(calculated.totals.commercialGapCrates) > 0)
        await store.save('alerts', {
          planDayId: firstDayId!,
          progressRecordId: null,
          type: AlertType.PLANNING,
          message: `Commercial shortfall: ${calculated.totals.commercialGapCrates} crates (${calculated.totals.commercialGapPercent.toFixed(2)}%).`,
          date: new Date(),
        });
      return this.detail(store, plan.id, actor);
    });
  }
  private async detail(store: PackingStore, id: number, actor: Actor) {
    const plan = await store.get('plans', id);
    ensure(plan, 'Plan not found', 404);
    assertPlantAccess(actor, plan.plantId);
    const rawDays = await store.find(
      'planDays',
      { planId: id },
      { orderBy: 'date' },
    );
    const days = await Promise.all(
      rawDays.map(async (day) => ({
        ...day,
        areas: await store.find('planDayAreas', { planDayId: day.id }),
        workday:
          (await store.find('workdays', { planDayId: day.id }))[0] ?? null,
        alerts: await store.find('alerts', { planDayId: day.id }),
        ...this.dayMetrics(day, plan),
      })),
    );
    const demand = (
      await store.find('projections', {
        plantId: plan.plantId,
        fruitId: plan.fruitId,
        year: plan.year,
        week: plan.week,
        type: ProjectionType.COMMERCIAL,
      })
    ).reduce((sum, row) => sum + Number(row.crates), 0);
    const target = days.reduce((sum, d) => sum + Number(d.targetCrates), 0);
    const plant = await store.get('plants', plan.plantId);
    ensure(plant, 'Plant not found', 404);
    return {
      ...plan,
      plantName: plant.name,
      plantDefaults: plantParameters(plant),
      parameterChanges: parameterChanges(
        plan.parametersSnapshot,
        plantParameters(plant),
      ),
      startDate: days[0]?.date ?? null,
      endDate: days.at(-1)?.date ?? null,
      days,
      totals: {
        targetCrates: decimal(target),
        commercialCrates: decimal(demand),
        commercialGapCrates: decimal(Math.max(0, demand - target)),
        commercialGapPercent: demand
          ? (Math.max(0, demand - target) / demand) * 100
          : 0,
        commercialCoverage: ratio(target, demand),
        peakWorkers: Math.max(0, ...days.map((d) => d.workers)),
        averageWorkers: days.length
          ? days.reduce((sum, d) => sum + d.workers, 0) / days.length
          : 0,
        operatingHours: decimal(
          days.reduce((sum, d) => sum + Number(d.hours), 0),
        ),
      },
    };
  }
  private dayMetrics(
    day: { targetCrates: string; workers: number; hours: string },
    plan: Plan,
  ) {
    const p = plan.parametersSnapshot;
    const target = Number(day.targetCrates);
    const hours = Number(day.hours);
    const margin = target
      ? (day.workers *
          Number(p.cratesPerWorkerHour) *
          Number(p.efficiencyFactor) *
          (Number(p.shiftHours) + Number(p.maxOvertimeHours))) /
          target -
        1
      : null;
    return {
      margin,
      hasLowMargin:
        margin !== null && margin < Number(p.volumeTolerancePercent) / 100,
      dayStatus:
        hours > Number(p.shiftHours) + Number(p.maxOvertimeHours)
          ? 'RIESGO_TURNO_EXTRA'
          : hours > Number(p.shiftHours)
            ? 'HORAS_EXTRA'
            : margin !== null && margin < Number(p.volumeTolerancePercent) / 100
              ? 'MARGEN_BAJO'
              : 'DENTRO_JORNADA',
    };
  }
  get(id: number, actor: Actor) {
    return this.detail(this.store, id, actor);
  }
  async list(query: PlanFilter, actor: Actor) {
    const { page, limit, status, ...filter } = query;
    const plans = await this.store.find(
      'plans',
      { ...filter, plantId: scopedPlant(actor, query.plantId) },
      { orderBy: 'id', direction: 'DESC' },
    );
    const statusCounts = Object.fromEntries(
      Object.values(PlanStatus).map((value) => [
        value,
        plans.filter((p) => p.status === value).length,
      ]),
    );
    const result = paginate(
      plans.filter((p) => !status || p.status === status),
      { page, limit },
    );
    return {
      ...result,
      statusCounts,
      items: await Promise.all(
        result.items.map((plan) => this.detail(this.store, plan.id, actor)),
      ),
    };
  }
  async transition(
    id: number,
    target: PlanStatus,
    actor: Actor,
    comment?: string,
  ) {
    return this.store.transaction(async (store) => {
      const plan = await store.get('plans', id);
      ensure(plan, 'Plan not found', 404);
      assertPlantAccess(actor, plan.plantId);
      await store.get('plants', plan.plantId, true);
      const locked = await store.get('plans', id, true);
      ensure(locked, 'Plan not found', 404);
      if (target === PlanStatus.PENDING) {
        ensure(
          locked.status === PlanStatus.DRAFT,
          'Only draft plans can be submitted',
          409,
        );
        ensure(
          (await store.find('planDays', { planId: id })).length > 0,
          'Plan has no days',
          409,
        );
        await store.save('plans', {
          id,
          status: target,
          submittedAt: new Date(),
        });
      } else {
        ensure(
          locked.status === PlanStatus.PENDING,
          'Only pending plans can be reviewed',
          409,
        );
        if (target === PlanStatus.REJECTED)
          ensure(comment?.trim(), 'A rejection comment is required');
        await store.save('plans', {
          id,
          status: target,
          approvedById: actor.id,
          approvedAt: new Date(),
          approvalComment: comment?.trim() ?? null,
        });
      }
      return this.detail(store, id, actor);
    });
  }
}
