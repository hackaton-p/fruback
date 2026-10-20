# Pura Fruit · Registro del incremento integrado

Fecha: 2026-10-19. Se evoluciona el frontend y backend existentes, conservando nombre, logo, fuentes y colores. Este registro documenta unidades de trabajo y evidencia del incremento; no constituye una entrega de toda la hoja de ruta.

## Cambios implementados

| Unidad | Resultado |
|---|---|
| Identidad y período | Crear genera un plan independiente; editar requiere ID explícito. Se seleccionan de 2 a 6 fechas de lunes a sábado de una semana futura, empezando en la primera seleccionada. |
| Aprobación | La reserva es de planta completa por fecha. Planes de fechas distintas pueden aprobarse en la misma semana; una fecha comprometida por un plan aprobado, en ejecución o cerrado produce conflicto. |
| Proyecciones | Las fuentes compartidas por planta/semana quedan protegidas cuando existe un plan consolidado enviado o aprobado. Cada plan nuevo o guardado explícitamente conserva el total de demanda comercial usado; los antiguos sin snapshot mantienen un fallback declarado a la fuente actual. Esto no versiona las fuentes completas por borrador. |
| Cierre e interfaz | El desglose por fruta usa jabas enteras en la UI; valida cantidades y sumas. El cierre permite introducir descarte, kg loose y kg fijo. Se conserva la identidad visual. |
| Entorno | Backend, migraciones y PostgreSQL mediante `fruback/compose.yaml`; frontend local mediante `pnpm dev`, con API real por defecto. Las credenciales de ejemplo son para el entorno local, no producción. |

## Migraciones y reversión

Se agregaron migraciones nuevas; las anteriores se conservan:

- `1791686000000-IndependentPlanReservations`: elimina la unicidad semanal del plan consolidado. Su `down` se bloquea si existen varios planes aprobados, en ejecución o cerrados de una misma planta/semana; no elimina ni modifica planes para forzar la reversión.
- `1791687000000-AssignmentIndexMetadata`: alinea los índices de asignaciones usuario/planta con los metadatos; su reversión restaura el nombre anterior y retira el índice añadido.
- `1791688000000-ConsolidatedProjectionLocks`: incluye planes consolidados al proteger proyecciones; su reversión restaura el alcance anterior por fruta y pierde esa protección adicional.

- `1791689000000-PlanCommercialSnapshot`: añade `demandaComercialUsada` numérica y nullable, sin inventar históricos mediante backfill. Su `down` se bloquea cuando existe cualquier snapshot para impedir pérdida de historia.

Revertir requiere comprobar datos y compatibilidad con la aplicación anterior, además de una copia de seguridad. No usar una reversión para borrar planes válidos ni asumir que recuperar el esquema anterior conserva las garantías nuevas.

## Evidencia disponible

El cierre de validación reportó **218 pruebas aprobadas**: 77 unitarias de backend, 10 PostgreSQL, 13 HTTP y 118 frontend. Las pruebas de base de datos se ejecutaron en un entorno aislado de prueba. Pasó lint de los archivos modificados de backend y frontend, incluidas las migraciones nuevas; se exportó el contrato OpenAPI final. Ambas imágenes Docker se compilaron y desplegaron: frontend, API y PostgreSQL saludables, migración terminada con código 0.

En navegador se completó la aceptación con API real: acceso del planificador de prueba, confirmación de configuración de planta, selección de fechas de la semana siguiente, carga comercial y cosecha, y creación de planes **1 y 2 en la misma semana 44**. Modificar la cosecha del plan 1 dejó idéntico el detalle completo del plan 2, comprobado mediante API (`deepEqual`). También se verificaron listado y bloqueo de creación hasta configurar la planta.

La comprobación final de independencia comercial cambió el plan 1 a **620 jabas** y confirmó que el detalle completo del plan 2 permaneció intacto, con snapshot de **650 jabas**. Ambos borradores locales de prueba se guardaron explícitamente para incorporar el snapshot después de añadir la migración; no se atribuyó un histórico ficticio a los planes antiguos. En ancho móvil de **390 px** no hubo desbordamiento horizontal del documento.

Los datos se crearon en la base local aislada `packing`, identificando la demanda como **SIMULACIÓN — Validación local**; son datos de prueba y no pedidos reales. Capturas locales: `/tmp/purafruit-two-plans.png` y `/tmp/purafruit-mobile.png`. Los archivos de `/tmp` son evidencia temporal, no artefactos versionados.

Receipt-driven development: **disabled/unmanaged**; el usuario no lo habilitó. Se ejecutaron validaciones ordinarias sin actores de revisión ni aprobación RDD fabricada.

## Entrega y límites

Por petición posterior, el arranque se simplifica a backend en Docker y frontend local. Se retiran `compose.yaml`, `README.md`, `.env.example`, `.gitignore` y `.env` de la raíz. No se trasladan secretos ni se eliminan volúmenes; la guía del backend distingue los volúmenes del entorno anterior. PostgreSQL se publica en 5433 y la API en 3000; el frontend usa 3001, sin archivo de entorno obligatorio y con API real por defecto. Los mocks siguen disponibles mediante `API_MOCK=true` explícito.

`fruback/` y `fru-front/` son repositorios Git separados; la raíz del workspace no es un repositorio Git. La configuración y documentación de arranque viven ahora dentro de cada repositorio: [backend con Docker Compose](../README.md) y [frontend local con pnpm](../../fru-front/README.md). Los resultados anteriores con ambos componentes en Docker corresponden al entorno anterior.

Permanecen como trabajo futuro las revisiones formales, ventanas arbitrarias, reservas por línea/turno, solver, multitenancy y agentes de planificación. No se ha convertido este incremento en una implementación de esos módulos.

## Actualización: rediseño de las pantallas existentes

La primera petición de rediseño autorizó un cambio integral excepto el dashboard (alcance inicial, ampliado posteriormente; ver siguiente apartado). Se incorporaron superficies de vidrio y acentos petróleo conservando Pura Fruit, su marca y colores. Planificación y subgerencia priorizan la siguiente tarea; jornada presenta inicio, avance, ajuste y cierre en diálogos accesibles, con historial y métricas bajo demanda. Configuración muestra una categoría editable a la vez; catálogos usan tarjetas compactas y edición/confirmación en diálogos. Login y perfil adoptan el mismo sistema visual. La administración usa una sección dentro del `main` del layout, sin regiones principales anidadas.

La validación final de este rediseño registra **124 pruebas frontend en 20 archivos**, **82 unitarias backend**, **12 PostgreSQL** y **13 HTTP** aprobadas. Se comprobó que las capturas del dashboard antes y después tienen **SHA-256 idéntico**; aquella entrega no modificó esa pantalla. Esta evidencia corresponde al alcance anterior y no describe la ampliación posterior.

Se reprodujeron y corrigieron dos rutas que producían el mensaje opaco `Invalid data`: errores de valores/rangos numéricos y cierre anterior a la fecha/hora de inicio de la jornada. Ahora se exponen mensajes accionables; la validación del cierre futuro se aplica antes de persistir. Esto no demuestra que alguna de esas rutas fuera la causa exacta del incidente original del usuario. Las horas reales no se infieren de un estimado de duración.

Estos resultados complementan la evidencia del incremento anterior. Las revisiones formales, solver y módulos futuros continúan fuera de lo implementado; no se añadieron rutas vacías para simular esas capacidades.


## Dashboard integrado y preservación de Flujo operativo

La petición posterior amplía el diseño compartido al dashboard: navegación lateral, encabezado, tarjetas de indicadores, puntos de atención y gráficos adoptan las superficies de vidrio y acentos petróleo. Los datos, filtros de semana/planta y cálculos permanecen iguales. Se elimina la excepción de layout del dashboard.

**Flujo operativo queda protegido:** `weekly-flow-card.tsx` y `weekly-flow-card.css` no se modifican. Un contenedor `operational-flow-preserved` reutiliza los mismos bloques de tokens claro/oscuro de `theme.css`, evitando que la paleta del workspace se herede en la ilustración. Los estilos globales de foco y movimiento reducido del workspace excluyen ese subárbol; el bloque mantiene sus propios controles y reglas originales. Su tamaño sigue adaptándose al espacio disponible del layout.

La comprobación de hashes de ambos archivos confirma que sus fuentes siguen intactas. La igualdad visual de toda la pantalla de la entrega anterior deja de ser un criterio; ahora corresponde verificar textos, colores, animaciones y pausa/reanudación del flujo dentro del nuevo dashboard.

Validación de esta ampliación: TypeScript sin errores, ESLint de los componentes modificados aprobado y **14 pruebas del dashboard en 3 archivos** aprobadas. Los hashes SHA-256 del TSX y CSS de Flujo operativo coinciden con los previos al cambio. La comparación automatizada en navegador confirmó en temas claro y oscuro el mismo texto, paleta, nombres, duraciones, demoras y repeticiones de animación; pausa/reanudación sigue operativa. El dashboard muestra el sidebar en escritorio y el menú móvil no produce desbordamiento horizontal.
