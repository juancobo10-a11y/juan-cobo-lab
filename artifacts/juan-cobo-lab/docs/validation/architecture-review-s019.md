# Architecture Review — S-019: Matriz de Contrastación de Hipótesis

**Sprint:** S-019  
**Date:** 2026-07-17  
**Scope:** ContrastationService, PantallaContrastationMatrix, PantallaRevisionFinal, ADR-0008, Helios state extension

---

## 1. ¿Cómo se representa una matriz de contrastación?

Una `ContrastationMatrix` es una entidad session-only (in-memory) que agrupa criterios de contrastación (`ContrastationRow[]`) bajo la referencia a la hipótesis que contrastan:

```
ContrastationMatrix {
  id: string
  hypothesisId: string          ← referencia a PolicyHypothesis.id (1:1 con OperationalizationMatrix)
  rows: ContrastationRow[]
  confirmed: boolean
}

ContrastationRow {
  id: string
  hypothesisId: string          ← denormalized for traceability
  indicadorId: string | null    ← FK → ConceptualIndicator.id  (reutilizar, no copiar)
  fuenteId: string | null       ← FK → EvidenceSource.id       (reutilizar, no copiar)
  evidenciaEsperada: string     ← libre: ¿qué observaríamos si la hipótesis fuera consistente?
  evidenciaContraria: string    ← libre: ¿qué resultado la pondría en duda?
  criterioInterpretacion: string← libre: regla para leer el resultado del indicador
  limitaciones: string          ← libre: limitaciones conocidas de este criterio
  prioridad: Prioridad | ""     ← catálogo: alta | media | baja (no asignada automáticamente)
  observaciones: string
  orden: number
}
```

La relación entre capas:
```
PolicyHypothesis
  └── ConceptualModel (variables, indicators, sources)
       └── OperationalizationMatrix (variable × dimension × indicator × scale × source)
            └── ContrastationMatrix (indicator × source × expected × contrary × interpretation)
```

---

## 2. ¿Qué diferencia existe entre operacionalización y contrastación?

| Aspecto | Operacionalización (S-018) | Contrastación (S-019) |
|---|---|---|
| **Pregunta central** | ¿Cómo se observará la variable? | ¿Qué evidencia apoyaría o refutaría la hipótesis? |
| **Unidad de análisis** | Variable conceptual → dimensión | Indicador × criterio de decisión |
| **Enfoque** | Descriptivo: qué medir y cómo | Evaluativo: qué resultado esperamos y qué nos haría dudar |
| **Resultado** | Definición operacional de dimensiones | Protocolo de falsación de la hipótesis |
| **Escala de medición** | Sí (nominal, ordinal, intervalo...) | No aplica — la evidencia es libre |
| **Contenido libre** | Observaciones metodológicas | evidenciaEsperada, evidenciaContraria, criterioInterpretacion, limitaciones |
| **Relación con hipótesis** | Transforma conceptos en observables | Define cuándo la hipótesis sería refutada |
| **Bloqueos** | variable-sin-dimension, indicador-ausente... | fila-sin-evidencia-esperada, fila-sin-evidencia-contraria... |

**Metáfora:** La operacionalización responde "¿con qué termómetro mido la temperatura?". La contrastación responde "¿qué temperatura me haría decir que el paciente está sano o enfermo?".

---

## 3. ¿Cómo se reutilizan indicadores?

Exactamente igual que en S-018 — por ID de referencia, sin duplicar datos:

```
ContrastationRow.indicadorId = "ind-abc"
                                    ↓
                    ConceptualIndicator { id: "ind-abc", nombre: "...", unidad: "%" }
```

La función `reutilizarIndicadorEnContrastation(matrix, cm, rowId, indicadorId)` simplemente asigna el FK. El nombre y la unidad del indicador se leen del `ConceptualModel` en tiempo de renderización. Si el analista edita el indicador en el modelo conceptual, la contrastación refleja el cambio automáticamente.

**Guard:** `createContrastationRow` y `updateContrastationRow` lanzan error si el `indicadorId` no existe en el `ConceptualModel`. Esto previene referencias huérfanas desde el momento de creación.

---

## 4. ¿Cómo se reutilizan fuentes?

Idéntico patrón que los indicadores:

```
ContrastationRow.fuenteId = "src-xyz"
                                 ↓
                EvidenceSource { id: "src-xyz", nombre: "DANE", tipo: "administrativo" }
```

`reutilizarFuenteEnContrastation(matrix, cm, rowId, fuenteId)` asigna el FK. Sin copia de datos. La UI muestra la lista completa de fuentes del modelo conceptual (no filtra por variable, a diferencia de S-018) — en contrastación el analista puede cruzar indicadores y fuentes de diferentes variables si su criterio lo requiere.

---

## 5. ¿Qué validaciones se implementaron?

`validateContrastation()` devuelve `ContrastationValidation` con dos listas:

### Blocking (bloquean confirmación)
| Código | Condición |
|---|---|
| `sin-filas` | La matriz no tiene ningún criterio |
| `fila-sin-indicador` | Una fila no tiene indicador asignado |
| `fila-sin-fuente` | Una fila no tiene fuente asignada |
| `fila-sin-evidencia-esperada` | La evidencia esperada está vacía |
| `fila-sin-evidencia-contraria` | La evidencia contraria está vacía |

### Warnings (informan sin bloquear)
| Código | Condición |
|---|---|
| `sin-criterio-interpretacion` | El criterio de interpretación está vacío |
| `sin-limitaciones` | Las limitaciones están vacías |
| `prioridad-vacia` | No se ha asignado prioridad |

**Regla de diseño:** `evidenciaEsperada` y `evidenciaContraria` son blocking porque sin ellas la contrastación no tiene contenido metodológico. Las otras tres son warnings porque añaden contexto pero no invalidan el criterio.

---

## 6. ¿Cómo se evita duplicidad?

**Tres mecanismos:**

**1. Reutilización por FK:** `indicadorId` y `fuenteId` son referencias, nunca copias. Una misma fuente puede aparecer en múltiples criterios sin duplicar su información.

**2. Deduplicación de combinaciones indicador+fuente:** `isContrastationRowDuplicate(matrix, indicadorId, fuenteId, excludeRowId?)` detecta si ya existe una fila con la misma combinación. A diferencia de S-018 (que deduplica por nombre de dimensión dentro de una variable), aquí la unidad de deduplicación es el par (indicadorId, fuenteId) dentro de la matriz. Filas con `indicadorId === null` o `fuenteId === null` nunca se consideran duplicadas.

**3. Separación de capas:** `ContrastationMatrix` no modifica ni extiende `OperationalizationMatrix`. Coexisten en estado de sesión como colecciones independientes. Ambas apuntan al mismo `hypothesisId` pero no se accoplan.

---

## 7. ¿Cómo se preserva la trazabilidad?

La cadena completa de trazabilidad es ahora:

```
problema (texto libre)
  ↓
Thinking Pattern (ThinkingPattern.metadata.titulo)
  ↓
PolicyHypothesis (titulo, formulacion)
  ↓
ConceptualModel (hypothesisId → variables → indicators → sources)
  ↓
OperationalizationMatrix (hypothesisId → rows[variableId → dimension → indicatorId → sourceId])
  ↓
ContrastationMatrix (hypothesisId → rows[indicadorId → fuenteId → evidencia])
```

**En `ContrastationRow`:** el campo `hypothesisId` está denormalizado (la matrix ya lo tiene) para que cada fila sea trazable de forma independiente sin navegar al objeto padre. Esto sigue el patrón de `ContrastationRow.hypothesisId` establecido en la spec.

**En `PantallaRevisionFinal`:** la vista consolidada muestra todas las capas simultáneamente, con botones de navegación a cada pantalla. No duplica datos — lee del estado de sesión en tiempo de render. Cada etapa tiene un badge verde (confirmada) o gris (pendiente).

---

## 8. ¿Qué limitaciones metodológicas permanecen?

| Limitación | Impacto |
|---|---|
| Sin tipo de diseño de evaluación | El analista sabe qué evidencia buscar pero no cómo diseñar el estudio |
| Sin estrategia estadística | No hay guía sobre qué estadístico usar dado el tipo de escala |
| Sin criterios de falsabilidad formalizados | La evidencia contraria es libre — no hay umbral cuantitativo |
| Sin protocolo de recolección | Cronograma, presupuesto y responsables están fuera del alcance |
| Sin comparación entre hipótesis | Si hay múltiples hipótesis, no hay matriz que las compare entre sí |
| Contrastación desacoplada del diseño | La contrastación describe qué observar pero no cómo organizarlo en campo |

---

## 9. ¿Qué deuda técnica queda?

| Ítem | Descripción | Impacto |
|---|---|---|
| Persistencia | Session-only — reload pierde todo | Alto para uso real |
| Exportación | Sin exportación a PDF, protocolo ICDP, ni instrumento de recolección | Alto |
| Sincronización CM→Contrastación | Si un indicador del CM se elimina, `indicadorId` en la fila queda huérfano | Medio |
| Validación semántica | No se detecta si `evidenciaEsperada` repite textualmente a `evidenciaContraria` | Bajo |
| Multi-hipótesis en UI | La pantalla de revisión final solo muestra la hipótesis primaria | Bajo |
| Umbral cuantitativo | La evidencia contraria es texto libre — sin umbral formal de refutación | Medio |
| Criterios de comparación | Sin herramienta para comparar plausibilidad entre hipótesis rivales | Medio |

---

## 10. ¿Está HELIOS preparado para construir diseños completos de evaluación?

**En parte — con condiciones:**

**Completamente listo:**
- La cadena metodológica de análisis está completa y trazable de extremo a extremo.
- Toda hipótesis puede ahora operacionalizarse (S-018) y contrastarse (S-019) de forma explícita.
- El analista no puede afirmar que una hipótesis fue "contrastada" sin haber definido qué evidencia la hubiera refutado (ADR-0008).
- La vista de revisión final (§16) consolida toda la cadena en una pantalla navegable.
- La regresión completa permanece en verde: 12/12 suites.

**Para diseños completos de evaluación real (sprint futuro):**

Un diseño de evaluación completo requiere adicionalmente:

1. **Tipo de diseño empírico:** experimental (RCT), cuasi-experimental (diferencias-en-diferencias, regresión discontinua), observacional, documental. Depende de la `EscalaMedicion` elegida en la operacionalización.

2. **Estrategia estadística:** regresión lineal/logística, análisis de series de tiempo, PSM, análisis de correspondencias — determinada por el diseño y la escala.

3. **Cronograma de recolección:** quién recolecta, cuándo, con qué presupuesto.

4. **Criterios formales de falsabilidad:** umbral cuantitativo (p < 0.05, tamaño de efecto mínimo) en lugar de texto libre.

5. **Protocolo de triangulación:** cómo combinar múltiples criterios de contrastación en un juicio global sobre la hipótesis.

Los puntos 1 y 2 dependen directamente de la `EscalaMedicion` y de los `indicadorId` ya definidos — HELIOS tiene toda la información necesaria para guiar al analista hacia el diseño apropiado. El siguiente sprint natural sería: **Plan de Evaluación** — una pantalla que, dado el modelo operacionalizado y los criterios de contrastación, proponga el tipo de diseño más adecuado y los estadísticos compatibles.
