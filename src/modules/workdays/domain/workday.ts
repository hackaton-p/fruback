import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface Workday extends DomainRecord {
  planDayId: number;
  startedAt: Date;
  closedAt: Date | null;
  initialEstimatedHours: string | null;
  expectedDailyCrates: string;
  presentWorkers: number;
  receivedCrates: string;
  workedHours: string | null;
  processedCrates: string;
  discardedCrates: string | null;
  looseKg: string | null;
  fixedKg: string | null;
  targetMet: boolean | null;
  difference: string | null;
}
