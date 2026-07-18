# ADR-0013 — Los snapshots son representaciones inmutables y verificables del estado metodológico

**Sprint:** S-024  
**Estado:** Aceptado  
**Fecha:** 2026-07-18

---

## Contexto

Después de S-023, HELIOS permite diseñar, auditar, evaluar evidencia, formular conclusiones y generar informes trazables. Sin embargo, no existía forma de capturar de manera inmutable el estado completo de un proyecto en un momento determinado.

Esto impedía responder preguntas como:
- ¿Qué versión del proyecto produjo este informe?
- ¿Qué cambió entre dos revisiones?
- ¿Puede reconstruirse exactamente un reporte anterior?
- ¿El archivo importado conserva su integridad?

---

## Decisión

Introducir un motor de versionamiento metodológico con snapshots inmutables.

**Un snapshot:**
- Es una representación completa y normalizada del estado metodológico en un momento dado.
- Es inmutable (Object.freeze profundo en tiempo de ejecución).
- Es determinístico (mismo contenido → mismo hash).
- Es verificable (hash de integridad).
- Es serializable (JSON, `.helios.json`).
- Es migrable (sistema de migraciones con path finding).
- Es reconstruible (session completa desde payload).
- Es independiente de la interfaz (no contiene estado de UI).

---

## Qué incluye un snapshot

### Incluido (estado metodológico persistible):
- `problema` — el problema de política pública analizado
- `packActivo` — el Knowledge Pack completo (para reproducibilidad cruzada de versiones)
- `thinkingUserSelection` — patrones de pensamiento seleccionados
- `reflectionAnswers` — respuestas de reflexión del usuario
- `hypotheses` — hipótesis de política
- `primaryHypothesisId` — hipótesis principal designada
- `conceptualModels` — modelos conceptuales con variables, indicadores y fuentes
- `operationalizationMatrices` — matrices de operacionalización
- `contrastationMatrices` — matrices de contrastación
- `evidenceEvaluationMatrices` — matrices de evaluación de evidencia
- `hypothesisEvidenceConclusions` — conclusiones metodológicas
- `reportDefinitions` — definiciones de informes (configuración, no contenido)

### Excluido (derivado, transitorio o estado de UI):
- `pantalla` — estado de navegación (UI)
- `routerResult` — resultado derivado del router
- `hipotesisActiva` — estado de UI
- `thinkingResult` — estado computado
- `candidateExplanations` — estado de UI
- `hypothesesReviewed` — estado de UI
- `perequeMode` — derivable de `thinkingUserSelection` + `packActivo`
- Knowledge Graph — derivable del payload
- Auditorías metodológicas — derivables del payload
- Reportes generados — reconstruibles desde `reportDefinitions` + payload
- Validaciones, resúmenes, filtros — derivados

---

## Hash de integridad

El `contentHash` se calcula sobre:
```
schemaVersion + projectId + projectName + payload normalizado
```

**Excluido del hash:**
- `createdAt` (el timestamp de captura no afecta el contenido)
- `contentHash` (no puede incluirse a sí mismo)
- Texto transitorio
- Orden accidental de claves (normalizado con sortKeys)

**Algoritmo:** MurmurHash3-inspired 128-bit fingerprint (puro JS, sincrónico, cross-environment).

**Importante:** El hash garantiza **integridad** (detección de modificaciones), no **confidencialidad**. El archivo exportado no está cifrado. El usuario debe protegerlo.

---

## Normalización

`normalizeSnapshotPayload()` produce una representación canónica:
- Claves de objetos ordenadas alfabéticamente
- Listas con orden semántico preservadas (variables, indicadores, evidencias, secciones)
- Listas sin significado semántico ordenadas establemente
- `undefined` normalizado → `null`
- Referencias circulares: no existen en el modelo de datos de HELIOS

---

## Versiones de esquema

- `schemaVersion` — identifica la **estructura técnica** del payload (e.g., `"1.0.0"`)
- `versionLabel` — identifica la **versión metodológica** declarada por el usuario (e.g., `"v2 - revisión de evidencia"`)

No son intercambiables.

---

## Migraciones

Sistema de migraciones con BFS path-finding:
- Registro declarativo de migrations: `registerMigration({ fromVersion, toVersion, migrate })`
- Migración compuesta: `0.9.0 → 1.0.0 → 2.0.0` si el camino existe
- Versión futura: bloqueada (no se intenta adivinar estructuras desconocidas)
- Migración fallida: error explícito, no silencioso

---

## Reproducibilidad de informes

El mismo snapshot + la misma `ReportDefinition` siempre producen el mismo contenido estructural.
Los timestamps son excluidos del hash de reproducibilidad.
Los informes se **reconstruyen** desde el snapshot; no se almacenan dentro de él.

---

## Importación

- Por defecto: `create-copy` (nuevos IDs, sin conflicto con el proyecto activo)
- Requiere confirmación explícita para `replace-current`
- `cancel` disponible en todo momento
- Verificaciones: structure → hash → schemaVersion → migraciones → conflictos → confirmación

---

## Alternativas consideradas

1. **Almacenar el Knowledge Graph completo** — rechazado (derivado, reproduce las entidades originales)
2. **Almacenar reportes generados como archivos dentro del snapshot** — rechazado (reconstruibles, aumenta tamaño innecesariamente)
3. **SHA-256 asíncrono (Web Crypto API)** — rechazado en este sprint (complica la API de funciones puras); documentado como upgrade path
4. **Git interno** — rechazado (fuera de alcance, no aplicable al modelo de sesión)
5. **ZIP** — rechazado en este sprint (JSON es suficiente para el modelo de datos actual)

---

## Consecuencias

✅ Snapshots reproducibles e intercambiables  
✅ Integridad verificable con un hash determinístico  
✅ Exportación/importación segura sin reemplazo silencioso  
✅ Arquitectura de migraciones extensible  
✅ Separación limpia entre estado activo y snapshots inmutables  
⚠️ El hash no es SHA-256; upgrade a Web Crypto requiere API asíncrona  
⚠️ Los snapshots no son backups externos (son estado de sesión serializado)  
⚠️ No hay cifrado; la confidencialidad es responsabilidad del usuario
