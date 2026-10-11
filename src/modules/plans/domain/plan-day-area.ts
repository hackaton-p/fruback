import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface PlanDayArea extends DomainRecord {
  planDayId: number;
  areaId: number;
  plannedWorkers: number;
  arrivedWorkers: number | null;
  startingWorkers: number | null;
  presentWorkers: number | null;
}
