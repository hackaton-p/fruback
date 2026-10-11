import { ProjectionsService } from './projections.service';
import type { PackingStore } from '../../../shared/application/packing.store';
import type { Actor } from '../../auth/domain/actor';
import { RoleName } from '../../auth/domain/enums';
import { ProjectionType } from '../domain/enums';

describe('Projection registration', () => {
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
  const store = {
    get: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    transaction: jest.fn(),
  };
  const reader = { read: jest.fn() };
  let service: ProjectionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    store.get.mockResolvedValue({ id: 1 });
    store.find.mockResolvedValue([]);
    store.save.mockImplementation(
      (_table: string, data: Record<string, unknown>) =>
        Promise.resolve({ id: 1, ...data }),
    );
    store.transaction.mockImplementation(
      (callback: (transaction: PackingStore) => Promise<unknown>) =>
        callback(store as unknown as PackingStore),
    );
    service = new ProjectionsService(store as unknown as PackingStore, reader);
  });

  it('registers integer harvest quantities, including zero', async () => {
    const result = await service.create(
      input,
      [
        { date: '2026-10-12', quantity: 0 },
        { date: '2026-10-14', quantity: 103 },
      ],
      actor,
    );
    expect(result.imported).toBe(2);
    expect(result.items.map((row) => Number(row.crates))).toEqual([0, 103]);
  });
  it('saves harvest form rows with their date and crate precision', async () => {
    const result = await service.create(
      input,
      [{ date: '2026-10-12', quantity: 100 }],
      actor,
    );
    expect(result.imported).toBe(1);
    expect(store.save).toHaveBeenCalledWith(
      'projections',
      expect.objectContaining({ date: '2026-10-12', crates: '100.0000' }),
    );
  });
  it('saves commercial rows and trims customer details', async () => {
    const result = await service.create(
      { ...input, type: ProjectionType.COMMERCIAL },
      [{ customerName: ' Customer ', country: ' Peru ', quantity: 50 }],
      actor,
    );
    expect(result.imported).toBe(1);
    expect(store.save).toHaveBeenCalledWith('customers', {
      name: 'Customer',
      country: 'Peru',
    });
  });
  it('rejects fractional harvest before writing any records', async () => {
    await expect(
      service.create(input, [{ date: '2026-10-12', quantity: 1.5 }], actor),
    ).rejects.toThrow('Harvest quantities must be whole crates');
    expect(store.transaction).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });
  it('enforces integer harvest quantities for Excel imports as well', async () => {
    reader.read.mockResolvedValue([{ date: '2026-10-12', quantity: 1.5 }]);
    await expect(
      service.import(input, Buffer.from('workbook'), actor),
    ).rejects.toThrow('Harvest quantities must be whole crates');
    expect(store.transaction).not.toHaveBeenCalled();
  });
  it('keeps commercial quantities compatible with decimal values', async () => {
    const result = await service.create(
      { ...input, type: ProjectionType.COMMERCIAL },
      [{ customerName: 'Customer', country: 'Peru', quantity: 10.5 }],
      actor,
    );
    expect(Number(result.items[0].crates)).toBe(10.5);
  });
  it('rejects duplicate dates and dates outside the requested week', async () => {
    await expect(
      service.create(input, [{ date: '2026-10-19', quantity: 1 }], actor),
    ).rejects.toThrow('outside the selected ISO week');
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
    expect(store.transaction).not.toHaveBeenCalled();
  });
  it('rejects overwriting registered projections', async () => {
    store.find.mockResolvedValue([{ id: 1 }]);
    await expect(
      service.create(input, [{ date: '2026-10-12', quantity: 1 }], actor),
    ).rejects.toThrow('already exists');
    expect(store.save).not.toHaveBeenCalled();
  });
  it('rejects another plant', async () => {
    await expect(
      service.create(
        { ...input, plantId: 2 },
        [{ date: '2026-10-12', quantity: 1 }],
        actor,
      ),
    ).rejects.toThrow('Plant access denied');
    expect(store.transaction).not.toHaveBeenCalled();
  });
  it('rejects invalid quantities and calendar dates before writing', async () => {
    await expect(
      service.create(input, [{ date: '2026-10-12', quantity: -1 }], actor),
    ).rejects.toThrow('Invalid projection quantity');
    for (const date of ['2026-99-99', '2026-02-30']) {
      await expect(
        service.create(input, [{ date, quantity: 1 }], actor),
      ).rejects.toThrow('Invalid calendar date');
    }
    expect(store.transaction).not.toHaveBeenCalled();
  });
  it('rejects missing commercial customer details before writing', async () => {
    await expect(
      service.create(
        { ...input, type: ProjectionType.COMMERCIAL },
        [{ quantity: 1 }],
        actor,
      ),
    ).rejects.toThrow('Invalid projection customer');
    expect(store.transaction).not.toHaveBeenCalled();
  });
});
