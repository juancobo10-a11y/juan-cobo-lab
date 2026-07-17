# Architecture Review — S-017: Modelo Conceptual de Variables, Indicadores y Evidencia

**Sprint:** S-017  
**Date:** 2026-07-17  
**Scope:** ConceptualModelService, PantallaConceptualModel, Helios state extension, ADR-0006

---

## 1. ¿Cómo se representa un modelo conceptual?

Un `ConceptualModel` es una entidad session-only (in-memory) que agrupa tres colecciones planas bajo una referencia a la hipótesis que operacionaliza:

```
ConceptualModel {
  id: string
  hypothesisId: string          ← referencia a PolicyHypothesis.id
  variables: ConceptualVariable[]
  indicators: ConceptualIndicator[]
  evidenceSources: EvidenceSource[]
  confirmed: boolean
}
```

Las relaciones se expresan mediante IDs (no nesting profundo):
- `ConceptualIndicator.variableId` → `ConceptualVariable.id`
- `EvidenceSource.indicadorIds[]` → `ConceptualIndicator.id[]`

Las colecciones son planas para facilitar actualizaciones atómicas e inmutabilidad: en lugar de anidar `variable.indicators[].sources`, cada nivel vive en su propia lista y se une en la capa de UI mediante filtrado por ID.

---

## 2. ¿Qué diferencia existe entre hipótesis y variable?

| Aspecto | PolicyHypothesis | ConceptualVariable |
|---|---|---|
| Propósito | Enunciado causal explícito (ADR-0005) | Entidad observable que el indicador mide |
| Nivel | Argumento teórico | Concepto operacionalizable |
| Campos | titulo, formulacion, causa, mecanismo, resultadoEsperado | nombre, descripcion, definicionOperacional, rol |
| Relación | Puede tener muchas variables a través de su ConceptualModel | Pertenece a exactamente un ConceptualModel → una hipótesis |
| Validación | validateHypothesis() — coherencia estructural del argumento | validateConceptualModel() — integridad referencial |

La hipótesis responde "¿qué se cree que está pasando y por qué?". La variable responde "¿qué habría que observar para verificarlo?".

Nota: `PolicyHypothesis` ya tiene `variables: HypothesisVariable[]` para el esquema causal básico (roles en el argumento). `ConceptualVariable` en `ConceptualModel` es más rica — incluye `definicionOperacional` y es el punto de anclaje para los indicadores. Son entidades complementarias, no redundantes.

---

## 3. ¿Cómo se relacionan variables e indicadores?

Relación uno-a-muchos estricta: una variable → muchos indicadores; un indicador → exactamente una variable.

```
ConceptualVariable (id: "var-X")
  ←── ConceptualIndicator (variableId: "var-X")
  ←── ConceptualIndicator (variableId: "var-X")
```

`ConceptualModelService.createIndicator()` rechaza con excepción si `variableId` no existe en el modelo. Eliminar una variable (via `removeVariable()`) elimina en cascada sus indicadores y limpia las referencias en las fuentes.

`reorderIndicators(model, variableId, orderedIds)` reordena únicamente los indicadores de una variable sin afectar los de otras.

---

## 4. ¿Cómo se vinculan las fuentes?

Relación muchos-a-muchos entre fuentes e indicadores: una fuente puede servir a múltiples indicadores; un indicador puede tener múltiples fuentes.

```
EvidenceSource (indicadorIds: ["ind-A", "ind-B"])
  ──→ ConceptualIndicator (id: "ind-A")
  ──→ ConceptualIndicator (id: "ind-B")
```

`createEvidenceSource()` valida que todos los IDs en `indicadorIds` existan antes de crear la fuente. Si un indicador es eliminado, `removeIndicator()` lo limpia de `EvidenceSource.indicadorIds` y elimina las fuentes que quedan con `indicadorIds` vacío (cascada suave).

---

## 5. ¿Qué validaciones se implementaron?

`validateConceptualModel()` devuelve `ConceptualModelValidation` con dos listas:

### Blocking (bloquean la confirmación)
| Código | Condición |
|---|---|
| `hipotesis-sin-variables` | El modelo no tiene ninguna variable |
| `indicador-sin-variable` | El `variableId` no apunta a una variable del modelo (estado corrupto) |
| `fuente-sin-indicador` | Todos los `indicadorIds` de una fuente apuntan a indicadores inexistentes |

### Warnings (no bloquean edición ni confirmación)
| Código | Condición |
|---|---|
| `variable-sin-rol` | El campo `rol` está vacío |
| `variable-sin-indicadores` | La variable existe pero no tiene indicadores asociados |
| `indicador-sin-fuente` | El indicador existe pero ninguna fuente lo referencia |
| `duplicado-variable` | Nombre normalizado idéntico a otra variable del modelo |
| `duplicado-indicador` | Nombre normalizado idéntico a otro indicador de la misma variable |
| `duplicado-fuente` | Nombre normalizado idéntico a otra fuente del modelo |

La edición nunca se bloquea. Solo la confirmación se bloquea cuando `blockingIssues.length > 0`.

---

## 6. ¿Cómo se preserva la trazabilidad?

La cadena completa es:

```
problema (string)
  → ThinkingPattern (ThinkingResult → perequeMode.pattern.metadata.id)
    → ReflectionAnswer[] (questionKey, patternId, answerText)
      → PolicyHypothesis (sourceQuestionIds[], thinkingPatternIds[])
        → ConceptualModel (hypothesisId FK)
          → ConceptualVariable[] (rol, definicionOperacional)
            → ConceptualIndicator[] (variableId FK, unidad, periodicidad)
              → EvidenceSource[] (indicadorIds FK[], tipo, acceso)
```

`ConceptualModel.hypothesisId` es la llave que une el modelo con la hipótesis. Si la hipótesis se elimina del estado de sesión, el modelo huérfano permanece en memoria hasta el reinicio (sin efectos secundarios — el modelo no tiene referencias inversas a la sesión).

La vista de trazabilidad en `PantallaConceptualModel` renderiza la cadena completa de forma jerárquica en lectura: problema → hipótesis → variables → indicadores → fuentes.

---

## 7. ¿Qué decisiones metodológicas quedaron fuera?

1. **Generación asistida de indicadores**: HELIOS no sugiere indicadores para una variable dada. Se requiere un catálogo sectorial o LLM — fuera del scope de S-017.
2. **Ranking o priorización de variables**: no hay mecanismo para marcar una variable como "más importante". El orden es libre.
3. **Relaciones entre variables (DAG)**: la hipótesis define una causalidad lineal implícita (causa → mecanismo → resultado). HELIOS no produce aún un Directed Acyclic Graph explícito. Tarea futura.
4. **Validación semántica de roles**: una hipótesis con tres variables "causa" y ninguna "resultado" es estructuralmente válida pero metodológicamente débil. HELIOS solo valida la integridad referencial, no la coherencia lógica de los roles.
5. **Múltiples modelos por hipótesis**: la decisión fue 1:1 (una hipótesis → un modelo). Escenarios comparativos (modelo optimista vs. pesimista) quedan fuera de S-017.

---

## 8. ¿Qué deuda técnica permanece?

| Ítem | Descripción | Impacto |
|---|---|---|
| Persistencia | Modelo session-only — reload pierde todo | Alto para uso real |
| Generación asistida | Sin sugerencias de indicadores ni catálogos | Medio |
| Visualización relacional | Solo vista jerárquica; no hay diagrama DAG | Bajo (cosmético) |
| Modelo multi-hipótesis | Solo el modelo de la hipótesis primaria se muestra en la pantalla | Bajo — fácil de extender |
| Exportación | No hay JSON export del modelo para reusar | Medio |

---

## 9. ¿Cómo prepara este sprint la generación futura de indicadores automáticos?

S-017 establece el **contrato de datos** que los indicadores automáticos deberán satisfacer:

- `ConceptualIndicator` ya tiene todos los campos que un LLM o regla de negocio necesitaría rellenar: `nombre`, `unidad`, `formulaOCriterio`, `periodicidad`, `nivelTerritorial`, `disponibilidad`.
- `ConceptualVariable.definicionOperacional` es el prompt natural para un generador de indicadores ("dado este texto, ¿qué mide y cómo?").
- `validateConceptualModel()` actuará como validador del output generado — rechazando indicadores sin variable o fuentes huérfanas.
- La interface `ThinkingAlgorithm` (ADR-0003 pattern) podría aplicarse análogamente para crear una `IndicatorGenerationStrategy` intercambiable.

El analista puede hoy construir el mismo modelo que un sistema futuro generaría — esto valida el contrato antes de automatizar.

---

## 10. ¿Está HELIOS listo para una etapa de diseño de investigación?

**Sí, con las siguientes condiciones:**

**Listo:**
- Cadena completa problema → hipótesis → variables → indicadores → fuentes está implementada y trazable.
- Validación estructural funciona y distingue errores bloqueantes de advertencias.
- La UI es accessible (keyboard navigation, aria-labels, botones reales).
- `ConceptualModelService` es puro y testeable de forma aislada (20/20 casos).
- Todos los sprints anteriores permanecen en verde (regresión completa 10/10 suites).

**Condiciones para producción:**
- La persistencia es session-only. Para un diseño de investigación real se necesita exportar a PDF/JSON o integrar un store persistente.
- El modelo solo muestra la hipótesis primaria (o la primera). Si el analista tiene 3 hipótesis, construye los modelos secuencialmente.

**Próximo paso natural:** exportación del modelo conceptual completo (variables + indicadores + fuentes) a un documento estructurado, o integración con una matriz de operacionalización estándar.
