/**
 * S-024 / S-024.1 — VersionComparisonService
 *
 * Pure functions for comparing two project snapshots.
 * No mutations. No storage access. No LLM-generated descriptions.
 *
 * Comparison strategy:
 * - Entities are compared by ID, never by array index alone.
 * - reordered: same entity, same canonical content, different index.
 * - modified: same entity, different canonical content.
 * - modified + reordered: content changed AND position changed simultaneously.
 *   In this case: changeType = "modified", reordered = true.
 * - breaking changes: evaluated using the BreakingChangeRules catalog.
 *
 * Index tracking:
 * - beforeIndex: position in base snapshot array (-1 if not present).
 * - afterIndex: position in target snapshot array (-1 if not present).
 *
 * Precedence rule for simultaneous content+position change:
 *   changeType = "modified" (content takes precedence), reordered = true.
 */

import type {
  ProjectDiff,
  ProjectDiffSummary,
  ProjectEntityChange,
  ProjectSnapshot,
  MethodologicalChangelog,
  MethodologicalChangelogSection,
} from "./types";
import {
  isBreakingChange,
  evaluateBreakingChange,
} from "./breaking-change-rules";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contentEqual(a: unknown, b: unknown): boolean {
  // Use JSON.stringify for deep equality — order of keys must match
  // (canonicalize is used upstream; here we compare already-normalized values)
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare two lists of entities keyed by ID.
 * Detects: added, removed, modified, reordered, unchanged.
 * Modified + reordered simultaneously → changeType = "modified", reordered = true.
 */
function compareEntityList(
  entityType: string,
  before: Array<{ id: string } & Record<string, unknown>>,
  after: Array<{ id: string } & Record<string, unknown>>,
  traceabilityFn?: (
    e: { id: string } & Record<string, unknown>
  ) => { hypothesisId?: string; parentEntityId?: string }
): ProjectEntityChange[] {
  const changes: ProjectEntityChange[] = [];
  const beforeMap = new Map(before.map((e) => [e.id, e]));
  const afterMap = new Map(after.map((e) => [e.id, e]));
  const beforeIndexMap = new Map(before.map((e, i) => [e.id, i]));
  const afterIndexMap = new Map(after.map((e, i) => [e.id, i]));

  // Removed
  before.forEach((bEntity) => {
    if (!afterMap.has(bEntity.id)) {
      const change: ProjectEntityChange = {
        entityType,
        entityId: bEntity.id,
        changeType: "removed",
        before: bEntity,
        after: undefined,
        beforeIndex: beforeIndexMap.get(bEntity.id) ?? -1,
        afterIndex: -1,
        traceability: traceabilityFn?.(bEntity),
      };
      const rule = evaluateBreakingChange(change);
      if (rule) change.breakingRuleId = rule.id;
      changes.push(change);
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
        beforeIndex: -1,
        afterIndex: afterIndexMap.get(aEntity.id) ?? -1,
        traceability: traceabilityFn?.(aEntity),
      });
    } else {
      const bEntity = beforeMap.get(aEntity.id)!;
      const bIdx = beforeIndexMap.get(aEntity.id) ?? -1;
      const aIdx = afterIndexMap.get(aEntity.id) ?? -1;
      const posChanged = bIdx !== aIdx;
      const equal = contentEqual(bEntity, aEntity);

      if (equal) {
        // Same content
        if (posChanged) {
          changes.push({
            entityType,
            entityId: aEntity.id,
            changeType: "reordered",
            before: bEntity,
            after: aEntity,
            beforeIndex: bIdx,
            afterIndex: aIdx,
            reordered: true,
            traceability: traceabilityFn?.(aEntity),
          });
        } else {
          changes.push({
            entityType,
            entityId: aEntity.id,
            changeType: "unchanged",
            beforeIndex: bIdx,
            afterIndex: aIdx,
            traceability: traceabilityFn?.(aEntity),
          });
        }
      } else {
        // Content changed
        const changedFields = Object.keys(aEntity).filter(
          (k) => !contentEqual(bEntity[k], aEntity[k])
        );
        const change: ProjectEntityChange = {
          entityType,
          entityId: aEntity.id,
          changeType: "modified",
          before: bEntity,
          after: aEntity,
          changedFields,
          beforeIndex: bIdx,
          afterIndex: aIdx,
          // If position also changed alongside content: modified + reordered = true
          reordered: posChanged ? true : undefined,
          traceability: traceabilityFn?.(aEntity),
        };
        const rule = evaluateBreakingChange(change);
        if (rule) change.breakingRuleId = rule.id;
        changes.push(change);
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

export function findReorderedEntities(changes: ProjectEntityChange[]): ProjectEntityChange[] {
  return changes.filter((c) => c.changeType === "reordered" || c.reordered === true);
}

// ─── Snapshot comparison ──────────────────────────────────────────────────────

export function compareSnapshots(base: ProjectSnapshot, target: ProjectSnapshot): ProjectDiff {
  const changes: ProjectEntityChange[] = [];

  const bp = base.payload;
  const tp = target.payload;

  // Problem
  if (bp.problema !== tp.problema) {
    changes.push({
      entityType: "problema",
      entityId: "problema",
      changeType: "modified",
      before: bp.problema,
      after: tp.problema,
      changedFields: ["problema"],
    });
  } else {
    changes.push({ entityType: "problema", entityId: "problema", changeType: "unchanged" });
  }

  // Pack
  const bPackId = bp.packActivo?.metadata.id ?? null;
  const tPackId = tp.packActivo?.metadata.id ?? null;
  if (bPackId !== tPackId) {
    changes.push({
      entityType: "pack",
      entityId: "pack",
      changeType: "modified",
      before: bp.packActivo,
      after: tp.packActivo,
      changedFields: ["pack"],
    });
  }

  // Hypotheses
  changes.push(
    ...compareEntityList(
      "hypothesis",
      bp.hypotheses as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.hypotheses as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // Conceptual models
  changes.push(
    ...compareEntityList(
      "conceptualModel",
      bp.conceptualModels as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.conceptualModels as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // Variables (embedded in models)
  const bVars = bp.conceptualModels.flatMap((m) =>
    (m.variables ?? []).map((v) => ({ ...(v as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tVars = tp.conceptualModels.flatMap((m) =>
    (m.variables ?? []).map((v) => ({ ...(v as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(
    ...compareEntityList("conceptualVariable", bVars, tVars, (e) => ({
      parentEntityId: (e as { _modelId?: string })._modelId,
    }))
  );

  // Indicators
  const bInds = bp.conceptualModels.flatMap((m) =>
    (m.indicators ?? []).map((i) => ({ ...(i as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tInds = tp.conceptualModels.flatMap((m) =>
    (m.indicators ?? []).map((i) => ({ ...(i as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(
    ...compareEntityList("conceptualIndicator", bInds, tInds, (e) => ({
      parentEntityId: (e as { _modelId?: string })._modelId,
    }))
  );

  // Evidence sources
  const bSrcs = bp.conceptualModels.flatMap((m) =>
    (m.evidenceSources ?? []).map((s) => ({ ...(s as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tSrcs = tp.conceptualModels.flatMap((m) =>
    (m.evidenceSources ?? []).map((s) => ({ ...(s as object), _modelId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(...compareEntityList("evidenceSource", bSrcs, tSrcs));

  // Operationalization matrices
  changes.push(
    ...compareEntityList(
      "operationalizationMatrix",
      bp.operationalizationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.operationalizationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // Contrastation matrices
  changes.push(
    ...compareEntityList(
      "contrastationMatrix",
      bp.contrastationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.contrastationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // Evidence evaluation matrices
  changes.push(
    ...compareEntityList(
      "evidenceEvaluationMatrix",
      bp.evidenceEvaluationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.evidenceEvaluationMatrices as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // Observed evidences (embedded)
  const bEvs = bp.evidenceEvaluationMatrices.flatMap((m) =>
    (m.observedEvidence ?? []).map((e) => ({ ...(e as object), _matrixId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  const tEvs = tp.evidenceEvaluationMatrices.flatMap((m) =>
    (m.observedEvidence ?? []).map((e) => ({ ...(e as object), _matrixId: m.id }))
  ) as unknown as Array<{ id: string } & Record<string, unknown>>;
  changes.push(...compareEntityList("observedEvidence", bEvs, tEvs));

  // Hypothesis evidence conclusions
  changes.push(
    ...compareEntityList(
      "hypothesisEvidenceConclusion",
      bp.hypothesisEvidenceConclusions as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.hypothesisEvidenceConclusions as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // Report definitions
  changes.push(
    ...compareEntityList(
      "reportDefinition",
      bp.reportDefinitions as unknown as Array<{ id: string } & Record<string, unknown>>,
      tp.reportDefinitions as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // S-026: Knowledge Sources (Fuentes de Conocimiento)
  changes.push(
    ...compareEntityList(
      "knowledgeSource",
      (bp.knowledgeSources ?? []) as unknown as Array<{ id: string } & Record<string, unknown>>,
      (tp.knowledgeSources ?? []) as unknown as Array<{ id: string } & Record<string, unknown>>
    )
  );

  // S-027: Contributions (Contribuciones)
  changes.push(
    ...compareEntityList(
      "contribution",
      (bp.contributions ?? []) as unknown as Array<{ id: string } & Record<string, unknown>>,
      (tp.contributions ?? []) as unknown as Array<{ id: string } & Record<string, unknown>>,
      (e) => ({ parentEntityId: (e as { sourceId?: string }).sourceId })
    )
  );

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
  let added = 0,
    removed = 0,
    modified = 0,
    reordered = 0,
    unchanged = 0;
  const affectedTypes = new Set<string>();
  let hasBreakingChanges = false;

  changes.forEach((c) => {
    if (c.changeType === "added") {
      added++;
      affectedTypes.add(c.entityType);
    } else if (c.changeType === "removed") {
      removed++;
      affectedTypes.add(c.entityType);
    } else if (c.changeType === "modified") {
      modified++;
      affectedTypes.add(c.entityType);
    } else if (c.changeType === "reordered") {
      reordered++;
    } else {
      unchanged++;
    }
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
    knowledgeSource: "Fuentes de conocimiento",
    contribution: "Contribuciones",
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
        reordered: items.filter((c) => c.changeType === "reordered" || c.reordered === true).length,
      };
    })
    .filter((s) => s.added + s.removed + s.modified + s.reordered > 0);

  return { sections, generatedAt: new Date().toISOString() };
}
