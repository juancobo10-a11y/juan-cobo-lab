# Architecture Review — S-020: Knowledge Graph & Dependency Engine

**Sprint:** S-020  
**Date:** 2026-07-17  
**Scope:** KnowledgeGraphService, PantallaKnowledgeGraph, ADR-0009, Helios state extension

---

## 1. ¿Cómo se representa el Knowledge Graph?

El Knowledge Graph es un grafo dirigido compuesto de dos colecciones planas:

```
KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

KnowledgeNode {
  id: string              ← determinista: "node-{type-prefix}-{refId}"
  type: NodeType          ← "problem" | "hypothesis" | "conceptual-variable" |
                            "indicator" | "evidence-source" |
                            "operationalization-row" | "contrastation-row"
  refId: string           ← ID de la entidad original en sesión
  metadata: {             ← snapshot de solo-lectura para display
    label: string
    [key: string]: unknown
  }
}

KnowledgeEdge {
  id: string              ← determinista: "edge-{sourceId}--{relationType}--{targetId}"
  source: string          ← ID del nodo que depende / referencia
  target: string          ← ID del nodo referenciado / dependido
  relationType: RelationType
}
```

**Representación interna:** grafo como dos arrays (nodos y aristas). No hay matriz de adyacencia ni lista de adyacencia precalculada — las consultas de vecinos son O(E) por simplidad (E = número de aristas). Para el tamaño de sesión esperado en HELIOS (decenas de nodos, < 200 aristas) esto es suficiente.

**Identificadores deterministas:** dado el mismo estado de sesión, `buildGraph()` produce exactamente los mismos IDs de nodo y arista. Esto hace que el grafo sea reproducible y testeable con aserciones exactas sobre IDs.

---

## 2. ¿Qué relaciones se modelaron?

| RelationType | Semántica | Ejemplo concreto |
|---|---|---|
| `supports` | La hipótesis aborda el problema | hypothesis → problem |
| `belongs-to` | La variable pertenece a la hipótesis | conceptual-variable → hypothesis |
| `derives-from` | El indicador deriva conceptualmente de la variable | indicator → variable |
| `measures` | El indicador mide la variable; la fila de op. mide el indicador | indicator → variable; op-row → indicator |
| `uses` | La fuente cubre el indicador; las filas usan fuente/indicador | source → indicator; op-row → source; ct-row → indicator/source |
| `operationalizes` | La fila de op. operacionaliza la variable | op-row → variable |
| `contrasts` | La fila de ct. contrasta la hipótesis | ct-row → hypothesis |

**Dirección de las aristas:** `source → target` significa **"source depende de / referencia a target"**. Esto hace que:
- `findDependencies(node)` = aristas salientes = lo que necesita este nodo
- `findDependents(node)` = aristas entrantes = lo que depende de este nodo

**Relaciones dobles indicator → variable:** se crean dos aristas (`derives-from` + `measures`) para el mismo par indicador/variable. Esto es intencional: captura dos dimensiones semánticas diferentes de la misma relación. La validación detecta pares con más de dos aristas entre ellos como "relaciones redundantes" (warning, no error).

---

## 3. ¿Cómo se construye desde la sesión?

`buildGraph(input: HeliosGraphInput): KnowledgeGraph` es una función pura que toma el estado de sesión y produce el grafo sin modificar ninguna entidad original.

```
HeliosGraphInput {
  problema: string
  hypotheses: PolicyHypothesis[]
  conceptualModels: ConceptualModel[]
  operationalizationMatrices: OperationalizationMatrix[]
  contrastationMatrices: ContrastationMatrix[]
}
```

**Proceso de construcción:**
1. Nodo `problem` desde `input.problema`
2. Para cada `PolicyHypothesis`: nodo hypothesis + arista hypothesis→problem
3. Para cada `ConceptualModel`: nodos de variables, indicadores y fuentes; aristas variable→hypothesis, indicator→variable, source→indicator
4. Para cada `OperationalizationMatrix`: nodos de filas + aristas op-row→variable, op-row→indicator, op-row→source
5. Para cada `ContrastationMatrix`: nodos de filas + aristas ct-row→hypothesis, ct-row→indicator, ct-row→source

**No se persiste:** el grafo se construye bajo demanda en cada render de `PantallaKnowledgeGraph`. El estado de sesión existente (hypotheses, conceptualModels, etc.) es la única fuente de verdad.

**Idempotencia garantizada:** misma sesión → mismos IDs → mismo grafo.

---

## 4. ¿Cómo se detectan dependencias?

```
findDependencies(graph, nodeId): KnowledgeNode[]
```
Recorre las aristas salientes de `nodeId` y devuelve los nodos TARGET. Es la respuesta a "¿qué necesita este nodo?".

```
findAllDependencies(graph, nodeId): KnowledgeNode[]
```
BFS recursivo siguiendo aristas salientes. Devuelve todos los nodos accesibles transitivamente desde `nodeId` siguiendo outgoing edges.

**Ejemplo:** `findAllDependencies(indicator)` devuelve `[variable, hypothesis, problem]` porque:
- indicator → variable (derives-from)
- variable → hypothesis (belongs-to)
- hypothesis → problem (supports)

---

## 5. ¿Cómo se detectan huérfanos?

`detectOrphans(graph): OrphanReport` clasifica huérfanos en cinco categorías:

| Campo | Descripción | Detección |
|---|---|---|
| `isolatedNodes` | Nodos sin ninguna arista | No aparecen en ninguna edge como source ni target |
| `brokenEdges` | Aristas con source o target inexistente | Edge.source o edge.target no está en nodes[] |
| `indicatorsWithoutVariable` | Indicadores sin arista derives-from/measures a variable | Ninguna arista saliente del indicador apunta a un nodo variable |
| `sourcesWithoutIndicator` | Fuentes sin arista uses a ningún indicador | Ninguna arista saliente source→indicator |
| `opRowsWithoutVariable` | Filas de op. sin arista operationalizes a variable | Ninguna arista saliente op-row→variable |
| `contrastationWithoutHypothesis` | Filas de ct. sin arista contrasts a hypothesis | Ninguna arista saliente ct-row→hypothesis |

**La función no corrige.** Devuelve la información para que la UI la muestre como advertencias (badge en PantallaKnowledgeGraph). El analista decide qué hacer.

---

## 6. ¿Cómo se calcula el impacto de una eliminación?

```
computeImpact(graph, nodeId): Map<string, KnowledgeNode[]>
```

Internamente llama a `findAllDependents(graph, nodeId)`: BFS recursivo siguiendo aristas ENTRANTES (reverso del traversal de dependencias).

**Ejemplo — eliminar un indicador:**
- Aristas entrantes al indicador: op-rows que lo miden, ct-rows que lo usan, fuentes que lo cubren
- BFS: primero encuentra esos nodos directos
- Luego sigue sus aristas entrantes: nada (op-rows y ct-rows no tienen dependientes)
- Resultado: [op-rows, ct-rows]

El impacto se agrupa por tipo (`Map<NodeType, KnowledgeNode[]>`) para display jerárquico en el panel lateral de PantallaKnowledgeGraph.

**Importante:** `computeImpact` no elimina nada. Solo calcula qué se vería afectado. La decisión de proceder es del usuario (sprint futuro podría agregar la confirmación real).

---

## 7. ¿Cómo se preserva la compatibilidad con S-019?

**Sin modificaciones a entidades existentes:** `KnowledgeGraphService` importa los tipos de S-011–S-019 solo con `import type`. No modifica ni extiende ningún tipo existente.

**Relaciones por refId:** los nodos del grafo referencian entidades por `refId` (el ID original). Si la sesión cambia (se agrega un indicador), basta con llamar de nuevo a `buildGraph()` para obtener el grafo actualizado.

**`PantallaRevisionFinal` extendida:** se añadió `onVerKnowledgeGraph?: () => void` como prop opcional. La pantalla sigue funcionando sin cambios si el prop no se pasa.

**`Pantalla` union extendida:** se añadió `"knowledge-graph"` al tipo discriminado en `Helios.tsx`. Las guardas existentes para las otras pantallas no cambian.

**Regresión:** 13/13 suites — S-012 a S-020, Smoke, Integration, Build.

---

## 8. ¿Qué ciclos están prohibidos?

El grafo es un DAG (Directed Acyclic Graph). `validateGraph()` detecta ciclos con DFS tricolor (blanco/gris/negro):

**Ciclos prohibidos (ejemplos):**
- `variable → variable` (variable que depende de sí misma)
- `indicator → variable → indicator`
- `hypothesis → problem → hypothesis`
- Cualquier ciclo de longitud ≥ 2

**Naturaleza del dominio:** los datos de sesión HELIOS no producen naturalmente ciclos porque las FKs son unidireccionales y la construcción del grafo sigue el orden de la jerarquía. Sin embargo, si en el futuro se agregan relaciones entre variables (por ejemplo, variables mediadoras que afectan a otras), la detección de ciclos previene inconsistencias.

---

## 9. ¿Qué deuda técnica permanece?

| Ítem | Descripción | Impacto |
|---|---|---|
| Búsqueda O(E) | Todas las consultas de vecinos recorren todo el array de aristas | Bajo para sesiones actuales, medio si escala a cientos de nodos |
| Sin índice de adyacencia | No hay Map<nodeId, Set<edgeId>> precalculado | Puede optimizarse con `useMemo` en la UI |
| No persistido | El grafo se pierde al recargar | Alto para uso real — requiere serialización de la sesión completa |
| Impact sin acción | `computeImpact` no activa la eliminación real | El sistema muestra qué se afecta pero no elimina en cascada |
| Sin comparación entre hipótesis | El grafo modela cada hipótesis por separado — no cruza sus nodos | Medio: análisis comparativo requeriría aristas cross-hypothesis |
| Topological order display | `topologicalTraversal` devuelve "dependientes primero" (Kahn estándar con source→target = depends-on). Para display jerárquico correcto, llamar `.reverse()` | Bajo — documentado en ADR |
| Sin persistencia de selección en árbol | Al regresar a PantallaKnowledgeGraph el nodo seleccionado se pierde | Bajo UX |

---

## 10. ¿Cómo prepara este sprint futuras capacidades?

El Knowledge Graph de S-020 sienta las bases para cinco capacidades de alto valor:

**1. Evaluación de impacto antes de editar**  
`computeImpact(graph, nodeId)` puede conectarse directamente al flujo de edición. Antes de que el analista elimine una variable o un indicador, mostrar el panel de impacto como confirmación con dos opciones: "Cancelar" o "Continuar y eliminar dependientes". Esto convierte S-020 en una salvaguarda de integridad metodológica.

**2. Detección automática de huecos**  
`detectOrphans()` + `validateGraph()` ya producen un reporte estructurado. Un sprint futuro podría convertir este reporte en "Sugerencias de mejora": "El indicador X no tiene fuente asignada — ¿quieres ir a asignarla?", con navegación directa a la pantalla relevante.

**3. Análisis de completitud por hipótesis**  
El grafo permite calcular, por cada hipótesis, qué porcentaje de sus variables tienen indicadores y fuentes. Esto produce un "score de completitud" visible en PantallaRevisionFinal.

**4. Plan de Evaluación (S-021 natural)**  
Con el grafo disponible, un "Plan de Evaluación" puede leer:
- Las `EscalaMedicion` de las filas de operacionalización
- Las `evidenciaEsperada` + `evidenciaContraria` de la contrastación
- Los tipos de fuentes disponibles
...y proponer el tipo de diseño empírico más apropiado (experimental, cuasi-experimental, observacional) sin hardcodear lógica sectorial.

**5. Exportación de protocolo de evaluación**  
El `topologicalTraversal(graph).reverse()` produce la cadena metodológica en orden "más fundamental primero". Este orden es el correcto para generar un documento lineal: problema → hipótesis → variables → indicadores → fuentes → operacionalización → contrastación. Implementar exportación a Markdown o PDF desde este traversal sería directo.
