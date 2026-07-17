/**
 * ConceptualModelService — S-017
 *
 * Pure functions for creating, validating, and managing ConceptualModels.
 * No sector-specific knowledge. No side effects. No external dependencies.
 *
 * Hierarchy enforced:
 *   hypothesis → variables → indicators → sources
 *
 * Constraints:
 *   - Indicators must reference an existing variable (no orphan indicators)
 *   - Sources must reference at least one existing indicator (no orphan sources)
 *   - Duplicates detected by normalised nombre within the same scope
 */

import type {
  ConceptualModel,
  ConceptualVariable,
  ConceptualVariableRole,
  ConceptualIndicator,
  ConceptualIndicatorUpdate,
  EvidenceSource,
  EvidenceSourceUpdate,
  ConceptualModelValidation,
  ConceptualModelIssue,
  ConceptualVariableUpdate,
  IndicatorPeriodicidad,
} from "./types";

// ─── ID generation (deterministic within session) ─────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─── Factory: ConceptualModel ─────────────────────────────────────────────────

/** Create an empty ConceptualModel for a given hypothesis. */
export function createEmptyConceptualModel(hypothesisId: string): ConceptualModel {
  const ts = now();
  return {
    id: generateId("cm"),
    hypothesisId,
    variables: [],
    indicators: [],
    evidenceSources: [],
    confirmed: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

// ─── Factory: Variable ────────────────────────────────────────────────────────

export function createVariable(
  model: ConceptualModel,
  fields: {
    nombre: string;
    descripcion?: string;
    definicionOperacional?: string;
    rol: ConceptualVariableRole;
  }
): ConceptualModel {
  const ts = now();
  const variable: ConceptualVariable = {
    id: generateId("var"),
    nombre: fields.nombre.trim(),
    descripcion: fields.descripcion?.trim() ?? "",
    definicionOperacional: fields.definicionOperacional?.trim() ?? "",
    rol: fields.rol,
    orden: model.variables.length,
    createdAt: ts,
    updatedAt: ts,
  };
  return { ...model, variables: [...model.variables, variable], updatedAt: ts };
}

export function updateVariable(
  model: ConceptualModel,
  variableId: string,
  fields: ConceptualVariableUpdate
): ConceptualModel {
  const ts = now();
  const variables = model.variables.map((v) =>
    v.id === variableId
      ? {
          ...v,
          ...fields,
          nombre: fields.nombre !== undefined ? fields.nombre.trim() : v.nombre,
          descripcion: fields.descripcion !== undefined ? fields.descripcion.trim() : v.descripcion,
          definicionOperacional: fields.definicionOperacional !== undefined
            ? fields.definicionOperacional.trim()
            : v.definicionOperacional,
          updatedAt: ts,
        }
      : v
  );
  return { ...model, variables, updatedAt: ts };
}

export function removeVariable(
  model: ConceptualModel,
  variableId: string
): ConceptualModel {
  const ts = now();
  // Cascade: remove indicators for this variable, then remove sources with no remaining indicators
  const indicators = model.indicators.filter((i) => i.variableId !== variableId);
  const remainingIndicatorIds = new Set(indicators.map((i) => i.id));
  const evidenceSources = model.evidenceSources
    .map((s) => ({
      ...s,
      indicadorIds: s.indicadorIds.filter((id) => remainingIndicatorIds.has(id)),
    }))
    .filter((s) => s.indicadorIds.length > 0);

  const variables = model.variables
    .filter((v) => v.id !== variableId)
    .map((v, i) => ({ ...v, orden: i }));

  return { ...model, variables, indicators, evidenceSources, updatedAt: ts };
}

export function reorderVariables(
  model: ConceptualModel,
  orderedIds: string[]
): ConceptualModel {
  const ts = now();
  const byId = new Map(model.variables.map((v) => [v.id, v]));
  const variables = orderedIds
    .filter((id) => byId.has(id))
    .map((id, i) => ({ ...byId.get(id)!, orden: i }));
  return { ...model, variables, updatedAt: ts };
}

// ─── Factory: Indicator ───────────────────────────────────────────────────────

export function createIndicator(
  model: ConceptualModel,
  fields: {
    nombre: string;
    variableId: string;
    descripcion?: string;
    unidad?: string;
    formulaOCriterio?: string;
    periodicidad?: IndicatorPeriodicidad | string;
    nivelTerritorial?: string;
    disponibilidad?: ConceptualIndicator["disponibilidad"];
  }
): ConceptualModel {
  // Guard: variable must exist
  if (!model.variables.some((v) => v.id === fields.variableId)) {
    throw new Error(
      `createIndicator: variable '${fields.variableId}' not found in model. Indicators require an existing variable.`
    );
  }
  const ts = now();
  const existingForVar = model.indicators.filter(
    (i) => i.variableId === fields.variableId
  );
  const indicator: ConceptualIndicator = {
    id: generateId("ind"),
    nombre: fields.nombre.trim(),
    descripcion: fields.descripcion?.trim() ?? "",
    variableId: fields.variableId,
    unidad: fields.unidad?.trim() ?? "",
    formulaOCriterio: fields.formulaOCriterio?.trim() ?? "",
    periodicidad: fields.periodicidad ?? "anual",
    nivelTerritorial: fields.nivelTerritorial?.trim() ?? "",
    disponibilidad: fields.disponibilidad ?? "desconocida",
    orden: existingForVar.length,
    createdAt: ts,
    updatedAt: ts,
  };
  return { ...model, indicators: [...model.indicators, indicator], updatedAt: ts };
}

export function updateIndicator(
  model: ConceptualModel,
  indicatorId: string,
  fields: ConceptualIndicatorUpdate
): ConceptualModel {
  // If variableId is being updated, validate the new target exists
  if (fields.variableId && !model.variables.some((v) => v.id === fields.variableId)) {
    throw new Error(
      `updateIndicator: target variable '${fields.variableId}' not found.`
    );
  }
  const ts = now();
  const indicators = model.indicators.map((i) =>
    i.id === indicatorId ? { ...i, ...fields, updatedAt: ts } : i
  );
  return { ...model, indicators, updatedAt: ts };
}

export function removeIndicator(
  model: ConceptualModel,
  indicatorId: string
): ConceptualModel {
  const ts = now();
  const indicators = model.indicators
    .filter((i) => i.id !== indicatorId)
    .map((ind, i) =>
      ind.variableId === model.indicators.find((x) => x.id === indicatorId)?.variableId
        ? { ...ind, orden: i }
        : ind
    );

  // Cascade: remove this indicator from all sources
  const evidenceSources = model.evidenceSources
    .map((s) => ({
      ...s,
      indicadorIds: s.indicadorIds.filter((id) => id !== indicatorId),
    }))
    .filter((s) => s.indicadorIds.length > 0);

  return { ...model, indicators, evidenceSources, updatedAt: ts };
}

export function reorderIndicators(
  model: ConceptualModel,
  variableId: string,
  orderedIds: string[]
): ConceptualModel {
  const ts = now();
  const byId = new Map(model.indicators.map((i) => [i.id, i]));
  const otherIndicators = model.indicators.filter((i) => i.variableId !== variableId);
  const reordered = orderedIds
    .filter((id) => byId.has(id))
    .map((id, idx) => ({ ...byId.get(id)!, orden: idx }));
  return { ...model, indicators: [...otherIndicators, ...reordered], updatedAt: ts };
}

// ─── Factory: Evidence Source ─────────────────────────────────────────────────

export function createEvidenceSource(
  model: ConceptualModel,
  fields: {
    nombre: string;
    tipo: EvidenceSource["tipo"];
    indicadorIds: string[];
    responsable?: string;
    frecuencia?: string;
    acceso?: EvidenceSource["acceso"];
    limitaciones?: string;
  }
): ConceptualModel {
  // Guard: all referenced indicators must exist
  const existingIds = new Set(model.indicators.map((i) => i.id));
  const invalidIds = fields.indicadorIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    throw new Error(
      `createEvidenceSource: indicator(s) not found: ${invalidIds.join(", ")}. Sources must reference existing indicators.`
    );
  }
  if (fields.indicadorIds.length === 0) {
    throw new Error(
      `createEvidenceSource: indicadorIds must not be empty. Sources must reference at least one indicator.`
    );
  }
  const ts = now();
  const source: EvidenceSource = {
    id: generateId("src"),
    nombre: fields.nombre.trim(),
    tipo: fields.tipo,
    responsable: fields.responsable?.trim() ?? "",
    frecuencia: fields.frecuencia?.trim() ?? "",
    acceso: fields.acceso ?? "publico",
    limitaciones: fields.limitaciones?.trim() ?? "",
    indicadorIds: [...new Set(fields.indicadorIds)],
    createdAt: ts,
    updatedAt: ts,
  };
  return { ...model, evidenceSources: [...model.evidenceSources, source], updatedAt: ts };
}

export function updateEvidenceSource(
  model: ConceptualModel,
  sourceId: string,
  fields: EvidenceSourceUpdate
): ConceptualModel {
  const ts = now();
  const evidenceSources = model.evidenceSources.map((s) =>
    s.id === sourceId ? { ...s, ...fields, updatedAt: ts } : s
  );
  return { ...model, evidenceSources, updatedAt: ts };
}

export function removeEvidenceSource(
  model: ConceptualModel,
  sourceId: string
): ConceptualModel {
  const ts = now();
  const evidenceSources = model.evidenceSources.filter((s) => s.id !== sourceId);
  return { ...model, evidenceSources, updatedAt: ts };
}

// ─── Deduplication helpers ────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Returns true when another variable in the model has the same normalised nombre. */
export function isVariableNameDuplicate(
  model: ConceptualModel,
  nombre: string,
  excludeId?: string
): boolean {
  const norm = normalise(nombre);
  return model.variables.some(
    (v) => normalise(v.nombre) === norm && v.id !== excludeId
  );
}

/** Returns true when another indicator for the same variable has the same normalised nombre. */
export function isIndicatorNameDuplicate(
  model: ConceptualModel,
  variableId: string,
  nombre: string,
  excludeId?: string
): boolean {
  const norm = normalise(nombre);
  return model.indicators.some(
    (i) =>
      i.variableId === variableId &&
      normalise(i.nombre) === norm &&
      i.id !== excludeId
  );
}

/** Returns true when another source has the same normalised nombre. */
export function isSourceNameDuplicate(
  model: ConceptualModel,
  nombre: string,
  excludeId?: string
): boolean {
  const norm = normalise(nombre);
  return model.evidenceSources.some(
    (s) => normalise(s.nombre) === norm && s.id !== excludeId
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateConceptualModel — checks structural integrity.
 *
 * Blocking issues prevent confirmation.
 * Warnings are informational only — editing is never blocked.
 */
export function validateConceptualModel(
  model: ConceptualModel
): ConceptualModelValidation {
  const blockingIssues: ConceptualModelIssue[] = [];
  const warnings: ConceptualModelIssue[] = [];

  const indicatorIds = new Set(model.indicators.map((i) => i.id));

  // ── Blocking: hypothesis has no variables ─────────────────────────────────
  if (model.variables.length === 0) {
    blockingIssues.push({ code: "hipotesis-sin-variables", hypothesisId: model.hypothesisId });
  }

  // ── Blocking: indicators without a valid variable reference ───────────────
  const variableIds = new Set(model.variables.map((v) => v.id));
  for (const ind of model.indicators) {
    if (!variableIds.has(ind.variableId)) {
      blockingIssues.push({
        code: "indicador-sin-variable",
        indicatorId: ind.id,
        nombre: ind.nombre,
      });
    }
  }

  // ── Blocking: sources without any valid indicator reference ───────────────
  for (const src of model.evidenceSources) {
    const hasValidIndicator = src.indicadorIds.some((id) => indicatorIds.has(id));
    if (!hasValidIndicator) {
      blockingIssues.push({
        code: "fuente-sin-indicador",
        sourceId: src.id,
        nombre: src.nombre,
      });
    }
  }

  // ── Warning: variable without rol ─────────────────────────────────────────
  for (const v of model.variables) {
    if (!v.rol) {
      warnings.push({ code: "variable-sin-rol", variableId: v.id, nombre: v.nombre });
    }
  }

  // ── Warning: variable without indicators ─────────────────────────────────
  for (const v of model.variables) {
    const hasIndicator = model.indicators.some((i) => i.variableId === v.id);
    if (!hasIndicator) {
      warnings.push({
        code: "variable-sin-indicadores",
        variableId: v.id,
        nombre: v.nombre,
      });
    }
  }

  // ── Warning: indicator without any source ─────────────────────────────────
  for (const ind of model.indicators) {
    const hasSource = model.evidenceSources.some((s) =>
      s.indicadorIds.includes(ind.id)
    );
    if (!hasSource) {
      warnings.push({
        code: "indicador-sin-fuente",
        indicatorId: ind.id,
        nombre: ind.nombre,
      });
    }
  }

  // ── Warning: duplicate variable names ────────────────────────────────────
  const varNames = new Map<string, string>(); // normalised → first id
  for (const v of model.variables) {
    const norm = normalise(v.nombre);
    if (varNames.has(norm)) {
      warnings.push({ code: "duplicado-variable", nombre: v.nombre });
    } else {
      varNames.set(norm, v.id);
    }
  }

  // ── Warning: duplicate indicator names (per variable) ────────────────────
  for (const varId of variableIds) {
    const indNames = new Map<string, string>();
    for (const ind of model.indicators.filter((i) => i.variableId === varId)) {
      const norm = normalise(ind.nombre);
      if (indNames.has(norm)) {
        warnings.push({
          code: "duplicado-indicador",
          nombre: ind.nombre,
          variableId: varId,
        });
      } else {
        indNames.set(norm, ind.id);
      }
    }
  }

  // ── Warning: duplicate source names ──────────────────────────────────────
  const srcNames = new Map<string, string>();
  for (const s of model.evidenceSources) {
    const norm = normalise(s.nombre);
    if (srcNames.has(norm)) {
      warnings.push({ code: "duplicado-fuente", nombre: s.nombre });
    } else {
      srcNames.set(norm, s.id);
    }
  }

  return {
    isValid: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}

// ─── Helpers for the session-level collection ─────────────────────────────────

/** Returns the ConceptualModel for a hypothesis, or null if none exists yet. */
export function findModelByHypothesisId(
  models: ConceptualModel[],
  hypothesisId: string
): ConceptualModel | null {
  return models.find((m) => m.hypothesisId === hypothesisId) ?? null;
}

/**
 * Upserts a ConceptualModel in the session collection.
 * If a model for the hypothesis already exists, replaces it; otherwise appends.
 */
export function upsertModel(
  models: ConceptualModel[],
  updated: ConceptualModel
): ConceptualModel[] {
  const idx = models.findIndex((m) => m.hypothesisId === updated.hypothesisId);
  if (idx >= 0) {
    return models.map((m, i) => (i === idx ? updated : m));
  }
  return [...models, updated];
}

/** Confirm a model (sets confirmed = true, bumps updatedAt). */
export function confirmModel(model: ConceptualModel): ConceptualModel {
  return { ...model, confirmed: true, updatedAt: now() };
}
