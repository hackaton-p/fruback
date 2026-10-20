import type { ValidationError } from 'class-validator';

const labels: Record<string, string> = {
  parameters: 'Parámetros',
  cratesPerWorkerHour: 'Rendimiento por persona',
  maxWorkers: 'Personal máximo',
  shiftHours: 'Horas de jornada',
  maxOvertimeHours: 'Horas extra',
  efficiencyFactor: 'Eficiencia',
  volumeTolerancePercent: 'Tolerancia',
  startTime: 'Hora de inicio',
  plantId: 'Planta',
  fruitId: 'Fruta',
  year: 'Año',
  week: 'Semana',
  selectedDates: 'Días seleccionados',
  startDate: 'Fecha de inicio',
  dayCount: 'Cantidad de días',
  workedHours: 'Horas trabajadas',
  processedCrates: 'Jabas procesadas',
  receivedCrates: 'Jabas recibidas',
  discardedCrates: 'Jabas descartadas',
  looseKg: 'Kilos loose',
  fixedKg: 'Kilos fijos',
  quantity: 'Cantidad',
  date: 'Fecha',
  name: 'Nombre',
  email: 'Correo',
};

function reason(rule: string, original: string): string {
  const bound = original.match(/(?:less|greater) than ([-\d.]+)/)?.[1];
  if (rule === 'min' && bound) return `debe ser mayor o igual a ${bound}`;
  if (rule === 'max' && bound) return `debe ser menor o igual a ${bound}`;
  const reasons: Record<string, string> = {
    isDefined: 'es obligatorio',
    isNotEmpty: 'es obligatorio',
    isInt: 'debe ser un número entero',
    isNumber: 'debe ser un número válido con hasta 4 decimales',
    isString: 'debe ser texto',
    isEmail: 'debe ser un correo válido',
    isEnum: 'selecciona una opción válida',
    isBoolean: 'debe ser verdadero o falso',
    isArray: 'debe ser una lista',
    arrayMinSize: 'agrega los elementos requeridos',
    arrayMaxSize: 'reduce la cantidad de elementos',
    isIso8601: 'usa una fecha válida en formato ISO',
    matches: 'revisa el formato; para horas usa HH:mm',
    minLength: 'el texto es demasiado corto',
    maxLength: 'el texto es demasiado largo',
    whitelistValidation: 'este campo no está permitido',
    nestedValidation: 'completa los campos requeridos',
    notEquals: 'este valor no está permitido',
  };
  return reasons[rule] ?? 'revisa el valor y formato de este campo';
}

export function validationMessages(
  errors: ValidationError[],
  parent = '',
): string[] {
  return errors.flatMap((error) => {
    const label = labels[error.property] ?? error.property;
    const path = parent ? `${parent} / ${label}` : label;
    return [
      ...Object.entries(error.constraints ?? {}).map(
        ([rule, message]) => `${path}: ${reason(rule, message)}.`,
      ),
      ...validationMessages(error.children ?? [], path),
    ];
  });
}
