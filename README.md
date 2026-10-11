# Pura Fruit · Packing API

Backend del MVP: NestJS 11, TypeORM, PostgreSQL 17, Better Auth y Scalar. Node.js 24 y pnpm 11.10.0.

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
