# S-022 Architecture Review — Motor de Evaluación de Evidencia

**Sprint:** S-022  
**Fecha:** 2026-07-17  
**Autor:** Agente HELIOS  
**Estado:** Completado

---

## Preguntas de revisión arquitectónica

### 1. ¿Por qué tres capas (ContrastationRow / ObservedEvidence / EvidenceAssessment) en lugar de dos?

**Decisión:** Tres capas separadas.  
**Justificación:** La evidencia esperada (ContrastationRow) representa un plan metodológico. La evidencia observada (ObservedEvidence) representa un dato empírico. La evaluación (EvidenceAssessment) representa un juicio interpretativo. Mezclar cualquiera de estos tres niveles introduce ambigüedad sobre qué es dato y qué es interpretación — un error metodológico fundamental en análisis de política pública.

### 2. ¿Por qué la conclusión (HypothesisEvidenceConclusion) es una entidad separada de EvidenceEvaluationMatrix?

**Decisión:** Entidades separadas, referenciadas por ID.  
**Justificación:** La matriz registra evidencia y evaluaciones (múltiples por hipótesis); la conclusión es un juicio sintético único por hipótesis. Mantenerlas separadas permite: (a) confirmar la matriz sin haber formulado la conclusión; (b) actualizar la conclusión sin invalidar la evidencia registrada; (c) auditar independientemente si la conclusión es consistente con las evaluaciones.

### 3. ¿Por qué HELIOS no sugiere automáticamente el `conclusionStatus`?

**Decisión:** HELIOS no auto-asigna `conclusionStatus`.  
**Justificación:** Un conteo de "2 apoya / 1 debilita" no puede traducirse automáticamente en "provisionalmente apoyada" sin inferencia semántica sobre la calidad y relevancia de cada evidencia. HELIOS muestra el resumen descriptivo (conteos por dirección y confianza) para orientar el juicio del investigador, pero la conclusión la formula el investigador. Ver ADR-0011.

### 4. ¿Por qué `EvidenceAssessment.confidence ≠ probabilidad estadística`?

**Decisión:** `confidence` es una valoración cualitativa del investigador.  
**Justificación:** HELIOS trabaja con evidencia cualitativa y cuantitativa mezclada. Traducir confianza a probabilidad requiere un modelo estadístico que HELIOS no tiene ni puede tener sin datos de entrenamiento específicos del dominio. `confidence` es un campo declarativo — el investigador declara su percepción de la solidez de la fuente y el hallazgo.

### 5. ¿Cómo garantiza la trazabilidad la cadena EvidenceAssessment → ObservedEvidence → ContrastationRow → ConceptualModel → PolicyHypothesis?

**Decisión:** Todos los vínculos son por ID, nunca por valor copiado.  
**Implementación:** `EvidenceAssessment.observedEvidenceId → ObservedEvidence.id`, `ObservedEvidence.contrastationRowId → ContrastationRow.id`, `ObservedEvidence.indicatorId → ConceptualIndicator.id`, `ObservedEvidence.sourceId → EvidenceSource.id`. Ninguna entidad duplica el nombre de otra.

### 6. ¿Por qué los EVD rules viven en `MethodologicalConsistencyService` y no en un servicio separado?

**Decisión:** EVD rules en `ALL_RULES` del MCS.  
**Justificación:** Las reglas EVD evalúan propiedades metodológicas estructurales (cobertura de criterios, consistencia de referencias, integridad de evaluaciones) — el mismo tipo de análisis que los demás grupos de reglas. Separar el módulo crearía dos sistemas de auditoría y dificultaría obtener un informe consolidado. La `MethodologicalAuditInput` fue extendida con campos opcionales para mantener compatibilidad hacia atrás.

### 7. ¿Cómo maneja HELIOS evidencia de fuentes alternativas (EVD-003)?

**Decisión:** EVD-003 emite `warning`, no `error`.  
**Justificación:** Una fuente diferente a la planificada puede ser metodológicamente justificable (datos más recientes, mayor representatividad, fuente complementaria). El investigador debe documentar la justificación en `EvidenceAssessment.limitations` o `alternativeInterpretations`. HELIOS no prohíbe la sustitución de fuente — la registra y la señala para revisión.

### 8. ¿Cómo se extiende el Knowledge Graph con los nuevos tipos de nodo?

**Decisión:** Tres nuevos NodeType (`observed-evidence`, `evidence-assessment`, `hypothesis-conclusion`) y cinco nuevas RelationType (`observes`, `evaluates`, `supports-conclusion`, `weakens-conclusion`, `concludes-about`).  
**Implementación:** `buildGraph` recibe `evidenceEvaluationMatrices` y `hypothesisEvidenceConclusions` como campos opcionales de `HeliosGraphInput`. El grafo preexistente (hasta S-021) no se modifica. Los nuevos nodos y aristas se añaden al mismo array cuando los datos están presentes.

### 9. ¿Qué ocurre si `EvidenceEvaluationMatrix` referencia un `contrastationMatrixId` de otra hipótesis?

**Decisión:** EVD-006 detecta esta incompatibilidad como `error` bloqueante.  
**Justificación:** La traza `evidenceMatrix.hypothesisId → contrastationMatrix.hypothesisId` debe ser consistente. Si una evidencia referencia un criterio de otra hipótesis, la cadena de trazabilidad está rota y la evaluación no puede interpretarse correctamente.

### 10. ¿Por qué `removeObservedEvidence` elimina también el `EvidenceAssessment` en cascada?

**Decisión:** Eliminación en cascada de la evaluación.  
**Justificación:** Una evaluación sin su evidencia es semánticamente vacía — evalúa un hallazgo que ya no existe en la sesión. Mantener evaluaciones huérfanas generaría errores de validación sin posibilidad de resolución. La cascada es el comportamiento esperado y está documentada en la API.

### 11. ¿Cómo se preservan los datos de sesión al navegar entre pantallas?

**Decisión:** Estado gestionado en `Helios.tsx` (session state pattern, S-017+).  
**Implementación:** `evidenceEvaluationMatrices` y `hypothesisEvidenceConclusions` son arrays en el estado de Helios. Los componentes reciben la matriz/conclusión activa como prop y devuelven actualizaciones via callbacks. Los handlers (`handleUpdateEvidenceEvaluationMatrix`, `handleUpdateHypothesisEvidenceConclusion`) usan upsert idempotente.

### 12. ¿Cuál es el impacto de S-022 en suites de test existentes?

**Impacto:** TC-53 de S-021 fue actualizado de 31 a 38 reglas (agrega EVD-001 hasta EVD-007 a ALL_RULES). Todos los demás TCs de sprints anteriores permanecen sin modificación. El campo `evidenceEvaluationMatrices` es opcional en `MethodologicalAuditInput` — los callers existentes sin ese campo siguen funcionando sin cambios.

### 13. ¿Por qué `PantallaEvidenceEvaluation` gestiona el estado de la matriz localmente y también llama `onUpdateMatrix` en cada cambio?

**Decisión:** Estado local + callback inmediato.  
**Justificación:** El estado local permite UX fluida (formularios reactivos sin roundtrip). El callback inmediato sincroniza el estado de la sesión en Helios.tsx para que la matrix no se pierda si el usuario navega a otra pantalla. Este patrón es consistente con PantallaConceptualModel, PantallaOperationalizationMatrix y PantallaContrastationMatrix.

### 14. ¿Qué garantiza que `supports ≠ prueba` y `weakens ≠ refutación` sean respetados en la UI?

**Decisión:** Tres mecanismos: (1) nota informativa `Info` bajo el selector de dirección en `AssessmentForm`; (2) nota `Info` en `PantallaHypothesisEvidenceConclusion` explicando que la conclusión la formula el usuario; (3) documentación en ADR-0011 y en `docs/methodology/evidence-evaluation-model.md`. El sistema no muestra etiquetas engañosas como "hipótesis confirmada" ni "hipótesis rechazada".
