# Visión del producto y operación objetivo

## Problema
En agroexportación, **pedido comercial ≠ cosecha proyectada ≠ recepción efectiva ≠ fruta procesada ≠ cajas exportables**. La planta debe dimensionar líneas, personas, horas, insumos y frío bajo incertidumbre, cambiando planes cuando Campo no cumple volumen u horario.

## Flujo de referencia
1. Comercial registra demandas por cliente/producto/presentación/fecha, en **cajas comerciales o kg**.
2. Compras/almacén asegura materiales según BOM de presentación (cajas, bolsas, etiquetas, pallets); compras de fruta a productores externos es otro flujo opcional.
3. Campo comunica proyección por fundo/lote/variedad, peso, fecha, ventana de llegada y confiabilidad.
4. Recepción registra viajes/camiones, lotes, cantidades/pesos, horarios, inspección y liberación de Calidad.
5. Planificador crea uno o varios planes, escenarios, turnos y asignaciones por semana/día/lote/línea; motor estima brechas.
6. Jefe de planta revisa, aprueba y publica un plan concreto.
7. Supervisores registran ejecución, paradas, horas efectivas, producción, mermas y calidad.
8. Comparación y resultados muestran diferencias por origen y razones; retroalimentan rendimientos.
9. Integraciones envían/reciben eventos con sistemas externos bajo contratos explícitos.

## Política temporal
Para **el piloto simulado**, se asume recepción hasta las 17:00 e inicio de procesamiento solo tras el cierre de recepción. Es **política configurable por planta, cultivo, proceso o turno**: también debe admitir procesar lotes ya recibidos y liberados o flujo continuo. No asumir que todas las plantas de Piura cierran a las 17:00.

## Datos ilustrativos (NO calibrados)
- Jaba: 7–9 kg; simulaciones pueden usar **8.2 kg/jaba** por configuración.
- Rendimiento supuesto: **5.9 jabas/persona-hora**; separar productividad **directa** (operarios de packing) vs **global** (incluye apoyos), cuya definición debe acompañar cada coeficiente.
- Muestra previa: semana de 14,000 jabas y hasta 34 personas/día, distribuidas en packing 29, almacén 1, trazabilidad 1, mantenimiento 1, saneamiento 2. **No tomar esa distribución como estándar ni multiplicar rendimiento de operarios por todos los empleados**.
- Incluir variedades configurables; multi-cultivo aunque uva sea piloto.

## Principios
- **Plan como agregado independiente**, no como propiedad singleton de una semana; ventana temporal arbitraria, calendario semanal solo como filtro/vista.
- Planes pueden coexistir como borradores, alternativas, escenarios o versiones; múltiples planes oficiales pueden coexistir si cubren dimensiones distintas. Ante solapamientos operativos, aplicar control de asignación y conflictos, **no prohibir planificaciones duplicadas por semana**.
- Modelo agnóstico de industria dentro del dominio de packing: cultivo, unidad, línea y reglas configurables.
- Explicar **por qué** el motor propone una dotación y rango de horas, con supuestos e incertidumbre.
- Primero un motor determinista comprobable; optimización y predicción después; IA nunca fuente de cifras inventadas.
- Inclusión de costos, materiales, frío y calidad por fases sin romper entidades actuales.

## Preguntas para validar en visita operativa
¿Cómo define la empresa jaba/kg/caja? ¿Qué personal entra en rendimientos históricos? ¿Cuándo inicia producción? ¿Cuánto tiempo se permite permanencia sin frío? ¿Cómo se mide descarte vs producto de segunda? ¿Qué datos provienen del ERP? ¿Cuándo y quién aprueba los cambios? ¿Cuántas líneas y roles mínimos? ¿Se divide una recepción entre planes? ¿Qué significa un cierre de jornada para ese negocio?

## No objetivos iniciales
Reemplazar ERP, liquidación de planillas, emitir documentos tributarios, tomar decisiones de compra automáticas, automatizar control industrial o predecir rendimientos sin datos suficientes.
