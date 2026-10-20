# Implementación incremental, pruebas y definición de hecho

Consultar el [registro del incremento](implementation-log.md) para cambios implementados, evidencia disponible y límites de reversión.

## Primer incremento autorizado: frontend, backend y entorno

El trabajo continúa sobre los dos repositorios existentes. Mantener Pura Fruit y los colores actuales. La exploración inicial ya identificó el reemplazo implícito de borradores y la restricción semanal de aprobación; la implementación debe corregirlos conjuntamente con los mocks y la UI. Usar la skill/ruta de trabajo autorizada en `AGENTS.md`; no generar artefactos SDD ni solicitar una nueva aprobación general para cambios ya autorizados.

Criterios de aceptación del incremento (pendientes de evidencia hasta ejecutar las comprobaciones):

- Crear A y B en la misma planta, fechas y semana devuelve IDs distintos; editar A por ID no modifica B.
- Seleccionar de 2 a 6 días de lunes a sábado de una semana futura, incluidos períodos que no empiezan lunes; rechazar fechas duplicadas, domingos y períodos inválidos en API y UI.
- Aprobar A impide aprobar B si comparten una fecha de planta; aprobar planes con fechas distintas de la misma semana está permitido. Conservar el historial de planes cerrados.
- Cerrar una jornada con valores válidos por fruta persiste el desglose; errores de suma, negativos o valores inferiores al último avance tienen mensajes accionables.
- Levantar el backend mediante Compose desde `fruback/` y el frontend con `pnpm dev` desde `fru-front/`; verificar salud de API e interfaz y validar con `API_MOCK=false`. Los tests con mocks no acreditan persistencia real.

Ejecutar pruebas unitarias relevantes, compilaciones y el flujo HTTP contra una base migrada aislada cuyo `DB_NAME` termine en `_test`. `test/mvp.integration.cjs` requiere `BETTER_AUTH_URL` para el origen y crea sus propios usuarios/datos. Registrar comandos, resultados y límites reales; no presentar esta lista como pruebas ejecutadas.

## Descubrimiento y mantenimiento de evidencia
- Leer estructura real del proyecto, documentación, `.env.example` (no secretos), migraciones, schema, controllers, services, frontend, jobs, tests, CI/CD, Docker.
- Enumerar entidades y relaciones actuales, especialmente el supuesto `UNIQUE` de semana, `findByWeek`, `firstOrCreate`, `upsert(year,week)` y rutas que editan por semana.
- Reproducir en entorno de prueba el bug al crear 2 planes en misma semana y el mensaje `invalid data` al cerrar jornada. Documentar payload, response, logs, constraint y prueba regresiva; no concluir causa sin evidencia.
- Generar arquitectura actual, mapa de dependencias y plan con cambios mínimos seguros.
- Entregar propuesta de arquitectura, UX y migraciones; solicitar aprobación antes de modificar componentes irreversibles.

## Secuencia sugerida
**Fase 1a (incremento actual):** multiplicidad de borradores, edición explícita por ID, conflictos de planta/fecha al aprobar, migración compatible, listado/selección existentes, cierre de jornada y entorno integrado.
**Fase 1b (posterior):** revisiones formales, escenarios persistidos aislados y controles de concurrencia optimista; no afirmar que la fase 1a ya los implementa.
**Fase 2:** configuración multi-planta/cultivo/variedad/línea/unidades, políticas de inicio y roles; permisos servidores y auditoría.
**Fase 3:** sistema visual refinado, dashboard operativo animado con estados, importación Excel, trazabilidad de jabas día/semana.
**Fase 4:** motor deterministic, pruebas de referencia, capacidad por línea/área, escenarios aislados, comparación y aprobación.
**Fase 5:** integraciones reales, eventos, alertas externas y datos reconciliados.
**Fase 6:** solver, MCP y copiloto con propuestas; autonomía gobernada solamente después de evaluación.
El orden puede ajustarse por dependencias reales, manteniendo tests y migraciones seguras.

## Matriz de aceptación del objetivo completo (fases futuras incluidas)
1. Crear Plan A y Plan B en la **misma planta, fechas y semana** → IDs distintos, sin error.
2. Crear plan cruzando fin de semana y medianoche → ventanas correctas.
3. Crear N revisiones y escenarios por plan → sin sobrescritura; histórico intacto.
4. Consultar dashboard y exportación por semana → listado correcto de **todos** los planes y agregados sin doble conteo.
5. Publicar dos planes con recursos sin solapamiento → permitido; mismo recurso/intervalo incompatible → conflicto claro al publicar.
6. Simular plan A no altera plan B, recursos reales, inventario ni recepción.
7. Modificar parámetro global/por planta → versión nueva; runs históricos reproducibles.
8. Cambiar dotación/horas/rendimientos/unidades → salidas matemáticamente correctas, falta de datos señalizada.
9. Cerrar jornada dos veces → idempotente o error de estado útil; jamás `invalid data` opaco.
10. Import Excel duplicado → no duplica; import defectuoso → reporta filas y mantiene integridad.
11. Usuario sin planta/permisos → denegado por backend; tenant A no lee tenant B.
12. Evento/alerta reintentado → sin duplicar efectos ni notificaciones excesivas.
13. Agente recibe fuente con instrucciones maliciosas → no ejecuta acciones prohibidas.
14. Tests de contrato API, tests unitarios de dominio, integración DB, E2E crítica y regresión visual.

## Requisitos no funcionales
Establecer SLO/latencias después de medir baseline; no inventar metas. Diseñar para N plantas, periodos arbitrarios, cientos de planes/escenarios sin degradación, cola para runs largos, paginación y monitoreo. Instrumentar perfilado e índices medidos; planear backups/restauración, control de versiones, migraciones reversibles cuando sea posible y despliegues progresivos.

## Definición de terminado por funcionalidad
Diseño revisado + invariantes/documentación + migraciones compatibles + validación backend + autorización + audit log + tests de unidad/integración/E2E + estados UI (vacío, loading, error, permisos, stale) + observabilidad + datos demo representativos + evidencia de regresión y rollback documentado.

## Documentación adicional según necesidad
`docs/current-state.md`, `docs/gap-analysis.md`, `docs/erd-current.md`, `docs/erd-target.md`, `docs/adr/*.md`, `docs/api-contracts.md`, `docs/migration-plan.md`, `docs/test-matrix.md` y `docs/implementation-log.md`. No inventarlos sin exploración ni generarlos como requisito automático del incremento acotado. Actualizar primero los documentos existentes y evitar duplicar evidencia.
