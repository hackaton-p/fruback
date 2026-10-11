import type { DomainRecord } from '../../../shared/domain/domain-record';
import type { ProjectionType } from './enums';
export interface Projection extends DomainRecord {
  plantId: number;
  fruitId: number;
  customerId: number | null;
  type: ProjectionType;
  year: number;
  week: number;
  date: string | null;
  crates: string;
}
