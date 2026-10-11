import type { Alert } from '../../alerts/domain/alert';
import type { Workday } from '../domain/workday';
import type { PlanDayArea } from '../../plans/domain/plan-day-area';
export interface DashboardDay {
  planId: number;
  plantId: number;
  fruitId: number;
  date: string;
  targetBoxes: string;
  plannedWorkers: number;
  plannedHours: string;
  workday: Workday | null;
  areas: (PlanDayArea & { absenteeism: number | null })[];
  metrics: {
    fulfillment: number | null;
    absenteeism: number | null;
    productivity: number | null;
    discardRate: number | null;
    looseRate: number | null;
    fixedRate: number | null;
  };
}
import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { ensure } from '../../../shared/domain/domain-error';
import {
  decimal,
  isoWeek,
  ratio,
  weekDates,
} from '../../../shared/domain/dates';
import { paginate } from '../../../shared/application/pagination';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess, scopedPlant } from '../../auth/domain/actor';
import { PlanStatus, HourAdjustmentReason } from '../../plans/domain/enums';
import { AlertType } from '../../alerts/domain/enums';
import { executionMetrics } from '../domain/execution-metrics';
interface Attendance {
  areaId: number;
  workers: number;
}
interface WorkdayFilter {
  plantId?: number;
  date?: string;
  planId?: number;
  page?: number;
  limit?: number;
}
@Injectable()
export class WorkdaysService {
  constructor(private readonly store: PackingStore) {}
  private async context(
    store: PackingStore,
    dayId: number,
    actor: Actor,
    lock = false,
  ) {
    const day = await store.get('planDays', dayId);
    ensure(day, 'Plan day not found', 404);
    const plan = await store.get('plans', day.planId);
    ensure(plan, 'Plan not found', 404);
    assertPlantAccess(actor, plan.plantId);
    if (lock) {
      await store.get('plants', plan.plantId, true);
      const current = await store.get('planDays', dayId);
      const currentPlan = await store.get('plans', plan.id);
      ensure(
        current && currentPlan,
        'Plan changed; reload before retrying',
        409,
      );
      return { day: current, plan: currentPlan };
    }
    return { day, plan };
  }
  private async attendance(
    store: PackingStore,
    dayId: number,
    input: Attendance[],
  ) {
    const areas = await store.find('planDayAreas', { planDayId: dayId });
    ensure(
      input.length === areas.length &&
        new Set(input.map((a) => a.areaId)).size === areas.length &&
        input.every((a) => areas.some((p) => p.areaId === a.areaId)),
      'Attendance must include each planned area exactly once',
    );
    for (const area of areas)
      await store.save('planDayAreas', {
        id: area.id,
        presentWorkers: input.find((a) => a.areaId === area.areaId)!.workers,
      });
    return input.reduce((sum, a) => sum + a.workers, 0);
  }
  async open(
    input: { planDayId: number; startedAt?: string; attendance: Attendance[] },
    actor: Actor,
  ) {
    return this.store.transaction(async (store) => {
      const { day, plan } = await this.context(
        store,
        input.planDayId,
        actor,
        true,
      );
      ensure(
        [PlanStatus.APPROVED, PlanStatus.IN_PROGRESS].includes(plan.status),
        'Only approved plans can be executed',
        409,
      );
      ensure(
        !(await store.find('workdays', { planDayId: day.id })).length,
        'This day already has a workday',
        409,
      );
      const startedAt = input.startedAt
        ? new Date(input.startedAt)
        : new Date();
      const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(startedAt);
      ensure(
        localDate === day.date,
        'Start time must belong to the planned date in America/Lima',
      );
      ensure(
        startedAt.getTime() <= Date.now(),
        'Start time cannot be in the future',
      );
      const presentWorkers = await this.attendance(
        store,
        day.id,
        input.attendance,
      );
      const workday = await store.save('workdays', {
        planDayId: day.id,
        startedAt,
        closedAt: null,
        presentWorkers,
        receivedBoxes: '0',
        processedBoxes: '0',
        workedHours: null,
        discardedBoxes: null,
        looseKg: null,
        fixedKg: null,
        targetMet: null,
        difference: null,
      });
      if (plan.status === PlanStatus.APPROVED)
        await store.save('plans', {
          id: plan.id,
          status: PlanStatus.IN_PROGRESS,
        });
      return workday;
    });
  }
  private async editable(store: PackingStore, id: number, actor: Actor) {
    const initial = await store.get('workdays', id);
    ensure(initial, 'Workday not found', 404);
    const context = await this.context(store, initial.planDayId, actor, true);
    const workday = await store.get('workdays', id);
    ensure(workday && !workday.closedAt, 'Workday is already closed', 409);
    ensure(
      context.plan.status === PlanStatus.IN_PROGRESS,
      'Plan is not in execution',
      409,
    );
    return { workday, ...context };
  }
  async progress(
    id: number,
    input: {
      recordedAt: string;
      cumulativeReceivedBoxes: number;
      cumulativeProcessedBoxes: number;
      attendance: Attendance[];
    },
    actor: Actor,
  ) {
    return this.store.transaction(async (store) => {
      const { workday, day, plan } = await this.editable(store, id, actor);
      const previous = (
        await store.find(
          'progressRecords',
          { workdayId: id },
          { orderBy: 'recordedAt', direction: 'DESC', take: 1 },
        )
      )[0];
      const recordedAt = new Date(input.recordedAt);
      ensure(
        recordedAt.getTime() >
          (previous?.recordedAt ?? workday.startedAt).getTime() &&
          recordedAt.getTime() <= Date.now(),
        'Progress time must follow the previous record and cannot be in the future',
      );
      ensure(
        input.cumulativeReceivedBoxes >= Number(workday.receivedBoxes) &&
          input.cumulativeProcessedBoxes >= Number(workday.processedBoxes),
        'Cumulative quantities cannot decrease',
      );
      ensure(
        input.cumulativeProcessedBoxes <= input.cumulativeReceivedBoxes,
        'Processed boxes cannot exceed received boxes',
      );
      const presentWorkers = await this.attendance(
        store,
        day.id,
        input.attendance,
      );
      const record = await store.save('progressRecords', {
        workdayId: id,
        recordedAt,
        cumulativeReceivedBoxes: decimal(input.cumulativeReceivedBoxes),
        cumulativeProcessedBoxes: decimal(input.cumulativeProcessedBoxes),
        presentWorkers,
        recordedById: actor.id,
      });
      await store.save('workdays', {
        id,
        presentWorkers,
        receivedBoxes: record.cumulativeReceivedBoxes,
        processedBoxes: record.cumulativeProcessedBoxes,
      });
      const metrics = executionMetrics({
        targetBoxes: Number(day.targetBoxes),
        plannedHours: Number(day.hours),
        availableHours: Number(day.adjustedHours ?? day.hours),
        receivedBoxes: input.cumulativeReceivedBoxes,
        processedBoxes: input.cumulativeProcessedBoxes,
        presentWorkers,
        elapsedHours:
          (recordedAt.getTime() - workday.startedAt.getTime()) / 3600000,
        parameters: plan.parametersSnapshot,
      });
      const alerts: Alert[] = [];
      if (metrics.volumeAlert)
        alerts.push(
          await store.save('alerts', {
            planDayId: day.id,
            progressRecordId: record.id,
            type: AlertType.INCOMING_VOLUME,
            message: `Received ${record.cumulativeReceivedBoxes} boxes; expected ${metrics.expectedReceived.toFixed(4)}.`,
            date: recordedAt,
          }),
        );
      if (metrics.requiresAdjustment && presentWorkers < day.workers)
        alerts.push(
          await store.save('alerts', {
            planDayId: day.id,
            progressRecordId: record.id,
            type: AlertType.INSUFFICIENT_STAFF,
            message: `Present staff ${presentWorkers}/${day.workers}; estimated hours ${metrics.estimatedHours?.toFixed(4) ?? 'unavailable while no staff is present'}.`,
            date: recordedAt,
          }),
        );
      return { ...record, metrics, alerts };
    });
  }
  async adjust(
    dayId: number,
    input: { adjustedHours: number; reason: HourAdjustmentReason },
    actor: Actor,
  ) {
    return this.store.transaction(async (store) => {
      const { day, plan } = await this.context(store, dayId, actor, true);
      const workday = (await store.find('workdays', { planDayId: dayId }))[0];
      ensure(
        plan.status === PlanStatus.IN_PROGRESS && workday && !workday.closedAt,
        'Hours can only be adjusted during an open workday',
        409,
      );
      await store.save('planDays', {
        id: day.id,
        adjustedHours: decimal(input.adjustedHours),
        adjustmentReason: input.reason,
      });
      return store.get('planDays', day.id);
    });
  }
  async close(
    id: number,
    input: {
      workedHours: number;
      receivedBoxes: number;
      processedBoxes: number;
      discardedBoxes: number;
      looseKg: number;
      fixedKg: number;
    },
    actor: Actor,
  ) {
    return this.store.transaction(async (store) => {
      const { workday, day, plan } = await this.editable(store, id, actor);
      ensure(
        input.receivedBoxes >= Number(workday.receivedBoxes) &&
          input.processedBoxes >= Number(workday.processedBoxes),
        'Closing quantities cannot be lower than the last progress',
      );
      ensure(
        input.processedBoxes <= input.receivedBoxes &&
          input.discardedBoxes <= input.processedBoxes,
        'Inconsistent closing quantities',
      );
      ensure(
        input.processedBoxes === 0 || input.workedHours > 0,
        'Worked hours are required when fruit was processed',
      );
      await store.save('workdays', {
        id,
        closedAt: new Date(),
        workedHours: decimal(input.workedHours),
        receivedBoxes: decimal(input.receivedBoxes),
        processedBoxes: decimal(input.processedBoxes),
        discardedBoxes: decimal(input.discardedBoxes),
        looseKg: decimal(input.looseKg),
        fixedKg: decimal(input.fixedKg),
        targetMet: input.processedBoxes >= Number(day.targetBoxes),
        difference: decimal(input.processedBoxes - Number(day.targetBoxes)),
      });
      const days = await store.find('planDays', { planId: plan.id });
      const closed = await Promise.all(
        days.map(
          async (d) =>
            (await store.find('workdays', { planDayId: d.id }))[0]?.closedAt,
        ),
      );
      if (closed.every(Boolean))
        await store.save('plans', { id: plan.id, status: PlanStatus.CLOSED });
      return store.get('workdays', id);
    });
  }
  async get(id: number, actor: Actor) {
    const workday = await this.store.get('workdays', id);
    ensure(workday, 'Workday not found', 404);
    const { day, plan } = await this.context(
      this.store,
      workday.planDayId,
      actor,
    );
    const progress = await this.store.find(
      'progressRecords',
      { workdayId: id },
      { orderBy: 'recordedAt' },
    );
    const time = workday.closedAt ?? progress.at(-1)?.recordedAt ?? new Date();
    const metrics = executionMetrics({
      targetBoxes: Number(day.targetBoxes),
      plannedHours: Number(day.hours),
      availableHours: Number(day.adjustedHours ?? day.hours),
      receivedBoxes: Number(workday.receivedBoxes),
      processedBoxes: Number(workday.processedBoxes),
      presentWorkers: workday.presentWorkers,
      elapsedHours: workday.closedAt
        ? Number(workday.workedHours)
        : Math.max(0, (time.getTime() - workday.startedAt.getTime()) / 3600000),
      parameters: plan.parametersSnapshot,
    });
    return {
      ...workday,
      planDay: day,
      attendance: await this.store.find('planDayAreas', { planDayId: day.id }),
      progress,
      alerts: await this.store.find('alerts', { planDayId: day.id }),
      metrics: workday.closedAt
        ? {
            ...metrics,
            estimatedHours: Number(workday.workedHours),
            requiresAdjustment: false,
            riskOfExtraShift:
              Number(workday.workedHours) >
              Number(plan.parametersSnapshot.shiftHours) +
                Number(plan.parametersSnapshot.maxOvertimeHours),
          }
        : metrics,
    };
  }
  async list(query: WorkdayFilter, actor: Actor) {
    if (query.date) isoWeek(query.date);
    const plans = await this.store.find('plans', {
      plantId: scopedPlant(actor, query.plantId),
      ...(query.planId ? { id: query.planId } : {}),
    });
    const items: (Workday & {
      planId: number;
      plantId: number;
      date: string;
    })[] = [];
    for (const plan of plans)
      for (const day of await this.store.find('planDays', {
        planId: plan.id,
        ...(query.date ? { date: query.date } : {}),
      })) {
        const workday = (
          await this.store.find('workdays', { planDayId: day.id })
        )[0];
        if (workday)
          items.push({
            ...workday,
            planId: plan.id,
            plantId: plan.plantId,
            date: day.date,
          });
      }
    return paginate(items, query);
  }
  async dashboard(
    query: { plantId?: number; fruitId?: number; year: number; week: number },
    actor: Actor,
  ) {
    weekDates(query.year, query.week);
    const plantId = scopedPlant(actor, query.plantId);
    const plans = (
      await this.store.find('plans', {
        plantId,
        fruitId: query.fruitId,
        year: query.year,
        week: query.week,
      })
    ).filter((p) =>
      [PlanStatus.APPROVED, PlanStatus.IN_PROGRESS, PlanStatus.CLOSED].includes(
        p.status,
      ),
    );
    const days: DashboardDay[] = [];
    for (const plan of plans)
      for (const day of await this.store.find(
        'planDays',
        { planId: plan.id },
        { orderBy: 'date' },
      )) {
        const workday =
          (await this.store.find('workdays', { planDayId: day.id }))[0] ?? null;
        const areas = await this.store.find('planDayAreas', {
          planDayId: day.id,
        });
        const processed = Number(workday?.processedBoxes ?? 0);
        const hours = Number(workday?.workedHours ?? 0);
        const workers = workday?.presentWorkers ?? 0;
        days.push({
          planId: plan.id,
          plantId: plan.plantId,
          fruitId: plan.fruitId,
          date: day.date,
          targetBoxes: day.targetBoxes,
          plannedWorkers: day.workers,
          plannedHours: day.hours,
          workday,
          areas: areas.map((a) => ({
            ...a,
            absenteeism:
              a.presentWorkers === null
                ? null
                : ratio(a.plannedWorkers - a.presentWorkers, a.plannedWorkers),
          })),
          metrics: {
            fulfillment: workday
              ? ratio(processed, Number(day.targetBoxes))
              : null,
            absenteeism: workday
              ? ratio(day.workers - workers, day.workers)
              : null,
            productivity: ratio(processed, workers * hours),
            discardRate: ratio(Number(workday?.discardedBoxes ?? 0), processed),
            looseRate: ratio(
              Number(workday?.looseKg ?? 0),
              Number(workday?.looseKg ?? 0) + Number(workday?.fixedKg ?? 0),
            ),
            fixedRate: ratio(
              Number(workday?.fixedKg ?? 0),
              Number(workday?.looseKg ?? 0) + Number(workday?.fixedKg ?? 0),
            ),
          },
        });
      }
    const executed = days.filter((d) => d.workday);
    const closed = executed.filter((d) => d.workday?.closedAt);
    const processed = executed.reduce(
      (s, d) => s + Number(d.workday!.processedBoxes),
      0,
    );
    const target = days.reduce((s, d) => s + Number(d.targetBoxes), 0);
    return {
      year: query.year,
      week: query.week,
      plantId: plantId ?? null,
      days,
      kpis: {
        targetBoxes: decimal(target),
        processedBoxes: decimal(processed),
        fulfillment: ratio(processed, target),
        averageHours: ratio(
          closed.reduce((s, d) => s + Number(d.workday!.workedHours), 0),
          closed.length,
        ),
        staffingRatio: ratio(
          executed.reduce((s, d) => s + d.workday!.presentWorkers, 0),
          executed.reduce((s, d) => s + d.plannedWorkers, 0),
        ),
        productivity: ratio(
          closed.reduce((s, d) => s + Number(d.workday!.processedBoxes), 0),
          closed.reduce(
            (s, d) =>
              s + d.workday!.presentWorkers * Number(d.workday!.workedHours),
            0,
          ),
        ),
        discardRate: ratio(
          closed.reduce((s, d) => s + Number(d.workday!.discardedBoxes), 0),
          closed.reduce((s, d) => s + Number(d.workday!.processedBoxes), 0),
        ),
      },
    };
  }
}
