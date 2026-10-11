import { executionMetrics } from './execution-metrics';
const parameters = {
  boxesPerWorkerHour: '5',
  maxWorkers: 300,
  shiftHours: '10',
  maxOvertimeHours: '2',
  startTime: '17:00',
  efficiencyFactor: '0.8',
  volumeTolerancePercent: '5',
};
const input = {
  targetBoxes: 1000,
  plannedHours: 10,
  processedBoxes: 200,
  receivedBoxes: 200,
  presentWorkers: 25,
  elapsedHours: 2,
  parameters,
};
describe('Execution estimates', () => {
  it('keeps expected receipts tied to approved hours after an adjustment', () => {
    const value = executionMetrics({
      ...input,
      availableHours: 12,
      receivedBoxes: 250,
    });
    expect(value.expectedReceived).toBe(200);
    expect(value.volumeAlert).toBe(true);
    expect(value.requiresAdjustment).toBe(false);
  });
  it('does not divide by zero when no staff is present', () => {
    const value = executionMetrics({ ...input, presentWorkers: 0 });
    expect(value.estimatedHours).toBeNull();
    expect(value.riskOfExtraShift).toBe(true);
  });
  it('does not propose additional time when the target is complete', () => {
    const value = executionMetrics({
      ...input,
      processedBoxes: 1000,
      receivedBoxes: 1000,
      presentWorkers: 0,
    });
    expect(value.estimatedHours).toBe(2);
    expect(value.requiresAdjustment).toBe(false);
  });
  it('handles zero target and incoming volume without infinite percentages', () => {
    const value = executionMetrics({
      ...input,
      targetBoxes: 0,
      plannedHours: 0,
      processedBoxes: 0,
      receivedBoxes: 5,
    });
    expect(value.deviationPercent).toBeNull();
    expect(value.volumeAlert).toBe(true);
  });
});
