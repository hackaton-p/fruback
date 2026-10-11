import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface Workday extends DomainRecord {
  planDayId: number;
  startedAt: Date;
  closedAt: Date | null;
  presentWorkers: number;
  receivedBoxes: string;
  workedHours: string | null;
  processedBoxes: string;
  discardedBoxes: string | null;
  looseKg: string | null;
  fixedKg: string | null;
  targetMet: boolean | null;
  difference: string | null;
}
