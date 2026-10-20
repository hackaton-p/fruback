# Modelo de datos conceptual y reglas de integridad

> Esquema objetivo conceptual, **NO migraciones listas para ejecutar**. Adaptar a DB real después de inspección. Nombres orientativos.

## Entidades maestras
- `tenants`, `plants`, `users`, `memberships`, `roles`, `permissions`, `role_assignments`.
- `crops`, `varieties(crop_id)`, `products`, `package_presentations`, `units`, `unit_conversions` (unidad origen/destino, factor, vigencia y contexto de producto si aplica), `quality_grades`.
- `areas`, `production_lines`, `line_capabilities` (variedad/presentación), `work_shifts`, `work_calendars`, `resource_pools`, `skills`, `resource_requirements`.
- `configuration_values` tipados con `scope_type/scope_id`, `key`, `value`, `effective_from/to`, `source`, `approved_by`, `version`; evitar JSON libre para datos que deban consultar, validar o relacionar.

## Entradas externas
- `commercial_programs` y `commercial_program_items` (cliente, producto, presentación, cantidad **con unidad**, fecha requerida).
- `harvest_forecasts` y `harvest_forecast_lines` (plant, campo/fundo/lote, variedad, ventana de llegada, cantidad y unidad, confianza, revisión/origen).
- `trips` (vehículo opcional, ETA), `receipts` y `receipt_lines` (lote, peso bruto/tara/neto, unidad, conteo, timestamp), `quality_inspections`, `quality_releases`.
- `inventory_positions`, `material_requirements` (a futuro; reflejar fuente externa y hora de corte).

## Núcleo: N planes en una semana
- `plans`: `id` PK, `tenant_id`, `plant_id`, `name`, `purpose`, `planning_start_at`, `planning_end_at`, `timezone`, `crop_id NULL`, `owner_id`, `lifecycle_state`, `created_at`, `archived_at`, `current_revision_id NULL`. **NO** `UNIQUE(plant_id,year,week)` ni `UNIQUE(week_start)`.
- `plan_revisions`: `id`, `plan_id`, `revision_no`, `base_revision_id NULL`, `assumption_snapshot`, `created_by`, `created_at`, `approval_state`, `approved_by/at`, `published_at`; `UNIQUE(plan_id, revision_no)`; referencias inmutables tras aprobación.
- `planning_scenarios`: `id`, `plan_revision_id` (o `plan_id` + `source_revision_id` según diseño), `name`, `scenario_type` (baseline/what-if/agent_proposed), `status`, `assumptions`, `created_by`; N escenarios por revisión.
- `scenario_runs`: `id`, `scenario_id`, `engine_version`, `config_version`, `input_hash`, `started_at`, `finished_at`, `status`, `infeasibility_reasons`, `output_snapshot`, métricas; cada ejecución reproducible.
- `plan_days` / `plan_slots`: `id`, `plan_revision_id`, intervalo inicio/fin, `crop_id`, `variety_id`, cantidad objetivo y unidad; varios slots por día y por plan.
- `line_allocations`: `id`, `plan_slot_id`, `line_id`, `shift_id`, inicio/fin, dotación directa, cantidad y unidad, estado.
- `area_allocations`: `id`, `plan_slot_id`, `area_id`, dotación, horas; soportar mínimos de apoyo y recursos compartidos.
- `resource_commitments`: reservations concretas de línea/personas/equipo por intervalos, referidas a **revisión publicada**. Evitar doble asignación cruzada entre planes con constraint/servicio transaccional; no bloquear que coexistan planes en borrador.
- `plan_links`: relación N:M planes ↔ programas comerciales, cosechas, lotes/recepciones, con cantidades de asignación si se divide un lote, manteniendo no sobreasignación de cantidades reales.

### Ejemplos válidos
- Plan A: 26–31/10, planta 1, variedad X, baseline; Plan B: **misma semana y planta**, variedad Y; Plan C: **misma semana y planta**, alternativa de Plan A. Los tres se crean sin conflicto en borrador.
- Plan D: ventana 28/10 17:00–29/10 05:00, intersecta dos fechas calendario; la semana es **atributo derivado para búsqueda**, no PK ni identidad.
- Publicar A y B solo si compromisos de recursos y materiales son compatibles. Ante conflicto, reportar qué línea/franja está ocupada y ofrecer resolver.

## Producción y trazabilidad
- `production_runs`, `production_run_lines`, `workdays`, `workday_events`, `downtime_events`, `grading_outcomes`, `waste_reasons`, `workday_closures` (cierre con actor, versión, timestamp e idempotency key).
- `source_systems`, `source_mappings`, `ingestion_batches`, `inbox_events`, `outbox_events`, `sync_errors`, `audit_log`, `alerts`, `notification_deliveries`, `agent_proposals`, `agent_approvals`.

## Relaciones e invariantes
1. Un plan pertenece a una planta, pero una planta tiene **infinitos planes conceptualmente** y cualquier cantidad por rango temporal.
2. `plan -> revisions (1:N) -> slots (1:N)`; no actualizar revisión aprobada en sitio.
3. Revisiones de planes diferentes pueden compartir semana, producto y hasta fuente de demanda; **duplicar entradas es posible para simular**, pero impedir doble consumo real al confirmar ejecución/publicar según política.
4. Datos operativos llevan `tenant_id`/`plant_id` o acceso verificado por clave foránea; imponer FK, checks de rangos, integridad de unidad/cantidad, unicidades que sí representan identidad.
5. Nunca deducir `plan_id` a partir de `(year, week)`; todas las rutas de edición/ejecución reciben `plan_id` explícito.
6. Conservar historia de unidades/conversiones, rendimientos, parámetros y evidencia usada para ejecutar un run.
7. Definir política de borrado: soft-delete solo donde ayude; no borrar ejecuciones/auditoría; referencias históricas inmutables.
8. Zona horaria local para presentación, `timestamptz` en almacenamiento; semanas ISO solo para filtro, declarando inicio configurable de semana si el negocio lo exige.

## Migración segura del singleton semanal heredado
- Detectar todas las claves únicas, consultas que usan `week/year` como identidad, endpoints que retornan objeto singular, referencias y UI que asumen un único registro.
- Introducir IDs de plan y revisión, tablas/columnas nuevas aditivas, backfill verificable, índices nuevos y lectura dual transitoria si aplica.
- Reescribir links y acciones para usar IDs; retirar unicidades de semana solo **después** de asegurar integridad y desplegar consumidores compatibles.
- Probar repetición de misma semana en **todas** las funciones CRUD, dashboard, ejecuciones, aprobación, exportación, cierre y reportes.
- Preparar backup, plan de rollback, pruebas de integridad y métricas de migración. Nunca mutar producción sin autorización.
