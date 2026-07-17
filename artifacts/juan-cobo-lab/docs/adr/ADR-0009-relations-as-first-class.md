# ADR-0009 — Las relaciones son entidades de primer nivel

**Sprint:** S-020  
**Status:** Accepted  
**Date:** 2026-07-17

---

## Contexto

Después de S-011–S-019, HELIOS mantiene una cadena metodológica completa:
problema → hipótesis → variables → indicadores → fuentes → operacionalización → contrastación.

Sin embargo, todas las relaciones entre entidades existen únicamente como campos FK
(`hypothesisId`, `variableId`, `indicadorIds`, etc.) embebidos en los objetos. Esto tiene
tres consecuencias negativas:

1. **No se puede consultar el impacto de un cambio** sin recorrer manualmente todos los objetos.
2. **Los huérfanos no son detectables** sin saber qué tipo de entidad tiene un FK hacia otra.
3. **La trazabilidad es unidireccional**: se puede ir de indicador a variable, pero no
   de variable a "todos los indicadores y filas que dependen de ella" sin recorrer todas
   las colecciones.

## Decisión

**Las relaciones entre entidades se representan explícitamente como nodos y aristas en un
Knowledge Graph interno.**

Un `KnowledgeEdge` es una entidad de primer nivel con:
- `id` propio
- `source` (nodo que depende / referencia)
- `target` (nodo que es dependido / referenciado)
- `relationType` (tipo semántico de la relación)

El grafo:
- Se construye bajo demanda desde el estado de sesión — no se persiste.
- No duplica datos: los nodos referencian las entidades originales por `refId`.
- Es reconstruible completamente en cualquier momento.

## Tipos de relación

| RelationType | Semántica |
|---|---|
| `supports` | Una hipótesis aborda el problema |
| `belongs-to` | Una variable pertenece a la hipótesis (vía modelo conceptual) |
| `derives-from` | Un indicador deriva conceptualmente de una variable |
| `measures` | Un indicador mide una variable; una fila de op. mide un indicador |
| `uses` | Una fuente cubre un indicador; una fila usa una fuente o indicador |
| `operationalizes` | Una fila de op. operacionaliza una variable |
| `contrasts` | Una fila de contrastación contrasta una hipótesis |

## Dirección de las aristas

**Fuente → Destino significa: "la fuente depende de / referencia al destino".**

Ejemplos:
- `indicator → variable`: el indicador deriva de la variable
- `op-row → indicator`: la fila mide el indicador
- `ct-row → hypothesis`: la fila contrasta la hipótesis

Esto permite:
- `findDependencies(node)` = aristas salientes = qué necesita este nodo
- `findDependents(node)` = aristas entrantes = qué depende de este nodo

## Ciclos prohibidos

El grafo es un DAG (Directed Acyclic Graph). Ciclos prohibidos:
- variable → variable (una variable no puede depender de sí misma)
- hypothesis → hypothesis
- indicator → indicator
- Ningún ciclo de ningún tipo (cualquier path de longitud > 0 que vuelva al nodo origen)

## Consecuencias

**Positivas:**
- El impacto de eliminar cualquier entidad es computable en O(V+E).
- La detección de huérfanos es explícita y tipificada.
- La trazabilidad es bidireccional.
- El grafo es extensible sin modificar los tipos de entidades originales.

**Negativas / deuda técnica:**
- El grafo se reconstruye en cada render de PantallaKnowledgeGraph — O(n) en el tamaño de la sesión.
- No hay índices; la búsqueda de aristas es lineal.
- El grafo no se persiste — se pierde al recargar.

## Alternativas consideradas

| Opción | Razón de descarte |
|---|---|
| Mantener FKs únicamente | No permite consultas bidireccionales ni cálculo de impacto sin recorrer todas las colecciones |
| Base de datos de grafos (Neo4j, etc.) | Excesivo para una aplicación session-only; viola la restricción de no introducir servicios externos |
| Librería de grafos (D3, vis.js, etc.) | El sprint prohíbe explícitamente librerías de grafos y canvas |
| Grafo persistido en estado de sesión | Requeriría sincronización con el estado real — riesgo de inconsistencia |
