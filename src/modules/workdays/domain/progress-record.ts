import type { ProgressType } from './enums';
import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface ProgressRecord extends DomainRecord {
  processedByFruit?: { fruitId: number; fruitName?: string; crates: string }[] | null;
  type: ProgressType;
  areaId: number | null;
  staffChange: number | null;
  expectedDailyCrates: string | null;
  estimatedHours: string | null;
  workdayId: number;
  recordedAt: Date;
  cumulativeReceivedCrates: string | null;
  cumulativeProcessedCrates: string | null;
  presentWorkers: number;
  recordedById: number;
}
