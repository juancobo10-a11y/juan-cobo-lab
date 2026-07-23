# Informe de validación — S-026: Knowledge Sources Foundation

**Fecha:** 2026-07-23  
**Sprint:** S-026  
**Autor:** HELIOS Engineering  
**Commit base:** 7eb0897 (S-025)

---

## Resumen ejecutivo

S-026 introduce `KnowledgeSource` como entidad del modelo de dominio de
HELIOS, asociada al `UnderstandingCase` establecido en S-025. El sprint es
estrictamente aditivo: ningún módulo existente fue refactorizado.

**Resultado:** 20/20 suites PASS · TypeCheck: 0 errores.

---

## Cambios de esquema

| Campo | Tipo | Posición en payload | Valor por defecto |
|-------|------|---------------------|-------------------|
| `knowledgeSources` | `KnowledgeSource[]` | Junto a `understandingCase` | `[]` |

Versión de esquema: **1.1.0 → 1.2.0**

---

## Modelo de estados validado

```
draft ──► registered ──► ready-for-analysis
              │                   │
              ▼                   ▼ [S-027]
            draft             processed
              │
              ▼
           rejected / archived
```

`ready-for-analysis` es el estado de antesala del pipeline cognitivo (S-027).
Marcarlo no desencadena ningún proceso en S-026; es una señal de intención
registrada en el snapshot con plena trazabilidad.

---

## Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/knowledge-sources/types.ts` | `KnowledgeSource`, enums de estado/tipo, labels, transiciones |
| `src/knowledge-sources/KnowledgeSourceService.ts` | Funciones puras: CRUD, validación, transiciones |
| `src/knowledge-sources/__tests__/validacion_s026.ts` | Suite S-026 — 16 secciones |
| `src/components/PantallaFuentes.tsx` | Pantalla de gestión de fuentes de conocimiento |
| `src/project-versioning/migrations/migration-1.1.0-to-1.2.0.ts` | Migración declarativa |
| `docs/adr/ADR-0015-knowledge-sources.md` | Decisión de arquitectura |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/project-versioning/types.ts` | Versión `"1.2.0"`, `knowledgeSources` en payload y `ReconstructedSession` |
| `src/project-versioning/SnapshotService.ts` | `reconstructSessionFromSnapshot` incluye `knowledgeSources` |
| `src/project-versioning/migrations/registry.ts` | 3 migraciones registradas |
| `src/project-versioning/VersionComparisonService.ts` | Diff y changelog para `knowledgeSource` |
| `src/project-versioning/index.ts` | Re-exporta tipos y funciones de `KnowledgeSource` |
| `src/components/PantallaCaseSetup.tsx` | `CaseSummaryBand` con `onNavigateToFuentes` y `sourcesCount` |
| `src/pages/Helios.tsx` | Estado `knowledgeSources`, pantalla `"fuentes"`, handlers |
| `src/project-versioning/__tests__/validacion_s024.ts` | `knowledgeSources: []` en fixtures |
| `src/project-versioning/__tests__/validacion_s024_1.ts` | `knowledgeSources: []` en fixtures |
| `src/understanding-case/__tests__/validacion_s025.ts` | `knowledgeSources: []` en fixtures |
| `scripts/validate-all.ts` | Suite S-026 añadida; header actualizado |
| `package.json` | Script `validate:s026` |
| `CHANGELOG.md` | Entrada S-026 |
| `PROJECT_CURRENT_STATE.md` | Actualización completa |

---

## Rutas de migración verificadas

| Ruta | Resultado |
|------|-----------|
| `0.9.0 → 1.2.0` | ✅ PASS — `knowledgeSources: []`, `understandingCase` sintetizado |
| `1.0.0 → 1.2.0` | ✅ PASS (vía 1.1.0) |
| `1.1.0 → 1.2.0` | ✅ PASS — `knowledgeSources: []`, todos los campos 1.1.0 preservados |

---

## Secciones de la suite S-026

| # | Sección | Aserciones |
|---|---------|-----------|
| 1 | Creación válida de una fuente | 6 |
| 2 | Validación — campos obligatorios | 5 |
| 3 | Validación — longitudes y restricciones | 3 |
| 4 | Edición (updateSource) | 5 |
| 5 | Cambio de estado — transiciones válidas | 6 |
| 6 | Cambio de estado — transiciones inválidas | 3 |
| 7 | Eliminación por ID | 2 |
| 8 | Asociación con el caso (caseId) | 3 |
| 9 | Múltiples fuentes en el mismo caso | 2 |
| 10 | Inclusión en snapshot | 3 |
| 11 | Estabilidad del hash | 2 |
| 12 | Hash cambia al modificar una fuente | 3 |
| 13 | Exportación e importación round-trip | 1 |
| 14 | Migración desde 1.1.0 | 4 |
| 15 | Diff: creación, modificación, eliminación, reordenamiento | 5 |
| 16 | Coexistencia con UnderstandingCase | 3 |
| **Total** | | **~56 aserciones** |

---

## Invariantes verificados

- `knowledgeSources` siempre es array (nunca `undefined` ni `null`) en payloads 1.2.0
- `incorporatedAt` no se modifica por `updateSource` ni `changeStatus`
- IDs únicos por fuente (prefijo `ks_`)
- Hash SHA-256 cambia con cualquier modificación de contenido, estado o eliminación
- `migrateSnapshot` es sincrónico; retorna `SchemaMigrationResult.migratedPayload`
- "Analizar fuente" deshabilitado en UI — señal explícita de S-027

---

## Criterios de aceptación — cumplimiento

| Criterio | Estado |
|---------|--------|
| `knowledgeSources: []` siempre presente en 1.2.0 | ✅ |
| Snapshots 1.1.0 migran con `knowledgeSources: []` | ✅ |
| Ruta 0.9.0→1.0.0→1.1.0→1.2.0 verificada | ✅ |
| Hash cambia al modificar/eliminar fuente | ✅ |
| Round-trip exportación/importación preserva fuentes | ✅ |
| PantallaFuentes renderiza con CaseSummaryBand | ✅ |
| "Analizar fuente" deshabilitado con indicador S-027 | ✅ |
| Eliminación requiere confirmación explícita | ✅ |
| 20/20 suites PASS · TypeCheck: 0 errores | ✅ |
| Flujo metodológico existente no alterado | ✅ |
