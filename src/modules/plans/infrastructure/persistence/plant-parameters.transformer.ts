import type { PlantParameters } from '../../../plants/domain/plant-parameters';

const snapshotKeys = {
  boxesPerWorkerHour: 'rendimientoPersonaHora',
  maxWorkers: 'personalMaximo',
  shiftHours: 'horasJornada',
  maxOvertimeHours: 'horasExtraMax',
  startTime: 'horaInicio',
  efficiencyFactor: 'factorEficiencia',
  volumeTolerancePercent: 'toleranciaVolumen',
} satisfies Record<keyof PlantParameters, string>;

// Preserve the keys of existing plan snapshots at the persistence boundary.
export const plantParametersTransformer = {
  to(parameters: PlantParameters): Record<string, string | number> {
    return Object.fromEntries(
      Object.entries(snapshotKeys).map(([property, key]) => [
        key,
        parameters[property as keyof PlantParameters],
      ]),
    );
  },
  from(snapshot: Record<string, string | number>): PlantParameters {
    return Object.fromEntries(
      Object.entries(snapshotKeys).map(([property, key]) => [
        property,
        snapshot[key],
      ]),
    ) as unknown as PlantParameters;
  },
};
