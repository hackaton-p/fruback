import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface Plant extends DomainRecord {
  name: string;
  cratesPerWorkerHour: string;
  maxWorkers: number;
  shiftHours: string;
  maxOvertimeHours: string;
  startTime: string;
  efficiencyFactor: string;
  volumeTolerancePercent: string;
  configurationCompletedAt: Date | null;
  isActive: boolean;
}
