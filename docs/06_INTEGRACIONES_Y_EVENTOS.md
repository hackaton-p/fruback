# Integraciones ERP, Excel, eventos y notificaciones

## Estrategia
ERP (potencialmente Nisira) no se reemplaza. Conectores adaptan contratos disponibles según permisos/licencias/versión **verificados**; no asumir endpoints ni acceso a bases externas. Primero Excel/CSV validados y mocks reproducibles; después adaptador ERP real. La base intermedia normaliza, versiona e identifica procedencia sin sobrescribir transacciones externas.

## Adaptadores y contratos
- `CommercialProgramAdapter`: lee demanda y presentaciones.
- `HarvestForecastAdapter`: lee programas de cosecha y sus revisiones.
- `ReceivingAdapter`: camiones, pesos, lotes, inspección.
- `ProductionAdapter`: actividad, cantidades y cierres.
- `WorkforceAdapter`: dotación y horas disponibles (si autorizado).
- `InventoryAdapter`: insumos/frío y disponibilidad (si existe).
Cada adaptador implementa `fetchChanges(cursor)`, `normalize`, `validate`, `upsertIdempotently`, `reconcile`; capacidades concretas dependen de fuente. Preferir APIs oficiales; integración SQL read-only solo si está autorizada y documentada.

## Datos y calidad
Incluir `source_system`, `external_id`, `source_updated_at`, `ingested_at`, `batch_id`, `data_quality_status`, `simulation_flag`. Deduplicación por `(source_system, entity_type, external_id, source_revision)` cuando esté disponible. Reconciliación diaria, métricas de atraso y alertas de cambios tardíos. No tomar campos faltantes como cero.

## Excel
Plantillas versionadas para programa comercial, cosecha y recepciones. Muestra previa, detección de hojas/columnas, tipos, unidades, duplicados, errores por fila y vista de cambios antes de confirmar. Importación atómica por lote o parcial explícita; trazabilidad de usuario y archivo; descargar reporte de errores.

## Eventos de dominio sugeridos
`commercial.program.updated`, `harvest.forecast.updated`, `truck.eta.updated`, `receiving.lot.arrived`, `quality.lot.released`, `planning.scenario.completed`, `planning.revision.approved`, `planning.plan.published`, `capacity.shortfall.detected`, `production.run.updated`, `workday.closed`, `source.sync.failed`.
Esquema versionado, id de evento, idempotency key, tenant/planta, UTC timestamp, correlation ID y payload mínimo; evitar transportar PII innecesaria. At-least-once con deduplicación.

## Alertas
Condiciones configurables: capacidad < volumen proyectado; llegada real menor/mayor; retraso de camión; rendimientos bajos; insuficiencia de insumos; exceso de horas; plan sin aprobador; integración desactualizada. Umbral, frecuencia, severidad, periodo y excepciones configurables por planta.
Canales: dentro de app, push web/móvil, email y WhatsApp Business mediante proveedor autorizado; MQTT/webhook hacia dispositivo externo solo con seguridad, autenticación y lista permitida. Anti-spam: deduplicación, histéresis, quiet hours, escalamiento y acuse. Registrar entregas y fallos; no enviar información sensible indiscriminadamente.

## Seguridad
Tokens cifrados y rotados; permisos de lectura/escritura mínimos; validación de firmas webhook; logs con datos sensibles redactados; límites de velocidad; circuit breakers; backoff exponencial y cola DLQ. Nunca habilitar writes ERP por defecto.
