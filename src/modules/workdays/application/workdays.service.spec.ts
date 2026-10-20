import { WorkdaysService } from './workdays.service';
import type { PackingStore } from '../../../shared/application/packing.store';
import { PlanStatus } from '../../plans/domain/enums';
import { RoleName } from '../../auth/domain/enums';

describe('Workday closing time', () => {
  it('rejects closing a future demo workday before any database writes', async () => {
    const save = jest.fn();
    const store = {
      get: jest.fn((table: string) =>
        Promise.resolve(
          (
            {
              workdays: {
                id: 1,
                planDayId: 2,
                startedAt: new Date(Date.now() + 86400000),
                closedAt: null,
              },
              planDays: { id: 2, planId: 3 },
              plans: { id: 3, plantId: 1, status: PlanStatus.IN_PROGRESS },
              plants: { id: 1 },
            } as Record<string, unknown>
          )[table],
        ),
      ),
      save,
      transaction: (callback: (transaction: PackingStore) => unknown) =>
        callback(store as unknown as PackingStore),
    };
    const service = new WorkdaysService(store as unknown as PackingStore);
    await expect(
      service.close(
        1,
        {
          workedHours: 1,
          processedCrates: 10,
          discardedCrates: 0,
          looseKg: 0,
          fixedKg: 0,
        },
        {
          id: 1,
          authUserId: 'test',
          email: 'test@example.test',
          name: 'Test',
          role: RoleName.SHIFT_MANAGER,
          plantId: 1,
        },
      ),
    ).rejects.toThrow('antes de su fecha y hora de inicio');
    expect(save).not.toHaveBeenCalled();
  });
});
