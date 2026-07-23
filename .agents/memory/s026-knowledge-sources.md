---
name: S-026 Knowledge Sources
description: KnowledgeSource entity, schema 1.2.0, migration API quirks, fixture requirements
---

## Regla principal
`knowledgeSources: KnowledgeSource[]` es campo NO-opcional en `ProjectSnapshotPayload` desde schema 1.2.0.
Toda construcción manual de un payload completo debe incluir `knowledgeSources: []`.

## migrateSnapshot — tipo de retorno
`migrateSnapshot(snapshot: ProjectSnapshot, toVersion: string)` retorna `SchemaMigrationResult`,
NO un `ProjectSnapshot`. Para acceder al payload migrado: `result.migratedPayload as ProjectSnapshotPayload`.
Verificar `result.success` antes de usar `result.migratedPayload`.

## createProjectPackage — firma correcta
`createProjectPackage(projectId: string, projectName: string, snapshots: ProjectSnapshot[], versions: ProjectVersion[])`
El primer argumento es el `projectId` (string), NO el array de snapshots.

## Fixtures en tests existentes
Al bumpar `CURRENT_PROJECT_SCHEMA_VERSION`, actualizar en suites anteriores:
- La aserción literal del string (e.g. `expect(CURRENT_PROJECT_SCHEMA_VERSION).toBe("1.2.0")`)
- Cualquier objeto `ProjectSnapshotPayload` hardcodeado (añadir el nuevo campo requerido)
Patrón: buscar con `grep -rn "1.x.0" src/**/__tests__/` tras cada bump.

**Why:** TypeScript strict mode rechaza payloads incompletos; los tests de regresión tienen
aserciones de versión hardcodeadas que deben actualizarse manualmente con cada bump.

## ready-for-analysis
Estado de antesala del pipeline cognitivo S-027. En S-026 no desencadena proceso alguno.
El botón "Analizar fuente" debe estar disabled con indicador explícito de S-027.

## Eliminación — NO es breaking change en S-026
Las fuentes no alimentan la cadena metodológica hasta S-027. ADR-0015.

## Commit S-026
`36fe8ad` — `origin/main`. 21 files changed, 2602 insertions.
