import { PlantEntity } from '../modules/plants/infrastructure/persistence/plant.entity';
import { RoleEntity } from '../modules/auth/infrastructure/persistence/role.entity';
import { UserEntity } from '../modules/auth/infrastructure/persistence/user.entity';
import { FruitEntity } from '../modules/catalogs/infrastructure/persistence/fruit.entity';
import { CustomerEntity } from '../modules/catalogs/infrastructure/persistence/customer.entity';
import { AreaEntity } from '../modules/catalogs/infrastructure/persistence/area.entity';
import { ProjectionEntity } from '../modules/projections/infrastructure/persistence/projection.entity';
import { PlanEntity } from '../modules/plans/infrastructure/persistence/plan.entity';
import { PlanDayEntity } from '../modules/plans/infrastructure/persistence/plan-day.entity';
import { PlanDayAreaEntity } from '../modules/plans/infrastructure/persistence/plan-day-area.entity';
import { WorkdayEntity } from '../modules/workdays/infrastructure/persistence/workday.entity';
import { ProgressRecordEntity } from '../modules/workdays/infrastructure/persistence/progress-record.entity';
import { AlertEntity } from '../modules/alerts/infrastructure/persistence/alert.entity';
export const entities = [
  PlantEntity,
  RoleEntity,
  UserEntity,
  FruitEntity,
  CustomerEntity,
  AreaEntity,
  ProjectionEntity,
  PlanEntity,
  PlanDayEntity,
  PlanDayAreaEntity,
  WorkdayEntity,
  ProgressRecordEntity,
  AlertEntity,
];
