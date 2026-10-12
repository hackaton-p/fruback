import { PlansService } from './plans.service';
import type { PackingStore } from '../../../shared/application/packing.store';
import type { Actor } from '../../auth/domain/actor';
import { RoleName } from '../../auth/domain/enums';
import { PlanStatus, HarvestScenario } from '../domain/enums';

interface Row {
  id: number;
  [key: string]: unknown;
}

describe('Weekly planning workflow', () => {
  const actor: Actor = {
    id: 1,
    authUserId: 'planner',
    name: 'Planner',
    email: 'planner@example.com',
    role: RoleName.PLANNER,
    plantId: 1,
  };
  const parameters = {
    cratesPerWorkerHour: 5.9,
    maxWorkers: 300,
    shiftHours: 10,
    maxOvertimeHours: 2,
    startTime: '17:00',
    efficiencyFactor: 0.8,
    volumeTolerancePercent: 5,
  };
  const input = {
    plantId: 1,
    fruitId: 1,
    year: 2026,
    week: 42,
    harvestScenario: HarvestScenario.PROJECTED,
    parameters,
    startDate: '2026-10-12',
    dayCount: 5,
  };
  let tables: Record<string, Row[]>;
  let service: PlansService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-11T12:00:00Z'));
    tables = {
      plants: [
        {
          id: 1,
          name: 'Piura',
          configurationCompletedAt: new Date(),
          ...parameters,
        },
      ],
      fruits: [{ id: 1 }],
      areas: [{ id: 1, name: 'Packing', proportion: '1' }],
      projections: [
        ...Array.from({ length: 7 }, (_, i) => ({
          id: i + 1,
          plantId: 1,
          fruitId: 1,
          year: 2026,
          week: 42,
          type: 'COSECHA',
          date: `2026-10-${12 + i}`,
          crates: '100',
        })),
        {
          id: 8,
          plantId: 1,
          fruitId: 1,
          year: 2026,
          week: 42,
          type: 'COMERCIAL',
          crates: '500',
        },
      ],
      plans: [],
      planDays: [],
      planDayAreas: [],
      alerts: [],
      workdays: [],
    };
    const matches = (row: Row, filter: Record<string, unknown>) =>
      Object.entries(filter).every(
        ([key, value]) => value === undefined || row[key] === value,
      );
    const store = {
      get: (table: string, id: number) =>
        Promise.resolve(tables[table].find((row) => row.id === id) ?? null),
      find: (table: string, filter: Record<string, unknown> = {}) =>
        Promise.resolve(tables[table].filter((row) => matches(row, filter))),
      save: (table: string, data: Record<string, unknown>) => {
        const existing = tables[table].find((row) => row.id === data.id);
        if (existing) {
          Object.assign(existing, data);
          return Promise.resolve(existing);
        }
        const row = {
          ...data,
          id: Math.max(0, ...tables[table].map((r) => r.id)) + 1,
        };
        tables[table].push(row);
        return Promise.resolve(row);
      },
      remove: (table: string, filter: Record<string, unknown>) => {
        tables[table] = tables[table].filter((row) => !matches(row, filter));
        return Promise.resolve();
      },
      transaction: async (
        callback: (store: PackingStore) => Promise<unknown>,
      ) => callback(store as unknown as PackingStore),
    };
    service = new PlansService(store as unknown as PackingStore);
  });

  afterEach(() => jest.useRealTimers());

  it('creates separate drafts for the same week and keeps five planning days', async () => {
    const first = await service.apply(input, actor);
    const second = await service.apply(input, actor);
    expect(first.id).not.toBe(second.id);
    expect(tables.plans).toHaveLength(2);
    expect(second.days.map((day) => day.date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
  });
  it('allows creating another plan while one is pending', async () => {
    const first = await service.apply(input, actor);
    await service.transition(first.id, PlanStatus.PENDING, actor);
    await service.apply(input, actor);
    expect(tables.plans).toHaveLength(2);
  });
  it('approves only one plan for the same week', async () => {
    const first = await service.apply(input, actor);
    const second = await service.apply(input, actor);
    await service.transition(first.id, PlanStatus.PENDING, actor);
    await service.transition(second.id, PlanStatus.PENDING, actor);
    await service.transition(first.id, PlanStatus.APPROVED, actor);
    await expect(
      service.transition(second.id, PlanStatus.APPROVED, actor),
    ).rejects.toThrow('Only one plan');
  });
  it('does not approve another plan after the approved one closes', async () => {
    const first = await service.apply(input, actor);
    const second = await service.apply(input, actor);
    tables.plans.find((p) => p.id === first.id)!.status = PlanStatus.CLOSED;
    await service.transition(second.id, PlanStatus.PENDING, actor);
    await expect(
      service.transition(second.id, PlanStatus.APPROVED, actor),
    ).rejects.toThrow('Only one plan');
  });
  it.each([PlanStatus.DRAFT, PlanStatus.REJECTED])(
    'discards %s without deleting weekly projections',
    async (status) => {
      const plan = await service.apply(input, actor);
      tables.plans[0].status = status;
      await service.discard(plan.id, actor);
      expect(tables.plans).toHaveLength(0);
      expect(tables.planDays).toHaveLength(0);
      expect(tables.planDayAreas).toHaveLength(0);
      expect(tables.projections).toHaveLength(8);
    },
  );
  it.each([
    PlanStatus.PENDING,
    PlanStatus.APPROVED,
    PlanStatus.IN_PROGRESS,
    PlanStatus.CLOSED,
  ])('prevents discarding %s', async (status) => {
    const plan = await service.apply(input, actor);
    tables.plans[0].status = status;
    await expect(service.discard(plan.id, actor)).rejects.toThrow(
      'Only unsubmitted',
    );
    expect(tables.plans).toHaveLength(1);
  });
  it('updates only the selected draft and blocks period changes', async () => {
    const first = await service.apply(input, actor);
    const second = await service.apply(input, actor);
    await service.apply(input, actor, first.id);
    expect(tables.plans).toHaveLength(2);
    expect(tables.planDays.filter((d) => d.planId === second.id)).toHaveLength(
      5,
    );
    await expect(
      service.apply({ ...input, dayCount: 4 }, actor, first.id),
    ).rejects.toThrow('period cannot be modified');
    await expect(
      service.apply({ ...input, startDate: '2026-10-13' }, actor, first.id),
    ).rejects.toThrow('period cannot be modified');
  });
  it('rejects planning days outside the selected week', async () => {
    await expect(
      service.apply({ ...input, startDate: '2026-10-16', dayCount: 5 }, actor),
    ).rejects.toThrow('Invalid planning period');
  });
  it('rejects creating plans for the current week', async () => {
    jest.setSystemTime(new Date('2026-10-12T05:00:00Z'));
    await expect(service.apply(input, actor)).rejects.toThrow(
      'New plans must start next week or later',
    );
    expect(tables.plans).toHaveLength(0);
  });
  it('keeps existing plans editable after their week becomes current', async () => {
    const plan = await service.apply(input, actor);
    jest.setSystemTime(new Date('2026-10-12T05:00:00Z'));
    const updated = await service.apply(input, actor, plan.id);
    expect(updated.id).toBe(plan.id);
  });
  it('defaults to five days when duration is omitted', async () => {
    const plan = await service.apply(
      { ...input, startDate: undefined, dayCount: undefined },
      actor,
    );
    expect(plan.days).toHaveLength(5);
  });
  it('creates a Monday to Saturday plan and preserves its period when updating', async () => {
    const plan = await service.apply({ ...input, dayCount: 6 }, actor);
    expect(plan.days.map((day) => day.date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
    ]);
    const updated = await service.apply(
      { ...input, dayCount: 6 },
      actor,
      plan.id,
    );
    expect(updated.days).toHaveLength(6);
    await expect(service.apply(input, actor, plan.id)).rejects.toThrow(
      'period cannot be modified',
    );
  });
  it.each([2, 3, 4])('creates a Monday plan with %i days', async (dayCount) => {
    const plan = await service.apply({ ...input, dayCount }, actor);
    expect(plan.days).toHaveLength(dayCount);
    expect(plan.days[0].date).toBe('2026-10-12');
    expect(plan.days[dayCount - 1].date).toBe(`2026-10-${11 + dayCount}`);
  });
  it('saves nonconsecutive days and preserves them when editing', async () => {
    const selectedDates = ['2026-10-12', '2026-10-14', '2026-10-17'];
    const selection = { ...input, dayCount: 3, selectedDates };
    const plan = await service.apply(selection, actor);
    expect(plan.days.map((day) => day.date)).toEqual(selectedDates);
    expect(Number(plan.totals.targetCrates)).toBe(300);
    const updated = await service.apply(
      { ...input, dayCount: 3 },
      actor,
      plan.id,
    );
    expect(updated.days.map((day) => day.date)).toEqual(selectedDates);
    await expect(
      service.apply(
        {
          ...selection,
          selectedDates: ['2026-10-12', '2026-10-15', '2026-10-17'],
        },
        actor,
        plan.id,
      ),
    ).rejects.toThrow('period cannot be modified');
  });
  it.each([
    ['2026-10-12'],
    ['2026-10-13', '2026-10-14'],
    ['2026-10-12', '2026-10-18'],
    ['2026-10-12', '2026-10-19'],
    ['2026-10-12', '2026-10-12'],
  ])('rejects invalid selected dates %#', async (...selectedDates) => {
    await expect(
      service.apply(
        { ...input, dayCount: selectedDates.length, selectedDates },
        actor,
      ),
    ).rejects.toThrow('Invalid planning period');
  });
  it.each([0, 1, 7, 2.5])(
    'rejects new plans with %s days',
    async (dayCount) => {
      await expect(
        service.apply({ ...input, dayCount }, actor),
      ).rejects.toThrow('Invalid planning period');
    },
  );
});
