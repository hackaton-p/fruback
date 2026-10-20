import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import {
  decimal,
  nextPlanningMonday,
  ratio,
  weekDates,
} from '../../../shared/domain/dates';
import { paginate } from '../../../shared/application/pagination';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess, scopedPlant } from '../../auth/domain/actor';
import { PlanStatus, HarvestScenario } from '../domain/enums';
import { ProjectionType } from '../../projections/domain/enums';
import { AlertType } from '../../alerts/domain/enums';
import { PlanCalculatorService } from '../domain/services/plan-calculator.service';
import type { PlanDay } from '../domain/plan-day';
import type { PlanDayArea } from '../domain/plan-day-area';
import {
  plantParameters,
  resolveParameters,
  parameterChanges,
} from '../../plants/domain/parameter-policy';
import type { ParameterInput } from '../../plants/domain/parameter-policy';
import type { Plan } from '../domain/plan';
export interface PlanInput {
  startDate?: string;
  dayCount?: number;
  selectedDates?: string[];
  plantId: number;
  year: number;
  week: number;
  harvestScenario: HarvestScenario;
  parameters: Required<ParameterInput>;
}
export interface PlanFilter {
  plantId?: number;
  year?: number;
  week?: number;
  status?: PlanStatus;
  page?: number;
  limit?: number;
}
type CalculatedPlanDay = Pick<
  PlanDay,
  'date' | 'targetCrates' | 'fruitTargets' | 'workers' | 'hours'
> & {
  margin: number | null;
  dayStatus: string;
  hasLowMargin: boolean;
  areas: Pick<
    PlanDayArea,
    | 'areaId'
    | 'plannedWorkers'
    | 'arrivedWorkers'
    | 'startingWorkers'
    | 'presentWorkers'
  >[];
};
@Injectable()
export class PlansService {
  private readonly calculator = new PlanCalculatorService();
  constructor(private readonly store: PackingStore) {}
  private async calculate(store: PackingStore, input: PlanInput) {
    weekDates(input.year, input.week);
    const plant = await store.get('plants', input.plantId);
    ensure(
      plant && plant.isActive !== false,
      'Plant not found or inactive',
      404,
    );
    ensure(
      plant.configurationCompletedAt,
      'Confirm the plant configuration before planning',
      409,
    );
    const parametersSnapshot = resolveParameters(
      plantParameters(plant),
      input.parameters,
    );
    const projections = await store.find('projections', {
      plantId: input.plantId,
      year: input.year,
      week: input.week,
    });
    let harvest = projections.filter((p) => p.type === ProjectionType.HARVEST);
    const commercial = projections.filter(
      (p) => p.type === ProjectionType.COMMERCIAL,
    );
    ensure(
      harvest.length && commercial.length,
      'Import both harvest and commercial projections before planning',
      409,
    );
    if (
      input.selectedDates !== undefined ||
      input.startDate !== undefined ||
      input.dayCount !== undefined
    ) {
      const dates = weekDates(input.year, input.week);
      const start = input.startDate ?? dates[0];
      const count = input.selectedDates?.length ?? input.dayCount ?? 5;
      const offset = dates.indexOf(start);
      ensure(
        Number.isInteger(count) &&
          count >= 1 &&
          count <= 7 &&
          offset >= 0 &&
          (input.selectedDates !== undefined || offset + count <= 7),
        'Invalid planning period',
      );
      const selected =
        input.selectedDates ?? dates.slice(offset, offset + count);
      ensure(
        new Set(selected).size === count &&
          selected.every((date) => dates.includes(date)),
        'Invalid planning period',
      );
      harvest = harvest.filter((row) => selected.includes(row.date!));
      ensure(
        new Set(harvest.map((row) => row.date)).size === count,
        'Harvest projections must cover every planning day',
        409,
      );
    }
    const datesForPlan = input.selectedDates ?? [
      ...new Set(harvest.map((row) => row.date!)),
    ];
    const demandedFruitIds = new Set(commercial.map((row) => row.fruitId));
    ensure(
      [...demandedFruitIds].every((fruitId) =>
        datesForPlan.every((date) =>
          harvest.some((row) => row.fruitId === fruitId && row.date === date),
        ),
      ),
      'Harvest projections must cover every planning day for each fruit in the commercial order',
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
    const harvestByDate = new Map<string, number>();
    const harvestByDateAndFruit = new Map<string, Map<number, number>>();
    const demandByFruit = new Map<number, number>();
    for (const row of commercial)
      demandByFruit.set(
        row.fruitId,
        (demandByFruit.get(row.fruitId) ?? 0) + Number(row.crates),
      );
    for (const row of harvest)
      harvestByDate.set(
        row.date!,
        (harvestByDate.get(row.date!) ?? 0) + Number(row.crates),
      );
    for (const row of harvest) {
      const byFruit =
        harvestByDateAndFruit.get(row.date!) ?? new Map<number, number>();
      byFruit.set(
        row.fruitId,
        (byFruit.get(row.fruitId) ?? 0) + Number(row.crates),
      );
      harvestByDateAndFruit.set(row.date!, byFruit);
    }
    const remainingDemand = new Map(demandByFruit);
    const days: CalculatedPlanDay[] = [];
    for (const [date] of [...harvestByDate.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const fruitTargets: PlanDay['fruitTargets'] = [];
      for (const [fruitId, crates] of harvestByDateAndFruit.get(date) ??
        new Map<number, number>()) {
        if ((remainingDemand.get(fruitId) ?? 0) <= 0) continue;
        const fruit = await store.get('fruits', fruitId);
        ensure(fruit, 'Fruit not found', 404);
        const target = Math.min(
          crates * multiplier,
          remainingDemand.get(fruitId) ?? 0,
        );
        remainingDemand.set(
          fruitId,
          Math.max(0, (remainingDemand.get(fruitId) ?? 0) - target),
        );
        fruitTargets.push({
          fruitId,
          fruitName: fruit.name,
          crates: decimal(target),
        });
      }
      const targetCrates = decimal(
        fruitTargets.reduce((sum, target) => sum + Number(target.crates), 0),
      );
      const calculation = this.calculator.calculateDay(
        Number(targetCrates),
        parametersSnapshot,
      );
      const support: CalculatedPlanDay['areas'] = areas
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
      days.push({
        date,
        targetCrates,
        fruitTargets,
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
      });
    }
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
  async apply(input: PlanInput, actor: Actor, planId?: number) {
    assertPlantAccess(actor, input.plantId);
    if (planId === undefined) {
      const dates = weekDates(input.year, input.week);
      const monday = dates[0];
      ensure(
        monday >= nextPlanningMonday(new Date()),
        'New plans must start next week or later',
      );
      const selected =
        input.selectedDates ??
        dates.slice(
          dates.indexOf(input.startDate ?? monday),
          dates.indexOf(input.startDate ?? monday) + (input.dayCount ?? 5),
        );
      const dayCount = selected.length;
      ensure(
        Number.isInteger(dayCount) &&
          dayCount >= 2 &&
          dayCount <= 6 &&
          new Set(selected).size === dayCount &&
          selected.every((date) => dates.slice(0, 6).includes(date)) &&
          (input.dayCount === undefined || input.dayCount === dayCount) &&
          (input.startDate === undefined ||
            input.startDate === [...selected].sort()[0]),
        'Invalid planning period',
      );
      input = {
        ...input,
        startDate: [...selected].sort()[0],
        dayCount,
        selectedDates: [...selected].sort(),
      };
    }
    return this.store.transaction(async (store) => {
      ensure(
        await store.get('plants', input.plantId, true),
        'Plant not found',
        404,
      );
      const previous =
        planId === undefined ? null : await store.get('plans', planId, true);
      if (planId !== undefined) {
        ensure(previous, 'Plan not found', 404);
        assertPlantAccess(actor, previous.plantId);
        ensure(
          [PlanStatus.DRAFT, PlanStatus.REJECTED].includes(previous.status),
          'Only draft or rejected plans can be modified',
          409,
        );
        ensure(
          previous.plantId === input.plantId &&
            previous.year === input.year &&
            previous.week === input.week,
          'The planning week cannot be modified',
          409,
        );
        const previousDays = await store.find(
          'planDays',
          { planId: previous.id },
          { orderBy: 'date' },
        );
        ensure(previousDays.length > 0, 'Plan has no days', 409);
        const previousDates = previousDays.map((day) => day.date).sort();
        ensure(
          (input.startDate ?? previousDates[0]) === previousDates[0] &&
            (input.dayCount ?? previousDays.length) === previousDays.length &&
            (input.selectedDates === undefined ||
              [...input.selectedDates].sort().join(',') ===
                previousDates.join(',')),
          'The planning period cannot be modified',
          409,
        );
        input = {
          ...input,
          startDate: previousDates[0],
          dayCount: previousDays.length,
          selectedDates: previousDates,
        };
      }
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
        fruitId: null,
        year: input.year,
        week: input.week,
        harvestScenario: input.harvestScenario,
        parametersSnapshot: calculated.parametersSnapshot,
        commercialCratesSnapshot: calculated.totals.commercialCrates,
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
          fruitTargets: day.fruitTargets,
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
    const hasCommercialSnapshot = plan.commercialCratesSnapshot != null;
    const demand = hasCommercialSnapshot
      ? Number(plan.commercialCratesSnapshot)
      : (
          await store.find('projections', {
            plantId: plan.plantId,
            ...(plan.fruitId === null ? {} : { fruitId: plan.fruitId }),
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
      commercialDemandSource: hasCommercialSnapshot
        ? 'SNAPSHOT'
        : 'LIVE_LEGACY',
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
    const { page, limit, status, ...rest } = query;
    const filter = Object.fromEntries(
      Object.entries(rest).filter(([key]) => key !== 'fruitId'),
    ) as Omit<PlanFilter, 'page' | 'limit' | 'status'>;
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
        if (target === PlanStatus.APPROVED) {
          const reservedPlans = (
            await store.find('plans', {
              plantId: locked.plantId,
            })
          ).filter(
            (candidate) =>
              candidate.id !== id &&
              [
                PlanStatus.APPROVED,
                PlanStatus.IN_PROGRESS,
                PlanStatus.CLOSED,
              ].includes(candidate.status),
          );
          const dates = new Set(
            (await store.find('planDays', { planId: id })).map(
              (day) => day.date,
            ),
          );
          // Until lines and shifts exist, each planned date reserves the plant.
          for (const reserved of reservedPlans) {
            const conflicts = (
              await store.find('planDays', { planId: reserved.id })
            )
              .filter((day) => dates.has(day.date))
              .map((day) => day.date);
            ensure(
              conflicts.length === 0,
              `Plant is already reserved by plan #${reserved.id} on ${conflicts.sort().join(', ')}`,
              409,
            );
          }
        }
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
  async discard(id: number, actor: Actor) {
    return this.store.transaction(async (store) => {
      const plan = await store.get('plans', id);
      ensure(plan, 'Plan not found', 404);
      assertPlantAccess(actor, plan.plantId);
      await store.get('plants', plan.plantId, true);
      const locked = await store.get('plans', id, true);
      ensure(locked, 'Plan not found', 404);
      ensure(
        (locked.status === PlanStatus.DRAFT && !locked.submittedAt) ||
          locked.status === PlanStatus.REJECTED,
        'Only unsubmitted or rejected plans can be discarded',
        409,
      );
      for (const day of await store.find('planDays', { planId: id })) {
        await store.remove('alerts', { planDayId: day.id });
        await store.remove('planDayAreas', { planDayId: day.id });
        await store.remove('planDays', { id: day.id });
      }
      await store.remove('plans', { id });
    });
  }
}
