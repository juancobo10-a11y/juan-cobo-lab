/**
 * S-024 — VersionComparisonService
 *
 * Pure functions for comparing two project snapshots.
 * No mutations. No storage access. No LLM-generated descriptions.
 *
 * Comparison strategy:
 * - Entities are compared by ID, not by array index.
 * - modification vs reordering: an entity is "reordered" if its content
 *   (excluding position) is unchanged but its index in the parent list differs.
 * - breaking changes: explicit rule set (hypothesis removed, variable removed
 *   that is referenced by an indicator, etc.).
 */

import type {
  ProjectDiff,
  ProjectDiffSummary,
  ProjectEntityChange,
  ProjectChangeType,
  ProjectSnapshot,
  MethodologicalChangelog,
  MethodologicalChangelogSection,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stableJson(v: unknown): string {
  return JSON.stringify(v, Object.keys(v as object ?? {}).sort() as never);
}

function contentEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare two lists of entities keyed by ID.
 * Detects added, removed, modified, reordered, unchanged.
 */
function compareEntityList(
  entityType: string,
  before: Array<{ id: string } & Record<string, unknown>>,
  after: Array<{ id: string } & Record<string, unknown>>,
  traceabilityFn?: (e: { id: string } & Record<string, unknown>) => { hypothesisId?: string; parentEntityId?: string }
): ProjectEntityChange[] {
  const changes: ProjectEntityChange[] = [];
  const beforeMap = new Map(before.map((e) => [e.id, e]));
  const afterMap = new Map(after.map((e) => [e.id, e]));
  const beforeIndex = new Map(before.map((e, i) => [e.id, i]));
  const afterIndex = new Map(after.map((e, i) => [e.id, i]));

  // Removed
  before.forEach((bEntity) => {
    if (!afterMap.has(bEntity.id)) {
      changes.push({
        entityType,
        entityId: bEntity.id,
        changeType: "removed",
        before: bEntity,
        after: undefined,
        traceability: traceabilityFn?.(bEntity),
      });
    }
  });

  // Added / modified / reordered / unchanged
  after.forEach((aEntity) => {
    if (!beforeMap.has(aEntity.id)) {
      changes.push({
        entityType,
        entityId: aEntity.id,
        changeType: "added",
        before: undefined,
        after: aEntity,
        traceability: traceabilityFn?.(aEntity),
      });
    } else {
      const bEntity = beforeMap.get(aEntity.id)!;
      const posChanged = beforeIndex.get(aEntity.id) !== afterIndex.get(aEntity.id);

      if (contentEqual(bEntity, aEntity)) {
        // Same content
        if (posChanged) {
          changes.push({
            entityType,
            entityId: aEntity.id,
            changeType: "reordered",
            before: bEntity,
            after: aEntity,
            traceability: traceabilityFn?.(aEntity),
          });
        } else {
          changes.push({
            entityType,
            entityId: aEntity.id,
            changeType: "unchanged",
            traceability: traceabilityFn?.(aEntity),
          });
        }
      } else {
        // Content changed
        const changedFields = Object.keys(aEntity).filter(
          (k) => !contentEqual(bEntity[k], aEntity[k])
        );
        changes.push({
          entityType,
          entityId: aEntity.id,
          changeType: "modified",
          before: bEntity,
          after: aEntity,
          changedFields,
          traceability: traceabilityFn?.(aEntity),
        });
      }
    }
  });

  return changes;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function compareEntities(
  entityType: string,
  before: Array<{ id: string } & Record<string, unknown>>,
  after: Array<{ id: string } & Record<string, unknown>>
): ProjectEntityChange[] {
  return compareEntityList(entityType, before, after);
}

export function findAddedEntities(changes: ProjectEntityChange[]): ProjectEntityChange[] {
  return changes.filter((c) => c.changeType === "added");
}

export function findRemovedEntities(changes: ProjectEntityChange[]): ProjectEntityChange[] {
  return changes.filter((c) => c.changeType === "removed");
}

export function findModifiedEntities(changes: ProjectEntityChange[]): ProjectEntityChange[] {
  return changes.filter((c) => c.changeType === "modified");
}

export function findUnchangedEntities(changes: ProjectEntityChange[]): ProjectEntityChange[] {
  return changes.filter((c) => c.changeType === "unchanged");
}

// ─── Breaking change detection ────────────────────────────────────────────────

/**
 * A change is "breaking" if it could invalidate downstream methodological
 * entities that depend on the removed/modified entity.
 *
 * Breaking conditions (explicit rules):
 * 1. A hypothesis is removed
 * 2. A ConceptualModel is removed
 * 3. A ConceptualVariable is removed (it may be referenced by indicators)
 * 4. A ConceptualIndicator is removed
 * 5. An ObservedEvidence is removed (it may be referenced by EvidenceAssessment)
 * 6. An OperationalizationMatrix is removed
 * 7. A ContrastationMatrix row is removed
 */
function isBreakingChange(change: ProjectEntityChange): boolean {
  if (change.changeType !== "removed") return false;
  const breakingTypes = [
    "hypothesis",
    "conceptualModel",
    "conceptualVariable",
    "conceptualIndicator",
    "observedEvidence",
    "operationalizationMatrix",
    "contrastationMatrix",
    "evidenceEvaluationMatrix",
    "hypothesisEvidenceConclusion",
  ];
  return breakingTypes.includes(change.entityType);
}

// ─── Snapshot comparison ──────────────────────────────────────────────────────

export function compareSnapshots(base: ProjectSnapshot, target: ProjectSnapshot): ProjectDiff {
  const changes: ProjectEntityChange[] = [];

  const bp = base.payload;
  const tp = target.payload;

  // Problem
  if (bp.problema !== tp.problema) {
    changes.push({ entityType: "problema", entityId: "problema", changeType: "modified", before: bp.problema, after: tp.problema, changedFields: ["problema"] });
  } else {
    changes.push({ entityType: "problema", entityId: "problema", changeType: "unchanged" });
  }

  // Pack
  const bPackId = bp.packActivo?.metadata.id ?? null;
  const tPackId = tp.packActivo?.metadata.id ?? null;
  if (bPackId !== tPackId) {
    changes.push({ entityType: "pack", entityId: "pack", changeType: "modified", before: bp.packActivo, after: tp.packActivo, changedFields: ["pack"] });
  }

  // Hypotheses
  changes.push(...compareEntityList(
    "hypothesis",
    bp.hypotheses as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.hypotheses as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  // Conceptual models
  changes.push(...compareEntityList(
    "conceptualModel",
    bp.conceptualModels as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.conceptualModels as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  // Variables (embedded in models)
  const bVars = bp.conceptualModels.flatMap((m) =>
    (m.variables ?? []).map((v) => ({ ...(v as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tVars = tp.conceptualModels.flatMap((m) =>
    (m.variables ?? []).map((v) => ({ ...(v as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(...compareEntityList("conceptualVariable", bVars, tVars, (e) => ({
    parentEntityId: (e as { _modelId?: string })._modelId,
  })));

  // Indicators
  const bInds = bp.conceptualModels.flatMap((m) =>
    (m.indicators ?? []).map((i) => ({ ...(i as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tInds = tp.conceptualModels.flatMap((m) =>
    (m.indicators ?? []).map((i) => ({ ...(i as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(...compareEntityList("conceptualIndicator", bInds, tInds, (e) => ({
    parentEntityId: (e as { _modelId?: string })._modelId,
  })));

  // Evidence sources
  const bSrcs = bp.conceptualModels.flatMap((m) =>
    (m.evidenceSources ?? []).map((s) => ({ ...(s as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tSrcs = tp.conceptualModels.flatMap((m) =>
    (m.evidenceSources ?? []).map((s) => ({ ...(s as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(...compareEntityList("evidenceSource", bSrcs, tSrcs));

  // Operationalization matrices
  changes.push(...compareEntityList(
    "operationalizationMatrix",
    bp.operationalizationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.operationalizationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  // Contrastation matrices
  changes.push(...compareEntityList(
    "contrastationMatrix",
    bp.contrastationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.contrastationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  // Evidence evaluation matrices
  changes.push(...compareEntityList(
    "evidenceEvaluationMatrix",
    bp.evidenceEvaluationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.evidenceEvaluationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  // Observed evidences (embedded)
  const bEvs = bp.evidenceEvaluationMatrices.flatMap((m) =>
    (m.observedEvidence ?? []).map((e) => ({ ...(e as object), _matrixId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tEvs = tp.evidenceEvaluationMatrices.flatMap((m) =>
    (m.observedEvidence ?? []).map((e) => ({ ...(e as object), _matrixId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(...compareEntityList("observedEvidence", bEvs, tEvs));

  // Hypothesis evidence conclusions
  changes.push(...compareEntityList(
    "hypothesisEvidenceConclusion",
    bp.hypothesisEvidenceConclusions as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.hypothesisEvidenceConclusions as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  // Report definitions
  changes.push(...compareEntityList(
    "reportDefinition",
    bp.reportDefinitions as unknown as Array<{ id: string } & Record<string, unknown>>,
    tp.reportDefinitions as unknown as Array<{ id: string } & Record<string, unknown>>
  ));

  const summary = summarizeDiff(changes);

  return {
    baseSnapshotId: base.id,
    targetSnapshotId: target.id,
    changes,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

export function summarizeDiff(changes: ProjectEntityChange[]): ProjectDiffSummary {
  let added = 0, removed = 0, modified = 0, reordered = 0, unchanged = 0;
  const affectedTypes = new Set<string>();
  let hasBreakingChanges = false;

  changes.forEach((c) => {
    if (c.changeType === "added") { added++; affectedTypes.add(c.entityType); }
    else if (c.changeType === "removed") { removed++; affectedTypes.add(c.entityType); }
    else if (c.changeType === "modified") { modified++; affectedTypes.add(c.entityType); }
    else if (c.changeType === "reordered") { reordered++; }
    else unchanged++;
    if (isBreakingChange(c)) hasBreakingChanges = true;
  });

  return {
    added,
    removed,
    modified,
    reordered,
    unchanged,
    affectedEntityTypes: [...affectedTypes].sort(),
    hasBreakingChanges,
  };
}

export function groupChangesByEntityType(
  changes: ProjectEntityChange[]
): Record<string, ProjectEntityChange[]> {
  const groups: Record<string, ProjectEntityChange[]> = {};
  changes.forEach((c) => {
    if (!groups[c.entityType]) groups[c.entityType] = [];
    groups[c.entityType].push(c);
  });
  return groups;
}

export function generateMethodologicalChangelog(diff: ProjectDiff): MethodologicalChangelog {
  const grouped = groupChangesByEntityType(diff.changes);
  const entityLabels: Record<string, string> = {
    hypothesis: "Hipótesis",
    conceptualModel: "Modelos conceptuales",
    conceptualVariable: "Variables",
    conceptualIndicator: "Indicadores",
    evidenceSource: "Fuentes de evidencia",
    operationalizationMatrix: "Matrices de operacionalización",
    contrastationMatrix: "Matrices de contrastación",
    evidenceEvaluationMatrix: "Matrices de evaluación de evidencia",
    observedEvidence: "Evidencias observadas",
    hypothesisEvidenceConclusion: "Conclusiones",
    reportDefinition: "Definiciones de informe",
    problema: "Problema de política",
    pack: "Pack de conocimiento",
  };

  const sections: MethodologicalChangelogSection[] = Object.keys(grouped)
    .filter((k) => k !== "unchanged")
    .sort()
    .map((entityType) => {
      const items = grouped[entityType];
      return {
        entityType,
        label: entityLabels[entityType] ?? entityType,
        added: items.filter((c) => c.changeType === "added").length,
        removed: items.filter((c) => c.changeType === "removed").length,
        modified: items.filter((c) => c.changeType === "modified").length,
        reordered: items.filter((c) => c.changeType === "reordered").length,
      };
    })
    .filter((s) => s.added + s.removed + s.modified + s.reordered > 0);

  return { sections, generatedAt: new Date().toISOString() };
}
