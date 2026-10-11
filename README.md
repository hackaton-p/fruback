# Pura Fruit · Packing API

Backend del MVP v2 (fruta únicamente en jabas): NestJS 11, TypeORM, PostgreSQL 17, Better Auth y Scalar. Node.js 24 y pnpm 11.10.0.

Incluye autenticación por email/contraseña, permisos por rol y planta, configuración, catálogos, importación XLSX, simulación y aprobación de planes, ejecución diaria, alertas y dashboard semanal.

## Inicio

```bash
cp .env.example .env
openssl rand -base64 48
```

Configurar `.env`: pegar el valor generado en `BETTER_AUTH_SECRET`, definir `DB_PASSWORD`, `BETTER_AUTH_URL` y los orígenes del frontend en `TRUSTED_ORIGINS` (separados por coma). Desarrollo usa API `http://localhost:3000` y frontend `http://localhost:3001`.

```bash
docker compose up --build -d
```

PostgreSQL inicia primero; el servicio `migrate` aplica migraciones y la API inicia después. Documentación interactiva en **http://localhost:3000/docs**, OpenAPI en **http://localhost:3000/openapi.json** y comprobación HTTP en `/api`.

Crear el primer subgerente global después de migrar:

```bash
export BOOTSTRAP_EMAIL='admin@example.com'
export BOOTSTRAP_NAME='Packing administrator'
read -s BOOTSTRAP_PASSWORD
export BOOTSTRAP_PASSWORD
docker compose exec -e BOOTSTRAP_EMAIL -e BOOTSTRAP_NAME -e BOOTSTRAP_PASSWORD api node dist/commands/bootstrap-user.js
unset BOOTSTRAP_PASSWORD
```

La contraseña debe tener entre 12 y 72 caracteres y no superar 72 bytes UTF-8. El bootstrap solo funciona antes de que exista el primer perfil vinculado a Better Auth. Después, el subgerente crea usuarios con `POST /api/users`.

Los parámetros iniciales de Piura/Sullana son ejemplos del documento; reemplazarlos por los valores oficiales desde `PATCH /api/plants/:id`.

## Credenciales demo

Tras el primer arranque (`docker compose up --build -d`), la migración `SeedUsers` crea estos usuarios:

| Rol | Email | Contraseña |
|-----|-------|------------|
| ADMIN | admin@example.com | password123 |
| SUBGERENTE | subgerente@example.com | password123 |
| PLANIFICADOR | planificador@piura.com | password123 |
| JEFE_TURNO | jefe.turno@piura.com | password123 |

El rol `ADMIN` y `SUBGERENTE` tienen acceso global (sin planta asignada). `PLANIFICADOR` y `JEFE_TURNO` están asignados a la planta **Piura**.

### Usuarios de prueba (comando)

Para pruebas adicionales, crea un planificador, un subgerente y un jefe de turno (uno por rol) ya vinculados a la primera planta existente:

```bash
docker compose exec api node dist/commands/seed-test-users.js
# o en local, con el proyecto compilado (pnpm build):
pnpm seed:test-users
```

Correos: `planner-test@purafruit.test`, `deputy-manager-test@purafruit.test`, `shift-manager-test@purafruit.test`. Contraseña para los tres: `Packing-test-password-2026`. El comando es idempotente: si un correo ya existe, lo omite. Requiere que exista al menos una planta (las del seed de migración, Piura/Sullana, sirven). No usar en producción.

## Desarrollo local

```bash
pnpm install --frozen-lockfile
docker compose up -d db
pnpm migration:run
pnpm build
pnpm auth:bootstrap
pnpm start:dev
```

`auth:bootstrap` lee las variables anteriores. El registro público está deshabilitado. Better Auth administra sesiones persistentes, cookies HttpOnly, contraseñas bcrypt y limitación de intentos en PostgreSQL. El token Bearer es un **token de sesión**, no un JWT propio. Login: `POST /api/auth/sign-in/email`; perfil de negocio: `GET /api/users/me`.

## Estructura

```text
src/modules/{auth,plants,catalogs,projections,plans,workdays,alerts}/
  domain/                  # Modelos y reglas sin dependencia del framework
  application/             # Casos de uso
  infrastructure/          # TypeORM, Better Auth y lectura de XLSX
  presentation/http/       # Controladores, autenticación y permisos
src/shared/
  application/             # Puerto de persistencia y paginación
  domain/                  # Errores y fechas ISO
  infrastructure/          # Adaptador TypeORM y transacciones
  presentation/http/       # DTOs, contratos OpenAPI y errores HTTP
src/database/              # Configuración y migraciones
src/commands/              # Bootstrap y exportación de OpenAPI
```

Las reglas y modelos del dominio son independientes de TypeORM. Los casos de uso operan sobre el puerto `PackingStore`; el adaptador TypeORM implementa consultas y transacciones. Las escrituras de planificación, importación y ejecución se serializan por planta mediante bloqueo de fila. Controladores y DTOs validan la entrada; el guard resuelve el rol y la planta desde la base en cada solicitud.

Los identificadores del código están en inglés según `AGENTS.md`. Tablas, columnas y valores persistidos de enums mantienen el contrato anterior; los snapshots JSONB tienen un transformador explícito. Las cantidades decimales se devuelven como strings y se reciben como números. El plan se identifica por planta, fruta, año ISO y semana ISO.

## Prioridades para acercar el MVP al reto

El MVP actual planifica por planta, fruta y día, con un turno y rendimientos agregados. El reto también pide optimizar por línea, considerar formatos y paradas, y mostrar utilización de línea. Agregar estas capacidades en este orden; cada fase depende de validar los datos de la anterior.

1. **Acordar alcance y reglas con Operaciones.** Confirmar si el plan debe ser por planta o por fruta, si habrá varios turnos, qué significa “buena planificación”, cómo se mide la calidad y qué restricciones de operación son obligatorias. Resolver también qué pasa con fruta que cruza de un día al siguiente. El alcance actual excluye líneas y arrastre de fruta.
2. **Conseguir y validar datos reales.** Solicitar entre uno y tres meses de datos anonimizados: programa comercial, fruta recibida y producida, variedades y formatos, líneas, capacidades y velocidades, horas, paradas y cambios de formato, dotación y producción ejecutada. Confirmar los rendimientos y topes de personal de Piura y Sullana; los valores cargados hoy son referenciales.
3. **Modelar líneas, turnos y formatos.** Agregar catálogos y relaciones para líneas, turnos, variedades y formatos, con capacidad/velocidad por combinación y tiempos de cambio y parada. Definir cómo se asignan personas por línea y turno. Revisar el modelo antes de crear migraciones para evitar fijar supuestos con datos incompletos.
4. **Calcular el plan operativo.** Extender la simulación del backend para distribuir volúmenes por línea y turno, respetando capacidades, tiempos disponibles, cambios de formato, paradas y personal. Mantener escenarios de volumen y el cumplimiento comercial; incluir las restricciones de calidad acordadas.
5. **Registrar ejecución por línea y validar el resultado.** Capturar producción, horas, dotación, paradas, cambios de formato y calidad por línea/turno. Comparar las recomendaciones con los datos históricos y revisar las diferencias con planificadores y jefes de turno.
6. **Completar indicadores y pantallas.** Incorporar utilización de línea, horas de operación, cumplimiento comercial y calidad; mostrar supuestos, alertas y escenarios en las vistas de planificación, ejecución y dashboard. Validar la interfaz con personal de planta.

La brecha comercial por cliente, el historial de auditoría y el arrastre excepcional siguen fuera del MVP mientras Operaciones no los priorice. Esta hoja de ruta describe trabajo pendiente; no implica que esas funciones ya estén disponibles.

## Migraciones

```bash
pnpm migration:generate src/database/migrations/NameOfChange
pnpm migration:create src/database/migrations/NameOfChange
pnpm migration:show
pnpm migration:run
pnpm migration:revert
# Con el código compilado:
pnpm migration:run:prod
pnpm migration:revert:prod
```

`synchronize` y la ejecución automática al arrancar cada réplica permanecen desactivados. Las tablas de Better Auth se crearon con su generador oficial y están versionadas en TypeORM; no ejecutar otro migrador en paralelo. La migración vincula perfiles previos que tengan contraseña bcrypt. Su reversión copia el hash vigente al campo anterior y elimina las sesiones de Better Auth. Revisar siempre el SQL; las reversiones iniciales eliminan datos.

## Pruebas y documentación

```bash
pnpm build
pnpm test --runInBand
pnpm exec eslint 'src/**/*.ts' 'test/**/*.ts'
# Configurar DB_* hacia una base aislada cuyo nombre termine en _test:
pnpm migration:run
pnpm test:e2e --runInBand
pnpm test:mvp
pnpm docs:export
```

Las pruebas HTTP del MVP crean datos de prueba identificados por ejecución; usar una base descartable. Cubren autenticación real, CSRF, permisos por planta, importación atómica, estados, concurrencia, avances, alertas, cierre y consultas. Las pruebas de esquema usan rollback y verifican que no existan diferencias respecto de las entidades.

`docs:export` genera `docs/openapi.json` desde los controladores y el esquema de Better Auth, usando una base migrada y la configuración de autenticación. `scalar.config.json` configura la guía y la referencia local para Scalar Docs. Las skills solicitadas están instaladas en `.agents/skills` y registradas en `skills-lock.json`.

Ver [guía de endpoints y contratos](docs/getting-started.md).

## Cambios del plan v2

Ver [comparación y decisiones de migración](docs/plan-v2-validation.md). El contrato v2 usa `crates`, parámetros finales completos y registros de jornada tipados. La migración bloquea bases con proyecciones o planes v1: no existe equivalencia definida entre cajas y jabas. No convierte ni elimina datos automáticamente.
