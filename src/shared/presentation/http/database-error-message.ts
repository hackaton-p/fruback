const constraints: Record<string, string> = {
  ck_planta_0:
    'Revisa rendimiento (> 0), personal máximo (mínimo 1), jornada (1 a 24 horas), eficiencia (0.1 a 1) y tolerancia (0 a 100).',
  ck_plan_0: 'Revisa el año y la semana seleccionados (semana 1 a 53).',
  ck_plan_1: 'Selecciona un escenario de cosecha válido.',
  ck_plan_3: 'Escribe un comentario antes de rechazar el plan.',
  ck_plan_dia_0:
    'La meta, el personal y las horas calculadas no pueden ser negativos. Revisa los parámetros de planificación.',
  ck_plan_dia_1: 'Indica horas no negativas y el motivo del ajuste.',
  ck_proyeccion_1: 'Las jabas de la proyección deben ser cero o mayores.',
  ck_proyeccion_2:
    'Revisa la fecha de cosecha (debe pertenecer a la semana seleccionada) o el cliente del programa comercial.',
  ck_jornada_0:
    'El personal y las jabas recibidas y procesadas no pueden ser negativos.',
  ck_jornada_1: 'Las horas trabajadas no pueden ser negativas.',
  ck_jornada_2: 'Las jabas descartadas no pueden ser negativas.',
  ck_jornada_3: 'Los kilos loose no pueden ser negativos.',
  ck_jornada_4: 'Los kilos fijos no pueden ser negativos.',
  ck_jornada_5:
    'Revisa el cierre: no puede ser anterior al inicio y requiere horas, descarte y kilos registrados.',
  ck_progress_type:
    'Revisa el registro: el avance requiere jabas recibidas y procesadas, el cambio de personal requiere un área y el volumen requiere jabas esperadas.',
};
const columns: Record<string, string> = {
  horas: 'Horas calculadas',
  trabajadores: 'Personal',
  jabas: 'Jabas',
  jabasMeta: 'Meta diaria',
  fecha: 'Fecha',
  fechaInicio: 'Fecha de inicio',
  fechaCierre: 'Fecha de cierre',
  horasTrabajadas: 'Horas trabajadas',
  plantaId: 'Planta',
  frutaId: 'Fruta',
  clienteId: 'Cliente',
};

export function databaseErrorMessage(
  code: string,
  constraint?: string,
  column?: string,
): string {
  if (constraint && constraints[constraint]) return constraints[constraint];
  const field = column ? columns[column] : undefined;
  const prefix = field ? `${field}: ` : '';
  if (code === '23502')
    return `${prefix}falta un dato obligatorio. Completa los campos requeridos.`;
  if (code === '22003')
    return `${prefix}un valor o resultado calculado supera el límite permitido. Reduce las cantidades y revisa rendimiento, eficiencia y personal.`;
  if (code === '22007' || code === '22008')
    return `${prefix}la fecha u hora no es válida. Revisa el día y usa una hora entre 00:00 y 23:59.`;
  if (code === '22P02')
    return `${prefix}revisa el formato del número o identificador seleccionado.`;
  return 'Los valores no cumplen una regla de registro. Revisa cantidades no negativas, fechas y campos obligatorios.';
}
