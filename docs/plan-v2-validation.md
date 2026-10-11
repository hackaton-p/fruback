# Validación del plan v2

Referencias: `contexto-plan-packing-v2.md` y las cinco pantallas contenidas en `claude-design-front/2 - Plan de Packing · Pantallas.html`. Se revisaron las vistas, formularios y cálculos incluidos en el HTML exportado. Este repositorio implementa el backend; el HTML permanece como referencia, sin modificarlo.

## Diferencias aplicadas

| Área | Antes | V2 implementado |
|---|---|---|
| Fruta | Cajas de 8.2 kg, importación de toneladas | Solo jabas; propiedades en inglés `crates`, sin `unit` ni conversiones |
| Defaults | Piura 5.0, Sullana 5.9 | Piura 5.9, Sullana 3.9 jabas/persona-hora; solo se actualizan los defaults originales |
| Parámetros | `overrides` parciales opcionales; indicador por presencia de campos | `parameters` completos obligatorios; `hasModifiedParameters` compara valores reales al aplicar |
| Revisión del plan | Snapshot sin comparación explícita | `plantDefaults`, `parameterChanges`, planta y rango de fechas en el detalle |
| Lista de planes | Lista paginada por estado | `statusCounts` por todos los estados, respetando los demás filtros y antes de paginar |
| Inicio | Un número de presentes por área | Llegaron, iniciaron y presentes; iniciar no puede superar llegaron; estimación inicial persistida |
| Vista previa | Sin endpoint | `GET /api/workdays/estimate?planDayId=&workers=` sin escrituras |
| Jornada | Acumulados y reemplazo completo de asistencia | `POST /api/workdays/:id/records`, con AVANCE, PERSONAL o VOLUMEN |
| Productividad | Menor entre promedio global y capacidad nominal | Jabas del último avance / horas-persona acumuladas hasta ese avance, integrando cambios de personal |
| Historial | Sin estimado histórico | Cada evento guarda presentes y horas estimadas; mismo timestamp permitido, orden estable por ID |
| Volumen | Meta o cantidad recibida | Volumen esperado editable; meta aprobada permanece fija |
| Dashboard | KPIs parciales, meta semanal como denominador | KPIs sobre días cerrados, meta semanal separada, horas extra, jabas/trabajador, referencias, semáforos, hallazgos y pendientes |

## Contratos que cambian

- `boxes*` / `*Boxes` pasan a `crates*` / `*Crates` en entradas y respuestas.
- `hasParameterOverrides` pasa a `hasModifiedParameters`.
- Aplicar y simular requieren todos los valores de `parameters`; se rechaza el antiguo `overrides`.
- Importación rechaza `unit`; Excel conserva la columna `quantity`, ahora exclusivamente en jabas.
- Abrir requiere `attendance: [{ areaId, arrivedWorkers, startingWorkers }]`.
- `/api/workdays/:id/progress` se sustituye por `/api/workdays/:id/records`. Solo acepta los campos correspondientes a `type`.
- En cierre, `receivedCrates` es opcional para que el formulario v2 funcione; si falta, se conserva lo recibido y se eleva como mínimo a lo procesado.

La guía y OpenAPI describen los contratos completos. Las rutas e identificadores siguen en inglés por convención del repositorio.

## Decisiones ante diferencias entre documento y prototipo

- Se conserva Better Auth con sesiones, según la instrucción explícita del proyecto; la mención a JWT no constituye un cambio del v2 respecto de v1.
- Se conserva un plan por planta, fruta y semana ISO (incluido año), como indica el modelo detallado, aunque el resumen abrevia a planta/semana.
- En ejecución se usa la producción realmente registrada. El prototipo extrapola producción entre eventos; el documento v2 define pendiente como volumen esperado menos jabas registradas.
- AVANCE alerta por exceso positivo sobre tolerancia, según la tabla del v2. El prototipo usa desvío absoluto y limita recepción esperada a la meta: esa lógica no reemplaza la fórmula explícita del documento. VOLUMEN alerta por cambios del total esperado en ambas direcciones, como muestra la pantalla.
- Una estimación imposible por cero personal/productividad es `null`, nunca Infinity ni una duración ficticia.
- Los indicadores de dashboard usan los umbrales del prototipo (cumplimiento 98/93%, personal 90/105%, descarte 9%). El descarte semanal es ponderado por producción. Las referencias de jornada/rendimiento son los defaults actuales; el cálculo del plan conserva su snapshot.
- No se implementan ocupabilidad, posiciones, producción por cliente, traspaso al día siguiente ni reapertura de jornadas: quedan fuera del MVP detallado.

## Migración

`PackingV21791679847749` renombra columnas, agrega asistencia inicial y eventos tipados, permite varios eventos en la misma hora y agrega restricciones de integridad. Las migraciones anteriores permanecen intactas.

No existe equivalencia definida entre cajas y jabas. Por eso la migración verifica, antes de modificar el esquema, que no existan proyecciones ni planes operativos. Si existen, falla y la transacción conserva los datos. La reversión también se bloquea cuando ya hay datos operativos v2.

Para instalaciones con datos v1: conservar una copia íntegra de la base anterior, provisionar una base v2 y volver a cargar proyecciones expresadas en jabas desde su fuente. La migración no borra ni convierte datos automáticamente. Los parámetros personalizados se conservan; el responsable debe verificar su unidad y valor oficial.

## Validación

Las pruebas cubren fórmulas v2, diferencias de parámetros, aislamiento por planta, importación sin conversiones, asistencia inicial, eventos simultáneos, acumulados, variación de personal, productividad por horas-persona, volumen esperado, estimados históricos, aprobación, cierre y dashboard. Se verifica además que las migraciones no dejen diferencias respecto de las entidades TypeORM.

Resultado: build y lint correctos; 19 pruebas unitarias, 7 de integración/esquema y 12 HTTP aprobadas. Aplicación, reversión y reaplicación de la migración verificadas sobre PostgreSQL 17 temporal, sin diferencias de esquema. OpenAPI regenerado.
