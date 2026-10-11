import { parameterChanges, resolveParameters } from './parameter-policy';

const defaults = {
  cratesPerWorkerHour: '5.9000',
  maxWorkers: 300,
  shiftHours: '10.0000',
  maxOvertimeHours: '2.0000',
  startTime: '17:00:00',
  efficiencyFactor: '0.8000',
  volumeTolerancePercent: '5.0000',
};
describe('Plan parameter comparison', () => {
  it('treats equivalent numeric and time representations as unchanged', () => {
    expect(
      parameterChanges(
        { ...defaults, cratesPerWorkerHour: '5.9', startTime: '17:00' },
        defaults,
      ),
    ).toEqual([]);
  });
  it('reports actual differences without mutating defaults or the snapshot', () => {
    const snapshot = resolveParameters(defaults, { efficiencyFactor: 0.85 });
    expect(parameterChanges(snapshot, defaults)).toEqual([
      { key: 'efficiencyFactor', value: '0.8500', defaultValue: '0.8000' },
    ]);
    expect(defaults.efficiencyFactor).toBe('0.8000');
    parameterChanges(snapshot, { ...defaults, maxWorkers: 200 });
    expect(snapshot.maxWorkers).toBe(300);
  });
});
