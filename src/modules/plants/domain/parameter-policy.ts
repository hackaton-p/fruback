import type { PlantParameters } from './plant-parameters';
import { PlanCalculatorService } from '../../plans/domain/services/plan-calculator.service';
import { decimal } from '../../../shared/domain/dates';
export type ParameterInput = Partial<{
  [K in keyof PlantParameters]: K extends 'startTime' ? string : number;
}>;
export function resolveParameters(
  base: PlantParameters,
  overrides: ParameterInput = {},
): PlantParameters {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined)
      Object.assign(result, {
        [key]:
          key === 'maxWorkers'
            ? value
            : key === 'startTime'
              ? value
              : decimal(Number(value)),
      });
  }
  new PlanCalculatorService().calculateDay(0, result);
  return result;
}
export function plantParameters(plant: PlantParameters): PlantParameters {
  return {
    cratesPerWorkerHour: plant.cratesPerWorkerHour,
    maxWorkers: plant.maxWorkers,
    shiftHours: plant.shiftHours,
    maxOvertimeHours: plant.maxOvertimeHours,
    startTime: plant.startTime,
    efficiencyFactor: plant.efficiencyFactor,
    volumeTolerancePercent: plant.volumeTolerancePercent,
  };
}

export function parameterChanges(
  values: PlantParameters,
  defaults: PlantParameters,
) {
  return (Object.keys(defaults) as (keyof PlantParameters)[])
    .filter((key) =>
      key === 'startTime'
        ? String(values[key]).slice(0, 5) !== String(defaults[key]).slice(0, 5)
        : Number(values[key]) !== Number(defaults[key]),
    )
    .map((key) => ({
      key,
      value: String(values[key]),
      defaultValue: String(defaults[key]),
    }));
}
