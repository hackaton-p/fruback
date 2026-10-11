import type { PlantParameters } from '../../plants/domain/plant-parameters';
import { ProgressType } from './enums';

export interface ExecutionEvent {
  type: ProgressType;
  recordedAt: Date;
  presentWorkers: number;
  cumulativeProcessedCrates: string | null;
}

export function observedProductivity(
  startedAt: Date,
  startingWorkers: number,
  records: ExecutionEvent[],
): number | null {
  let workers = startingWorkers;
  let time = startedAt.getTime();
  let personHours = 0;
  let productivity: number | null = null;
  for (const record of records) {
    personHours +=
      (workers * Math.max(0, record.recordedAt.getTime() - time)) / 3600000;
    time = record.recordedAt.getTime();
    if (record.type === ProgressType.PROGRESS && personHours > 0)
      productivity = Number(record.cumulativeProcessedCrates) / personHours;
    workers = record.presentWorkers;
  }
  return productivity;
}

export function executionMetrics(input: {
  targetCrates: number;
  plannedHours: number;
  availableHours?: number;
  expectedDailyCrates?: number;
  processedCrates: number;
  receivedCrates: number;
  presentWorkers: number;
  elapsedHours: number;
  productivity?: number | null;
  parameters: PlantParameters;
}) {
  const {
    targetCrates,
    plannedHours,
    processedCrates,
    receivedCrates,
    presentWorkers,
    elapsedHours,
    parameters,
  } = input;
  const expectedReceived =
    plannedHours > 0 ? (targetCrates * elapsedHours) / plannedHours : 0;
  const deviationPercent =
    expectedReceived > 0
      ? ((receivedCrates - expectedReceived) / expectedReceived) * 100
      : null;
  const volumeAlert =
    deviationPercent === null
      ? receivedCrates > 0
      : deviationPercent > Number(parameters.volumeTolerancePercent);
  const productivity =
    input.productivity ??
    Number(parameters.cratesPerWorkerHour) *
      Number(parameters.efficiencyFactor);
  const remainingCrates = Math.max(
    0,
    (input.expectedDailyCrates ?? Math.max(targetCrates, receivedCrates)) -
      processedCrates,
  );
  const rate = presentWorkers * productivity;
  const estimatedHours =
    remainingCrates === 0
      ? elapsedHours
      : rate > 0
        ? elapsedHours + remainingCrates / rate
        : null;
  const availableHours = input.availableHours ?? plannedHours;
  const requiredWorkers =
    remainingCrates === 0
      ? 0
      : availableHours > elapsedHours && productivity > 0
        ? Math.ceil(
            remainingCrates / ((availableHours - elapsedHours) * productivity),
          )
        : null;
  return {
    expectedReceived,
    deviationPercent,
    volumeAlert,
    productivity,
    remainingCrates,
    estimatedHours,
    additionalWorkers:
      requiredWorkers === null
        ? null
        : Math.max(0, requiredWorkers - presentWorkers),
    requiresAdjustment:
      estimatedHours === null || estimatedHours > availableHours,
    riskOfExtraShift:
      estimatedHours === null ||
      estimatedHours >
        Number(parameters.shiftHours) + Number(parameters.maxOvertimeHours),
  };
}
