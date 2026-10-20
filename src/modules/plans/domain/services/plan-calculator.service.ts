import { DomainError, ensure } from '../../../../shared/domain/domain-error';
import type { PlantParameters } from '../../../plants/domain/plant-parameters';

export class PlanCalculatorService {
  calculateDay(targetCrates: number, parameters: PlantParameters) {
    const productivity = Number(parameters.cratesPerWorkerHour);
    const efficiency = Number(parameters.efficiencyFactor);
    const workday = Number(parameters.shiftHours);
    const extra = Number(parameters.maxOvertimeHours);
    const tolerance = Number(parameters.volumeTolerancePercent);
    const maximum = parameters.maxWorkers;
    if (
      ![
        targetCrates,
        productivity,
        efficiency,
        workday,
        extra,
        tolerance,
        maximum,
      ].every(Number.isFinite) ||
      targetCrates < 0 ||
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
      throw new DomainError(
        400,
        'Revisa la meta (no negativa), el rendimiento (mayor a 0), la eficiencia (0.1 a 1), las horas de jornada (1 a 24) y el personal máximo (entero positivo).',
      );
    ensure(
      targetCrates < 1e10,
      'La meta diaria supera el límite de jabas. Reduce el volumen antes de calcular.',
    );

    const workers = Math.min(
      Math.ceil(targetCrates / (productivity * efficiency * workday)),
      maximum,
    );
    const hours =
      targetCrates === 0
        ? 0
        : targetCrates / (workers * productivity * efficiency);
    ensure(
      Number.isFinite(hours) && hours < 1e10,
      'Las horas calculadas superan el límite permitido. Revisa el rendimiento y la eficiencia; aumenta el personal o reduce la meta diaria.',
    );
    // With no target, the relative margin is undefined; avoid NaN/Infinity in JSON.
    const margin =
      targetCrates === 0
        ? null
        : (workers * productivity * efficiency * (workday + extra)) /
            targetCrates -
          1;
    const dayStatus =
      hours > workday + extra
        ? 'RIESGO_TURNO_EXTRA'
        : hours > workday
          ? 'HORAS_EXTRA'
          : margin !== null && margin < tolerance / 100
            ? 'MARGEN_BAJO'
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
