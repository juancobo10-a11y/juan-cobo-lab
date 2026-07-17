# Architecture Review — S-018: Matriz de Operacionalización

**Sprint:** S-018  
**Date:** 2026-07-17  
**Scope:** OperationalizationService, PantallaOperationalizationMatrix, Helios state extension, ADR-0007

---

## 1. ¿Cómo se representa una matriz de operacionalización?

Una `OperationalizationMatrix` es una entidad session-only (in-memory) que agrupa filas (`OperationalizationRow[]`) bajo una referencia a la hipótesis que operacionaliza:

```
OperationalizationMatrix {
  id: string
  hypothesisId: string          ← referencia a PolicyHypothesis.id (1:1 con ConceptualModel)
  rows: OperationalizationRow[]
  confirmed: boolean
}

OperationalizationRow {
  id: string
  variableId: string            ← FK → ConceptualVariable.id
  dimension: Dimension          ← embebida (pertenece a exactamente una fila)
  indicatorId: string | null    ← FK → ConceptualIndicator.id  (reutilizar, no copiar)
  escala: EscalaMedicion | ""   ← catálogo: nominal/ordinal/intervalo/razón/índice-compuesto
  sourceId: string | null       ← FK → EvidenceSource.id  (reutilizar, no copiar)
  observaciones: string
  orden: number
}

Dimension {
  id: string
  nombre: string                ← etiqueta corta (p. ej. "Infraestructura")
  definicionOperacional: string ← ¿Cómo sabré que esta dimensión está presente?
  orden: number
}
```

**Diseño de colecciones planas:** Las filas son planas dentro de la matriz — no están anidadas bajo las variables. Esto facilita actualizaciones atómicas, reordenamiento global y validación uniforme. La jerarquía `variable → filas` se reconstruye en la UI mediante filtrado por `variableId`.

---

## 2. ¿Qué diferencia existe entre variable conceptual y dimensión?

| Aspecto | ConceptualVariable | Dimension |
|---|---|---|
| Qué representa | Constructo analítico del modelo conceptual (S-017) | Sub-aspecto observable de ese constructo |
| Propósito | Definir qué concepto se quiere medir | Descomponer el concepto en aspectos concretos |
| Ejemplos | "Calidad educativa" | "Infraestructura", "Docentes", "Resultados" |
| Persistencia | Parte del ConceptualModel | Embebida en OperationalizationRow |
| Relación | 1 variable → muchas dimensiones (muchas filas) | 1 dimensión → 1 fila (embedded) |
| Creación | Analista la define en PantallaConceptualModel | Analista la define al agregar una fila a la matriz |
| Pregunta que responde | ¿Qué concepto quiero operacionalizar? | ¿Cómo sabré que este aspecto está presente? |

La variable conceptual es el "qué". La dimensión es el "cómo observarlo", específico y operacionalizable.

Nota metodológica: Una variable conceptual puede carecer de dimensiones (la matriz no tiene filas para esa variable) — esto genera un error bloqueante `variable-sin-dimension`. Es la señal de que el analista dejó un constructo sin operacionalizar.

---

## 3. ¿Cómo se reutilizan indicadores?

Los indicadores se reutilizan **por ID, sin duplicar datos**. La operación `reutilizarIndicador(matrix, conceptualModel, rowId, indicatorId)` simplemente asigna `indicatorId` en la fila — no copia ningún campo del `ConceptualIndicator`.

```
OperationalizationRow.indicatorId = "ind-abc"
                                         ↓
                           ConceptualIndicator { id: "ind-abc", nombre: "...", unidad: "%" }
```

La UI lee el nombre y la unidad del indicador desde el `ConceptualModel` en tiempo de renderización. Si el indicador cambia (el analista lo edita en PantallaConceptualModel), la matriz refleja automáticamente el cambio porque solo guarda el ID.

Restricciones:
- El `indicatorId` solo puede referenciar indicadores que existen en el `ConceptualModel` asociado a la misma hipótesis.
- `createRow()` y `updateRow()` guardan (`throw`) si el ID no existe.

---

## 4. ¿Cómo se reutilizan fuentes?

Idéntico patrón que los indicadores. `reutilizarFuente(matrix, conceptualModel, rowId, sourceId)` asigna `sourceId` — no copia `EvidenceSource`.

La UI filtra las fuentes disponibles para una fila según la variable: solo muestra fuentes que referencian al menos un indicador de esa variable (`EvidenceSource.indicadorIds ∩ indicators(variableId) ≠ ∅`). Esto evita asignar fuentes que metodológicamente no aplican a la variable en cuestión.

---

## 5. ¿Qué validaciones existen?

`validateOperationalization()` devuelve `OperationalizationValidation` con dos listas:

### Blocking (bloquean confirmación)
| Código | Condición |
|---|---|
| `sin-filas` | La matriz no tiene ninguna fila |
| `variable-sin-dimension` | Una variable del `ConceptualModel` no tiene ninguna fila en la matriz |
| `dimension-sin-definicion` | La definición operacional de una dimensión está vacía |
| `indicador-ausente` | Una fila no tiene indicador asignado (`indicatorId === null`) |
| `fuente-ausente` | Una fila no tiene fuente asignada (`sourceId === null`) |

### Warnings (informan sin bloquear)
| Código | Condición |
|---|---|
| `unidad-vacia` | El indicador referenciado tiene `unidad` vacía |
| `escala-vacia` | La fila no tiene escala de medición asignada |
| `observaciones-vacias` | Las observaciones están vacías |

La edición nunca se bloquea. Solo la confirmación (`Confirmar matriz`) se bloquea cuando `blockingIssues.length > 0`.

---

## 6. ¿Cómo se evita duplicidad?

Tres mecanismos:

**1. Reutilización por ID:** Los indicadores y fuentes del `ConceptualModel` se referencian por ID. No se copian campos. No puede existir un `ConceptualIndicator` "de la matriz" — hay exactamente un ConceptualIndicator por ID en el modelo.

**2. Deduplicación de dimensiones:** `isDimensionNameDuplicate(matrix, variableId, nombre, excludeRowId?)` detecta nombres de dimensión normalizados idénticos dentro de la misma variable. La normalización colapsa mayúsculas y espacios múltiples: `"  INFRAESTRUCTURA  "` === `"infraestructura"`.

**3. Separación de capas:** La matriz no es parte del `ConceptualModel`. Extiende el modelo sin modificarlo. Si se elimina una variable del modelo conceptual y el analista vuelve a la pantalla de la matriz, la validación detectará la fila huérfana (`variable-sin-dimension` inverso — la fila referencia una variableId que ya no existe en el modelo). Eso se maneja en validación futura si se añade `variable-eliminada-en-cm` como issue.

---

## 7. ¿Qué deuda técnica permanece?

| Ítem | Descripción | Impacto |
|---|---|---|
| Persistencia | Session-only — reload pierde todo | Alto para uso real |
| Sincronización CM→Matriz | Si una variable del CM se elimina, la fila de la matriz queda con variableId huérfano; no hay cascada automática | Medio |
| Exportación | Sin exportación a PDF, Excel o instrumento de recolección | Medio |
| Sugerencias de dimensiones | Sin generación asistida de dimensiones ni catálogos sectoriales | Medio |
| Validación semántica de escalas | El analista puede asignar "nominal" a un índice compuesto sin detección | Bajo |
| Multi-hipótesis en UI | La pantalla solo muestra la hipótesis primaria; para otras hipótesis el analista debe navegar manualmente | Bajo |

---

## 8. ¿Está HELIOS preparado para diseñar un plan de contrastación?

**Sí, con las siguientes condiciones:**

**Listo:**
- La cadena metodológica completa está implementada y trazable:
  `problema → hipótesis → modelo conceptual → variables → indicadores → fuentes → matriz de operacionalización → dimensiones → escala`.
- Cada constructo puede operacionalizarse explícitamente (ADR-0007).
- La elección de escala de medición es parte de la matriz confirmada.
- `OperationalizationService` es puro y testeable (34 asserts en 15 TCs).
- La regresión completa permanece en verde: 11/11 suites.

**Para un plan de contrastación real (sprint futuro):**

Un plan de contrastación requiere, adicionalmente:
1. **Tipo de diseño:** experimental, cuasi-experimental, observacional, documental.
2. **Estrategia de análisis:** regresión, comparación de casos, análisis de series de tiempo, análisis documental.
3. **Criterios de falsabilidad:** condiciones bajo las cuales la hipótesis se rechazaría.
4. **Cronograma y presupuesto de recolección.**

Los puntos 1 y 2 dependen directamente de la `EscalaMedicion` elegida en la matriz — razón por la que la escala es obligatoria para confirmar. Con la escala definida, HELIOS puede guiar al analista hacia los estadísticos apropiados y el tipo de diseño compatible.

El siguiente sprint natural sería: **Plan de Contrastación** — un módulo que, dado el modelo operacionalizado, propone el tipo de diseño más adecuado (tabla de compatibilidad escala × diseño) y permite al analista especificar criterios de falsabilidad por hipótesis.
