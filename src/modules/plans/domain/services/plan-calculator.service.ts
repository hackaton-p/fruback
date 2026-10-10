import type { PlantParameters } from '../../../plants/domain/plant-parameters';

export class PlanCalculatorService {
  calculateDay(targetBoxes: number, parameters: PlantParameters) {
    const productivity = Number(parameters.boxesPerWorkerHour);
    const efficiency = Number(parameters.efficiencyFactor);
    const workday = Number(parameters.shiftHours);
    const extra = Number(parameters.maxOvertimeHours);
    const tolerance = Number(parameters.volumeTolerancePercent);
    const maximum = parameters.maxWorkers;
    if (
      ![
        targetBoxes,
        productivity,
        efficiency,
        workday,
        extra,
        tolerance,
        maximum,
      ].every(Number.isFinite) ||
      targetBoxes < 0 ||
      productivity <= 0 ||
      efficiency < 0.1 ||
      efficiency > 1 ||
      workday < 1 ||
      workday > 24 ||
      extra < 0 ||
      tolerance < 0 ||
      tolerance > 100 ||
      !Number.isInteger(maximum) ||
      maximum < 1
    )
      throw new Error('Parámetros de planificación inválidos');

    const workers = Math.min(
      Math.ceil(targetBoxes / (productivity * efficiency * workday)),
      maximum,
    );
    const hours =
      targetBoxes === 0
        ? 0
        : targetBoxes / (workers * productivity * efficiency);
    // With no target, the relative margin is undefined; avoid NaN/Infinity in JSON.
    const margin =
      targetBoxes === 0
        ? null
        : (workers * productivity * efficiency * (workday + extra)) /
            targetBoxes -
          1;
    const dayStatus =
      hours > workday + extra
        ? 'RIESGO_TURNO_EXTRA'
        : hours > workday
          ? 'HORAS_EXTRA'
          : 'DENTRO_JORNADA';
    return {
      workers,
      hours,
      margin,
      dayStatus,
      hasLowMargin: margin !== null && margin < tolerance / 100,
    };
  }

  allocateWorkers(total: number) {
    if (!Number.isSafeInteger(total) || total < 0)
      throw new Error('Personal inválido');
    const warehouse = Math.round(total * 0.039);
    const traceability = Math.round(total * 0.025);
    const maintenance = Math.round(total * 0.021);
    const sanitation = Math.round(total * 0.045);
    return {
      warehouse,
      traceability,
      maintenance,
      sanitation,
      packing: total - warehouse - traceability - maintenance - sanitation,
    };
  }
}
