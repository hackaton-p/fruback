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
  "plantIds": [1, 2]
}
```

Roles persistidos: `PLANIFICADOR`, `SUBGERENTE`, `JEFE_TURNO`. `plantIds` asigna una o varias plantas al perfil. `plantId` sigue aceptándose como alias para asignar una sola planta. Solo un subgerente global puede crear un perfil global sin asignaciones. Las asignaciones existentes se copian a la relación `usuario_planta` durante la migración. `/api/users/me` devuelve `plantIds`, y cada operación por planta valida esa relación. Las contraseñas se almacenan en Better Auth con bcrypt; nunca se devuelven hashes.

## Plantas y catálogos

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/plants` | Plantas accesibles por el usuario |
| GET | `/api/plants/{id}` | Usuario de la planta o subgerente global |
| PATCH | `/api/plants/{id}` | Subgerente con acceso a la planta |
| GET | `/api/fruits?plantId={id}` | Cualquier usuario autenticado; filtra el catálogo por planta |
| GET | `/api/areas` | Cualquier usuario autenticado |
| GET | `/api/customers` | Cualquier usuario autenticado |
| GET | `/api/customers/{id}` | Cualquier usuario autenticado |
| POST | `/api/customers` | Planificador o subgerente |
| PATCH | `/api/customers/{id}` | Planificador o subgerente |
| DELETE | `/api/customers/{id}` | Planificador o subgerente; solo si no tiene referencias |

Los clientes, frutas y áreas son catálogos compartidos. Frutas y áreas son de solo lectura. El resto de los datos se filtra por planta y se valida contra las asignaciones del usuario. Un `SUBGERENTE` con `plantId: null` mantiene acceso global; los demás usuarios pueden tener una o varias plantas asignadas.

Los parámetros de planta son `cratesPerWorkerHour`, `maxWorkers`, `shiftHours`, `maxOvertimeHours`, `startTime`, `efficiencyFactor` y `volumeTolerancePercent`. La eficiencia usa fracción (`0.8`); la tolerancia usa porcentaje (`5`). Cambiar parámetros no cambia planes existentes.

## Proyecciones por Excel

- `GET /api/projections?plantId=1&fruitId=1&year=2026&week=42&type=COSECHA` devuelve las filas de la proyección. Registrar de nuevo (POST) la reemplaza mientras ningún plan de esa semana esté enviado o aprobado. `year` y `week` son obligatorios.
- `POST /api/projections/import`, solo planificador, recibe `multipart/form-data`: `file`, `plantId`, `fruitId`, `year`, `week`, `type`.
- El XLSX debe tener exactamente una hoja, encabezados exactos, entre 1 y 500 filas de datos y un tamaño máximo de 2 MB. No se aceptan fórmulas en las celdas de entrada.

| Tipo | Encabezados, en orden | Ejemplo de fila |
|---|---|---|
| COSECHA | `date`, `quantity` | `2026-10-12`, `11180` |
| COMERCIAL | `customerName`, `country`, `quantity` | `Summit Produce`, `US`, `13000` |

`date` puede ser una fecha Excel o texto `YYYY-MM-DD`, y debe pertenecer al año/semana ISO indicados. `quantity` es una celda numérica no negativa. Todas las cantidades representan jabas (`crates`). No se acepta `unit` ni se hacen conversiones.

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
  "parameters": {
    "cratesPerWorkerHour": 5.9,
    "maxWorkers": 300,
    "shiftHours": 10,
    "maxOvertimeHours": 2,
    "startTime": "17:00",
    "efficiencyFactor": 0.8,
    "volumeTolerancePercent": 5
  }
}
```

Escenarios: `PROYECTADA`, `+10`, `+20`, `-10`. Se requieren ambas proyecciones. Se crea un día por fecha cargada en la cosecha. `parameters` es obligatorio y contiene todos los valores finales. El frontend puede inicializarlo con los defaults de planta. El plan conserva el snapshot completo; `hasModifiedParameters` refleja diferencias reales al aplicar. El detalle devuelve `plantDefaults` y `parameterChanges` contra los defaults actuales.

La lista incluye `statusCounts` antes de paginar y sin aplicar el filtro `status`, para los contadores de cada estado.

Filtros de lista: `plantId`, `fruitId`, `year`, `week`, `status`, `page`, `limit`. Estados: `BORRADOR`, `PENDIENTE`, `APROBADO`, `RECHAZADO`, `EN_EJECUCION`, `CERRADO`. Una transición inválida o intentar reemplazar un plan enviado/aprobado devuelve 409. No se modifican metas, trabajadores ni horas originales durante ejecución.

## Ejecución diaria

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/workdays` | Listar por `plantId`, `planId`, `date`, `page`, `limit` |
| GET | `/api/workdays/estimate?planDayId=1&workers=186` | Estimar horas, fin y personal faltante sin guardar |
| GET | `/api/workdays/{id}` | Detalle con asistencia, avances, alertas y estimación |
| POST | `/api/workdays` | Abrir jornada; jefe de turno |
| POST | `/api/workdays/{id}/records` | Registrar AVANCE, PERSONAL o VOLUMEN; jefe de turno |
| PATCH | `/api/plan-days/{id}/hours` | Ajustar horas y motivo; jefe de turno |
| POST | `/api/workdays/{id}/close` | Cerrar jornada; jefe de turno |

Abrir: `planDayId`, `startedAt` opcional y `attendance: [{areaId, arrivedWorkers, startingWorkers}]`. Se deben incluir todas las áreas del día exactamente una vez; `startingWorkers` no puede superar `arrivedWorkers`. Se guarda `initialEstimatedHours`, y los presentes arrancan iguales a los que inician. La fecha de inicio corresponde al día programado en `America/Lima`; no puede estar en el futuro. Al omitirla se usa la hora actual. Abrir la primera jornada cambia el plan a `EN_EJECUCION`. Solo hay una jornada por día, incluso ante solicitudes simultáneas.

Cada registro recibe `type` y `recordedAt` con zona horaria, y solo los campos de su tipo:

```json
{"type":"AVANCE","recordedAt":"2026-10-12T19:00:00-05:00","cumulativeReceivedCrates":2600,"cumulativeProcessedCrates":2300}
```

```json
{"type":"PERSONAL","recordedAt":"2026-10-12T19:00:00-05:00","areaId":1,"staffChange":15}
```

```json
{"type":"VOLUMEN","recordedAt":"2026-10-12T19:30:00-05:00","expectedDailyCrates":14300}
```

El tiempo no puede ser anterior al último registro ni estar en el futuro. Se permiten eventos en la misma hora, ordenados por ID. En AVANCE, los acumulados no bajan y procesado no supera recibido. PERSONAL aplica un cambio entero distinto de cero y el área no puede quedar negativa. VOLUMEN no puede ser menor que lo ya recibido. Cuando lo recibido supera el volumen esperado, este sube hasta lo recibido.

La productividad real es la producción acumulada del último AVANCE dividida por las horas-persona hasta ese instante, integrando cada cambio de personal. Antes del primer avance se usa rendimiento × eficiencia. Las horas estimadas son transcurridas + pendiente / (presentes × productividad). No se inventa producción entre registros. Sin capacidad y con pendiente, la estimación es `null` y se marca riesgo. Cada evento guarda `estimatedHours` y `presentWorkers` como valores históricos; el detalle los conserva.

La desviación de recepción usa las horas originales aprobadas. AVANCE genera alerta cuando el exceso supera la tolerancia; VOLUMEN alerta por cambios positivos o negativos del total esperado que superen la tolerancia. Si faltan trabajadores y no alcanzan las horas, genera alerta de personal. Los ajustes solo cambian el tiempo disponible para terminar.

Ajuste: `{"adjustedHours":12,"reason":"PERSONAL_PRESENTE"}`. Motivos: `CAMBIO_VOLUMEN` o `PERSONAL_PRESENTE`. Solo es posible con jornada abierta; no requiere nueva aprobación ni cambia la meta. El exceso respecto de jornada + horas extra se informa como riesgo.

Cierre: `workedHours`, `processedCrates`, `discardedCrates`, `looseKg` y `fixedKg`. `receivedCrates` es opcional; si se omite se conserva el último recibido o, como mínimo, lo procesado al cierre. No se admiten cantidades inferiores al último avance. Calcula `targetMet` y `difference`, que puede ser negativa. Se cierra el plan cuando todas sus jornadas están cerradas. No se implementa transferencia de fruta al siguiente día ni historial de ajustes.

## Alertas y dashboard

- `GET /api/alerts?plantId=1&date=2026-10-12`: alertas paginadas. `date` corresponde al día planificado, incluyendo avances posteriores a medianoche. No existe creación manual de alertas.
- `GET /api/dashboard?plantId=1&year=2026&week=42`: KPIs y filas diarias para gráficos de proyectado vs ejecutado, horas, personal, rendimiento, descarte y loose/fijo. Acepta `fruitId` opcional.

Dashboard considera planes aprobados, en ejecución o cerrados. Los KPIs comparan solo días cerrados (sin penalizar los futuros); `weeklyTargetCrates` conserva la meta semanal completa. Incluye `overtimeDays`, `closedDays`, jabas por trabajador, referencias por planta, seis `indicators` (`OK`, `WARNING`, `ALERT` o `null`), tres `insights`, `pendingPlans` y `alertCount`. Los umbrales visuales proceden del HTML de referencia; el descarte agregado es ponderado por jabas procesadas. Métricas que requieren una jornada cerrada usan horas reales de jornadas cerradas; divisiones sin denominador válido devuelven `null`. No se inventan datos de ocupabilidad o posiciones, excluidos del modelo del MVP.

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
