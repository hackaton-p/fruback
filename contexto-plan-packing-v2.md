# Plan de Packing · Contexto del sistema

Resumen del estado actual del diseño (10/10/2026). Refleja el artefacto **Plan de Packing · Pantallas** (antes "Flujos Plan de Packing") en Claude Design: https://claude.ai/artifact/AZVy84DGpaZidzHRiivV7q

- Stack objetivo: **Next.js** (frontend) + **NestJS** (backend).
- Empresa: Pura Fruit. Plantas: **Piura (Santa María)** y **Sullana**.
- Frutas: uva y arándano. Las variedades se agregarán después.

---

## 1. Problema que resuelve

Cosecha proyecta cuánta fruta llega y comercial proyecta cuánto vende, pero hoy no hay un plan que cruce ambas cosas con la capacidad de la planta. El resultado es improvisación en personal y horas, días que se alargan y riesgo de un segundo turno.

El sistema:

1. Recibe la **proyección de cosecha**, por semana y por día.
2. Recibe el **programa comercial** de la semana, por cliente.
3. Calcula un **plan semanal por planta**: meta diaria, trabajadores y horas.
4. Lo pasa por **aprobación** del subgerente.
5. Durante cada jornada registra **avances**, compara el volumen entrante contra el plan, lanza **alertas** y ajusta **horas**.
6. Al cierre registra horas reales, meta cumplida y diferencia.

---

## 2. Reglas de negocio confirmadas

| Tema | Regla |
|---|---|
| Unidad | Solo **jabas**, en cosecha, comercial, plan y jornada. No existen cajas ni conversiones. |
| Alcance del plan | Un plan por **planta** y por semana. Sin líneas en el MVP. |
| Turnos | **Un solo turno**. Un turno extra es lo que se quiere evitar. |
| Personal | Se cuenta **todo el personal** (packing, almacén, trazabilidad, mantenimiento, saneamiento). No se usan posiciones de línea ni la relación directo-indirecto. |
| Trabajadores | **Los calcula el sistema**; el planificador no los ingresa. |
| Parámetros | La **configuración de la planta** guarda solo **valores por defecto**. El planificador parte de ellos y puede cambiarlos en su plan; el plan guarda los **valores finales** que usó, y esos son los que se muestran y valen. Cambiar la configuración no los sobrescribe. |
| Proyecciones | Son **inmutables** una vez registradas. |
| Aprobación | Solo se aprueba el **plan semanal**. En la ejecución diaria solo se **ajustan horas** (por volumen o por personal presente), nunca la meta. |
| Fruta pendiente | Normalmente no pasa al día siguiente; se extienden horas. En casos muy excepcionales sí pasa: queda fuera del MVP, pero el diseño no debe asumir que nunca ocurre. |
| Alertas | Al inicio, solo la alerta de **planificación** (cosecha vs comercial). Durante la jornada, alertas de **volumen entrante vs plan** en cada registro de avance. El packing empieza alrededor de las 5 PM. |
| Avances | Los **registros de avance** durante la jornada y las **horas actualizadas** entran en el MVP. |
| Pendiente | La brecha por cliente (qué clientes no se cubren y en qué %) se iterará después. |

### Roles

| Rol | Qué hace |
|---|---|
| **Planificador** | Simula, aplica el plan oficial y lo envía a aprobación. |
| **Subgerente** | Revisa y aprueba o rechaza los planes, sigue el curso de la semana y edita la configuración de planta. |
| **Jefe de turno** | Ve el plan aprobado, registra avances, ajusta horas y cierra la jornada. |

---

## 3. Parámetros de planta (pantalla Configuración, valores por defecto)

| Parámetro | Piura | Sullana | Para qué sirve |
|---|---|---|---|
| Rendimiento estándar por persona | 5.9 jabas/h | 3.9 jabas/h | Jabas que procesa en promedio una persona en una hora, contando a todo el personal. |
| Personal máximo disponible | 300 | 1,200 | Tope de trabajadores. Si se necesitan más, el plan sube las horas. |
| Horas por jornada | 10 h | 12 h | Duración normal del turno. |
| Horas extra permitidas | 2 h | 2 h | Máximo que se puede extender el turno el mismo día. |
| Hora de inicio | 17:00 | 17:00 | Sirve para estimar la hora de fin. |
| Eficiencia planificada | 80% | 80% | El plan asume ese porcentaje del rendimiento; lo que sobra es margen para imprevistos. |
| Tolerancia de volumen entrante | 5% | 5% | Desvío de jabas frente a lo esperado que no genera alerta. |

> Los rendimientos se **infirieron** de los reportes de la semana 41 (jabas ÷ personal total ÷ horas) y el personal máximo es un valor de ejemplo. Hay que reemplazarlos por los valores oficiales.
> Estos son defaults: cada plan guarda en `parametrosUsados` los valores finales con que se calculó.

---

## 4. Cálculos

**Trabajadores por día**

```
trabajadores = ceil( jabasMeta / (rendimiento × eficiencia × horasJornada) )
trabajadores = min(trabajadores, personalMaximo)
```

**Horas por día**

```
horas = jabasMeta / (trabajadores × rendimiento × eficiencia)
```

**Margen para volumen extra**: cuánta fruta adicional entra en la jornada más las horas extra.

```
margen = trabajadores × rendimiento × eficiencia × (horasJornada + horasExtra) / jabasMeta − 1
```

**Estado de cada día**

| Condición | Estado |
|---|---|
| horas ≤ jornada | Dentro de jornada |
| horas > jornada | Requiere horas extra |
| horas > jornada + horas extra | Riesgo de turno extra |
| margen < tolerancia | Margen bajo |

**Alerta de planificación**: aparece si la cosecha en jabas es menor que el programa comercial. Muestra la brecha en jabas y en %.

**Reparto por área**: el total de trabajadores se divide con la proporción observada en la semana 41.

| Área | Proporción |
|---|---|
| Almacén | 3.9% |
| Trazabilidad | 2.5% |
| Mantenimiento | 2.1% |
| Saneamiento | 4.5% |
| Packing | El resto |

**Ejemplo (Piura)**

- Día normal: 13,000 jabas. 13,000 / (5.9 × 0.8 × 10) = **276 trabajadores** durante unas **10 h**, con un margen de **+20%**.
- Escenario +20% de cosecha: 15,600 jabas piden 331 trabajadores, pero el tope es 300. Con el tope, el día dura 11.0 h y queda en "Requiere horas extra".

**En la jornada (jefe de turno)**

- Las horas estimadas se calculan con el ritmo real, que depende de los trabajadores presentes.
- Ejemplo: si inician 186 de los 276 planificados, el día estimado sube a unas 14.8 h contra 10.0 h del plan (riesgo de turno extra).
- Si las horas estimadas caben en el plan, no se cambian horas. Si el volumen se desvía más que la tolerancia, sale una alerta informativa.
- Si las horas no caben, se proponen **horas actualizadas** con un motivo (CAMBIO_VOLUMEN o PERSONAL_PRESENTE).

---

## 5. Pantallas (artefacto Plan de Packing · Pantallas)

Solo interesan las vistas; los diagramas de flujo se eliminaron. Todas usan un menú superior común: Dashboard · Planificador · Subgerente · Jefe de turno · Configuración.

### Planificador · Plan semanal (semana 42, Piura)

1. Ve la proyección de cosecha (jabas por día) y el programa comercial por cliente, en jabas. Ambas se cargan por Excel y son de solo lectura. Si la cosecha no cubre el programa, aparece la alerta de planificación (en el ejemplo faltan 2,400 jabas, el 3.8%).
2. **Paso 1 · Simulación** (borrador, no se guarda):
   - Panel **"Parámetros del plan · Planta Piura"**: arranca con los valores por defecto de la configuración y el planificador puede cambiarlos. Los valores que difieren del default se marcan.
   - Escenarios de cosecha: proyectada, +10%, +20% y −10%.
   - KPIs: meta de la semana, trabajadores calculados (pico y promedio), horas de operación y cumplimiento comercial.
   - Tabla por día: jabas, trabajadores, horas, margen y estado.
3. **"Aplicar como plan oficial"** guarda la simulación como **Paso 2 · Plan oficial**, con el personal por área y los valores finales de los parámetros.
4. **"Enviar a aprobación"** solo se habilita cuando ya existe un plan oficial.

### Subgerente · Planes y curso (una sola pantalla con dos pestañas)

- **Pestaña Planes**, con un contador rojo que se calcula con los planes pendientes y baja al aprobar o rechazar:
  - Lista de planes de todas las plantas, con filtros por estado y su conteo: Por aprobar, En ejecución, Aprobados, Rechazados y Cerrados.
  - Cada fila muestra planta, semana, fechas, meta en jabas, trabajadores pico, horas y estado. La acción depende del estado: "Revisar y aprobar", "Ver curso" (abre la pestaña Curso) o "Ver detalle".
  - **Detalle del plan** (con "Volver a planes"): alerta comercial, KPIs, **valores usados en el plan** y el plan diario con el personal por área. Si un valor difiere del default de la planta, se muestra "(default X)" al lado, y un resumen dice cuántos cambió el planificador. Si está pendiente, se puede **aprobar** o **rechazar y devolver** (comentario obligatorio).
  - Datos de ejemplo: semana 42 de Piura (con eficiencia 85%, cambiada respecto al default 80%) y de Sullana, por aprobar; semana 41 de ambas, en ejecución; semana 40 de ambas, cerrada.
- **Pestaña Curso de la semana** (Piura, semana 41, proyectado vs ejecutado):
  - KPIs y tabla diaria: jabas y cumplimiento, % loose y % fijo, rendimiento en jabas por persona-hora (contra el default), % descarte, personal proyectado y ejecutado por área, ausentismo y horas.
  - "Lectura de la semana" con hallazgos y una tarjeta de planes pendientes que se calcula sola y lleva a la lista filtrada.

### Jefe de turno · Jornada (Piura)

Tres fases en la misma pantalla:

1. **Iniciar jornada:** por área registra cuántos llegaron y con cuántos inicia. Muestra en vivo las horas estimadas contra las del plan (276 trabajadores, 13,000 jabas, ≈10 h).
2. **Durante la jornada:** estado, KPIs (trabajadores ahora, horas estimadas, jabas procesadas, volumen del día), formulario de registros (avance de volumen, cambio de personal, cambio de volumen del día) y la lista "Registros de hoy" con el estimado después de cada uno. Si las horas no alcanzan, alerta y opción de **ajustar horas** con motivo.
3. **Cierre:** horas trabajadas, jabas procesadas, jabas de descarte, kg loose y kg fijo; resultado con meta cumplida y diferencia.

### Dashboard de packing

- Filtro por planta (Piura o Sullana) con datos reales de la semana 41.
- 6 KPIs con semáforo: cumplimiento de jabas, horas promedio (contra la jornada de la planta), días con horas extra, personal ejecutado vs proyectado, rendimiento en jabas por persona-hora (contra el default) y descarte.
- 3 puntos de atención calculados.
- 6 gráficos por día: jabas proyectadas vs ejecutadas, horas (con la jornada de la planta como referencia), jabas por trabajador, personal, rendimiento por persona-hora (con el default como referencia) y % descarte.
- Al pasar el cursor se ve el detalle de cada barra.

### Configuración de planta (valores por defecto)

- Pestañas Piura y Sullana con tres bloques: Personal y rendimiento, Jornada, y Eficiencia y tolerancias.
- Panel **"Así calcula el sistema"** en vivo: jabas por persona por jornada, trabajadores necesarios, horas y margen. Avisa si el personal necesario supera el máximo.
- Botones Guardar y Descartar, con indicador de cambios sin guardar. Son defaults para planes nuevos: no sobrescriben los valores finales de los planes ya creados.

---

## 6. Modelo de datos esencial

Detalle completo en [uml-bd-esencial.md](uml-bd-esencial.md). La referencia ampliada es [uml-bd-v4.md](uml-bd-v4.md).

```
ROL ─< USUARIO >─ PLANTA
PLANTA ─< PROYECCION >─ FRUTA        (tipo COSECHA o COMERCIAL)
           PROYECCION >─ CLIENTE      (solo en COMERCIAL)
PLANTA ─< PLAN >─ FRUTA
          PLAN ─< PLAN_DIA ─┬─o JORNADA ─< REGISTRO_AVANCE ─< ALERTA
                            ├─< ALERTA (de planificacion)
                            └─< PLAN_DIA_AREA >─ AREA
```

### UML de datos (diagrama entidad-relación)

```mermaid
erDiagram
    ROL ||--o{ USUARIO : "tiene"
    PLANTA ||--o{ USUARIO : "trabaja en"
    PLANTA ||--o{ PROYECCION : "recibe"
    FRUTA ||--o{ PROYECCION : "de"
    CLIENTE ||--o{ PROYECCION : "pide (solo COMERCIAL)"
    PLANTA ||--o{ PLAN : "tiene"
    PLAN ||--|{ PLAN_DIA : "se divide en"
    PLAN_DIA ||--o| JORNADA : "se ejecuta en"
    PLAN_DIA ||--o{ ALERTA : "genera"
    JORNADA ||--o{ REGISTRO_AVANCE : "registra durante el dia"
    REGISTRO_AVANCE ||--o{ ALERTA : "dispara"
    AREA ||--o{ REGISTRO_AVANCE : "cambio de personal en"
    USUARIO ||--o{ REGISTRO_AVANCE : "registra"
    USUARIO ||--o{ PLAN : "crea / aprueba"
    FRUTA ||--o{ PLAN : "de"
    PLAN_DIA ||--|{ PLAN_DIA_AREA : "reparte personal en"
    AREA ||--o{ PLAN_DIA_AREA : "agrupa"

    ROL {
        int id PK
        string nombre "PLANIFICADOR, SUBGERENTE, JEFE_TURNO"
    }
    USUARIO {
        int id PK
        int rolId FK
        int plantaId FK
        string nombre
        string email
        string password
    }
    PLANTA {
        int id PK
        string nombre "Sullana, Piura"
        decimal rendimientoPersonaHora "jabas por persona-hora, ej. 5.9 (default)"
        int personalMaximo "tope de trabajadores"
        decimal horasJornada "10"
        decimal horasExtraMax "2"
        time horaInicio "17:00"
        decimal factorEficiencia "0.80"
        decimal toleranciaVolumen "% sin alerta, ej. 5"
    }
    CLIENTE {
        int id PK
        string nombre "Summit Produce, Fruit Growers Alliance..."
        string pais
    }
    FRUTA {
        int id PK
        string nombre "Uva, Arandano"
    }
    AREA {
        int id PK
        string nombre "Packing, Almacen, Trazabilidad, Mantenimiento, Saneamiento"
        decimal proporcion "parte del total, ej. 0.039 almacen"
    }
    PROYECCION {
        int id PK
        int plantaId FK
        int frutaId FK
        int clienteId FK "null en COSECHA"
        string tipo "COSECHA, COMERCIAL"
        int semana
        date fecha "por dia en cosecha, null en comercial"
        decimal jabas "unica unidad de fruta"
    }
    PLAN {
        int id PK
        int plantaId FK
        int frutaId FK
        int semana
        string escenarioCosecha "PROYECTADA, +10, +20, -10"
        json parametrosUsados "valores finales del plan"
        boolean parametrosModificados "true si algun valor difiere del default"
        string estado "BORRADOR, PENDIENTE, APROBADO, RECHAZADO, EN_EJECUCION, CERRADO"
        int creadoPor FK
        datetime fechaEnvio
        int aprobadoPor FK
        datetime fechaAprobacion
        string comentarioAprobacion "obligatorio si RECHAZADO"
    }
    PLAN_DIA_AREA {
        int id PK
        int planDiaId FK
        int areaId FK
        int trabajadoresPlan
        int trabajadoresLlegaron "al iniciar"
        int trabajadoresInicio "con cuantos arranca"
        int trabajadoresPresentes "actual, cambia con registros de PERSONAL"
    }
    PLAN_DIA {
        int id PK
        int planId FK
        date fecha
        decimal jabasMeta
        int trabajadores "calculado"
        decimal horas "calculado, plan aprobado"
        decimal horasActualizadas "ajuste por volumen o personal"
        string motivoAjuste "CAMBIO_VOLUMEN, PERSONAL_PRESENTE"
    }
    JORNADA {
        int id PK
        int planDiaId FK
        datetime horaInicio
        datetime horaFin
        decimal horasEstimadasInicio "estimado al iniciar"
        int trabajadoresPresentes
        decimal jabasRecibidas
        decimal horasTrabajadas
        decimal jabasProcesadas
        decimal jabasDescarte "para % descarte"
        decimal kgLoose "para % peso loose"
        decimal kgFijo "para % peso fijo"
        boolean metaCumplida
        decimal diferencia
    }
    REGISTRO_AVANCE {
        int id PK
        int jornadaId FK
        datetime hora
        string tipo "AVANCE, PERSONAL, VOLUMEN"
        decimal jabasRecibidasAcum "AVANCE"
        decimal jabasProcesadasAcum "AVANCE"
        int areaId FK "PERSONAL"
        int cambioPersonal "PERSONAL, + llegan / - salen"
        decimal jabasEsperadasDia "VOLUMEN"
        int trabajadoresPresentes "total despues del registro"
        decimal horasEstimadas "estimado despues del registro"
        int registradoPor FK
    }
    ALERTA {
        int id PK
        int planDiaId FK
        int registroAvanceId FK "null si es de planificacion"
        string tipo "PLANIFICACION, VOLUMEN_ENTRANTE, PERSONAL_INSUFICIENTE"
        string mensaje
        datetime fecha
    }
```

### Resumen por entidad

| Entidad | Campos clave |
|---|---|
| ROL | nombre: PLANIFICADOR, SUBGERENTE o JEFE_TURNO |
| USUARIO | rolId, plantaId, nombre, email |
| PLANTA | rendimientoPersonaHora, personalMaximo, horasJornada, horasExtraMax, horaInicio, factorEficiencia, toleranciaVolumen |
| FRUTA | nombre: Uva o Arándano |
| AREA | nombre (Packing, Almacén, Trazabilidad, Mantenimiento, Saneamiento), proporción |
| CLIENTE | nombre, país |
| PROYECCION | plantaId, frutaId, clienteId (solo en COMERCIAL), tipo (COSECHA o COMERCIAL), semana, fecha (por día en cosecha), jabas |
| PLAN | plantaId, frutaId, semana, escenarioCosecha, parametrosUsados (valores finales), parametrosModificados (sí/no), estado, creadoPor, fechaEnvio, aprobadoPor, fechaAprobacion, comentarioAprobacion |
| PLAN_DIA | planId, fecha, jabasMeta, trabajadores (calculado), horas (calculado), horasActualizadas, motivoAjuste |
| PLAN_DIA_AREA | planDiaId, areaId, trabajadoresPlan, trabajadoresPresentes |
| JORNADA | planDiaId, trabajadoresPresentes, jabasRecibidas, horasTrabajadas, jabasProcesadas, jabasDescarte, kgLoose, kgFijo, metaCumplida, diferencia |
| REGISTRO_AVANCE | jornadaId, hora, jabasRecibidasAcum, jabasProcesadasAcum, trabajadoresPresentes, registradoPor |
| ALERTA | planDiaId, registroAvanceId (null si es de planificación), tipo (PLANIFICACION, VOLUMEN_ENTRANTE o PERSONAL_INSUFICIENTE), mensaje, fecha |

**Estados de PLAN**: BORRADOR (oficial, sin enviar), luego PENDIENTE (enviado a aprobación). Desde ahí pasa a APROBADO, luego EN_EJECUCION y finalmente CERRADO; o a RECHAZADO, que vuelve al planificador.

> La simulación **no se guarda** en la BD: es estado de la pantalla hasta que se aplica como plan oficial.

**Métricas calculadas (no se guardan):** rendimiento = jabasProcesadas ÷ trabajadoresPresentes ÷ horasTrabajadas; ausentismo = presentes vs plan por área; % descarte = jabasDescarte ÷ jabasProcesadas; % loose/fijo = kgLoose o kgFijo ÷ (kgLoose + kgFijo); cumplimiento = procesadas ÷ meta. Toda la fruta se cuenta en jabas. Posiciones de línea, ocupabilidad y relación directo-indirecto no se modelan.

### Descripción de cada tabla (back y front)

Convenciones generales:
- Todas las tablas llevan `createdAt` y `updatedAt`. La fruta se cuenta solo en **jabas** (no hay cajas ni conversiones) y las horas en decimal (por ejemplo, 9.5 = 9 h 30 min).
- Los enums se guardan como texto en mayúsculas.
- Back: NestJS con un módulo por agregado (auth, plantas, proyecciones, planes, jornadas, alertas). Los cálculos viven en un servicio del back (`PlanCalculatorService`), nunca solo en el front.
- Front: Next.js. Las pantallas de referencia están en el artefacto Plan de Packing · Pantallas.

#### ROL
- **Qué es:** el catálogo de roles: `PLANIFICADOR`, `SUBGERENTE` y `JEFE_TURNO`.
- **Back:**
  - Se crea por seed y no se edita desde la app.
  - Se usa en un guard de permisos:

    | Acción | Rol que puede hacerla |
    |---|---|
    | Crear, aplicar y enviar planes | Planificador |
    | Aprobar o rechazar planes, y editar la configuración de planta | Subgerente |
    | Registrar avances, ajustar horas y cerrar la jornada | Jefe de turno |
    | Ver el dashboard | Todos |
- **Front:** según el rol del usuario, decide qué opciones del menú se muestran y qué botones se habilitan.

#### USUARIO
- **Qué es:** una persona que entra al sistema.
- **Back:**
  - `email` es único y `password` se guarda con hash (bcrypt).
  - El login devuelve un JWT con `userId`, `rol` y `plantaId`.
  - `plantaId` limita lo que ve el planificador y el jefe de turno. Si el subgerente tiene `plantaId` null, ve todas las plantas.
- **Front:** pantalla de login, y nombre y rol en la cabecera. El selector de planta solo aparece si el usuario ve más de una planta.

#### PLANTA
- **Qué es:** cada planta (Piura, Sullana) con los **valores por defecto** de sus parámetros de cálculo.
- **Back:**
  - Solo el subgerente puede editarla.
  - Validaciones:
    - `rendimientoPersonaHora` > 0.
    - `personalMaximo` ≥ 1.
    - `horasJornada` entre 1 y 24.
    - `horasExtraMax` ≥ 0.
    - `factorEficiencia` entre 0.1 y 1 (en pantalla se muestra en %).
    - `toleranciaVolumen` entre 0 y 100.
  - Un cambio **no** modifica planes existentes: cada PLAN guarda sus valores finales en `parametrosUsados`.
  - Endpoints: `GET /plantas/:id` y `PATCH /plantas/:id`.
- **Front:** pantalla **Configuración de planta**, con una pestaña por planta, Guardar y Descartar, y el panel de vista previa "Así calcula el sistema", que se calcula en el cliente con la misma fórmula. El planificador los recibe como valores iniciales editables en su plan.

#### FRUTA
- **Qué es:** el catálogo de frutas (Uva, Arándano). Las variedades irán más adelante.
- **Back:** se crea por seed.
- **Front:** selector de fruta al cargar proyecciones y al crear un plan.

#### CLIENTE
- **Qué es:** los clientes del programa comercial (FGA, Summit Produce, etc.).
- **Back:** CRUD simple. Si en la carga del Excel comercial aparece un cliente nuevo, se crea.
- **Front:** columna "Cliente" de la tabla del programa comercial en la pantalla del planificador.

#### AREA
- **Qué es:** las áreas de personal (Packing, Almacén, Trazabilidad, Mantenimiento, Saneamiento) y su `proporcion` del total.
- **Back:**
  - Se crea por seed con las proporciones de la semana 41:

    | Área | Proporción |
    |---|---|
    | Almacén | 0.039 |
    | Trazabilidad | 0.025 |
    | Mantenimiento | 0.021 |
    | Saneamiento | 0.045 |
    | Packing | El resto |

  - Al calcular un PLAN_DIA, se reparte el total: las áreas de apoyo reciben `round(total × proporcion)` y Packing se queda con la diferencia, para que la suma cuadre exacto.
- **Front:** columnas por área en el plan oficial, en el detalle del plan del subgerente y en la tabla de personal del jefe de turno.

#### PROYECCION
- **Qué es:** lo que cosecha prevé que llega (por día) y lo que comercial prevé vender (por semana y cliente), siempre en jabas.
- **Back:**
  - Si `tipo = COSECHA`: `fecha` es obligatoria y `clienteId` va null.
  - Si `tipo = COMERCIAL`: `clienteId` es obligatorio y `fecha` va null.
  - Es **inmutable**: no hay update. Si hay un error, se carga una versión nueva y se marca la anterior como reemplazada (fuera del MVP; en el MVP solo se crea).
  - Carga por Excel: `POST /proyecciones/import` con `tipo`, `plantaId`, `frutaId`, `semana` y el archivo.
  - Índice: (`plantaId`, `frutaId`, `semana`, `tipo`).
- **Front:**
  - Tablas "Proyección de cosecha" y "Programa comercial" en la pantalla del planificador, con el botón "Importar Excel" y sin edición.
  - Si la cosecha de la semana es menor que el total comercial, muestra la **alerta de planificación** con la brecha en jabas y en %.

#### PLAN
- **Qué es:** el plan semanal oficial de una planta y una fruta. La simulación **no** es un PLAN: vive solo en el front hasta que se aplica.
- **Back:**
  - `POST /planes` (aplicar): recibe `plantaId`, `frutaId`, `semana`, `escenarioCosecha` y los **valores finales** de los parámetros (los defaults de la planta, cambiados o no por el planificador).
  - El back hace todo el cálculo:
    1. Guarda esos valores en `parametrosUsados`; son los que valen para el plan.
    2. Marca `parametrosModificados` si alguno difiere del default de PLANTA (solo informativo).
    3. Crea los PLAN_DIA y sus PLAN_DIA_AREA.
    4. Si ya existe un plan BORRADOR para esa planta, fruta y semana, lo reemplaza.
  - Si la cosecha no cubre el programa comercial, crea una ALERTA de tipo `PLANIFICACION`.
  - Transiciones de estado (cualquier otra devuelve 409):

    | De | A | Quién | Acción |
    |---|---|---|---|
    | BORRADOR | PENDIENTE | Planificador | `POST /planes/:id/enviar`; guarda `fechaEnvio` |
    | PENDIENTE | APROBADO | Subgerente | `POST /planes/:id/aprobar`; guarda `aprobadoPor` y `fechaAprobacion` |
    | PENDIENTE | RECHAZADO | Subgerente | `POST /planes/:id/rechazar`; `comentarioAprobacion` es obligatorio |
    | RECHAZADO | BORRADOR | Planificador | Vuelve a aplicar el plan |
    | APROBADO | EN_EJECUCION | Sistema | Automático al abrirse la primera JORNADA de la semana |
    | EN_EJECUCION | CERRADO | Sistema | Automático al cerrar la última JORNADA |

  - Solo puede haber un plan APROBADO o EN_EJECUCION por planta, fruta y semana.
  - `GET /planes?estado=&plantaId=`: lista con los totales calculados (meta, trabajadores pico y horas).
- **Front:**
  - Planificador: panel "Parámetros del plan" que arranca con los defaults de PLANTA y se puede editar, paso 2 "Plan oficial" y botón "Enviar a aprobación".
  - Subgerente (pantalla con pestañas Planes y Curso de la semana): lista **Planes**, con filtros por estado y contador de pendientes calculado, y **detalle** con KPIs, los **valores usados en el plan** (leídos de `parametrosUsados`, con "(default X)" al lado cuando difieren de PLANTA), plan diario y bloque de aprobar o rechazar.
  - Para mostrar los estados:

    | Estado | Texto en pantalla | Color |
    |---|---|---|
    | PENDIENTE | Pendiente de aprobación | Ámbar |
    | EN_EJECUCION | En ejecución | Oscuro |
    | APROBADO | Aprobado | Verde |
    | RECHAZADO | Rechazado | Coral |
    | CERRADO | Cerrado | Gris |

#### PLAN_DIA
- **Qué es:** la meta de cada día del plan, con los trabajadores y horas calculados.
- **Back:**
  - Fórmulas, con los valores de `PLAN.parametrosUsados`:
    - `trabajadores = min(ceil(jabasMeta / (rend × efic × jornada)), personalMaximo)`.
    - `horas = jabasMeta / (trabajadores × rend × efic)`.
  - `jabasMeta` y `trabajadores` quedan **fijos** cuando el plan se aprueba.
  - Durante la ejecución solo cambian `horasActualizadas` y `motivoAjuste` (`CAMBIO_VOLUMEN` o `PERSONAL_PRESENTE`), con `PATCH /plan-dias/:id/ajuste-horas` y solo el jefe de turno.
  - Derivados para la respuesta (no se guardan):
    - `margen = trabajadores × rend × efic × (jornada + extra) / jabasMeta − 1`.
    - `estadoDia`:

      | Condición | estadoDia |
      |---|---|
      | horas ≤ jornada | DENTRO_JORNADA |
      | horas > jornada | HORAS_EXTRA |
      | horas > jornada + extra | RIESGO_TURNO_EXTRA |
      | margen < tolerancia | MARGEN_BAJO |
- **Front:** filas de la tabla diaria (simulación, plan oficial y detalle del subgerente) y cabecera del jefe de turno (meta del día y horas del plan). Etiquetas de estado:

  | estadoDia | Texto en pantalla | Color |
  |---|---|---|
  | DENTRO_JORNADA | Dentro de jornada | Verde |
  | HORAS_EXTRA | Requiere horas extra | Ámbar |
  | RIESGO_TURNO_EXTRA | Riesgo de turno extra | Coral |
  | MARGEN_BAJO | Margen bajo | Ámbar |

#### PLAN_DIA_AREA
- **Qué es:** los trabajadores planificados y reales por área para un día.
- **Back:**
  - `trabajadoresPlan` se crea junto con el PLAN_DIA, repartiendo con `AREA.proporcion`.
  - Al iniciar la jornada, el jefe de turno registra por área cuántos **llegaron** (`trabajadoresLlegaron`) y con cuántos **inicia** (`trabajadoresInicio`, no puede ser mayor que los que llegaron). `trabajadoresPresentes` arranca igual a `trabajadoresInicio`.
  - Cada registro de tipo PERSONAL suma o resta en `trabajadoresPresentes` del área.
  - La suma de presentes alimenta `JORNADA.trabajadoresPresentes`.
  - Única por (`planDiaId`, `areaId`).
- **Front:** tabla de **Iniciar jornada** (plan, llegaron, inician y diferencia por área) y tabla "Personal por área" durante la jornada (plan, llegaron, iniciaron, ahora y diferencia en rojo si falta). Columnas por área en el plan. En el dashboard, el ausentismo = 1 − presentes ÷ plan.

#### JORNADA
- **Qué es:** la ejecución real de un PLAN_DIA. Se abre al iniciar el turno y se cierra al terminar.
- **Back:**
  - `POST /jornadas` (iniciar): recibe por área los que llegaron y los que inician. Guarda `horaInicio` y calcula `horasEstimadasInicio = jabasMeta ÷ (inician × rendimiento × eficiencia)`.
  - `GET /jornadas/estimar?planDiaId=&trabajadores=`: el mismo cálculo sin guardar, para que el front muestre el estimado mientras el jefe escribe (o el front lo replica con los parámetros del plan).
  - `POST /jornadas/:id/cerrar`: recibe `horasTrabajadas`, `jabasProcesadas`, `jabasDescarte`, `kgLoose` y `kgFijo`. Calcula `metaCumplida = jabasProcesadas ≥ jabasMeta` y `diferencia = jabasProcesadas − jabasMeta`.
  - Hay una jornada por PLAN_DIA.
  - Abrir la primera jornada de la semana pasa el PLAN a EN_EJECUCION; cerrar la última lo pasa a CERRADO.
  - Si queda fruta sin procesar, el caso excepcional queda fuera del MVP, pero `diferencia` negativa lo deja registrado.
- **Front:**
  - Pantalla **Jefe de turno**, en tres etapas:
    1. **Iniciar jornada:** llegaron e inician por área, horas estimadas y hora de fin aproximada, cuántos faltan para terminar en la jornada, y el botón "Iniciar jornada con N trabajadores".
    2. **Durante la jornada:** estado (en plan, no se termina en las horas del plan, riesgo de turno extra), KPIs (trabajadores ahora, horas estimadas, jabas procesadas, volumen del día), registro de eventos y la lista "Registros de hoy" con el estimado después de cada uno.
    3. **Cierre:** horas trabajadas, jabas procesadas, descarte, kg loose y kg fijo; resultado con meta cumplida y diferencia.
  - **Curso de la semana** y **Dashboard**, que muestran:
    - Ejecutado vs proyectado.
    - Horas.
    - % descarte = jabasDescarte ÷ jabasProcesadas.
    - % loose = kgLoose ÷ (kgLoose + kgFijo).
    - Rendimiento = jabasProcesadas ÷ presentes ÷ horas (jabas por persona-hora).

#### REGISTRO_AVANCE
- **Qué es:** cada cosa que el jefe de turno registra durante la jornada. Hay tres tipos:
  - `AVANCE`: jabas recibidas y jabas procesadas, acumuladas.
  - `PERSONAL`: llegan (+) o salen (−) personas de un área.
  - `VOLUMEN`: cosecha avisa que el total del día cambia (`jabasEsperadasDia`).
- **Back:**
  - `POST /jornadas/:id/registros` con `tipo` y los campos de ese tipo.
  - Validaciones: `hora` no puede ser anterior al último registro; en AVANCE los acumulados no pueden bajar; en PERSONAL `cambioPersonal` ≠ 0 y el área no puede quedar en negativo.
  - Después de cada registro se recalcula y se guarda en el mismo registro `trabajadoresPresentes` y `horasEstimadas`:
    - Productividad real = jabas procesadas ÷ horas-persona trabajadas hasta el último AVANCE (antes del primer avance se usa rendimiento × eficiencia).
    - Pendiente = volumen esperado del día − jabas procesadas.
    - `horasEstimadas` = horas transcurridas + pendiente ÷ (trabajadores actuales × productividad).
    - `esperado = jabasMeta × horas transcurridas ÷ horas del plan`.
    - `desvío = (recibidas − esperado) ÷ esperado`.
  - Reglas de alertas:

    | Condición | Alerta | Qué más hace |
    |---|---|---|
    | desvío > `toleranciaVolumen` | `VOLUMEN_ENTRANTE` | — |
    | `horasEstimadas` > horas del plan por menos presentes | `PERSONAL_INSUFICIENTE` | Propone horas actualizadas |
    | `horasEstimadas` > jornada + extra | La alerta que corresponda | Marca riesgo de turno extra |
- **Front:**
  - Formulario **Registrar en la jornada** con pestañas: Avance de volumen (hora, jabas recibidas, jabas procesadas), Cambio de personal (hora, cantidad, área) y Cambio de volumen del día (hora, jabas esperadas).
  - Lista "Registros de hoy" con el estimado de horas después de cada registro y las alertas que generó.
  - Muestra la alerta y el botón "Ajustar horas" cuando aplica.

#### ALERTA
- **Qué es:** un aviso generado por el sistema, nunca a mano.
- **Back:** tipos:

  | Tipo | Cuándo se crea | Ligada a |
  |---|---|---|
  | `PLANIFICACION` | Al aplicar el plan, si la cosecha no cubre lo comercial | Primer PLAN_DIA o plan completo; `registroAvanceId` null |
  | `VOLUMEN_ENTRANTE` | En un avance, si el desvío supera la tolerancia | Ese REGISTRO_AVANCE |
  | `PERSONAL_INSUFICIENTE` | En un avance, si faltan trabajadores para cumplir las horas | Ese REGISTRO_AVANCE |

  - `mensaje` guarda el texto listo para mostrar, con los números.
  - `GET /alertas?plantaId=&fecha=`.
- **Front:**
  - Banner coral en la pantalla del planificador (planificación) y en la del jefe de turno (volumen y personal).
  - Contador en el dashboard.
  - Siempre con ícono y texto, nunca solo color.

---

## 7. Marca y estilo de las pantallas

| Elemento | Valor |
|---|---|
| Verde | #2E9E4A (#1E7F38 en textos y botones) |
| Coral | #E2483C (#C2382C en textos); reservado para alertas |
| Oscuro | #1F1F1F |
| Fondo | #F3F4F2 |
| Tarjetas | Blancas y redondeadas, con títulos de sección en forma de píldora |
| Tipografía | Baloo 2 para títulos y Nunito para el texto |
| Logo | Marca "p" con el texto "purafruit" en #3DBE5C |
| Gráficos | Proyectado en ámbar #E8A23A y ejecutado en verde #1E7F38 (paleta validada para daltonismo) |

---

## 8. Pendientes y supuestos por confirmar

- **Valores oficiales**: confirmar el rendimiento estándar por persona-hora y el personal máximo de cada planta.
- **Brecha comercial por cliente**: qué clientes no se cubren y en qué %. Necesitará una entidad tipo PRODUCCION_CLIENTE.
- **Fruta que pasa al día siguiente**: los casos excepcionales quedan fuera del MVP.
- **Historial**: el historial de aprobaciones y de ajustes de horas queda fuera del MVP; hoy son campos en PLAN y PLAN_DIA.
- **Datos de Sullana**: "Curso de la semana" solo tiene datos reales de Piura.
- **Audio del reto**: no se pudo transcribir en el entorno en la nube, así que su contexto no está incluido.
