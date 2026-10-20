# Motor determinista de capacidad y simulación

## Contrato
Entrada tipada y versionada: demanda, suministro, calendarios, disponibilidad, rendimientos, capacidades de líneas, restricciones de calidad/frío/materiales, reglas de turnos, política de inicio, objetivo de optimización. Salida: factibilidad, asignación de recursos, intervalo calculado, pendientes, costos si conocidos, alertas, explicaciones, supuestos, `run_id`, versión del motor y hash de inputs. Nunca mezclar outputs simulados con ejecución real.

## Unidades y rendimientos
Representar cada cantidad como `{value, unit, crop/variety?, gross_or_net?, context?}`. Diferenciar jabas recibidas, peso neto, jabas procesadas, kg exportables, cajas y unidades de empaque. Conversiones contextuales/versionadas; jaba no equivale a caja exportable por defecto.
- Productividad **directa** = jabas procesadas / suma de horas efectivas de personal directamente productivo.
- Productividad **global** = jabas procesadas / suma de horas efectivas de todo personal incluido explícitamente en definición del coeficiente.
- No mezclar denominadores; adjuntar metadata de medición: cultivo, variedad, tipo de presentación, línea, condición y periodo.
- Rendimiento exportable = kg clasificados exportables / kg netos ingresados al proceso (solo si la empresa define ese denominador). Clasificar merma, descarte, segunda categoría y reproceso por separado.

## Estimación inicial (antes del solver)
```
Horas-persona = jabas_objetivo / productividad_directa_jabas_persona_h
Operarios_directos = ceil(Horas-persona / horas_productivas_por_operario)
Capacidad_linea = min(capacidad_física_línea, operarios_directos * productividad_directa * horas_productivas)
Kg_exportables_estimados = kg_neto_procesables * tasa_exportable_configurada
```
Las fórmulas simplificadas no sustituyen restricciones de áreas de apoyo ni disponibilidad de materiales/frío; si faltan datos, devolver `estimated` y advertencias, no `feasible` definitivo.

## Restricciones duras
- Disponibilidad real de líneas, turnos, equipos, personal calificado, mínimos por área y compatibilidad de variedad/presentación.
- Recursos no doble-comprometidos en planes publicados durante ventanas superpuestas.
- Materiales, capacidad de recepción y frío; límites temporales de liberación de Calidad, tránsito, preparación, limpieza y paradas programadas.
- Disponibilidad de lote/cantidad; no consumir más kg netos de los efectivamente liberados para un plan de ejecución.
- Jornadas y descansos deben respetar normativa aplicable y acuerdos configurados/validados por RRHH.

## Restricciones blandas / objetivos ponderables
- Minimizar horas extra, costo y cambios de línea.
- Minimizar fruta en espera y penalidad de incumplimiento comercial.
- Maximizar utilización o robustez ante variaciones de cosecha.
- Equilibrar dotación; priorizar pedidos por vencimiento y criticidad, con pesos auditables.
Nunca esconder objetivos en prompts; entregar lista explícita, pesos, decisión y explicación.

## Modos de operación
1. **Estimación rápida** basada en fórmulas y supuestos (UI instantánea).
2. **Validación de factibilidad** con restricciones reales.
3. **Simulación what-if**: variar llegadas, personal, variedades, horarios, descarte, eficiencia, líneas y políticas.
4. **Optimización** con OR-Tools u otro solver evaluado; retornar `optimal`, `feasible`, `infeasible`, `timeout`, con brecha cuando corresponda.
5. **Replanificación** por cambio de recepción; crea nueva revisión, preserva plan anterior y compromisos.

## Reglas temporales
Tres políticas: `AFTER_RECEPTION_CUTOFF`, `AFTER_LOT_QA_RELEASE`, `CONTINUOUS_AVAILABLE_LOTS`. El caso de ejemplo cierra recepción a las 17:00; no convertirlo en constante universal. Permitir producción cruzando medianoche, multi-turnos y múltiples sesiones por día.

## Política de errores
- Unidades incompatibles → error de validación explicable.
- Productividad ausente → usar fallback configurado señalizado como estimación; nunca asumir 5.9 silenciosamente.
- Capacidad insuficiente → plan **inviable** con faltantes y opciones, no un resultado `ok`.
- Datos externos desactualizados → marcar timestamp y degradar nivel de confianza.
- Sin convergencia o timeout → retornar mejor solución factible solo si cumple restricciones duras; de lo contrario no publicar.

## Pruebas críticas y de propiedades
- Monotonía controlada: al aumentar recursos útiles sin otras restricciones, capacidad máxima no disminuye.
- Si cantidad 0, horas 0; rendimientos <=0 inválidos.
- Consistencia de conversión reversible solo cuando aplica; redondeos explícitos.
- Dos planes misma semana independientes; varias revisiones/escenarios; turnos cruzan día/semana; cortes a las 17:00 configurables.
- La capacidad agregada no excede restricción de cuello de botella; asignaciones publicadas no se superponen indebidamente.
- Snapshot reproducible: mismas entradas/versiones/parámetros -> misma salida determinista (o reproducibilidad controlada por seed/solver).
- Escenarios jamás generan movimientos reales ni alteran inventario/producción.

## Validación con datos
Calibrar jabas/persona-hora desde horas realmente productivas; comparar predicción vs realidad por variedad, presentación, línea y semana; medir MAE/MAPE cuando aplicable, sin confundir causalidad. Mostrar intervalos de incertidumbre con series suficientes.
