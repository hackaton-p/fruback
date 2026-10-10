/** Decimal values remain strings at the persistence boundary to preserve PostgreSQL precision. */
export interface PlantParameters {
  boxesPerWorkerHour: string;
  maxWorkers: number;
  shiftHours: string;
  maxOvertimeHours: string;
  startTime: string;
  efficiencyFactor: string;
  /** Percentage from 0 to 100 (5 means 5%). */
  volumeTolerancePercent: string;
}
