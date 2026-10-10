# Pura Fruit · Plan de Packing

Base de persistencia del backend NestJS 11 + TypeORM 0.3 + PostgreSQL 17, basada en `contexto-plan-packing.md`. Requiere Node.js 24 y pnpm 11.10.0.

## Alcance

Incluye las 13 entidades, relaciones, índices, restricciones, migraciones reversibles, catálogos iniciales, configuración compartida entre Nest y CLI, cálculo diario de dominio y contenedores. El único endpoint actual sigue siendo `GET /` (comprobación HTTP básica, no de disponibilidad de BD).

Los endpoints funcionales, login JWT/bcrypt, guards, importación de Excel, casos de uso de aprobación/ejecución, validaciones entre agregados y cálculo de alertas son trabajo posterior. El campo `passwordHash` se excluye de consultas normales; el futuro caso de uso de registro deberá guardar exclusivamente hashes bcrypt. No se crean usuarios ni contraseñas iniciales.

## Arquitectura mínima

```text
src/
  modules/
    auth/              # Role, User
    plants/           # Plant y contrato de parámetros
    catalogs/         # Fruit, Customer, Area
    projections/      # Projection
    plans/            # Plan, PlanDay, PlanDayArea y calculadora
    workdays/          # Workday, ProgressRecord
    alerts/           # Alert
  database/            # Configuración, DataSource, registro de entidades y migraciones
  shared/
    infrastructure/persistence/  # ID y timestamps comunes
```

Las convenciones del repositorio están en `AGENTS.md`: nombres de código y carpetas en inglés, y comentarios solo para contexto necesario o reglas de negocio importantes. Las entidades mapean explícitamente los nombres de columnas existentes; los valores persistidos de enums y las claves JSONB se conservan para mantener compatibilidad con las migraciones y snapshots previos.

Cada módulo registra sus entidades en `infrastructure/persistence`. `domain` contiene enums, contratos y reglas puras sin dependencias de NestJS ni TypeORM. Los módulos Nest son el punto de composición. Al implementar flujos, agregar `application` para casos de uso/puertos y `presentation/http` para controladores/DTOs en el módulo correspondiente. Los adaptadores de repositorio vivirán en infraestructura; los casos de uso dependerán de sus puertos. No se duplican entidades ni se crean repositorios genéricos o carpetas vacías para este alcance.

## Decisiones del modelo

- Se sigue la regla detallada del documento: plan por **planta + fruta + año ISO + semana ISO**. La sección inicial dice planta/semana; confirmar si se requiere un único plan que englobe ambas frutas antes de construir esos flujos. `year` evita colisiones entre años y debe corresponder al año ISO, que puede diferir del calendario en enero/diciembre.
- Se permite un solo BORRADOR por esa combinación y un solo APROBADO/EN_EJECUCION mediante índices únicos parciales. RECHAZADOS y CERRADOS pueden conservarse.
- `parametersSnapshot` es un snapshot JSONB completo, tipado con `PlantParameters`. El futuro caso de uso de aplicar plan debe copiar todos los parámetros efectivos. Editar Planta no altera ese snapshot.
- `numeric(14,4)` se representa como **string** en las entidades para conservar precisión. La calculadora convierte explícitamente a número. La tolerancia es porcentaje (5 = 5%); eficiencia y proporciones son fracciones (0.8 = 80%). Cajas siempre representan 8.2 kg; no hay tabla de unidades ni factor jaba/caja.
- Fechas de días usan `date`/string; eventos usan `timestamptz`/Date; hora de planta usa `time`. El inicio se interpreta en America/Lima al abrir la jornada. `startedAt` y `closedAt` permiten calcular tiempo transcurrido y distinguir jornadas abiertas/cerradas; cruzar medianoche es válido.
- Valores de cierre y asistencia por área admiten null hasta registrarse. `difference` puede ser negativa: no se asume que toda la fruta se procesa el mismo día.
- Proyecciones son inmutables mediante trigger PostgreSQL. COSECHA exige fecha de la semana ISO y sin cliente; COMERCIAL exige cliente y sin fecha.
- Todas las entidades tienen `createdAt`/`updatedAt`; las relaciones usan claves foráneas con RESTRICT, sin borrados en cascada ni soft-delete. Enums son VARCHAR con CHECK de valores mayúsculos (los escenarios mantienen +10/+20/-10).
- Las restricciones cubren no negativos, rangos de planta, unicidad día/plan y día/área, una jornada por día, rechazo con comentario y ajuste de horas con motivo. Las transiciones, permisos, inmutabilidad de metas aprobadas, orden/monotonía de avances, consistencia de alertas entre jornada/día, semana de los días y suma del personal por área deberán implementarse en casos de uso transaccionales con bloqueo del agregado; las entidades por sí solas no ejecutan esos flujos.
- Margen bajo se devuelve por separado del estado de horas para no ocultar riesgo de turno extra. Sin cosecha: cero trabajadores/horas y margen null. El reparto usa las proporciones fijas del documento y asigna el resto a Packing.

## Inicio con Docker

```bash
cp .env.example .env
# Cambiar DB_PASSWORD en .env según el entorno.
docker compose up --build -d
```

La secuencia es PostgreSQL saludable → servicio de migraciones finalizado → API en http://localhost:3000. PostgreSQL persiste en un volumen; los puertos se exponen solo en localhost. `docker compose down` conserva datos; no usar `down -v` salvo que se quiera eliminar la base.

Dockerfile multietapa: dependencias con lockfile congelado y caché BuildKit, compilación separada, runtime con dependencias de producción, usuario sin privilegios, sin código fuente ni `.env`. Compose usa `init: true`; Nest atiende señales para cierre ordenado. Las migraciones se ejecutan en un servicio separado, nunca mediante `synchronize` ni al arrancar cada réplica.

Las migraciones iniciales crean roles, frutas, áreas y plantas Piura/Sullana. **Los rendimientos y topes de personal son ejemplos del documento: reemplazarlos por los valores oficiales antes de operar.**

## Desarrollo local

```bash
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d db
pnpm migration:run
pnpm start:dev
```

Nest y la CLI comparten `databaseOptions()`. DB_HOST, DB_USER, DB_PASSWORD y DB_NAME son obligatorios; DB_PORT tiene valor 5432. En servicios externos se puede usar DB_SSL=true (verificación de certificado habilitada; configurar certificados del entorno si corresponde). `synchronize` y `migrationsRun` permanecen desactivados.

## Migraciones

```bash
# Tras modificar entidades, con la BD de desarrollo previamente migrada:
pnpm migration:generate src/database/migrations/NombreDelCambio
# Para SQL o datos manuales:
pnpm migration:create src/database/migrations/NombreDelCambio
pnpm migration:show
pnpm migration:run
pnpm migration:revert    # Revierte únicamente la última migración
# Tras pnpm build, con dependencias de producción:
pnpm migration:run:prod
pnpm migration:revert:prod
```

Revisar siempre el SQL generado. Las reglas con triggers y los datos iniciales necesitan migraciones manuales. No editar migraciones ya aplicadas. La reversión del seed falla deliberadamente si los catálogos tienen referencias; la reversión inicial elimina tablas y es destructiva.

Referencias: [migraciones TypeORM](https://typeorm.io/docs/migrations/setup/) y [integración NestJS](https://docs.nestjs.com/techniques/database).

## Validación

```bash
pnpm build
pnpm test --runInBand
pnpm exec eslint 'src/**/*.ts' 'test/**/*.ts'
```

Las pruebas e2e requieren PostgreSQL migrado. Usar una base aislada cuyo nombre termine en `_test` (las pruebas de esquema rechazan otro nombre), configurar las variables DB_* y ejecutar:

```bash
pnpm migration:run
pnpm test:e2e --runInBand
```

Las pruebas de esquema usan transacciones con rollback y comprueban restricciones, proyecciones inmutables, snapshot, unicidad de plans/jornadas y ausencia de diferencias entre migraciones y entidades. No usar una base de producción para probar migraciones.
