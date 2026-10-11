import type { Projection } from '../domain/projection';
import { Injectable } from '@nestjs/common';
import { PackingStore } from '../../../shared/application/packing.store';
import { SpreadsheetReader } from './spreadsheet-reader';
import { ProjectionType } from '../domain/enums';
import type { Actor } from '../../auth/domain/actor';
import { assertPlantAccess, scopedPlant } from '../../auth/domain/actor';
import { ensure } from '../../../shared/domain/domain-error';
import { decimal, isoWeek, weekDates } from '../../../shared/domain/dates';
export interface ImportProjection {
  plantId: number;
  fruitId: number;
  year: number;
  week: number;
  type: ProjectionType;
  unit?: 'BOXES' | 'TONNES';
}
@Injectable()
export class ProjectionsService {
  constructor(
    private readonly store: PackingStore,
    private readonly reader: SpreadsheetReader,
  ) {}
  async list(
    query: {
      plantId?: number;
      fruitId?: number;
      year: number;
      week: number;
      type?: ProjectionType;
    },
    actor: Actor,
  ) {
    weekDates(query.year, query.week);
    return this.store.find('projections', {
      ...query,
      plantId: scopedPlant(actor, query.plantId),
    });
  }
  async import(input: ImportProjection, file: Buffer, actor: Actor) {
    assertPlantAccess(actor, input.plantId);
    weekDates(input.year, input.week);
    const rows = await this.reader.read(file, input.type);
    const keys = rows.map((row) =>
      input.type === ProjectionType.HARVEST
        ? row.date
        : row.customerName?.toLowerCase(),
    );
    ensure(
      new Set(keys).size === keys.length,
      'Duplicate dates or customers in workbook',
    );
    return this.store.transaction(async (store) => {
      ensure(
        await store.get('plants', input.plantId, true),
        'Plant not found',
        404,
      );
      ensure(await store.get('fruits', input.fruitId), 'Fruit not found', 404);
      const filter = {
        plantId: input.plantId,
        fruitId: input.fruitId,
        year: input.year,
        week: input.week,
        type: input.type,
      };
      ensure(
        !(await store.find('projections', filter)).length,
        'A projection for this plant, fruit, week and type already exists',
        409,
      );
      const result: Projection[] = [];
      for (const row of rows) {
        let customerId: number | null = null;
        if (input.type === ProjectionType.HARVEST) {
          const actual = isoWeek(row.date!);
          ensure(
            actual.year === input.year && actual.week === input.week,
            'Harvest date is outside the selected ISO week',
          );
        } else {
          const existing = (
            await store.find('customers', { name: row.customerName })
          )[0];
          ensure(
            !existing || existing.country === row.country,
            'Existing customer has a different country',
            409,
          );
          const customer =
            existing ??
            (await store.save('customers', {
              name: row.customerName,
              country: row.country,
            }));
          customerId = customer.id;
        }
        result.push(
          await store.save('projections', {
            ...filter,
            date: row.date ?? null,
            customerId,
            boxes: decimal(
              row.quantity * (input.unit === 'TONNES' ? 1000 / 8.2 : 1),
            ),
          }),
        );
      }
      return { imported: result.length, items: result };
    });
  }
}
