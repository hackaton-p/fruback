import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface ProgressRecord extends DomainRecord {
  workdayId: number;
  recordedAt: Date;
  cumulativeReceivedBoxes: string;
  cumulativeProcessedBoxes: string;
  presentWorkers: number;
  recordedById: number;
}
