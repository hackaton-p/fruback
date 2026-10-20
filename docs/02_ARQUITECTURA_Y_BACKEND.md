# Arquitectura y backend escalables

## Base actual que se conserva

`fru-front/` usa Next.js 16 y React 19; `fruback/` usa NestJS 11, TypeORM y Better Auth sobre PostgreSQL 17. La API mantiene su monolito modular y las capas `domain`, `application`, `infrastructure` y `presentation/http`. Los IDs actuales son numéricos; no migrarlos a UUID/ULID sin una necesidad y estrategia de compatibilidad explícitas.

El frontend mantiene las rutas por rol, la marca Pura Fruit, `app/theme.css`, `components/layout/brand-logo.tsx` y las fuentes existentes. Los contratos HTTP, acciones de servidor y estados visuales deben evolucionar junto con la API. El backend es la autoridad de permisos, cálculos y transiciones; la validación visual permite corregir errores antes de enviar.

`fruback/compose.yaml` coordina API, migraciones y PostgreSQL. El frontend corre localmente con `pnpm dev` y usa por defecto `API_URL=http://localhost:3000`, `APP_URL=http://localhost:3001` y `API_MOCK=false`. Los orígenes de autenticación deben coincidir con los del [README del backend](../README.md); el [README del frontend](../../fru-front/README.md) explica el arranque local. No se necesita configuración en la raíz. `localhost` dentro de un contenedor identifica ese contenedor; la API usa `db:5432` internamente.

### Contrato del primer incremento

`POST /api/plans` crea una nueva identidad; `PATCH /api/plans/{id}` modifica solo ese borrador o rechazado. Año y semana son filtros. La creación admite de 2 a 6 fechas únicas de lunes a sábado en una semana futura; `startDate` es la menor fecha seleccionada. El período de un plan existente permanece fijo.

La aprobación verifica bajo transacción el solapamiento de fechas en la misma planta. En este modelo la reserva es de planta completa por día; dos planes con fechas distintas pueden aprobarse en la misma semana. Borradores pueden compartir fechas. Las líneas, turnos y reservas parciales pertenecen a una fase posterior. Los planes aprobados no se sobrescriben; las revisiones formales aún son objetivo futuro.

## Arquitectura objetivo posterior

Las secciones siguientes son diseño de evolución, no un inventario de componentes implementados. Mantener el monolito modular; separar el motor de optimización solo si escala o dependencias lo justifican. Redis y OR-Tools requieren una necesidad comprobada antes de añadirse.

## Contextos delimitados
1. Identity & Access: tenants, plantas, usuarios, roles/permisos por recurso.
2. Master Data: cultivos, variedades, presentaciones, unidades, conversiones, áreas, líneas, calendarios, equipos, parámetros versionados.
3. Demand: programas comerciales, órdenes/clientes, restricciones, cantidades objetivo.
4. Supply: programa de cosecha, ventanas, campos/lotes y revisiones.
5. Receiving & Quality: viajes, recepciones, pesos, inspecciones, liberaciones.
6. Planning: planes, revisiones, escenarios, horizonte, asignaciones, aprobación/publicación.
7. Capacity & Optimization: cálculos puros, restricciones, factibilidad, solver, explicación de decisiones.
8. Execution: jornadas, producción por lotes/líneas, paradas, pérdidas, cierre idempotente.
9. Analytics & Alerts: métricas, snapshots, reglas y canales.
10. Integration: conectores ERP/Excel, inbox/outbox, reconciliación y mapeos.
11. Agent Orchestration: sugerencias reproducibles, herramientas limitadas, aprobaciones.

## Capas dentro de cada módulo
- `domain`: entidades, invariantes, políticas, servicios puros.
- `application`: casos de uso, transacciones, comandos, consultas, idempotencia.
- `infrastructure`: repositorios, mappers, colas, adaptadores, DB, mensajería.
- `interfaces`: HTTP/GraphQL si existe, contratos versionados, validación, autorización, esquemas.
No meter cálculos críticos en React, controladores, procedimientos opacos ni prompts de IA. Extraer servicios testeables; evitar acoplamientos cíclicos y tablas comodín polimórficas sin invariantes.

## API y consistencia
- API por recursos (`/plans`, `/plans/{id}/revisions`, `/scenarios`, `/runs`, `/assignments`, `/receipts`, `/workdays`). IDs estables; conservar IDs numéricos actuales y evaluar UUID/ULID solo según compatibilidad.
- DTOs tipados + contratos OpenAPI; cantidades con unidad, dinero decimal, fechas ISO 8601 y zona horaria de planta (`America/Lima` por defecto configurable).
- **Concurrencia:** `revision_number` o `row_version` y `If-Match`; rechazar escrituras obsoletas con `409/412`. Transacciones y locks específicos en publicación/asignación de recursos.
- **Idempotencia:** claves en importaciones, cierre de jornada, aprobación y publicación; reintentos seguros.
- No usar caché como fuente de verdad ni depender de eventos para invariantes síncronas.
- Eventos de dominio y patrón outbox para notificaciones e integraciones. Inbox deduplica eventos entrantes. Jobs reintentables con dead-letter, monitoreo y reconciliación.
- Lecturas: paginación por cursor, filtros por planta/ventana/estado/variedad, índices multicolumna revisados con `EXPLAIN`; proyecciones/materializaciones solo si métricas las justifican.

## Tenancy y autorización
`tenant_id` y `plant_id` en recursos operativos (salvo recursos globales); filtros siempre aplicados por servidor; no confiar en IDs suministrados por cliente. RBAC + permisos a nivel planta/recurso/acción, y ABAC para alcance de datos cuando sea necesario. Separación de tareas: quien propone no necesariamente aprueba. Registro de auditoría de cambios en parámetros de negocio.

## Confiabilidad y observabilidad
Logs estructurados con `correlation_id`, `plan_id`, `scenario_id`, `run_id`, `plant_id` y actor; métricas de sincronización, runs, latencias, colas y fallos; tracing distribuido si hay servicios. Backups probados y rollback de migraciones. Feature flags para reemplazar módulos gradualmente; compatibilidad de contratos.

## ADRs mínimos
Documentar: mantener/refactorizar stack; modelo multitenant; identidad de plan vs semana; unidades/conversiones; versión de parámetros y reglas; alcance de transacciones; publicación y conflictos; solver; estrategia de integración y permisos de agentes.
