# Pura Fruit — Índice y contrato de desarrollo full-stack

**Estado:** hoja de ruta objetivo con un primer incremento full-stack en implementación; no constituye evidencia de funcionalidades terminadas. **Fecha:** 2026-10-19. **Industria:** packing agroexportador (piloto uva de mesa en Piura, Perú). **Idioma de interfaz:** español.

## Propósito
Evolucionar el software **ya existente** —sin rehacerlo sin justificación— hacia un planificador y simulador de capacidad operativo, visual, configurable, multiempresa/multiplanta y preparado para planificación asistida y, posteriormente, ejecutada por agentes autorizados. ERP externo y Excel siguen siendo fuentes transaccionales; este producto decide, simula, propone, compara y audita.

## Proyecto existente y alcance inmediato

El producto conserva el nombre **Pura Fruit**, su identidad y los colores actuales. Se pueden incorporar colores complementarios con contraste accesible. La implementación evoluciona ambos repositorios del mismo workspace:

| Parte | Ruta | Base existente |
|---|---|---|
| Interfaz | `fru-front/` | Next.js 16, React 19, pantallas por rol, repositorios HTTP y mocks |
| API | `fruback/` | NestJS 11, TypeORM, Better Auth, módulos de planificación y jornadas |
| Persistencia | PostgreSQL 17 | Migraciones existentes; preservar datos y snapshots |
| Entorno local | Cada repositorio | `fruback/compose.yaml` para API, migraciones y PostgreSQL; `pnpm dev` en `fru-front/` |

Consultar el [README del backend](../README.md) para Docker Compose y el [README del frontend](../../fru-front/README.md) para `pnpm dev` local. No se necesitan archivos en la raíz del workspace. Las pruebas de aceptación deben usar `API_MOCK=false`, que es el valor predeterminado del frontend; los mocks requieren activación explícita para pruebas aisladas. No crear un frontend, backend ni esquema paralelo.

**Primer incremento:** crear varios borradores independientes en la misma planta/semana, editar únicamente por ID explícito, seleccionar de 2 a 6 fechas de lunes a sábado desde la próxima semana y cerrar jornadas con un desglose por fruta válido. La primera fecha seleccionada es el inicio; no es obligatorio seleccionar lunes. La aprobación reserva la planta completa por fecha: permite planes en fechas distintas de la misma semana y rechaza fechas ya comprometidas. Todavía no hay recursos por línea/turno para permitir simultaneidad en el mismo día.

Los capítulos siguientes describen también el objetivo futuro: revisiones inmutables, multitenancy, ventanas arbitrarias, solver, integraciones ERP y agentes. No deben interpretarse como funciones ya disponibles ni como obligación de reconstruir el sistema antes de entregar el primer incremento. Los datos de demanda/cosecha siguen compartidos por planta/semana. Cada plan nuevo o guardado explícitamente conserva el total comercial usado; planes antiguos sin snapshot mantienen un fallback a la fuente actual. Esto no equivale a versionar las fuentes completas.

## Orden obligatorio de lectura
1. `01_VISION_Y_ALCANCE.md` — objetivos, operación, supuestos y vocabulario.
2. `02_ARQUITECTURA_Y_BACKEND.md` — diseño senior, límites y contratos.
3. `03_MODELO_DATOS.md` — entidades, cardinalidades, invariantes y migraciones.
4. `04_MOTOR_PLANIFICACION.md` — cálculos, restricciones y verificaciones.
5. `05_UX_UI_Y_ROLES.md` — navegación, pantallas y estados.
6. `06_INTEGRACIONES_Y_EVENTOS.md` — ERP, Excel, integración, alertas.
7. `07_AGENTES_IA_MCP.md` — hoja de ruta a planificación por agentes.
8. `08_IMPLEMENTACION_Y_CALIDAD.md` — descubrimiento, fases, pruebas y definición de hecho.
9. `09_PROMPT_PARA_AGENTE.md` — instrucciones operativas listas para copiar.

## Reglas irrenunciables
- **Primero inspeccionar el código y DB actuales.** No inventar stack, tablas, endpoints, pantallas o estado del proyecto. Elaborar mapa actual vs objetivo, conservar funcionalidades útiles y proponer migraciones aditivas.
- **No existe unicidad `semana` → `plan`.** Una semana admite N planes, varios escenarios, variantes, versiones y planes para distintas plantas/productos/propósitos. Nunca `UNIQUE(year,week)` ni `firstOrCreate(week)` como identidad del plan. Véase `03_MODELO_DATOS.md`.
- **No confundir unidades:** jabas cosechadas, kg netos/brutos, cajas comerciales, kg exportables, descartes y horas-persona.
- **Diferenciar valores:** real, externo importado, estimado y simulado. Datos ilustrativos no son estándares industriales verificados.
- **No sobrescribir plan aprobado:** versionar; cambios importantes crean revisión y trazabilidad.
- **No ejecutar operaciones del ERP ni publicar propuestas automáticamente por una IA sin autorización y guardrails.** El agente empieza como copiloto de lectura y simulación.
- **No hardcodear** cultivos, variedades, áreas, 5 p. m., 8.2 kg, 5.9 jabas/persona-hora, dotaciones, tolerancias, políticas de turno o topes; usar configuraciones con alcance, vigencia y fuente.
- **Backend como fuente de verdad:** permisos, cálculos, cambios de estado, reglas, validación y auditoría se aplican en servidor, no solo UI.
- **UX moderna y de baja carga cognitiva:** conservar y mejorar animación de camiones/packing en dashboard, vinculada a estados, con accesibilidad y opción de reducir movimiento.

## Evidencia de implementación
1. Inventario de repo: stack/versiones, módulos, DB y migraciones, puntos de entrada, tests, jobs, integraciones, roles y dashboard actual.
2. Hallazgos: qué reutilizar, riesgos, deuda técnica, errores reproducibles (incluido `invalid data` al cerrar jornada).
3. Matriz de trazabilidad requisito → módulo → entidad → endpoint → prueba.
4. Diseño propuesto con ADRs para decisiones irreversibles y plan de migración/rollback.
5. Primer incremento: crear **dos planes para la misma semana** y comprobar su independencia mediante API real y UI. La autorización de implementación ya fue otorgada; continuar con cambios acotados y verificables sin repetir una aprobación de inicio.

## Criterios de éxito
Un gerente puede ver demanda, fruta recibida, capacidad, personal y horas; crear múltiples planes y escenarios en la misma semana; comparar y aprobar propuestas sin perder histórico; importar información; entender alertas; y, más adelante, permitir que un agente proponga la asignación explicando supuestos y solicitando aprobación.
