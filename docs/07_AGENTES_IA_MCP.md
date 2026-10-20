# Hoja de ruta: agente que realiza la planificación

## Objetivo final
A partir de demanda comercial, proyecciones de Campo, recepciones, líneas, dotación, rendimientos, calendarios y restricciones, un **agente planificador** construye y compara escenarios, llama al motor determinista, explica la selección y, previa aprobación según políticas, crea una revisión de planificación lista para publicar. El agente **no inventa producción, capacidad ni horas**; razona sobre outputs reproducibles y datos verificables.

## Etapas de autonomía
- **Nivel 0 — lectura:** responde preguntas con fuentes/fechas y links a registros.
- **Nivel 1 — copiloto:** detecta brechas, propone cambios y explica escenarios; sin modificar planes.
- **Nivel 2 — propuestas:** guarda borradores/revisiones no publicadas con autor `agent`, compara alternativas y solicita aprobación humana.
- **Nivel 3 — ejecución gobernada:** tras aprobación, aplica la revisión autorizada con diff inmutable, límites, auditoría y posibilidad de reversión operacional cuando sea viable.
- **Nivel 4 — autonomía limitada (futuro):** replanifica automáticamente **solo dentro de políticas/umbrales aprobados**, sin afectar pedidos, ERP, pagos ni recursos comprometidos fuera del alcance permitido. Despliegue gradual y revocable.

## Arquitectura
Orquestador de agente → herramientas tipadas (MCP u API interna) → servicios de dominio → motor de capacidad/solver → DB. MCP es interfaz de herramientas, **no motor matemático ni fuente de verdad**. Usar el mismo backend transaccional para web, agente y API; sin accesos directos a tablas ni SQL arbitrario desde LLM.

## Catálogo inicial de herramientas MCP (contratos conceptuales)
Lectura: `list_plans(filters)`, `get_plan(id)`, `get_demand(window,plant)`, `get_harvest_forecast(...)`, `get_receipts(...)`, `get_capacity_resources(...)`, `get_rendimiento_baseline(...)`, `get_data_freshness(...)`.
Simulación: `create_scenario(plan_id|new, input_overrides)`, `run_capacity_scenario(scenario_id)`, `compare_scenario_runs(run_ids)`, `explain_infeasibility(run_id)`.
Escritura restringida: `propose_plan_revision(plan_id, run_id, rationale)`, `submit_for_approval(revision_id)`, `publish_approved_revision(revision_id, approval_token)` (expuesta solo cuando cumpla controles).
Cada acción exige esquema, tenant/planta, actor, permiso, idempotencia y logging. Evitar herramientas genéricas `execute_sql`, `update_anything` o `run_shell` sobre producción.

## Proceso de planificación del agente
1. Seleccionar planta, periodo, pedidos, variedades y objetivo; **listar todos los planes existentes**, no asumir único por semana.
2. Consultar datos actualizados y detectar ausencias/contradicciones; pedir aclaración si importa.
3. Crear hipótesis base y variantes factibles; definir limitaciones y ventana de llegada por lote.
4. Ejecutar motor determinista/solver para cada escenario y analizar restricciones duras/blandas.
5. Presentar tabla comparativa: personal, horas, jabas, toneladas, compromiso comercial, costo si disponible, riesgos, horas extras y supuestos.
6. Elegir recomendación explicable **sin sobrescribir planes previos**; crear propuesta/versionado.
7. Obtener aprobación y publicar solo mediante flujo autorizado, comprobando nuevamente datos y conflictos si cambió el entorno.
8. Registrar outcome; después de ejecución comparar previsto vs real para mejorar estimaciones.

## Seguridad IA
Prompts y documentos externos son **datos no confiables**; neutralizar instrucciones inyectadas. Permisos granulares, rate limit, sandbox para pruebas, presupuestos de solver, límites de alcance, human-in-the-loop, prohibición de comprometer recursos irreversiblemente sin aprobación, redacción de datos personales y supervisión de auditoría. Validar todo resultado del LLM contra esquemas y reglas del servidor. Errores del agente no deben afectar ejecución operativa.

## Evaluación
Conjunto de casos golden: misma semana con varios planes, recepción atrasada, cambio de rendimiento, insumos faltantes, conflicto de líneas, plan cruzando medianoche, calidad rechazada, proveedor desactualizado, falta de datos. KPIs: % propuestas factibles, diferencia vs baseline, precisión, aprobación humana, tiempo de cómputo y cantidad de intervenciones. No habilitar autonomía superior sin pasar evaluación y controles.
