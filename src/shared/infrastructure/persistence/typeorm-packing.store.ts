import { DataSource, EntityManager, IsNull } from 'typeorm';
import type { EntityTarget, ObjectLiteral } from 'typeorm';
import { PackingStore } from '../../application/packing.store';
import type {
  Models,
  Table,
  FindOptions,
} from '../../application/packing.store';
import { WorkdayEntity } from '../../../modules/workdays/infrastructure/persistence/workday.entity';
import { ProgressRecordEntity } from '../../../modules/workdays/infrastructure/persistence/progress-record.entity';
import { AreaEntity } from '../../../modules/catalogs/infrastructure/persistence/area.entity';
import { CustomerEntity } from '../../../modules/catalogs/infrastructure/persistence/customer.entity';
import { FruitEntity } from '../../../modules/catalogs/infrastructure/persistence/fruit.entity';
import { AlertEntity } from '../../../modules/alerts/infrastructure/persistence/alert.entity';
import { ProjectionEntity } from '../../../modules/projections/infrastructure/persistence/projection.entity';
import { RoleEntity } from '../../../modules/auth/infrastructure/persistence/role.entity';
import { UserEntity } from '../../../modules/auth/infrastructure/persistence/user.entity';
import { PlanDayEntity } from '../../../modules/plans/infrastructure/persistence/plan-day.entity';
import { PlanDayAreaEntity } from '../../../modules/plans/infrastructure/persistence/plan-day-area.entity';
import { PlanEntity } from '../../../modules/plans/infrastructure/persistence/plan.entity';
import { PlantEntity } from '../../../modules/plants/infrastructure/persistence/plant.entity';
const tables: Record<Table, EntityTarget<ObjectLiteral>> = {
  workdays: WorkdayEntity,
  progressRecords: ProgressRecordEntity,
  areas: AreaEntity,
  customers: CustomerEntity,
  fruits: FruitEntity,
  alerts: AlertEntity,
  projections: ProjectionEntity,
  roles: RoleEntity,
  users: UserEntity,
  planDays: PlanDayEntity,
  planDayAreas: PlanDayAreaEntity,
  plans: PlanEntity,
  plants: PlantEntity,
};
export class TypeOrmPackingStore extends PackingStore {
  constructor(
    private readonly source: DataSource,
    private readonly manager: EntityManager = source.manager,
  ) {
    super();
  }
  find<K extends Table>(
    table: K,
    where: Partial<Models[K]> = {},
    options: FindOptions = {},
  ): Promise<Models[K][]> {
    const criteria = Object.fromEntries(
      Object.entries(where)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, v === null ? IsNull() : v]),
    );
    return this.manager.getRepository(tables[table]).find({
      where: criteria,
      order: options.orderBy
        ? { [options.orderBy]: options.direction ?? 'ASC' }
        : { id: 'ASC' },
      skip: options.skip,
      take: options.take,
    }) as Promise<Models[K][]>;
  }
  get<K extends Table>(
    table: K,
    id: number,
    lock = false,
  ): Promise<Models[K] | null> {
    return this.manager.getRepository(tables[table]).findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    }) as Promise<Models[K] | null>;
  }
  save<K extends Table>(
    table: K,
    value: Partial<Models[K]>,
  ): Promise<Models[K]> {
    return this.manager.getRepository(tables[table]).save(value) as Promise<
      Models[K]
    >;
  }
  async remove<K extends Table>(
    table: K,
    where: Partial<Models[K]>,
  ): Promise<void> {
    await this.manager.getRepository(tables[table]).delete(where);
  }
  transaction<T>(work: (store: PackingStore) => Promise<T>): Promise<T> {
    return this.source.transaction((manager) =>
      work(new TypeOrmPackingStore(this.source, manager)),
    );
  }
}
