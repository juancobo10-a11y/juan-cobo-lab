/**
 * S-026 — Knowledge Sources (Fuentes de Conocimiento)
 *
 * A KnowledgeSource is an object that provides information potentially
 * relevant for building understanding within a case.
 *
 * Registering a source does NOT imply its content is true, pertinent,
 * or constitutes evidence. The following distinctions are preserved:
 *
 *   Fuente (Source):             origin of the content.
 *   Información (Information):   content incorporated from the source.
 *   Contribución (Contribution): cognitive unit to be extracted (future: S-027).
 *   Evidencia (Evidence):        information evaluated against a hypothesis.
 *
 * Status lifecycle:
 *
 *   draft ──► registered ──► ready-for-analysis
 *                                    │
 *                                    │  [S-027: contribution extraction]
 *                                    ▼
 *                                 processed
 *
 *   Any non-processed state ──► rejected | archived
 *
 * ready-for-analysis: the analyst has reviewed the source and considers it
 * suitable for the cognitive pipeline. This is the state immediately preceding
 * contribution extraction (S-027). Marking a source ready-for-analysis
 * signals intent and prepares the pipeline; no automated processing occurs
 * in S-026.
 *
 * ADR-0015: KnowledgeSource is introduced as knowledgeSources: KnowledgeSource[]
 * in ProjectSnapshotPayload. Schema version bump: 1.1.0 → 1.2.0.
 * Migration: snapshots from 1.1.0 receive knowledgeSources: [].
 */

// ─── Source type ──────────────────────────────────────────────────────────────

/**
 * Describes the origin modality of the source.
 * In S-026, only "pasted-text" has a functional UI.
 * All other types are defined for type completeness and future enablement.
 */
export type KnowledgeSourceType =
  | "pasted-text"    // Supported in S-026: analyst pastes text directly
  | "document"       // Future: PDF, Word, plain-text file upload
  | "web"            // Future: URL capture / web scraping
  | "dataset"        // Future: structured data (CSV, JSON, XLSX)
  | "interview"      // Future: transcript from an interview or focus group
  | "note"           // Future: analyst's own notes
  | "other";         // Catch-all for unlisted types

// ─── Status ───────────────────────────────────────────────────────────────────

export type KnowledgeSourceStatus =
  | "draft"               // Initial state; content may be incomplete
  | "registered"          // Content complete and saved; not yet reviewed
  | "ready-for-analysis"  // Reviewed; queued for contribution extraction (S-027)
  | "processed"           // Contributions have been extracted (S-027+)
  | "rejected"            // Analyst deemed source unsuitable
  | "archived";           // Soft-removed; hidden from active views

// ─── Core entity ──────────────────────────────────────────────────────────────

/**
 * A Knowledge Source — an object contributing information to the epistemic
 * container (UnderstandingCase) within which analysis is conducted.
 *
 * Required fields: id, caseId, title, sourceType, content, status,
 *                  incorporatedAt, updatedAt.
 * Optional fields: author, institution, publicationDate, language,
 *                  referenceUrl, notes.
 */
export interface KnowledgeSource {
  /** Stable unique identifier (format: ks_<timestamp>_<random>). */
  id: string;
  /** ID of the UnderstandingCase this source belongs to. */
  caseId: string;
  /** Human-readable title for the source. Max 200 characters. */
  title: string;
  /** Origin modality. Only "pasted-text" has an active UI in S-026. */
  sourceType: KnowledgeSourceType;
  /**
   * Raw content incorporated from the source.
   * In S-026: the text pasted by the analyst.
   * Future: may reference an external storage URI for non-text types.
   */
  content: string;
  /**
   * Lifecycle state. Transitions are governed by VALID_STATUS_TRANSITIONS.
   * ready-for-analysis is the gateway to future contribution extraction (S-027).
   */
  status: KnowledgeSourceStatus;
  /** Author or creator of the original source document. Optional. */
  author?: string;
  /** Institution or publisher associated with the source. Optional. */
  institution?: string;
  /**
   * Publication or production date of the original source.
   * Accepts ISO 8601 full date (YYYY-MM-DD) or partial year (YYYY). Optional.
   */
  publicationDate?: string;
  /**
   * Primary language of the source content (e.g. "es", "en").
   * ISO 639-1 preferred. Optional.
   */
  language?: string;
  /**
   * Reference URL — original URL or DOI of the source. Optional.
   * Does not imply live access; used for traceability.
   */
  referenceUrl?: string;
  /**
   * Internal analyst notes about this source.
   * Not part of the source content itself; captured separately to
   * preserve the Fuente / Información distinction.
   */
  notes?: string;
  /** ISO-8601 timestamp: when the source was first incorporated into the case. */
  incorporatedAt: string;
  /** ISO-8601 timestamp: last modification to any field of this source. */
  updatedAt: string;
}

// ─── Service I/O ──────────────────────────────────────────────────────────────

/** Fields supplied by the analyst when creating a source. */
export interface KnowledgeSourceInput {
  caseId: string;
  title: string;
  sourceType: KnowledgeSourceType;
  content: string;
  author?: string;
  institution?: string;
  publicationDate?: string;
  language?: string;
  referenceUrl?: string;
  notes?: string;
  /** Defaults to "draft" when omitted. */
  status?: KnowledgeSourceStatus;
}

/** Fields that can be updated on an existing source (id, caseId, incorporatedAt are immutable). */
export type KnowledgeSourceUpdate = Partial<
  Omit<KnowledgeSource, "id" | "caseId" | "incorporatedAt" | "updatedAt">
>;

/** Result of validating a KnowledgeSourceInput. */
export interface KnowledgeSourceValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Labels and transitions ───────────────────────────────────────────────────

/** Human-readable labels for each status. */
export const SOURCE_STATUS_LABELS: Record<KnowledgeSourceStatus, string> = {
  draft: "Borrador",
  registered: "Registrada",
  "ready-for-analysis": "Lista para análisis",
  processed: "Procesada",
  rejected: "Rechazada",
  archived: "Archivada",
};

/** Human-readable labels for each source type. */
export const SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  "pasted-text": "Texto pegado",
  document: "Documento",
  web: "Fuente web",
  dataset: "Conjunto de datos",
  interview: "Entrevista",
  note: "Nota",
  other: "Otro",
};

/**
 * Valid status transitions from a given state.
 * Attempting a transition not listed here must be rejected by KnowledgeSourceService.
 *
 * Design note: processed → archived is the only exit from processed in S-026.
 * Future sprints may open processed → re-analysis paths.
 */
export const VALID_STATUS_TRANSITIONS: Record<KnowledgeSourceStatus, KnowledgeSourceStatus[]> = {
  draft: ["registered", "archived"],
  registered: ["draft", "ready-for-analysis", "rejected", "archived"],
  "ready-for-analysis": ["registered", "rejected", "archived"],
  processed: ["archived"],
  rejected: ["archived"],
  archived: [],
};

/** Source types that have an active UI in S-026. Others are shown but disabled. */
export const ENABLED_SOURCE_TYPES_S026: KnowledgeSourceType[] = ["pasted-text"];
