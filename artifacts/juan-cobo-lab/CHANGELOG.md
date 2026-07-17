# HELIOS — Changelog

## S-022 (2026-07-17) — Motor de Evaluación de Evidencia

### Resumen
Capa de evaluación entre ContrastationMatrix y la conclusión final. Permite al investigador registrar qué evidencia observó para cada criterio de contrastación, calificar su dirección e interpretación, y formular una conclusión metodológica explícita sobre la hipótesis.

### Nuevos módulos
- **`src/evidence-evaluation/types.ts`** — Tipos: `ObservedEvidence`, `EvidenceAssessment`, `EvidenceEvaluationMatrix`, `HypothesisEvidenceConclusion`, enums de dirección / confianza / status, labels y colores para UI.
- **`src/evidence-evaluation/EvidenceEvaluationService.ts`** — 18 funciones puras: CRUD de evidencia y evaluaciones, validación, confirmación, resumen estadístico, upsert idempotente.
- **`src/evidence-evaluation/HypothesisEvidenceConclusionService.ts`** — 9 funciones puras: crear, actualizar, validar, confirmar conclusión; validar referencias de evidencia; upsert idempotente.
- **`src/components/PantallaEvidenceEvaluation.tsx`** — UI: tarjetas por criterio de contrastación, lista de evidencias, formulario inline de registro, panel de evaluación, validación en tiempo real, confirmación.
- **`src/components/PantallaHypothesisEvidenceConclusion.tsx`** — UI: resumen descriptivo de evaluaciones (sin auto-recomendación), formulario de conclusión (status, texto, confianza, selectores de evidencia de soporte, limitaciones, revisado).

### Archivos extendidos
- **`src/knowledge-graph/types.ts`** — Nuevos NodeType: `observed-evidence`, `evidence-assessment`, `hypothesis-conclusion`; nuevas RelationType: `observes`, `evaluates`, `supports-conclusion`, `weakens-conclusion`, `concludes-about`; labels para todos.
- **`src/knowledge-graph/KnowledgeGraphService.ts`** — `buildGraph` extiende el grafo con nodos y aristas de evidencia cuando `evidenceEvaluationMatrices` / `hypothesisEvidenceConclusions` están presentes en `HeliosGraphInput`.
- **`src/methodological-consistency/types.ts`** — `MethodologicalAuditInput` extendido con campos opcionales `evidenceEvaluationMatrices` y `hypothesisEvidenceConclusions` (compatible hacia atrás).
- **`src/methodological-consistency/rules.ts`** — 7 nuevas reglas EVD (`EVD-001`–`EVD-007`): criterios sin evidencia, indicador erróneo, fuente diferente, evidencia no evaluada, evaluación injustificada, incompatibilidad cruzada, conclusión sin cobertura. `ALL_RULES`: 31 → 38.
- **`src/components/PantallaContrastationMatrix.tsx`** — Botón "Registrar evidencia observada" (visible cuando `matrix.confirmed`); prop `onIrAEvidenceEvaluation`.
- **`src/components/PantallaRevisionFinal.tsx`** — Prop `onIrAEvidenceEvaluation` para navegación desde la cadena metodológica.
- **`src/components/PantallaAuditoriaMetodologica.tsx`** — Acepta `evidenceEvaluationMatrices` y `hypothesisEvidenceConclusions`; los pasa al Motor de Consistencia para evaluar reglas EVD.
- **`src/pages/Helios.tsx`** — Nuevas pantallas `evidence-evaluation` y `hypothesis-conclusion`; estado de sesión para matrices y conclusiones; 5 nuevos handlers; imports de módulos S-022.
- **`scripts/validate-all.ts`** — Suite S-022 agregada; header actualizado a S-022; 14 → 15 suites.
- **`package.json`** — Script `validate:s022`.

### Decisiones arquitectónicas
- **ADR-0011** — Tres capas separadas (expected / observed / assessment); HELIOS nunca deriva conclusiones; `supports ≠ prueba`; `weakens ≠ refutación`; `confidence ≠ probabilidad`; causalidad es responsabilidad del investigador.
- Resumen descriptivo (conteos por dirección y confianza) disponible en PantallaEvidenceEvaluation para orientar el juicio — sin auto-asignación de status.

### Validación
- **S-022:** 139/139 TCs (75 TCs, 139 assertions) — EVD rules, servicios, integración con grafo y auditoría.
- **15/15 suites** (Typecheck + S-012…S-022 + Smoke + Integration + Build) — sin regresiones.

### Documentación
- `docs/adr/ADR-0011-observed-evidence-separation.md` — Tres capas y límites del sistema.
- `docs/architecture/S-022-evidence-evaluation-review.md` — 14 preguntas de revisión arquitectónica.
- `docs/methodology/evidence-evaluation-model.md` — Principios epistemológicos: supports ≠ prueba, weakens ≠ refutación, confidence ≠ probabilidad, HELIOS no determina causalidad, conclusión es del usuario.

---

## S-021 (2026-07-17) — Motor de Consistencia Metodológica

### Resumen
Introduce un motor de auditoría cruzada que evalúa la coherencia metodológica de toda
la cadena diseño: hipótesis → variables → indicadores → fuentes → operacionalización →
contrastación. A diferencia de los servicios de etapa anteriores (S-017/S-018/S-019)
que validan localmente por entidad, el MCS detecta violaciones que solo son visibles
con una vista completa de la sesión. No hay LLM, no hay auto-corrección, no hay nuevos
Thinking Patterns. Severidades: error (bloqueante), warning (atención), suggestion (mejora).

### ADR-0010 — Reglas de consistencia metodológica
`docs/adr/ADR-0010-methodological-consistency-rules.md` — Sistema de auditoría
declarativo, puro, sin auto-corrección. Las reglas son explícitas y trazables.

### Tipos — src/methodological-consistency/types.ts
- `MethodologicalRuleCategory` — 9 categorías: HYPOTHESIS, VARIABLE, INDICATOR,
  SOURCE, OPERATIONALIZATION, CONTRASTATION, TRACEABILITY, CROSS_HYPOTHESIS, GLOBAL
- `MethodologicalSeverity` — 3 niveles: error, warning, suggestion
- `MethodologicalEntityType` — 10 tipos de entidades referenciables
- `MethodologicalRule` — id, category, severity, title, description, evaluator
- `MethodologicalFinding` — id, ruleId, severity, category, title, explanation,
  evidence, entityRefs, suggestedAction
- `MethodologicalAudit` — findings, evaluatedRuleIds, generatedAt, summary
- `MethodologicalAuditSummary` — errors, warnings, suggestions, totalFindings,
  blocking, complete, categoriesAffected
- Labels de display exportados: SEVERITY_LABELS, RULE_CATEGORY_LABELS, ENTITY_TYPE_LABELS

### Catálogo de reglas — src/methodological-consistency/rules.ts
31 reglas puras declarativas:
- **HYP-001–004** — coherencia de hipótesis (causa/resultado, modelo, operacionalización)
- **VAR-001–004** — cobertura de variables (indicadores, contrastación, op-rows, aislamiento)
- **IND-001–005** — trazabilidad de indicadores (variable, op, ct, cross-hyp, redundancia)
- **SRC-001–003** — uso de fuentes (sin fuente en ct, no usada, fuera de indicador)
- **OPR-001–005** — integridad de op-rows (sin indicador, sin fuente, no contrastada, dup, escala)
- **CON-001–006** — integridad de ct-rows (evidencias, criterio, indicador operacionalizado,
  fuente operacionalizada, sin matriz, criterio duplicado)
- **TRA-001–004** — trazabilidad del grafo (cadena incompleta, referencias rotas,
  entidades aisladas, ciclos ilegales)

### Servicio — src/methodological-consistency/MethodologicalConsistencyService.ts
- `runMethodologicalAudit(input, now?)` — ejecuta las 31 reglas, construye grafo si ausente
- `evaluateRule(ruleId, input)` — evalúa una sola regla, devuelve [] si desconocida
- `summarizeFindings(findings, input)` — genera MethodologicalAuditSummary
- `groupFindingsByCategory(findings)` — Map\<category, findings[]\>
- `groupFindingsBySeverity(findings)` — Map\<severity, findings[]\>
- `groupFindingsByEntity(findings)` — Map\<entityType, findings[]\>
- `findBlockingErrors/findWarnings/findSuggestions` — filtros convenientes
- `isMethodologicallyComplete(audit, input)` — true si no hay errores Y todos los stages confirmados

### KnowledgeGraph §15 — src/knowledge-graph/
- **types.ts:** `OrphanReport` extendido con `unusedIndicators` y `unusedSources`
  (distinción orphan vs unused: orphan = relación obligatoria ausente;
  unused = relación válida pero sin referencia operacional)
- **KnowledgeGraphService.ts:** nuevas funciones exportadas:
  - `topologicalTraversalDependentsFirst(graph)` — alias explícito del comportamiento existente
  - `topologicalTraversalDependenciesFirst(graph)` — reverso; entidades fundamentales primero
  - `detectOrphans(graph)` actualizado para poblar `unusedIndicators` y `unusedSources`

### UI — src/components/PantallaAuditoriaMetodologica.tsx
Pantalla de auditoría metodológica completa:
- Ejecuta el audit en mount via `useMemo` (síncrono, sin flicker)
- Header: hipótesis evaluadas, reglas ejecutadas, hora, badges de severidad
- Barra de filtros con `aria-live`: por severidad + por categoría (combinables)
- Lista de hallazgos con cards seleccionables (aria-pressed)
- Panel de detalle: código de regla, explicación, evidencia estructural, entityRefs con
  botones "Ir a etapa" por tipo, acción sugerida
- Navegación: Volver a revisión, Ver Knowledge Graph (optional), Reiniciar análisis
- Accesibilidad: `aria-live`, `aria-labelledby` en secciones, `focus-visible` en todos los botones

### Integración en Helios.tsx
- Nuevo valor `"auditoria"` en union `Pantalla`
- `handleEjecutarAuditoria` → `setPantalla("auditoria")`
- Render block para `"auditoria"` con todos los props de sesión y callbacks de navegación
- `onEjecutarAuditoria` pasado a `PantallaRevisionFinal` y `PantallaKnowledgeGraph`

### Puntos de acceso
- `PantallaRevisionFinal` → botón "Ejecutar auditoría metodológica" (siempre visible si prop presente)
- `PantallaKnowledgeGraph` → botón "Auditoría metodológica" en área de navegación

### Documentación
- `docs/adr/ADR-0010-methodological-consistency-rules.md`
- `docs/architecture/S-021-methodological-consistency-review.md` — 12 preguntas de revisión

### Validación
- Suite S-021: **115/115** aserciones
  - 53 TCs cubriendo las 31 reglas + topological aliases + distinción orphan/unused +
    audit summary + grouping + idempotencia + no-mutación + múltiples hipótesis + diseño completo
- Runner completo: **14/14** suites
  - Typecheck + S-012 → S-021 + Smoke + Integration + Build — todos PASS

---

## S-020 (2026-07-17) — Knowledge Graph & Dependency Engine

### Resumen
Introduce un motor interno de relaciones: todas las conexiones entre entidades HELIOS
(problema, hipótesis, variables, indicadores, fuentes, filas de operacionalización y
contrastación) se representan explícitamente como nodos y aristas en un Knowledge Graph.
El grafo es consultable, validable y navegable. No reemplaza las estructuras de sesión
existentes — las enriquece con trazabilidad bidireccional y cálculo de impacto en cascada.

### ADR-0009 — Las relaciones son entidades de primer nivel
`docs/adr/ADR-0009-relations-as-first-class.md` — Las relaciones entre entidades
constituyen conocimiento y deben representarse explícitamente. El grafo se construye
bajo demanda, no se persiste, y siempre es reconstruible desde el estado de sesión.

### Nuevos tipos — src/knowledge-graph/types.ts
- `NodeType` — 7 tipos: problem, hypothesis, conceptual-variable, indicator,
  evidence-source, operationalization-row, contrastation-row
- `RelationType` — 7 tipos: supports, belongs-to, derives-from, measures, uses,
  operationalizes, contrasts
- `KnowledgeNode` — id determinista, type, refId, metadata.label
- `KnowledgeEdge` — id determinista, source, target, relationType
- `KnowledgeGraph` — { nodes[], edges[] }
- `HeliosGraphInput` — snapshot de sesión para buildGraph()
- `OrphanReport` — 5 categorías: isolatedNodes, brokenEdges, indicatorsWithoutVariable,
  sourcesWithoutIndicator, opRowsWithoutVariable, contrastationWithoutHypothesis
- `GraphValidation` — isValid, errors (4 tipos), warnings (2 tipos)

### Nuevo servicio — src/knowledge-graph/KnowledgeGraphService.ts
Funciones puras, sin efectos secundarios:
- `buildGraph(input)` — construye grafo completo desde sesión; idempotente
- `addNode(graph, node)` — puro; ignora IDs duplicados
- `removeNode(graph, nodeId)` — puro; elimina aristas conectadas automáticamente
- `addEdge(graph, edge)` — guard: valida existencia de source/target y rechaza duplicados
- `removeEdge(graph, edgeId)` — puro; silencioso si no existe
- `findDependencies(graph, nodeId)` — aristas salientes → targets (directo)
- `findAllDependencies(graph, nodeId)` — BFS recursivo outgoing (transitivo)
- `findDependents(graph, nodeId)` — aristas entrantes → sources (directo)
- `findAllDependents(graph, nodeId)` — BFS recursivo incoming (para impacto)
- `detectOrphans(graph)` — 5 categorías de huérfanos estructurales
- `validateGraph(graph)` — ciclos (DFS tricolor), referencias rotas, duplicados, huérfanos
- `topologicalTraversal(graph)` — Kahn's algorithm; dependientes primero
- `computeImpact(graph, nodeId)` — impacto en cascada agrupado por tipo
- `inDegree(graph, nodeId)`, `outDegree(graph, nodeId)`, `edgesOf(graph, nodeId)`

### Nueva pantalla — src/components/PantallaKnowledgeGraph.tsx
- Árbol navegable: Problema → Hipótesis → Variables → Indicadores → Fuentes (colapsable)
- Cada nodo muestra: tipo (badge coloreado), ↗ dependencias, ↙ dependientes, total relaciones
- Filas de operacionalización y contrastación en sección separada
- Panel lateral "Impacto del cambio": muestra dependencias directas, dependientes directos,
  y cascada completa agrupada por tipo con badge de advertencia
- Stats bar: total nodos, relaciones, hipótesis, variables
- Panel de advertencias con `aria-live` para huérfanos y errores de validación
- Teclado: Tab entre nodos, Enter para seleccionar, ArrowRight/ArrowLeft para expandir/colapsar
- Sin canvas, sin librerías de grafos

### PantallaRevisionFinal modificada
- Nuevo prop `onVerKnowledgeGraph?: () => void`
- Botón "Ver Knowledge Graph" en la sección de navegación (solo cuando el prop está presente)

### Helios.tsx extendido
- Pantalla `"knowledge-graph"` en el tipo Pantalla
- Import de `PantallaKnowledgeGraph`
- Handler `handleVerKnowledgeGraph`
- Render block para `"knowledge-graph"` (construye el grafo desde todo el estado de sesión)
- `onVerKnowledgeGraph={handleVerKnowledgeGraph}` en PantallaRevisionFinal

### Suite S-020 — src/knowledge-graph/__tests__/validacion_s020.ts
52 asserts en 20 TCs ✓ — cubre buildGraph (9 tipos de nodo), addNode/addEdge/removeNode/
removeEdge, detectOrphans, validateGraph (duplicados, referencias rotas, ciclos), 
findDependencies, findDependents, computeImpact, reconstrucción idempotente, múltiples
hipótesis, múltiples variables, múltiples indicadores, navegación transitiva, reinicio,
integración (impacto de fuente), consistencia, topologicalTraversal, referencias cruzadas,
inDegree/outDegree.

### Revisión inicial (§1) — completada antes de implementar
Todos los FKs implícitos mapeados: hypothesisId, variableId, indicadorIds[], indicatorId,
sourceId, indicadorId, fuenteId. Ninguna estructura duplicada. Compatibilidad preservada
al 100% — el grafo enriquece sin modificar las entidades originales.

### Regresión — 13/13 suites
```
Typecheck      PASS
S-012          PASS
S-013          PASS
S-014          PASS
S-015          PASS
S-016          PASS
S-017          PASS   20/20
S-018          PASS   34/34
S-019          PASS   55/55
S-020          PASS   52/52
Smoke          PASS   37/37
Integration    PASS   29/29
Build          PASS
```

---

## S-019 (2026-07-17) — Matriz de Contrastación de Hipótesis

### Resumen
Extiende la cadena metodológica con la etapa de contrastación explícita:
… → Modelo Conceptual → Operacionalización → **Matriz de Contrastación** → Revisión Final.

La matriz fuerza al analista a especificar explícitamente qué evidencia apoyaría la hipótesis
y qué evidencia la pondría en duda — antes de que la hipótesis sea considerada metodológicamente
lista para uso. HELIOS no decide si la hipótesis es verdadera; estructura el proceso de
contrastación.

### ADR-0008 — Toda hipótesis debe tener criterios explícitos de contrastación
Una hipótesis sin criterios de contrastación es irrefutable en la práctica.
HELIOS no genera criterios automáticamente — el analista debe escribirlos explícitamente.

### Nuevos tipos — src/contrastation/types.ts
- `Prioridad` — catálogo: alta | media | baja (no asignada automáticamente)
- `PRIORIDAD_LABELS` + `PRIORIDAD_LIST` — catálogo exportado
- `ContrastationRow` — `id`, `hypothesisId`, `indicadorId` (FK|null), `fuenteId` (FK|null),
  `evidenciaEsperada`, `evidenciaContraria`, `criterioInterpretacion`, `limitaciones`,
  `prioridad`, `observaciones`, `orden`
- `ContrastationMatrix` — `hypothesisId`, `rows[]`, `confirmed` (1:1 con OperationalizationMatrix)
- `ContrastationValidation` — 5 blocking + 3 warnings
- `ContrastationIssue` — discriminated union de 8 tipos de issue
- `ContrastationRowUpdate` — payload de actualización parcial

### Nuevo servicio — src/contrastation/ContrastationService.ts
Funciones puras sin conocimiento sectorial:
- `createEmptyContrastationMatrix`, `createContrastationRow`, `updateContrastationRow`
- `removeContrastationRow`, `reorderContrastationRows`
- `reutilizarIndicadorEnContrastation`, `reutilizarFuenteEnContrastation` — FK, sin copiar datos
- `isContrastationRowDuplicate` — deduplicación por par (indicadorId, fuenteId)
- `validateContrastation` — 5 blocking + 3 warnings
- `findContrastationMatrixByHypothesisId`, `upsertContrastationMatrix`, `confirmContrastationMatrix`

Guards: createContrastationRow/updateContrastationRow rechazan indicadorId/fuenteId inválidos.
Deduplicación: filas con null indicadorId o fuenteId nunca se consideran duplicadas.

### Nueva pantalla — src/components/PantallaContrastationMatrix.tsx
Tabla editable de criterios de contrastación:
- Columnas (summary): Indicador · Fuente · Evidencia esperada · Prioridad (badge coloreado)
- Edición inline al expandir: todos los campos editables en el panel expandido
- Formulario de agregar: evidenciaEsperada y evidenciaContraria son requeridos en el form
- Selector de indicadores y fuentes (lista completa del modelo conceptual)
- Panel de validación en tiempo real (aria-live)
- "Ver cadena metodológica" → aparece solo después de confirmar
- Keyboard accessible — sin drag-and-drop

### Nueva pantalla — src/components/PantallaRevisionFinal.tsx (§16)
Vista consolidada de toda la cadena metodológica navegable:
- Secciones: Problema · Thinking Pattern · Hipótesis · Modelo Conceptual · Operacionalización · Contrastación
- Cada sección muestra badge verde (confirmada) o gris (pendiente)
- Botón "Ir a esta etapa" en cada sección — navegación sin edición directa
- Tabla de operacionalización con variables, indicadores, escala y fuentes
- Criterios de contrastación con evidencia esperada/contraria, prioridad y limitaciones
- Badge coloreado por prioridad (rojo=alta, amber=media, emerald=baja)

### PantallaOperationalizationMatrix modificada
- Nuevo prop `onConstruirContrastation?: () => void`
- Botón "Construir matriz de contrastación" — solo visible cuando `matrix.confirmed === true`

### Helios.tsx extendido
- Nuevas pantallas `"contrastation-matrix"` y `"revision-final"` en el tipo `Pantalla`
- Nuevo estado `contrastationMatrices: ContrastationMatrix[]`
- Handlers: `handleConstruirContrastation`, `handleUpdateContrastationMatrix`,
  `handleConfirmarContrastationMatrix`, `handleVolverDesdeContrastation`, `handleVerCadenaMetodologica`
- `handleReiniciar` limpia `contrastationMatrices`
- Derivación de `patternTitulo` desde `perequeMode.pattern.metadata.titulo` para PantallaRevisionFinal
- `onConstruirContrastation` conectado a PantallaOperationalizationMatrix

### Suite S-019 — src/contrastation/__tests__/validacion_s019.ts
55 asserts en 26 TCs ✓ — cubre crear, agregar, reutilizar indicador, reutilizar fuente,
validar (5 blocking + 3 warnings), eliminar, reordenar, múltiples hipótesis, múltiples matrices,
navegación, reinicio, integración, confirmación, deduplicación, prioridades, criterios
de interpretación, limitaciones, persistencia en sesión, guard indicador inválido.

### Regresión — 12/12 suites
```
Typecheck      PASS
S-012          PASS
S-013          PASS
S-014          PASS
S-015          PASS
S-016          PASS
S-017          PASS   20/20
S-018          PASS   34/34
S-019          PASS   55/55
Smoke          PASS   37/37
Integration    PASS   29/29
Build          PASS
```

---

## S-018 (2026-07-17) — Matriz de Operacionalización

### Resumen
Extiende el flujo de HELIOS con la etapa de operacionalización explícita:
Problema → Thinking Pattern → Reflexión → Hipótesis → Modelo Conceptual → **Matriz de Operacionalización**.

La matriz es el puente entre el modelo conceptual y el diseño empírico. Cada fila
representa una dimensión de una variable, vinculada a un indicador, una escala de medición
y una fuente de evidencia — todos reutilizados del modelo conceptual sin duplicación.

### ADR-0007 — Todo constructo debe poder operacionalizarse explícitamente
Los conceptos utilizados en una hipótesis deben transformarse en variables observables
mediante una matriz explícita. No deben existir indicadores sin una operacionalización
previa. Sin generación automática — la operacionalización exige el juicio del analista.

### Nuevos tipos — src/operationalization/types.ts
- `EscalaMedicion` — catálogo: nominal, ordinal, intervalo, razón, índice-compuesto
- `ESCALAS_LABELS` + `ESCALAS_LIST` — catálogo exportado
- `Dimension` — nombre, definicionOperacional, orden (embebida en OperationalizationRow)
- `OperationalizationRow` — variableId (FK), dimension (embedded), indicatorId (FK|null), escala, sourceId (FK|null), observaciones, orden
- `OperationalizationMatrix` — hypothesisId, rows[], confirmed (1:1 con ConceptualModel)
- `OperationalizationValidation` — blockingIssues (5 tipos) + warnings (3 tipos)
- `RowUpdate`, `DimensionUpdate` — update payloads

### Nuevo servicio — src/operationalization/OperationalizationService.ts
Funciones puras sin conocimiento sectorial:
- `createEmptyMatrix`, `createRow`, `updateRow`, `updateDimension`, `removeRow`, `reorderRows`
- `reutilizarIndicador`, `reutilizarFuente` — reutilización por ID sin duplicar datos
- `isDimensionNameDuplicate` — deduplicación normalizada por variable
- `validateOperationalization` — 5 blocking + 3 warnings; validación contra ConceptualModel
- `findMatrixByHypothesisId`, `upsertMatrix`, `confirmMatrix`

Restricciones de integridad:
- `createRow`/`updateRow` rechazan variableId, indicatorId, sourceId inválidos
- No puede existir un indicador "de la matriz" — solo FKs al ConceptualModel
- Edición nunca bloqueada; solo confirmación bloqueada por issues estructurales

### Nueva pantalla — src/components/PantallaOperationalizationMatrix.tsx
Tabla editable con filas expandibles:
- Columnas: Variable/Dimensión, Definición operacional, Indicador, Escala, Unidad, Fuente
- Formulario de agregar fila: selección de variable, dimensión, indicador (filtrado por variable), fuente (filtrada por variable), escala, observaciones
- Edición inline al expandir cada fila
- Panel de validación en tiempo real (aria-live)
- Cadena de trazabilidad completa en lectura
- Keyboard accessible — sin drag-and-drop

### PantallaConceptualModel modificada
- Nuevo prop `onConstruirMatriz?: () => void`
- Botón "Construir matriz de operacionalización" siempre visible

### Helios.tsx extendido
- Nueva pantalla `"operationalization-matrix"` en el tipo `Pantalla`
- Nuevo estado `operationalizationMatrices: OperationalizationMatrix[]`
- Handlers: `handleConstruirMatriz`, `handleUpdateOperationalizationMatrix`, `handleConfirmarOperationalizationMatrix`, `handleVolverDesdeMatriz`
- `handleReiniciar` limpia `operationalizationMatrices`

### Suite S-018 — src/operationalization/__tests__/validacion_s018.ts
34 asserts en 15 TCs ✓ — cubre crear, agregar, editar, reutilizar indicador, reutilizar fuente,
deduplicación, validación (4 blocking), eliminación, navegación, reinicio, múltiples hipótesis,
múltiples variables, integración completa.

### Regresión — 11/11 suites
```
Typecheck      PASS
S-012          PASS
S-013          PASS
S-014          PASS
S-015          PASS
S-016          PASS
S-017          PASS   20/20
S-018          PASS   34/34
Smoke          PASS   37/37
Integration    PASS   29/29
Build          PASS
```

---

## S-017 (2026-07-17) — Modelo Conceptual de Variables, Indicadores y Evidencia

### Resumen
Extiende el flujo de HELIOS con una nueva etapa de operacionalización:
Problema → Thinking Pattern → Reflexión → Hipótesis → **Modelo Conceptual** → Variables → Indicadores → Fuentes de evidencia.

### ADR-0006 — Toda hipótesis debe poder operacionalizarse
Una hipótesis adquiere valor analítico cuando puede traducirse en variables observables,
indicadores verificables y fuentes de evidencia identificables.
HELIOS no produce indicadores automáticamente — ayuda a estructurarlos.

### Nuevos tipos — src/conceptual/types.ts
- `ConceptualVariable` — nombre, descripcion, definicionOperacional, rol (causa/resultado/mediadora/moderadora/control), orden
- `ConceptualIndicator` — nombre, variableId (FK), unidad, formulaOCriterio, periodicidad, nivelTerritorial, disponibilidad
- `EvidenceSource` — nombre, tipo, responsable, frecuencia, acceso, limitaciones, indicadorIds[] (many-to-many)
- `ConceptualModel` — agrupa las tres colecciones bajo hypothesisId
- `ConceptualModelValidation` — blockingIssues (bloquean confirmación) + warnings (informan sin bloquear)

### Nuevo servicio — src/conceptual/ConceptualModelService.ts
Funciones puras sin conocimiento sectorial:
- `createEmptyConceptualModel`, `createVariable`, `updateVariable`, `removeVariable`, `reorderVariables`
- `createIndicator`, `updateIndicator`, `removeIndicator`, `reorderIndicators`
- `createEvidenceSource`, `updateEvidenceSource`, `removeEvidenceSource`
- `validateConceptualModel` — 3 blocking + 6 warnings
- `isVariableNameDuplicate`, `isIndicatorNameDuplicate`, `isSourceNameDuplicate`
- `findModelByHypothesisId`, `upsertModel`, `confirmModel`

Restricciones de integridad:
- Indicadores sin variable → error bloqueante
- Fuentes sin indicador válido → error bloqueante
- Eliminación en cascada: removeVariable elimina sus indicadores y limpia fuentes huérfanas

### Nueva pantalla — src/components/PantallaConceptualModel.tsx
Vista jerárquica editable: hipótesis → variables → indicadores → fuentes
- Keyboard accessible — sin drag-and-drop
- Panel de validación en tiempo real
- Cadena de trazabilidad en lectura (problema → hipótesis → variables → indicadores → fuentes)
- Confirmación bloqueada cuando existan errores estructurales

### PantallaRevisionHipotesis modificada
- Nuevo prop `onConstruirModelo?: () => void`
- Botón "Construir modelo conceptual" aparece cuando `hypothesesReviewed === true`

### Helios.tsx extendido
- Nueva pantalla `"conceptual-model"` en el tipo `Pantalla`
- Nuevo estado `conceptualModels: ConceptualModel[]`
- Handlers: `handleConstruirModelo`, `handleUpdateConceptualModel`, `handleConfirmarConceptualModel`, `handleVolverDesdeConceptualModel`
- `handleReiniciar` limpia `conceptualModels`

### Suite S-017 — src/conceptual/__tests__/validacion_s017.ts
20/20 ✓ — cubre crear, actualizar, eliminar, relaciones, cascada, duplicados, validación estructural,
múltiples hipótesis, navegación, conservación de estado, reinicio, integración completa.

### Regresión — 10/10 suites
```
Typecheck      PASS
S-012          PASS
S-013          PASS
S-014          PASS
S-015          PASS
S-016          PASS
S-017          PASS   20/20
Smoke          PASS   37/37
Integration    PASS   29/29
Build          PASS
```

---

## S-016 (2026-07-17) — Hardening técnico y validación reproducible

### Resumen
Establece la línea base técnica reproducible. Sin cambios funcionales ni metodológicos.
El comando `pnpm run validate` ejecuta 9 suites secuenciales y devuelve exit code correcto.

### Problema del build (PORT/BASE_PATH)
`vite.config.ts` lanzaba excepción si `PORT` o `BASE_PATH` estaban ausentes (entorno limpio, CI).
Se reemplazaron los throws por fallbacks seguros (`PORT → 5000`, `BASE_PATH → "/"`).
El workflow de producción sigue inyectando `PORT=18800` y `BASE_PATH="/"` vía `artifact.toml`.

### Problema de aliases en tests
No existía un problema real. Los scripts de validación ya usaban imports relativos — el error
anterior era causado por rutas incorrectas en los comandos del runner, no por resolución de aliases.
Se fijaron las rutas correctas en los scripts de `package.json`.

### Scripts añadidos a package.json
```json
"validate:s012": "tsx src/thinking/__tests__/validacion_s012.ts",
"validate:s013": "tsx src/thinking/__tests__/validacion_s013.ts",
"validate:s014": "tsx src/thinking/__tests__/validacion_s014.ts",
"validate:s015": "tsx src/hypothesis/__tests__/validacion_s015.ts",
"validate:s016": "tsx src/hypothesis/__tests__/validacion_s016.ts",
"validate:smoke": "tsx src/thinking/__tests__/smoke.ts",
"validate:integration": "tsx src/thinking/__tests__/integration_flow.ts",
"validate": "tsx scripts/validate-all.ts"
```

### Runner unificado — scripts/validate-all.ts
Ejecuta secuencialmente: Typecheck → S-012 → S-013 → S-014 → S-015 → S-016 → Smoke → Integration → Build.
Continúa en fallos para diagnóstico completo. Devuelve exit 0 solo si 9/9 suites pasan.

### Nuevo módulo — src/config/portConfig.ts
Funciones puras `resolvePort()` y `resolveBasePath()` — testables de forma aislada (TC-05 a TC-08).

### Nuevas suites
- `src/hypothesis/__tests__/validacion_s016.ts` — 15/15 ✓ — hardening técnico
- `src/thinking/__tests__/integration_flow.ts` — 29/29 ✓ — flujo completo Cases A-F

### Correcciones de estado obsoleto (§10)
Reglas implementadas en `Helios.tsx`:
- **handleUpdateHypotheses**: cualquier cambio en la lista invalida `hypothesesReviewed` → false
- **handleUpdateHypotheses**: si la hipótesis principal fue eliminada, `primaryHypothesisId` → undefined
- **handleUserSelectPattern**: llama `markPatternChanged(prev)` para marcar hipótesis como potencialmente
  desalineadas cuando el analista cambia el Thinking Pattern. El flag ya existía en S-015 pero nunca se activaba.

### Resultados finales
```
Typecheck      PASS
S-012          PASS   (B14 documentado — limitación del algoritmo, no regresión)
S-013          PASS   24/24
S-014          PASS   50/50
S-015          PASS   18/18
S-016          PASS   15/15
Smoke          PASS   37/37
Integration    PASS   29/29
Build          PASS
```

---

## S-015 (2026-07-17) — Hypothesis Builder

### Resumen
Convierte la reflexión del pereque en hipótesis estructuradas, editables y trazables.
Ningún LLM interviene. Todo el estado es session-only (sin DB ni localStorage).
ADR-0005 añadido: toda hipótesis debe ser explícita, contrastable y revisable.

### Nuevas pantallas
- **`hypothesis-builder`** (`PantallaHypothesisBuilder`) — crea, edita, ordena, duplica y elimina hipótesis; vincula reflexiones como insumo; muestra diagnóstico metodológico inline; plantillas genéricas; editor con generador de formulación provisional bajo demanda.
- **`revision-hipotesis`** (`PantallaRevisionHipotesis`) — resumen de sesión completo: problema → pack → router → selección → patrones → reflexiones → hipótesis con validación. Confirmar = `hypothesesReviewed = true` (no hay Pantalla extra).

### Cambios en pantallas existentes
- **`PreguntaItem`** — reestructurado: header (botón) separado del panel expandido (ahora un `<div>` con `role="region"`) para permitir `<textarea>` sin HTML inválido (interactive dentro de interactive).
- **`PantallaPereque`** — nuevas props: `reflectionAnswers`, `onAnswerChange`, `onConstruirHipotesis`. CTA primaria: "Construir hipótesis". CTA secundaria: "Continuar con las hipótesis". Aviso ámbar no bloqueante si no hay reflexiones escritas.

### Nuevos servicios
- `src/hypothesis/types.ts` — tipos completos: `PolicyHypothesis`, `ReflectionAnswer`, `HypothesisVariable`, `HypothesisValidation`, `HypothesisTemplate`, `HYPOTHESIS_TEMPLATES` (3 plantillas metodológicas genéricas).
- `src/hypothesis/HypothesisBuilderService.ts` — funciones puras: `createEmptyHypothesis`, `updateHypothesis`, `buildProvisionalFormulacion`, `validateHypothesis`, `computeHypothesisStatus`, `duplicateHypothesis`, `moveHypothesis`, `setPrimaryHypothesis`, `removeHypothesis`, `markPatternChanged`, `linkReflectionAnswer`, `unlinkReflectionAnswer`, `createVariable`, `removeVariable`, `updateVariable`, `exceedsRecommendedCount`, `getAnsweredReflections`, `getPrimaryHypothesis`.

### Cambios en Helios state machine
- Tipo `Pantalla`: añadidos `"hypothesis-builder"` y `"revision-hipotesis"`.
- Estado nuevo: `reflectionAnswers`, `hypotheses`, `primaryHypothesisId`, `hypothesesReviewed`.
- Handlers nuevos: `handleAnswerChange`, `handleConstruirHipotesis`, `handleUpdateHypotheses`, `handleUpdatePrimaryId`, `handleContinuarDesdeBuilder`, `handleVolverDesdeBuilder`, `handleConfirmarRevision`, `handleVolverDesdeRevision`, `handleVolverRevisionAPereque`.
- `handleReiniciar` restablece todo el estado S-015.
- `PerequeMode` ahora es `export type` (requerido por los nuevos componentes).

### Reglas de diseño (ADR-0005)
- `buildProvisionalFormulacion` es pura y nunca se auto-aplica.
- `computeHypothesisStatus` es independiente de `confianza`.
- `markPatternChanged` añade flag de advertencia sin borrar hipótesis.
- Edición en `PantallaHypothesisBuilder` es inmediata (sin ciclo save/cancel).
- Confirmación de revisión: `hypothesesReviewed = true`, sin Pantalla adicional.

### Validación
- `src/hypothesis/__tests__/validacion_s015.ts` — 18/18 ✓
- TypeCheck: 0 errores
- `docs/validation/hypothesis-builder-s015.md` — 15 preguntas de arquitectura respondidas

---

## S-014 (2026-07-17) — Gestión explicable de múltiples Thinking Patterns candidatos

### Resumen
Cuando el Router identifica más de un patrón pertinente, HELIOS ahora muestra
una pantalla de selección explícita en lugar de saltarse el Thinking Engine.
El usuario puede elegir un patrón único o combinar dos en secuencia ordenada.
El Router no fue modificado. ADR-0001/0002/0003/0004 mantenidos.

### Nuevos archivos

- `src/thinking/SelectionService.ts` — funciones puras para filtrado, explicaciones,
  comparación, deduplicación y límites de preguntas
- `src/components/PantallaSeleccionThinkingPattern.tsx` — selección individual y
  combinación de dos patrones; accesible por teclado
- `src/thinking/__tests__/validacion_s014.ts` — 50/50 ✅
- `docs/validation/thinking-router-s014.md` — informe completo

### Cambios en TypeScript

- `src/thinking/types.ts`: +`ThinkingUserSelection` (single | combined)
- `src/pages/Helios.tsx`:
  - `+PerequeMode` tipo (single | combined) + `computePerequeMode()` helper
  - `+PreguntaItem` sub-componente extraído (evita duplicación en modo combined)
  - `PantallaPereque`: signature cambia a `perequeMode: PerequeMode`; soporta modo combined
    con dos bloques secuenciales de preguntas (≤5 principal + ≤3 complementario)
  - Nueva pantalla `"seleccion-thinking-pattern"` en el state machine
  - Nuevos estados: `thinkingUserSelection`, `candidateExplanations`, `pantallaVolverDesdeSeleccion`
  - Nuevos handlers: `handleUserSelectPattern`, `handleVolverDesdeSeleccion`
  - Categorías EP añadidas a `categoriaStyle` (incentivos, distribucion, poder,
    coaliciones, implementacion, captura, statu-quo, negociacion)

### Constantes de infraestructura (SelectionService)

- `MAX_PREGUNTAS_PRINCIPAL = 5`
- `MAX_PREGUNTAS_COMPLEMENTARIO = 3`
- `MAX_CANDIDATOS_UI = 3`

### Flujo nuevo

```
Problema → Knowledge Router → Thinking Router
  ├── seleccionado → pereque (sin cambio)
  ├── candidatos  → seleccion-thinking-pattern
  │     ├── único        → pereque (modo single)
  │     └── combinación  → pereque (modo combined)
  └── ninguno     → hipotesis
```

### Validación

- SelectionService: 50/50 ✅
- Smoke tests: 37/37 ✅
- Regresión S-013: 24/24 ✅
- Regresión S-012: 96.8% (sin cambios)
- Typecheck: ✅
- Build: ✅

---

## S-013 (2026-07-17) — Incorporación del patrón Economía Política

### Resumen
Tercer Thinking Pattern incorporado sin modificar el algoritmo ConceptualThinkingAlgorithm.
Sin cambios en la interfaz de usuario. Sin cambios en el flujo de HELIOS.
La única intervención estructural fue la regla de protección de la señal del problema en ThinkingRouter.

### Resultados de validación S-013

| Batería | n | Acuerdo |
|---------|---|---------|
| EP — Casos puros EP | 8 | 100% (8/8) |
| MX — Mixtos | 6 | 100% (6/6) |
| FP — Anti-falsos-positivos | 6 | 100% (6/6) |
| SP — Protección de señal | 4 | 100% (4/4) |
| **Global** | 24 | **100% (24/24)** |

EP: precisión 92%, recall 100% | Smoke tests: 37/37 ✅ | Regresión S-012: 96.8% (↑ desde 93.5%)

### Nuevos archivos

- `content/thinking/economia-politica/metadata.json` — 6 conceptos ThinkingConcept (v0.1.0)
- `content/thinking/economia-politica/preguntas.json` — 8 preguntas guiadas
- `src/thinking/__tests__/validacion_s013.ts` — 24 casos en 4 baterías
- `docs/validation/thinking-router-s013.md` — informe completo

### Cambios en TypeScript

- `src/thinking/registry.ts` — +1 entrada para Economía Política
- `src/thinking/ThinkingRouter.ts` — regla de protección de señal del problema (spec §6):
  cuando `scoreProblema >= baja` para algún patrón, el pack no puede desplazarlo como ganador
- `src/thinking/__tests__/validacion_s012.ts` — ADV09 reclasificado a "ambiguo"
  (con EP activo, "incentivos económicos" + "efectos distintos entre territorios" es genuinamente ambiguo)

### Ajustes en metadata

- `content/thinking/economia-politica/metadata.json`:
  - Distribución sinonimos: −`"subsidio"` (causaba FP en "subsidios directos" socrático)
  - Actores e intereses: +"statu quo" (sinonimo), +"grupos beneficiados", "se benefician del statu quo"
  - Poder institucional: +"influencia suficiente para", "organización e influencia", "neutralizar cualquier intento"
- `content/thinking/sistemico/metadata.json`:
  - Efectos indirectos: +"se trasladaron hacia", "se trasladó hacia", "trasladaron hacia", "trasladado a los"
    (corrige FP05 falso negativo: "se trasladaron" no coincidía con "trasladado hacia")

### Limitaciones documentadas

- SP01/SP02 producen CANDIDATOS cuando la señal del problema es de confianza "media" — la UI necesita manejar tres candidatos
- B14 (cadena causal implícita) persiste como límite estructural

---

## S-012 (2026-07-17) — Validación ampliada del Thinking Router conceptual

### Resumen
Sprint de validación y calibración del `ConceptualThinkingAlgorithm` introducido en S-011.
Sin nuevos patrones. Sin cambios de interfaz. Sin cambios algorítmicos estructurales.

### Resultados de validación

| Batería                  | n  | Acuerdo     | Sistémico P/R | Socrático Recall |
|--------------------------|----|-------------|---------------|------------------|
| A — Original S-010       | 12 | 100% (9/9)  | 83% / 100%    | 100%             |
| B — Independiente        | 20 | 93.8% (15/16)| 100% / 86%   | 100%             |
| C — Adversarial          | 12 | 91.7% (11/12)| 100% / 33%   | 86%              |
| Global (A+B+D)           | 38 | 93.5% (29/31)| 93% / 93%    | 92%              |

Regresión: 37/37 smoke tests ✅

### Ajustes al metadata (content/thinking/sistemico/metadata.json → v0.2.1)

**Eliminaciones (reducción de falsos positivos):**
- Retroalimentación sinonimos: eliminado `"ciclo"` (activaba "ciclo presupuestal")
- Estructuras terminos: eliminado `"barreras"` (activaba "barrera normativa"); "barreras de acceso" permanece en expresiones

**Adiciones (reducción de falsos negativos en lenguaje natural):**
- Interdependencia expresiones: "altera el trabajo de las demás", "ninguna tiene control sobre el resultado"
- Efectos indirectos expresiones: "solucionó un problema pero", "pero creó otro"
- Comportamiento temporal terminos: "manifestarse"
- Comportamiento temporal expresiones: "tardan en manifestarse", "generación tras generación"
- Estructuras expresiones: "incentivos no alineados", "falta de incentivos alineados"
- Retroalimentación expresiones: "se retroalimenta", "a pesar de los programas de"
- Causalidad compleja expresiones: "efectos tan distintos entre territorios"

### Nuevos archivos

- `src/thinking/__tests__/validacion_s012.ts` — 50 casos en 4 baterías (original, independiente, adversarial, pares controlados)
- `docs/validation/thinking-router-s012.md` — informe completo

### Limitaciones documentadas

- B14: cadenas causales implícitas (A→B→C→A) sin vocabulario explícito son indetectables con match lexical
- D05: pack de alta densidad sistémica puede empatar con texto socrático moderado (tensión arquitectónica `packContextWeight`)
- ADV09: caso genuinamente ambiguo socrático/sistémico

---

## S-011 (2026-07-17) — Modelo de conocimiento ThinkingConcept (tres niveles)

### Resumen
Reemplaza el modelo plano `keywords[]` con `ThinkingConcept` — objetos con `terminos`, `sinonimos` y `expresiones` — para cada patrón de pensamiento.

### Corrección principal
Eliminada la normalización por `totalTokens × W.keywordPhrase` que impedía a Sistémico superar el umbral `baja` (0.20) con 1–3 coincidencias naturales.

### Cambios técnicos
- **`src/thinking/types.ts`** — `ThinkingConcept`, `ThinkingConceptMatch`; `ThinkingMatchedTerm` y `terminosCoincidentes` marcados `@deprecated`
- **`src/thinking/algorithms/ConceptualThinkingAlgorithm.ts`** — nuevo algoritmo primario; diminishing returns por concepto, diversity bonus, legacy path para `keywords[]`
- **`src/thinking/algorithms/KeywordThinkingAlgorithm.ts`** — interfaz actualizada, marcado `@deprecated`
- **`src/thinking/ThinkingRouter.ts`** — usa `ConceptualThinkingAlgorithm`
- **`src/thinking/ExplanationService.ts`** — `dimensionesDetectadas` = nombres conceptuales
- **`content/thinking/sistemico/metadata.json`** → v0.2.0 — 6 conceptos
- **`content/thinking/socratico/metadata.json`** → v0.2.0 — 6 conceptos
- **`src/thinking/__tests__/smoke.ts`** → v0.5.0 — 37 casos, 37/37 ✅

---

## S-010 (2026-07-17) — ExplanationService

- `buildExplicacionSeleccion`: `fuentePrincipal`, `dimensionesDetectadas`, `resumen`
- `ThinkingConceptMatch` con campo `surface` para trazabilidad
- `NEUTRAL_TERMS` en constants.ts

---

## S-009 (2026-07-17) — ThinkingEngine v0.3 (Sistémico)

- Patrón Sistémico con scoring por superficie separado
- `esFallback`, `motivoSeleccion` en `ThinkingCandidate`
- 20/20 tests ✅

---

## S-008 (2026-07-17) — Orquestación trazable v0.2

- KnowledgeRouter → ThinkingRouter secuencial
- Cache key `texto::packId`
- `universalFloor` (0.25) para patrones universales

---

## S-007 (2026-07-17) — PantallaPereque integración UI

- UI integra ThinkingEngine con PerequeContainer
- 9/9 smoke tests ✅

---

## S-006 (2026-07-17) — ThinkingEngine v0.1 (Socrático)

- `ThinkingRouter`, `KeywordThinkingAlgorithm`
- Patrón Socrático activo

---

## S-005 / S-005.1 (2026-07-17) — KnowledgeRouter

- Router de conocimiento para Knowledge Packs
- 9/9 smoke tests ✅
