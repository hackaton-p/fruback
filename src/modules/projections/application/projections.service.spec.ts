import { ProjectionsService } from './projections.service';
import { ProjectionType } from '../domain/enums';
import { RoleName } from '../../auth/domain/enums';
import type { Actor } from '../../auth/domain/actor';
import type { PackingStore } from '../../../shared/application/packing.store';
import type { SpreadsheetReader } from './spreadsheet-reader';

describe('Manual projections', () => {
  const actor: Actor = {
    id: 1,
    authUserId: 'planner',
    name: 'Planner',
    email: 'planner@example.com',
    role: RoleName.PLANNER,
    plantId: 1,
  };
  const input = {
    plantId: 1,
    fruitId: 1,
    year: 2026,
    week: 42,
    type: ProjectionType.HARVEST,
  };
  const save = jest.fn();
  const find = jest.fn();
  const store = {
    get: jest.fn().mockResolvedValue({ id: 1 }),
    find,
    save,
    transaction: async (
      callback: (transaction: PackingStore) => Promise<unknown>,
    ) => callback(store as unknown as PackingStore),
  };
  const service = new ProjectionsService(
    store as unknown as PackingStore,
    {} as SpreadsheetReader,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    find.mockResolvedValue([]);
    save.mockImplementation((table: string, row: object) =>
      Promise.resolve({ id: 1, ...row }),
    );
  });
  it('saves harvest form rows', async () => {
    const result = await service.create(
      input,
      [{ date: '2026-10-12', quantity: 100 }],
      actor,
    );
    expect(result.imported).toBe(1);
    expect(save).toHaveBeenCalledWith(
      'projections',
      expect.objectContaining({ date: '2026-10-12', crates: '100.0000' }),
    );
  });
  it('saves commercial rows and their customers', async () => {
    const result = await service.create(
      { ...input, type: ProjectionType.COMMERCIAL },
      [{ customerName: ' Customer ', country: ' Peru ', quantity: 50 }],
      actor,
    );
    expect(result.imported).toBe(1);
    expect(save).toHaveBeenCalledWith('customers', {
      name: 'Customer',
      country: 'Peru',
    });
  });
  it('rejects duplicate dates', async () => {
    await expect(
      service.create(
        input,
        [
          { date: '2026-10-12', quantity: 1 },
          { date: '2026-10-12', quantity: 2 },
        ],
        actor,
      ),
    ).rejects.toThrow('Duplicate dates');
    expect(save).not.toHaveBeenCalled();
  });
  it('rejects dates outside the selected week', async () => {
    await expect(
      service.create(input, [{ date: '2026-10-19', quantity: 1 }], actor),
    ).rejects.toThrow('outside');
  });
  it('rejects overwriting registered projections', async () => {
    find.mockResolvedValue([{ id: 1 }]);
    await expect(
      service.create(input, [{ date: '2026-10-12', quantity: 1 }], actor),
    ).rejects.toThrow('already exists');
    expect(save).not.toHaveBeenCalled();
  });
  it('rejects another plant', async () => {
    await expect(
      service.create(
        { ...input, plantId: 2 },
        [{ date: '2026-10-12', quantity: 1 }],
        actor,
      ),
    ).rejects.toThrow('Plant access denied');
  });
  it('rejects invalid quantities and dates', async () => {
    await expect(
      service.create(input, [{ date: '2026-10-12', quantity: -1 }], actor),
    ).rejects.toThrow('Invalid quantity');
    await expect(
      service.create(input, [{ date: '2026-99-99', quantity: 1 }], actor),
    ).rejects.toThrow('Invalid harvest date');
  });
});
