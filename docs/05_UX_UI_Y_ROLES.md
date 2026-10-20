# Diseño UX/UI, navegación y permisos

## Dirección visual autorizada del incremento

La petición más reciente extiende el rediseño al **dashboard**, incluyendo navegación lateral, encabezado, indicadores y gráficos. El contenido y la animación del bloque **Flujo operativo se mantienen tal cual**: mismos componentes, datos, colores originales en claro/oscuro, controles, tiempos y política de movimiento reducido. Su contenedor restaura los tokens originales y queda excluido de los estilos de interacción del workspace. Mantener Pura Fruit y sus colores; incorporar superficies de vidrio y acentos petróleo mediante tokens compartidos. No crear rutas vacías para funciones futuras.

Priorizar tareas: estado principal y siguiente acción; formularios de inicio, avance, ajuste y cierre de jornada en diálogos accesibles. Historial, parámetros y métricas secundarias se consultan bajo demanda. Configuración muestra una categoría editable a la vez; catálogos presentan recursos compactos con nombre, estado y edición, sin tablas de parámetros innecesarias. La validación permanece junto a la tarea, conserva entradas ante error y cierra el diálogo solo al confirmar éxito.

Compose continúa siendo el entorno existente de ejecución; este rediseño no requiere cambiar su configuración. Las secciones siguientes mantienen la hoja de ruta de producto; sus módulos futuros no se presentan como implementados.

## Meta visual
Software profesional de operaciones: estética industrial contemporánea, jerarquía clara, estados legibles, espacios amplios, tipografía consistente, navegación rápida y mínimo texto explicativo en pantalla. Colores neutros, acentos semánticos moderados, tarjetas limpias, iconografía homogénea y transiciones fluidas. Nunca depender solo del color para indicar riesgo. Responsive desde escritorio a tablet; móvil prioriza supervisión y alertas.

## Estructura de navegación (adaptable a roles)
1. **Inicio / Dashboard**: KPIs ejecutivos, próximas llegadas, brechas, semana activa seleccionable, tarjetas de planes (N por semana), estado general.
2. **Operaciones**: flujo de cuatro macroetapas **Recepción → Planning → Comparación → Resultados**, con camiones, fruta y packing animados; jabas/día y semana siempre visibles.
3. **Planificación**: listado multipropósito (no lista singleton por semana), filtros por planta, rango, estado, nombre, cultivo, responsable; crear plan, duplicar, nueva versión, aprobar, publicar, archivar.
4. **Simulador**: variantes por plan o simulaciones libres; sliders/inputs contextualizados, comparación A/B/C, explicación de límites.
5. **Comparación**: proyección vs recepción vs procesado vs producto terminado; dotación, horas y rendimiento planeados vs reales.
6. **Resultados**: indicadores, tendencias, alertas, rendimiento exportable, tiempos, utilización, costos cuando estén disponibles.
7. **Integraciones**: salud de conectores, importación y conciliación, fuentes, logs operativos.
8. **Configuración**: plantas, cultivos, variedades, presentaciones, unidades, áreas, líneas, horarios, coeficientes, alertas, permisos y reglas.

## Dashboard animado — preservar Flujo operativo
- Camión en camino: evento ETA/estado de transporte; en recepción: check-in y descarga; packing: línea activa/progreso; resultados: producción validada.
- Los valores visuales responden a eventos/snapshots reales o claramente etiquetados `SIMULACIÓN`; animación no debe falsificar progreso.
- Visualización compacta de etapas: número de jabas del **día y de semana**, recibidas, liberadas, procesadas, pendientes y objetivo; herramientas de detalle al seleccionar etapa.
- `prefers-reduced-motion`, pausa de animación, render ligero SVG/CSS/Canvas según medición, accesibilidad por teclado y lector.
- Estados UI: `sin_datos`, `sincronizando`, `con_datos`, `desactualizado`, `parcial`, `error`, `simulado`; no dejar pantallas aparentemente exitosas ante fallos.

## Patrones de interacción
- Planeación como maestro-detalle: panel de filtros/planes a izquierda y plan activo/detalle a derecha, o páginas responsive equivalentes.
- Crear varios planes para la **misma semana**: botón siempre accesible y selector con ID/nombre/cultivo/estado; duplicar escenario sin borrar anterior.
- Wizard breve para crear: planta + periodo → producto/variedades → entradas → asignaciones → resumen + guardado de borrador. Guardado incremental y autosave de borradores con control de conflictos.
- Datos densos con tablas legibles, filtros, búsqueda y columnas ancladas; dashboards resumidos con drill-down.
- Formularios tienen valores iniciales confiables, validaciones cercanas al campo, explicaciones cortas opcionales y unidades visibles.
- Eliminar tarjeta principal de 'jabas por trabajador'; mantener productividad en pantalla técnica de configuración/análisis con definición precisa.
- Frutas removibles/desactivables del programa comercial por autorización; impedir borrar un dato referenciado históricamente, ofrecer desasociación/desactivación.

## Acciones críticas
- Cerrar jornada: validación de cantidades, cierres de líneas y pendientes, ventana, razón, confirmación y respuesta idempotente; ante falla mostrar detalle específico, no `invalid data`. Ofrecer reabrir solo con rol y auditoría si operación lo permite.
- Aprobar/publicar: mostrar snapshot, impacto, recursos comprometidos y conflictos detectados; firma/aprobación, no edición silenciosa.
- Alarmas: accionables con causa, umbral, dato origen, timestamp, siguiente acción y botón contextual.

## Roles (plant-scoped, permisos explícitos)
- Admin: configuración global, usuarios, integraciones.
- Jefe/Gerente de planta: parámetros autorizados, aprobar/publicar/replanificar.
- Planificador: crear planes, escenarios, proponer.
- Campo: proyecciones y cambios de cosecha.
- Recepción: check-in, cantidades, calidad según asignación.
- Supervisor packing: producción, paradas, dotación real y cierre.
- Comercial/Gerencia: consulta de pedidos, compromisos e indicadores.
- Agente de IA: identidad de servicio con permisos mínimos, por defecto `read + simulate + propose`; publicación requiere aprobación explícita.

## Sistema de diseño
Tokens para color, espaciado, radios, tipografía, sombras y animación; biblioteca de componentes compartida; responsive y dark mode solo si es útil; WCAG 2.2 AA como objetivo. Documentar estados (loading/empty/error/permissions/stale) por componente. Prototipar y probar tareas reales: crear 2 planes misma semana, reconocer déficit de capacidad, comparar escenarios, resolver recepción tardía, cerrar jornada.
