import { PlanCalculatorService } from './plan-calculator.service';
const parameters = {
  boxesPerWorkerHour: '5',
  maxWorkers: 300,
  shiftHours: '10',
  maxOvertimeHours: '2',
  startTime: '17:00',
  efficiencyFactor: '0.8',
  volumeTolerancePercent: '5',
};
describe('PlanCalculatorService', () => {
  const service = new PlanCalculatorService();
  it('calcula el ejemplo de Piura', () => {
    const result = service.calculateDay(11180, parameters);
    expect(result.workers).toBe(280);
    expect(result.hours).toBeCloseTo(9.9821, 4);
    expect(result.dayStatus).toBe('DENTRO_JORNADA');
  });
  it('limita trabajadores y extiende horas para +20%', () => {
    const result = service.calculateDay(11180 * 1.2, parameters);
    expect(result.workers).toBe(300);
    expect(result.hours).toBeCloseTo(11.18);
    expect(result.dayStatus).toBe('HORAS_EXTRA');
  });
  it('conserva el riesgo de turno extra aunque el margen sea bajo', () => {
    expect(service.calculateDay(20000, parameters)).toMatchObject({
      dayStatus: 'RIESGO_TURNO_EXTRA',
      hasLowMargin: true,
    });
  });
  it('permite días sin cosecha sin dividir entre cero', () => {
    expect(service.calculateDay(0, parameters)).toMatchObject({
      workers: 0,
      hours: 0,
      margin: null,
    });
  });
  it('rechaza configuraciones y cantidades inválidas', () => {
    expect(() => service.calculateDay(-1, parameters)).toThrow();
    expect(() =>
      service.calculateDay(1, { ...parameters, efficiencyFactor: '0' }),
    ).toThrow();
  });
  it('reparte todo el personal sin perder personas por redondeo', () => {
    for (const total of [0, 1, 10, 280, 300, 1200]) {
      const counts = Object.values(service.allocateWorkers(total));
      expect(counts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(counts.every((n) => n >= 0)).toBe(true);
    }
  });
});
