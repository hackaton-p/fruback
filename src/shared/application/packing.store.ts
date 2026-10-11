import type { Workday } from '../../modules/workdays/domain/workday';
import type { ProgressRecord } from '../../modules/workdays/domain/progress-record';
import type { Area } from '../../modules/catalogs/domain/area';
import type { Customer } from '../../modules/catalogs/domain/customer';
import type { Fruit } from '../../modules/catalogs/domain/fruit';
import type { PlantFruit } from '../../modules/catalogs/domain/plant-fruit';
import type { Alert } from '../../modules/alerts/domain/alert';
import type { Projection } from '../../modules/projections/domain/projection';
import type { Role } from '../../modules/auth/domain/role';
import type { User } from '../../modules/auth/domain/user';
import type { PlanDay } from '../../modules/plans/domain/plan-day';
import type { PlanDayArea } from '../../modules/plans/domain/plan-day-area';
import type { Plan } from '../../modules/plans/domain/plan';
import type { Plant } from '../../modules/plants/domain/plant';
export interface Models {
  workdays: Workday;
  progressRecords: ProgressRecord;
  areas: Area;
  customers: Customer;
  fruits: Fruit;
  plantFruits: PlantFruit;
  alerts: Alert;
  projections: Projection;
  roles: Role;
  users: User;
  planDays: PlanDay;
  planDayAreas: PlanDayArea;
  plans: Plan;
  plants: Plant;
}
export type Table = keyof Models;
export interface FindOptions {
  orderBy?: string;
  direction?: 'ASC' | 'DESC';
  skip?: number;
  take?: number;
}
export abstract class PackingStore {
  abstract find<K extends Table>(
    table: K,
    where?: Partial<Models[K]>,
    options?: FindOptions,
  ): Promise<Models[K][]>;
  abstract get<K extends Table>(
    table: K,
    id: number,
    lock?: boolean,
  ): Promise<Models[K] | null>;
  abstract save<K extends Table>(
    table: K,
    value: Partial<Models[K]>,
  ): Promise<Models[K]>;
  abstract remove<K extends Table>(
    table: K,
    where: Partial<Models[K]>,
  ): Promise<void>;
  abstract transaction<T>(
    work: (store: PackingStore) => Promise<T>,
  ): Promise<T>;
}
