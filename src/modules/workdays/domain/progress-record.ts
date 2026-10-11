import type { ProgressType } from './enums';
import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface ProgressRecord extends DomainRecord {
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
