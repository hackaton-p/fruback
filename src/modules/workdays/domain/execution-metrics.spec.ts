import { ProgressType } from './enums';
import { executionMetrics, observedProductivity } from './execution-metrics';
const parameters = {
  cratesPerWorkerHour: '5',
  maxWorkers: 300,
  shiftHours: '10',
  maxOvertimeHours: '2',
  startTime: '17:00',
  efficiencyFactor: '0.8',
  volumeTolerancePercent: '5',
};
const input = {
  targetCrates: 1000,
  plannedHours: 10,
  processedCrates: 200,
  receivedCrates: 200,
  presentWorkers: 25,
  elapsedHours: 2,
  parameters,
};
describe('Execution estimates', () => {
  it('keeps expected receipts tied to approved hours after an adjustment', () => {
    const value = executionMetrics({
      ...input,
      availableHours: 12,
      receivedCrates: 250,
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
      processedCrates: 1000,
      receivedCrates: 1000,
      presentWorkers: 0,
    });
    expect(value.estimatedHours).toBe(2);
    expect(value.requiresAdjustment).toBe(false);
  });
  it('handles zero target and incoming volume without infinite percentages', () => {
    const value = executionMetrics({
      ...input,
      targetCrates: 0,
      plannedHours: 0,
      processedCrates: 0,
      receivedCrates: 5,
    });
    expect(value.deviationPercent).toBeNull();
    expect(value.volumeAlert).toBe(true);
  });
});

describe('V2 productivity with staff changes', () => {
  it('integrates worker hours and preserves the last observed productivity', () => {
    const start = new Date('2026-10-09T22:00:00Z');
    const at = (hours: number) => new Date(start.getTime() + hours * 3600000);
    const records = [
      {
        type: ProgressType.STAFF,
        recordedAt: at(1),
        presentWorkers: 20,
        cumulativeProcessedCrates: null,
      },
      {
        type: ProgressType.PROGRESS,
        recordedAt: at(2),
        presentWorkers: 20,
        cumulativeProcessedCrates: '120',
      },
      {
        type: ProgressType.STAFF,
        recordedAt: at(3),
        presentWorkers: 30,
        cumulativeProcessedCrates: null,
      },
    ];
    expect(observedProductivity(start, 10, records)).toBe(4);
    expect(
      executionMetrics({
        ...input,
        productivity: 4,
        presentWorkers: 30,
        processedCrates: 120,
        expectedDailyCrates: 600,
        elapsedHours: 3,
      }).estimatedHours,
    ).toBe(7);
  });
  it('does not cap real productivity to the default or replace zero productivity', () => {
    expect(executionMetrics({ ...input, productivity: 8 }).estimatedHours).toBe(
      6,
    );
    expect(
      executionMetrics({ ...input, productivity: 0 }).estimatedHours,
    ).toBeNull();
  });
  it('accepts lower expected volume without changing the approved target', () => {
    expect(
      executionMetrics({ ...input, expectedDailyCrates: 600 }).estimatedHours,
    ).toBe(6);
  });
});
