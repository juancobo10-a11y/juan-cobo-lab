# S-024 — Architecture Review: Versioning & Reproducibility

## 1. ¿Qué integra exactamente un snapshot?

El payload incluye el estado metodológico **persistible** completo:
- `problema`, `packActivo`, `thinkingUserSelection`, `reflectionAnswers`
- `hypotheses`, `primaryHypothesisId`
- `conceptualModels` (con variables, indicadores, fuentes)
- `operationalizationMatrices`, `contrastationMatrices`
- `evidenceEvaluationMatrices`, `hypothesisEvidenceConclusions`
- `reportDefinitions` (configuración, no contenido renderizado)

## 2. ¿Qué queda excluido y por qué?

| Excluido | Razón |
|----------|-------|
| `pantalla`, `hipotesisActiva`, `hypothesesReviewed` | Estado transitorio de UI |
| `routerResult`, `thinkingResult`, `candidateExplanations` | Derivados o transitorios |
| `perequeMode` | Derivable de `thinkingUserSelection` + `packActivo` |
| Knowledge Graph | Derivable del payload con `buildGraph()` |
| Auditorías | Derivables con `runMethodologicalAudit()` |
| Reportes generados | Reconstruibles desde `reportDefinitions` + payload |
| Validaciones, resúmenes | Derivados |

## 3. ¿Cómo se garantiza la inmutabilidad?

- `createProjectSnapshot()` aplica `Object.freeze` recursivo (deep freeze)
- El payload se almacena como copia profunda (`JSON.parse(JSON.stringify(payload))`)
- `reconstructSessionFromSnapshot()` retorna otra copia profunda (mutable, para React state)
- Nunca se comparte referencia directa entre snapshot y session activa

## 4. ¿Cómo se calcula el hash?

MurmurHash3-inspired 128-bit fingerprint sobre:
```
JSON.stringify({
  schemaVersion,
  projectId,
  projectName,
  payload: normalizeSnapshotPayload(payload)
})
```

## 5. ¿Qué campos se excluyen del hash?

- `createdAt` (timestamp de captura)
- `contentHash` (no puede incluirse a sí mismo)
- `id` del snapshot
- Texto transitorio de UI

## 6. ¿Cómo se preserva el orden semántico?

`normalizeSnapshotPayload()` usa `sortKeys()` que:
- Ordena claves de objetos alfabéticamente (determinismo)
- **Preserva** orden de listas con significado metodológico: `variables`, `indicators`, `evidenceSources`, `rows`, `assessments`, `sections`, `reflectionAnswers`, `hypotheses`, y todas las matrices
- Ordena listas sin significado semántico (e.g., `tags`)

## 7. ¿Cómo se compara una versión?

`compareSnapshots(base, target)` compara entidades por ID (no por índice):
- Detecta added, removed, modified, reordered, unchanged para cada tipo de entidad
- Produce un `ProjectDiff` con `changes[]` y `summary`
- `generateMethodologicalChangelog()` agrupa cambios por tipo de entidad en una estructura exportable

## 8. ¿Cómo se distingue modificación de reordenamiento?

Algoritmo en `compareEntityList()`:
1. Comparar contenido (`JSON.stringify(a) === JSON.stringify(b)`)
2. Si contenido igual → verificar posición (índice)
3. Mismo contenido + diferente posición → `"reordered"`
4. Diferente contenido → `"modified"` (con `changedFields` listados)

## 9. ¿Qué cambios son breaking?

Cambios breaking son eliminaciones de entidades que tienen dependientes downstream:
- Hipótesis eliminada
- ConceptualModel eliminado
- ConceptualVariable eliminada (puede ser referenciada por indicadores)
- ConceptualIndicator eliminado
- ObservedEvidence eliminada (puede ser referenciada en evaluaciones)
- OperationalizationMatrix o ContrastationMatrix eliminadas
- HypothesisEvidenceConclusion eliminada

Las ediciones textuales **no** son breaking.

## 10. ¿Cómo se reconstruye un informe anterior?

```
snapshot
  → reconstructSessionFromSnapshot() → session (deep copy)
  → findReportDefinitionByHypothesis() → reportDef
  → buildReportDocument(reportDef, buildInput) → GeneratedReport
  → MarkdownExporter.export() → string
```

## 11. ¿Cómo se verifica reproducibilidad?

`verifyReportReproducibility()` genera el informe dos veces desde el mismo snapshot y compara hashes (con timestamps excluidos). Si los hashes coinciden → reproducible.

## 12. ¿Cómo funciona el paquete de proyecto?

```json
{
  "manifest": { format, packageVersion, schemaVersion, projectId, projectName, exportedAt, packageHash },
  "snapshots": [...],
  "versions": [...]
}
```

El `packageHash` excluye `exportedAt` para reproducibilidad binaria.

## 13. ¿Cómo se protege la importación?

Flujo de importación:
1. Parsear JSON
2. Validar estructura (manifest + snapshots + versions)
3. Verificar `packageHash`
4. Verificar `schemaVersion` (futuro → bloqueado)
5. Migrar si es necesario
6. Detectar conflictos de IDs
7. Mostrar resumen al usuario
8. Esperar confirmación explícita
9. Aplicar estrategia elegida (create-copy por defecto)

## 14. ¿Cómo se manejan versiones de esquema?

- `CURRENT_PROJECT_SCHEMA_VERSION = "1.0.0"` como constante central
- `registerMigration()` declara migraciones
- `findMigrationPath()` usa BFS para encontrar la ruta más corta
- Versión futura: bloqueada con mensaje explícito
- Versión sin ruta de migración: bloqueada con mensaje explícito

## 15. ¿Qué ocurre con archivos de versiones futuras?

Se bloquean explícitamente:
```
Cannot import package with future schemaVersion X.Y.Z (current: 1.0.0)
```
No se intenta adivinar estructuras desconocidas.

## 16. ¿Cómo se evita reemplazar silenciosamente el proyecto activo?

- La estrategia por defecto es `"create-copy"` (nuevos IDs para todo)
- `"replace-current"` requiere selección explícita en la UI + confirmación
- `"cancel"` siempre disponible
- La UI muestra el resumen de impacto antes de confirmar
- No hay importación automática sin confirmación del usuario

## 17. ¿Qué limitaciones de seguridad permanecen?

- No hay cifrado; el hash garantiza integridad, no confidencialidad
- El usuario debe proteger los archivos exportados
- No hay firma digital ni certificación de autoría
- Los snapshots viven en memoria de sesión (no en localStorage ni indexedDB)

## 18. ¿Qué deuda técnica queda?

- Hash: MurmurHash3-128 (no SHA-256) — upgrade requiere API asíncrona
- Sin firma digital para auditoría institucional
- Sin cifrado de archivos exportados
- Sin soporte ZIP para paquetes con múltiples artefactos
- Sin merge automático de proyectos importados
- Snapshots solo en memoria de sesión (sin persistencia entre sesiones)

## 19. ¿Está HELIOS preparado para colaboración, firma digital o auditoría institucional?

No completamente en este sprint. La arquitectura es extensible:
- **Colaboración**: requeriría un backend y resolución de conflictos
- **Firma digital**: requeriría Web Crypto Signatures + PKI
- **Auditoría institucional**: requeriría almacenamiento externo, trazabilidad de usuarios y cifrado

Las bases (snapshots inmutables, hashes determinísticos, paquetes portables) están en lugar.

## 20. ¿Qué deuda arquitectónica queda documentada?

Ver ADR-0013 para el registro completo de consecuencias y alternativas consideradas.
