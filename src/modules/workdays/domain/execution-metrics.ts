import type { PlantParameters } from '../../plants/domain/plant-parameters';
export function executionMetrics(input: {
  targetBoxes: number;
  plannedHours: number;
  availableHours?: number;
  processedBoxes: number;
  receivedBoxes: number;
  presentWorkers: number;
  elapsedHours: number;
  parameters: PlantParameters;
}) {
  const {
    targetBoxes,
    plannedHours,
    processedBoxes,
    receivedBoxes,
    presentWorkers,
    elapsedHours,
    parameters,
  } = input;
  const expectedReceived =
    plannedHours > 0 ? (targetBoxes * elapsedHours) / plannedHours : 0;
  const deviationPercent =
    expectedReceived > 0
      ? ((receivedBoxes - expectedReceived) / expectedReceived) * 100
      : null;
  const volumeAlert =
    deviationPercent === null
      ? receivedBoxes > 0
      : deviationPercent > Number(parameters.volumeTolerancePercent);
  const nominalRate =
    presentWorkers *
    Number(parameters.boxesPerWorkerHour) *
    Number(parameters.efficiencyFactor);
  const observedRate =
    elapsedHours > 0 && processedBoxes > 0
      ? processedBoxes / elapsedHours
      : nominalRate;
  const rate = Math.min(nominalRate, observedRate);
  const remaining = Math.max(
    0,
    Math.max(targetBoxes, receivedBoxes) - processedBoxes,
  );
  const estimatedHours =
    remaining === 0
      ? elapsedHours
      : rate > 0
        ? elapsedHours + remaining / rate
        : null;
  return {
    expectedReceived,
    deviationPercent,
    volumeAlert,
    estimatedHours,
    requiresAdjustment:
      estimatedHours === null ||
      estimatedHours > (input.availableHours ?? plannedHours),
    riskOfExtraShift:
      estimatedHours === null ||
      estimatedHours >
        Number(parameters.shiftHours) + Number(parameters.maxOvertimeHours),
  };
}
