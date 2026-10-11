# Packing API · Guía del MVP

La referencia interactiva se sirve en `/docs`; el contrato OpenAPI completo, con solicitudes, respuestas, enums y autenticación, está en `/openapi.json`. Todas las rutas de negocio tienen prefijo `/api`.

## Autenticación

1. Crear el primer subgerente con el comando de bootstrap del README.
2. Enviar `POST /api/auth/sign-in/email` con `{"email":"admin@example.com","password":"..."}`.
3. Usar el `token` devuelto como `Authorization: Bearer <token>` en Scalar o clientes HTTP. El navegador también puede usar la cookie HttpOnly que devuelve Better Auth (`credentials: 'include'`).
4. Consultar `GET /api/users/me` para obtener `id`, `authUserId`, `name`, `email`, `role` y `plantId`.
5. Crear planificadores y jefes de turno mediante `POST /api/users`.

Las escrituras autenticadas con cookie requieren `Origin` igual a un origen de `TRUSTED_ORIGINS` o `BETTER_AUTH_URL`. Las sesiones duran 24 horas y pueden renovarse según actividad. Cambios de rol/planta en la base afectan el acceso inmediatamente: el perfil se resuelve en cada solicitud. El token es opaco; no debe interpretarse como JWT. Cerrar sesión invalida el token.

| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/auth/sign-in/email` | Login con email y contraseña |
| GET | `/api/auth/get-session` | Sesión e identidad de Better Auth |
| POST | `/api/auth/sign-out` | Cerrar la sesión actual |
| POST | `/api/auth/change-password` | Cambiar contraseña con la contraseña actual |
| GET | `/api/auth/list-sessions` | Listar las sesiones propias |
| POST | `/api/auth/revoke-session` | Revocar una sesión propia |
| POST | `/api/auth/revoke-sessions` | Revocar todas las sesiones propias |
| POST | `/api/auth/revoke-other-sessions` | Revocar las otras sesiones |
| GET | `/api/auth/ok` | Estado del manejador de autenticación |
| GET | `/api/users/me` | Perfil de negocio autenticado |
| GET | `/api/users` | Listar perfiles accesibles; subgerente |
| POST | `/api/users` | Crear identidad y perfil; subgerente |

No hay registro público, OAuth, 2FA ni recuperación por correo en este MVP. El cambio de contraseña autenticado sí está disponible. No se configura un servicio de email ficticio.

Creación de usuario:

```json
{
  "name": "Packing planner",
  "email": "planner@example.com",
  "password": "Use-a-unique-password",
  "role": "PLANIFICADOR",
  "plantId": 1
}
```

Roles persistidos: `PLANIFICADOR`, `SUBGERENTE`, `JEFE_TURNO`. Solo un subgerente global puede crear otro perfil sin planta. Planificadores y jefes de turno requieren `plantId`. Las contraseñas se almacenan en Better Auth con bcrypt; nunca se devuelven hashes.

## Plantas y catálogos

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/plants` | Plantas accesibles por el usuario |
| GET | `/api/plants/{id}` | Usuario de la planta o subgerente global |
| PATCH | `/api/plants/{id}` | Subgerente con acceso a la planta |
| GET | `/api/fruits` | Cualquier usuario autenticado |
| GET | `/api/areas` | Cualquier usuario autenticado |
| GET | `/api/customers` | Cualquier usuario autenticado |
| GET | `/api/customers/{id}` | Cualquier usuario autenticado |
| POST | `/api/customers` | Planificador o subgerente |
| PATCH | `/api/customers/{id}` | Planificador o subgerente |
| DELETE | `/api/customers/{id}` | Planificador o subgerente; solo si no tiene referencias |

Los clientes, frutas y áreas son catálogos compartidos. Frutas y áreas son de solo lectura. El resto de los datos se filtra por planta. Un `SUBGERENTE` con `plantId: null` tiene acceso global; un subgerente asignado a una planta queda limitado a ella.

Los parámetros de planta son `boxesPerWorkerHour`, `maxWorkers`, `shiftHours`, `maxOvertimeHours`, `startTime`, `efficiencyFactor` y `volumeTolerancePercent`. La eficiencia usa fracción (`0.8`); la tolerancia usa porcentaje (`5`). Cambiar parámetros no cambia planes existentes.

## Proyecciones por Excel

- `GET /api/projections?plantId=1&fruitId=1&year=2026&week=42&type=COSECHA` devuelve las filas inmutables. `year` y `week` son obligatorios.
- `POST /api/projections/import`, solo planificador, recibe `multipart/form-data`: `file`, `plantId`, `fruitId`, `year`, `week`, `type` y `unit` opcional (`BOXES` por defecto o `TONNES`).
- El XLSX debe tener exactamente una hoja, encabezados exactos, entre 1 y 500 filas de datos y un tamaño máximo de 2 MB. No se aceptan fórmulas en las celdas de entrada.

| Tipo | Encabezados, en orden | Ejemplo de fila |
|---|---|---|
| COSECHA | `date`, `quantity` | `2026-10-12`, `11180` |
| COMERCIAL | `customerName`, `country`, `quantity` | `Summit Produce`, `US`, `13000` |

`date` puede ser una fecha Excel o texto `YYYY-MM-DD`, y debe pertenecer al año/semana ISO indicados. `quantity` es una celda numérica no negativa. Toneladas se convierten con `quantity × 1000 ÷ 8.2`. No se almacenan jabas ni conversiones estimadas de jabas.

No se permite repetir fecha/cliente dentro del archivo ni importar por segunda vez el mismo tipo para la misma planta, fruta y semana. Un cliente comercial nuevo se crea en la misma transacción. Si alguna fila falla, no se guarda ninguna fila ni cliente. No hay edición, borrado ni versionado de proyecciones.

## Planificación

| Método | Ruta | Acción y permiso |
|---|---|---|
| POST | `/api/plans/simulate` | Calcula sin guardar; planificador |
| POST | `/api/plans` | Aplica/reemplaza borrador o reaplica rechazado; planificador |
| GET | `/api/plans` | Lista filtrada con detalles y totales |
| GET | `/api/plans/{id}` | Días, personal por área, parámetros, alertas y ejecución |
| POST | `/api/plans/{id}/submit` | BORRADOR → PENDIENTE; planificador |
| POST | `/api/plans/{id}/approve` | PENDIENTE → APROBADO; subgerente |
| POST | `/api/plans/{id}/reject` | PENDIENTE → RECHAZADO; subgerente, `comment` obligatorio |

Aplicar o simular:

```json
{
  "plantId": 1,
  "fruitId": 1,
  "year": 2026,
  "week": 42,
  "harvestScenario": "+10",
  "overrides": { "maxWorkers": 300, "shiftHours": 10 }
}
```

Escenarios: `PROYECTADA`, `+10`, `+20`, `-10`. Se requieren ambas proyecciones. Se crea un día por fecha cargada en la cosecha. Los campos omitidos en `overrides` usan los valores de planta y el plan conserva el snapshot completo.

Filtros de lista: `plantId`, `fruitId`, `year`, `week`, `status`, `page`, `limit`. Estados: `BORRADOR`, `PENDIENTE`, `APROBADO`, `RECHAZADO`, `EN_EJECUCION`, `CERRADO`. Una transición inválida o intentar reemplazar un plan enviado/aprobado devuelve 409. No se modifican metas, trabajadores ni horas originales durante ejecución.

## Ejecución diaria

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/workdays` | Listar por `plantId`, `planId`, `date`, `page`, `limit` |
| GET | `/api/workdays/{id}` | Detalle con asistencia, avances, alertas y estimación |
| POST | `/api/workdays` | Abrir jornada; jefe de turno |
| POST | `/api/workdays/{id}/progress` | Registrar acumulados; jefe de turno |
| PATCH | `/api/plan-days/{id}/hours` | Ajustar horas y motivo; jefe de turno |
| POST | `/api/workdays/{id}/close` | Cerrar jornada; jefe de turno |

Abrir: `planDayId`, `startedAt` opcional y `attendance: [{areaId, workers}]`. Se deben incluir todas las áreas del día exactamente una vez. La fecha de inicio corresponde al día programado en `America/Lima`; no puede estar en el futuro. Al omitirla se usa la hora actual. Abrir la primera jornada cambia el plan a `EN_EJECUCION`. Solo hay una jornada por día, incluso ante solicitudes simultáneas.

Avance: `recordedAt` con zona horaria, `cumulativeReceivedBoxes`, `cumulativeProcessedBoxes` y la asistencia completa. El tiempo debe ser posterior al registro anterior y los acumulados no pueden bajar. Procesado no puede superar recibido. Se guarda el usuario que registra y se evalúan alertas de volumen y personal.

Las horas estimadas consideran el volumen recibido, el pendiente y el menor entre ritmo observado y capacidad del personal presente. Si aún no hay producción, se usa la capacidad prevista del personal. Sin personal y con volumen pendiente, la estimación es `null` y se marca riesgo. La desviación de recepción siempre se compara con las horas originalmente aprobadas; ajustar horas no cambia esa referencia.

Ajuste: `{"adjustedHours":12,"reason":"PERSONAL_PRESENTE"}`. Motivos: `CAMBIO_VOLUMEN` o `PERSONAL_PRESENTE`. Solo es posible con jornada abierta; no requiere nueva aprobación ni cambia la meta. El exceso respecto de jornada + horas extra se informa como riesgo.

Cierre: `workedHours`, `receivedBoxes`, `processedBoxes`, `discardedBoxes`, `looseKg` y `fixedKg`. No se admiten cantidades inferiores al último avance. Calcula `targetMet` y `difference`, que puede ser negativa. Se cierra el plan cuando todas sus jornadas están cerradas. No se implementa transferencia de fruta al siguiente día ni historial de ajustes.

## Alertas y dashboard

- `GET /api/alerts?plantId=1&date=2026-10-12`: alertas paginadas. `date` corresponde al día planificado, incluyendo avances posteriores a medianoche. No existe creación manual de alertas.
- `GET /api/dashboard?plantId=1&year=2026&week=42`: KPIs y filas diarias para gráficos de proyectado vs ejecutado, horas, personal, rendimiento, descarte y loose/fijo. Acepta `fruitId` opcional.

Dashboard considera planes aprobados, en ejecución o cerrados. Métricas que requieren una jornada cerrada usan horas reales de jornadas cerradas; divisiones sin denominador válido devuelven `null`. No se inventan datos de ocupabilidad o posiciones, excluidos del modelo del MVP.

## Respuestas y errores

Las listas paginadas devuelven `items`, `total`, `page` y `limit` (25 por defecto, máximo 100). Cantidades y horas persistidas se devuelven como strings decimales. Los campos de entrada están en inglés; los valores de enums mantienen el contrato de negocio en mayúsculas.

- 400: entrada inválida, archivo incorrecto o acumulados inconsistentes.
- 401: falta de sesión o sesión expirada/revocada.
- 403: rol, planta u origen no permitido.
- 404: recurso inexistente o ruta de autenticación no expuesta.
- 409: estado incompatible, duplicado, dependencia que impide borrar o conflicto concurrente.
- 429: límite de intentos de autenticación.

## Despliegue

El Dockerfile separa compilación y dependencias de producción; la API corre como usuario `node`. Compose incluye init, healthchecks, volumen PostgreSQL y servicio separado de migraciones. En producción configurar `NODE_ENV=production`, una URL HTTPS en `BETTER_AUTH_URL`, un secreto aleatorio y los orígenes exactos del frontend. El proxy HTTPS debe reenviar el tráfico a la API.

Para actualizar el contrato estático de Scalar: `pnpm build && pnpm docs:export`, con variables DB y Better Auth configuradas. No se publican documentos ni endpoints en servicios externos automáticamente.

Referencias de implementación: [Better Auth](https://better-auth.com/docs/integrations/express), [Scalar para NestJS](https://scalar.com/docs-for/nestjs). Skills utilizadas: `better-auth-best-practices`, `create-auth`, `email-and-password-best-practices`, `better-auth-security-best-practices` y `scalar-docs`.
