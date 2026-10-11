import { CatalogsService } from './catalogs.service';
import type { PackingStore } from '../../../shared/application/packing.store';

describe('Historical fruit lookup', () => {
  const store = { get: jest.fn(), find: jest.fn() };
  const service = new CatalogsService(store as unknown as PackingStore);

  beforeEach(() => jest.resetAllMocks());

  it('returns an inactive fruit referenced by an existing plan', async () => {
    store.get.mockResolvedValue({ id: 3, name: 'Uva', isActive: false });
    store.find.mockResolvedValue([{ fruitId: 3, plantId: 1 }]);

    await expect(service.fruit(3)).resolves.toEqual({
      id: 3, name: 'Uva', isActive: false, plantIds: [1],
    });
  });

  it('returns 404 for a fruit that really does not exist', async () => {
    store.get.mockResolvedValue(null);
    await expect(service.fruit(99)).rejects.toMatchObject({ status: 404 });
    expect(store.find).not.toHaveBeenCalled();
  });

  it('keeps inactive fruits out of the default selection catalog', async () => {
    store.find.mockImplementation(async (table: string) => table === 'fruits'
      ? [{ id: 3, name: 'Uva', isActive: false }, { id: 4, name: 'Mango', isActive: true }]
      : []);
    await expect(service.fruits()).resolves.toEqual([
      { id: 4, name: 'Mango', isActive: true, plantIds: [] },
    ]);
  });
});
