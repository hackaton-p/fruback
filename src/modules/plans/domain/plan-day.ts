import type { DomainRecord } from '../../../shared/domain/domain-record';
import type { HourAdjustmentReason } from './enums';
export interface PlanDay extends DomainRecord {
  planId: number;
  date: string;
  targetCrates: string;
  fruitTargets: { fruitId: number; fruitName: string; crates: string }[];
  workers: number;
  hours: string;
  adjustedHours: string | null;
  adjustmentReason: HourAdjustmentReason | null;
}
