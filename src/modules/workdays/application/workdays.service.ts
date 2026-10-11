import { ProgressType } from '../domain/enums';
import type { Alert } from '../../alerts/domain/alert';
import type { Workday } from '../domain/workday';
import type { PlanDayArea } from '../../plans/domain/plan-day-area';
export interface DashboardDay {
  planId: number;
  plantId: number;
  fruitId: number;
  date: string;
  targetCrates: string;
  plannedWorkers: number;
  plannedHours: string;
  defaultShiftHours: number;
  defaultProductivity: number;
  maxOvertimeHours: number;
  workday: Workday | null;
  areas: (PlanDayArea & { absenteeism: number | null })[];
  metrics: {
    fulfillment: number | null;
    absenteeism: number | null;
    productivity: number | null;
    discardRate: number | null;
    looseRate: number | null;
    fixedRate: number | null;
    cratesPerWorker: number | null;
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
import {
  executionMetrics,
  observedProductivity,
} from '../domain/execution-metrics';
interface Attendance {
  areaId: number;
  arrivedWorkers: number;
  startingWorkers: number;
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
    for (const area of areas) {
      const entry = input.find((a) => a.areaId === area.areaId)!;
      ensure(
        entry.startingWorkers <= entry.arrivedWorkers,
        'Starting workers cannot exceed arrived workers',
      );
      await store.save('planDayAreas', {
        id: area.id,
        arrivedWorkers: entry.arrivedWorkers,
        startingWorkers: entry.startingWorkers,
        presentWorkers: entry.startingWorkers,
      });
    }
    return input.reduce((sum, a) => sum + a.startingWorkers, 0);
  }
  async estimate(input: { planDayId: number; workers: number }, actor: Actor) {
    const { day, plan } = await this.context(
      this.store,
      input.planDayId,
      actor,
    );
    ensure(
      [PlanStatus.APPROVED, PlanStatus.IN_PROGRESS].includes(plan.status),
      'Only approved plans can be executed',
      409,
    );
    const metrics = executionMetrics({
      targetCrates: Number(day.targetCrates),
      plannedHours: Number(day.hours),
      processedCrates: 0,
      receivedCrates: 0,
      presentWorkers: input.workers,
      elapsedHours: 0,
      parameters: plan.parametersSnapshot,
    });
    const start = new Date(
      `${day.date}T${plan.parametersSnapshot.startTime.slice(0, 5)}:00-05:00`,
    );
    return {
      ...metrics,
      estimatedEndAt:
        metrics.estimatedHours === null
          ? null
          : new Date(
              start.getTime() + metrics.estimatedHours * 3600000,
            ).toISOString(),
    };
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
        expectedDailyCrates: day.targetCrates,
        initialEstimatedHours:
          presentWorkers === 0
            ? Number(day.targetCrates) === 0
              ? '0'
              : null
            : decimal(
                Number(day.targetCrates) /
                  (presentWorkers *
                    Number(plan.parametersSnapshot.cratesPerWorkerHour) *
                    Number(plan.parametersSnapshot.efficiencyFactor)),
              ),
        receivedCrates: '0',
        processedCrates: '0',
        workedHours: null,
        discardedCrates: null,
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
      type: ProgressType;
      recordedAt: string;
      cumulativeReceivedCrates?: number;
      cumulativeProcessedCrates?: number;
      areaId?: number;
      staffChange?: number;
      expectedDailyCrates?: number;
    },
    actor: Actor,
  ) {
    return this.store.transaction(async (store) => {
      const { workday, day, plan } = await this.editable(store, id, actor);
      const records = await store.find(
        'progressRecords',
        { workdayId: id },
        { orderBy: 'id' },
      );
      const recordedAt = new Date(input.recordedAt);
      ensure(
        recordedAt.getTime() >=
          (records.at(-1)?.recordedAt ?? workday.startedAt).getTime() &&
          recordedAt.getTime() <= Date.now(),
        'Record time cannot precede the previous record or be in the future',
      );
      const fields = {
        [ProgressType.PROGRESS]: [
          'cumulativeReceivedCrates',
          'cumulativeProcessedCrates',
        ],
        [ProgressType.STAFF]: ['areaId', 'staffChange'],
        [ProgressType.VOLUME]: ['expectedDailyCrates'],
      }[input.type];
      ensure(
        Object.entries(input)
          .filter(([, value]) => value !== undefined)
          .every(([key]) => ['type', 'recordedAt', ...fields].includes(key)),
        'Fields do not match the record type',
      );
      let received = Number(workday.receivedCrates);
      let processed = Number(workday.processedCrates);
      let expected = Number(workday.expectedDailyCrates);
      let presentWorkers = workday.presentWorkers;
      const areas = await store.find('planDayAreas', { planDayId: day.id });
      if (input.type === ProgressType.PROGRESS) {
        ensure(
          input.cumulativeReceivedCrates! >= received &&
            input.cumulativeProcessedCrates! >= processed,
          'Cumulative quantities cannot decrease',
        );
        ensure(
          input.cumulativeProcessedCrates! <= input.cumulativeReceivedCrates!,
          'Processed crates cannot exceed received crates',
        );
        received = input.cumulativeReceivedCrates!;
        processed = input.cumulativeProcessedCrates!;
        expected = Math.max(expected, received);
      } else if (input.type === ProgressType.STAFF) {
        const area = areas.find((a) => a.areaId === input.areaId);
        ensure(area, 'Area does not belong to this plan day');
        const count = area.presentWorkers! + input.staffChange!;
        ensure(
          count >= 0 && count <= 100000,
          'Area staff must remain between 0 and 100000',
        );
        presentWorkers += input.staffChange!;
        await store.save('planDayAreas', {
          id: area.id,
          presentWorkers: count,
        });
      } else {
        ensure(
          input.expectedDailyCrates! >= received,
          'Expected daily volume cannot be lower than already received crates',
        );
        expected = input.expectedDailyCrates!;
      }
      const event = {
        workdayId: id,
        type: input.type,
        recordedAt,
        cumulativeReceivedCrates:
          input.type === ProgressType.PROGRESS ? decimal(received) : null,
        cumulativeProcessedCrates:
          input.type === ProgressType.PROGRESS ? decimal(processed) : null,
        areaId: input.type === ProgressType.STAFF ? input.areaId! : null,
        staffChange:
          input.type === ProgressType.STAFF ? input.staffChange! : null,
        expectedDailyCrates:
          input.type === ProgressType.VOLUME ? decimal(expected) : null,
        presentWorkers,
        recordedById: actor.id,
      };
      const metrics = executionMetrics({
        targetCrates: Number(day.targetCrates),
        plannedHours: Number(day.hours),
        availableHours: Number(day.adjustedHours ?? day.hours),
        expectedDailyCrates: expected,
        receivedCrates: received,
        processedCrates: processed,
        presentWorkers,
        elapsedHours:
          (recordedAt.getTime() - workday.startedAt.getTime()) / 3600000,
        productivity: observedProductivity(
          workday.startedAt,
          areas.reduce((sum, area) => sum + (area.startingWorkers ?? 0), 0),
          [...records, event],
        ),
        parameters: plan.parametersSnapshot,
      });
      const record = await store.save('progressRecords', {
        ...event,
        estimatedHours:
          metrics.estimatedHours === null
            ? null
            : decimal(metrics.estimatedHours),
      });
      await store.save('workdays', {
        id,
        presentWorkers,
        receivedCrates: decimal(received),
        processedCrates: decimal(processed),
        expectedDailyCrates: decimal(expected),
      });
      const alerts: Alert[] = [];
      if (
        (input.type === ProgressType.PROGRESS && metrics.volumeAlert) ||
        (input.type === ProgressType.VOLUME &&
          (Number(day.targetCrates) === 0
            ? expected > 0
            : Math.abs(expected / Number(day.targetCrates) - 1) * 100 >
              Number(plan.parametersSnapshot.volumeTolerancePercent)))
      )
        alerts.push(
          await store.save('alerts', {
            planDayId: day.id,
            progressRecordId: record.id,
            type: AlertType.INCOMING_VOLUME,
            message:
              input.type === ProgressType.VOLUME
                ? `Expected daily volume ${decimal(expected)} crates; approved target ${day.targetCrates}.`
                : `Received ${decimal(received)} crates; expected ${metrics.expectedReceived.toFixed(4)}.`,
            date: recordedAt,
          }),
        );
      if (metrics.requiresAdjustment && presentWorkers < day.workers)
        alerts.push(
          await store.save('alerts', {
            planDayId: day.id,
            progressRecordId: record.id,
            type: AlertType.INSUFFICIENT_STAFF,
            message: `Present staff ${presentWorkers}/${day.workers}; estimated hours ${metrics.estimatedHours?.toFixed(4) ?? 'unavailable at current productivity'}.`,
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
      receivedCrates?: number;
      processedCrates: number;
      discardedCrates: number;
      looseKg: number;
      fixedKg: number;
    },
    actor: Actor,
  ) {
    return this.store.transaction(async (store) => {
      const { workday, day, plan } = await this.editable(store, id, actor);
      const receivedCrates =
        input.receivedCrates ??
        Math.max(Number(workday.receivedCrates), input.processedCrates);
      ensure(
        receivedCrates >= Number(workday.receivedCrates) &&
          input.processedCrates >= Number(workday.processedCrates),
        'Closing quantities cannot be lower than the last progress',
      );
      ensure(
        input.processedCrates <= receivedCrates &&
          input.discardedCrates <= input.processedCrates,
        'Inconsistent closing quantities',
      );
      ensure(
        input.processedCrates === 0 || input.workedHours > 0,
        'Worked hours are required when fruit was processed',
      );
      await store.save('workdays', {
        id,
        closedAt: new Date(),
        workedHours: decimal(input.workedHours),
        receivedCrates: decimal(receivedCrates),
        processedCrates: decimal(input.processedCrates),
        discardedCrates: decimal(input.discardedCrates),
        looseKg: decimal(input.looseKg),
        fixedKg: decimal(input.fixedKg),
        targetMet: input.processedCrates >= Number(day.targetCrates),
        difference: decimal(input.processedCrates - Number(day.targetCrates)),
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
      { orderBy: 'id' },
    );
    const time = workday.closedAt ?? progress.at(-1)?.recordedAt ?? new Date();
    const attendance = await this.store.find('planDayAreas', {
      planDayId: day.id,
    });
    const metrics = executionMetrics({
      productivity: observedProductivity(
        workday.startedAt,
        attendance.reduce((sum, a) => sum + (a.startingWorkers ?? 0), 0),
        progress,
      ),
      expectedDailyCrates: Number(workday.expectedDailyCrates),
      targetCrates: Number(day.targetCrates),
      plannedHours: Number(day.hours),
      availableHours: Number(day.adjustedHours ?? day.hours),
      receivedCrates: Number(workday.receivedCrates),
      processedCrates: Number(workday.processedCrates),
      presentWorkers: workday.presentWorkers,
      elapsedHours: workday.closedAt
        ? Number(workday.workedHours)
        : Math.max(0, (time.getTime() - workday.startedAt.getTime()) / 3600000),
      parameters: plan.parametersSnapshot,
    });
    return {
      ...workday,
      planDay: day,
      attendance,
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
    const plants = await this.store.find('plants', { id: plantId });
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
        const processed = Number(workday?.processedCrates ?? 0);
        const hours = Number(workday?.workedHours ?? 0);
        const workers = workday?.presentWorkers ?? 0;
        days.push({
          planId: plan.id,
          plantId: plan.plantId,
          fruitId: plan.fruitId,
          date: day.date,
          targetCrates: day.targetCrates,
          plannedWorkers: day.workers,
          plannedHours: day.hours,
          defaultShiftHours: Number(
            plants.find((p) => p.id === plan.plantId)!.shiftHours,
          ),
          defaultProductivity: Number(
            plants.find((p) => p.id === plan.plantId)!.cratesPerWorkerHour,
          ),
          maxOvertimeHours: Number(
            plants.find((p) => p.id === plan.plantId)!.maxOvertimeHours,
          ),
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
              ? ratio(processed, Number(day.targetCrates))
              : null,
            absenteeism: workday
              ? ratio(day.workers - workers, day.workers)
              : null,
            productivity: workday?.closedAt
              ? ratio(processed, workers * hours)
              : null,
            cratesPerWorker: workday?.closedAt
              ? ratio(processed, workers)
              : null,
            discardRate: ratio(
              Number(workday?.discardedCrates ?? 0),
              processed,
            ),
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
    const closed = days.filter((d) => d.workday?.closedAt);
    const processed = closed.reduce(
      (sum, d) => sum + Number(d.workday!.processedCrates),
      0,
    );
    const target = closed.reduce((sum, d) => sum + Number(d.targetCrates), 0);
    const hours = closed.reduce(
      (sum, d) => sum + Number(d.workday!.workedHours),
      0,
    );
    const workers = closed.reduce(
      (sum, d) => sum + d.workday!.presentWorkers,
      0,
    );
    const personHours = closed.reduce(
      (sum, d) =>
        sum + d.workday!.presentWorkers * Number(d.workday!.workedHours),
      0,
    );
    const productivity = ratio(processed, personHours);
    const defaultProductivity = ratio(
      closed.reduce(
        (sum, d) =>
          sum +
          d.defaultProductivity *
            d.workday!.presentWorkers *
            Number(d.workday!.workedHours),
        0,
      ),
      personHours,
    );
    const averageShiftHours = ratio(
      closed.reduce((sum, d) => sum + d.defaultShiftHours, 0),
      closed.length,
    );
    const averageMaxHours = ratio(
      closed.reduce(
        (sum, d) => sum + d.defaultShiftHours + d.maxOvertimeHours,
        0,
      ),
      closed.length,
    );
    const fulfillment = ratio(processed, target);
    const averageHours = ratio(hours, closed.length);
    const staffingRatio = ratio(
      workers,
      closed.reduce((sum, d) => sum + d.plannedWorkers, 0),
    );
    const discardRate = ratio(
      closed.reduce((sum, d) => sum + Number(d.workday!.discardedCrates), 0),
      processed,
    );
    const overtimeDays = closed.filter(
      (d) => Number(d.workday!.workedHours) > d.defaultShiftHours,
    ).length;
    const belowTarget = closed
      .filter((d) => (d.metrics.fulfillment ?? 1) < 0.95)
      .map((d) => d.date);
    const pendingPlans = (
      await this.store.find('plans', {
        plantId,
        fruitId: query.fruitId,
        status: PlanStatus.PENDING,
      })
    ).length;
    const alertCount = (
      await Promise.all(
        plans.map(async (plan) => {
          const planDays = await this.store.find('planDays', {
            planId: plan.id,
          });
          return (
            await Promise.all(
              planDays.map((day) =>
                this.store.find('alerts', { planDayId: day.id }),
              ),
            )
          ).flat().length;
        }),
      )
    ).reduce((sum, count) => sum + count, 0);
    return {
      year: query.year,
      week: query.week,
      plantId: plantId ?? null,
      days,
      pendingPlans,
      alertCount,
      references: plants.map((plant) => ({
        plantId: plant.id,
        shiftHours: Number(plant.shiftHours),
        productivity: Number(plant.cratesPerWorkerHour),
      })),
      kpis: {
        targetCrates: decimal(target),
        processedCrates: decimal(processed),
        weeklyTargetCrates: decimal(
          days.reduce((sum, d) => sum + Number(d.targetCrates), 0),
        ),
        fulfillment,
        averageHours,
        staffingRatio,
        productivity,
        discardRate,
        overtimeDays,
        closedDays: closed.length,
        cratesPerWorker: ratio(processed, workers),
      },
      indicators: {
        fulfillment:
          fulfillment === null
            ? null
            : fulfillment >= 0.98
              ? 'OK'
              : fulfillment >= 0.93
                ? 'WARNING'
                : 'ALERT',
        averageHours:
          averageHours === null
            ? null
            : averageHours <= averageShiftHours!
              ? 'OK'
              : averageHours <= averageMaxHours!
                ? 'WARNING'
                : 'ALERT',
        overtimeDays: !closed.length
          ? null
          : overtimeDays > 1
            ? 'ALERT'
            : overtimeDays
              ? 'WARNING'
              : 'OK',
        staffingRatio:
          staffingRatio === null
            ? null
            : staffingRatio < 0.9
              ? 'ALERT'
              : staffingRatio > 1.05
                ? 'WARNING'
                : 'OK',
        productivity:
          productivity === null || defaultProductivity === null
            ? null
            : productivity >= defaultProductivity
              ? 'OK'
              : 'WARNING',
        discardRate:
          discardRate === null ? null : discardRate > 0.09 ? 'WARNING' : 'OK',
      },
      insights: closed.length
        ? [
            {
              code: 'PRODUCTIVITY',
              value: productivity,
              reference: defaultProductivity,
              dates: [] as string[],
            },
            {
              code: 'STAFFING',
              value: staffingRatio,
              reference: 1,
              dates: [] as string[],
            },
            {
              code: 'BELOW_TARGET',
              value: belowTarget.length,
              reference: 0.95,
              dates: belowTarget,
            },
          ]
        : [],
    };
  }
}
