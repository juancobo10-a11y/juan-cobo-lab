/**
 * S-027 — Contribution Foundation
 *
 * A Contribution is a traceable cognitive unit extracted from a
 * Knowledge Source. It represents an element of knowledge potentially
 * useful for building understanding.
 *
 * A Contribution is NOT:
 *   - a summary
 *   - a document
 *   - a hypothesis
 *   - evidence (in the evidential sense)
 *   - a conclusion
 *
 * Conceptual distinctions (Inteligencia Ecosistémica):
 *   Fuente (Source):             origin of content.
 *   Información (Information):   content incorporated from the source.
 *   Contribución (Contribution): cognitive unit extracted here (S-027).
 *   Evidencia (Evidence):        information evaluated against a hypothesis (future).
 *
 * Referential integrity (enforced in ContributionService):
 *   - sourceId must reference an existing KnowledgeSource.
 *   - caseId must equal KnowledgeSource.caseId.
 *   - The source must be in an ENABLED state (registered | ready-for-analysis).
 *
 * Orphan protection (enforced in ContributionService):
 *   - A KnowledgeSource with ≥1 contribution cannot be hard-deleted.
 *   - Offer: archive the source, or manage contributions first.
 *
 * Status lifecycle:
 *
 *   draft ──► proposed ──► validated
 *     │           │              │
 *     │           └──► rejected  │
 *     │                    │     │
 *     └────────────────────┴─────┴──► archived
 *
 * ADR-0016: contributions: Contribution[] added to ProjectSnapshotPayload.
 * Schema bump: 1.2.0 → 1.3.0.
 * Migration: all existing projects receive contributions: [].
 */

// ─── Contribution type ────────────────────────────────────────────────────────

/**
 * Cognitive role of the contribution within the analysis.
 * Ten distinct epistemic roles to force explicit classification.
 */
export type ContributionType =
  | "finding"           // Empirical result or observed pattern
  | "definition"        // Conceptual definition or terminological clarification
  | "fact"              // Verifiable factual statement
  | "claim"             // Assertion that requires support (not yet verified)
  | "causal-mechanism"  // Explanation of how/why something occurs
  | "recommendation"    // Prescriptive statement or policy suggestion
  | "limitation"        // Constraint, caveat, or scope restriction
  | "assumption"        // Premise taken for granted without explicit support
  | "contradiction"     // Statement that conflicts with other knowledge
  | "question"          // Open question or unknown raised by the source
  | "other";            // Catch-all

// ─── Status ───────────────────────────────────────────────────────────────────

export type ContributionStatus =
  | "draft"      // Initial — being formulated
  | "proposed"   // Submitted for analyst validation
  | "validated"  // Analyst confirmed as cognitively useful
  | "rejected"   // Analyst deemed not useful or incorrect
  | "archived";  // Soft-removed; preserved for historical traceability

// ─── Origin ───────────────────────────────────────────────────────────────────

/**
 * How the contribution was produced.
 * In S-027: all contributions created from UI are "human".
 * "agent-assisted" is reserved for future AI-enabled extraction sprints.
 */
export type ContributionOrigin = "human" | "agent-assisted";

// ─── Source location ──────────────────────────────────────────────────────────

/**
 * Typed, extensible location of the contribution within the source.
 *
 * Replaces the naive `sourceLocation?: string` in the original spec to
 * support future location modalities without a breaking change:
 *   - description: always available; free-text ("párrafo 3", "p. 45", "sección 2")
 *   - textRange:   character offset within source.content (pasted-text, S-027+)
 *   - page:        page number (future: document/PDF sources)
 *   - section:     heading or section identifier (future: structured documents/web)
 *
 * In S-027 analysts fill `description` manually; `textRange` is set
 * programmatically if/when text selection is implemented.
 */
export interface SourceLocation {
  /** Free-text location description. E.g. "párrafo 3", "p. 45", "sección 2.3". */
  description?: string;
  /**
   * Character offset range within KnowledgeSource.content.
   * Future: populated by text-selection UI.
   */
  textRange?: { start: number; end: number };
  /** Page number — for document/PDF sources (future). */
  page?: number;
  /** Section or heading identifier — for structured documents or web (future). */
  section?: string;
}

// ─── Core entity ──────────────────────────────────────────────────────────────

/**
 * A Contribution — a traceable cognitive unit extracted from a Knowledge Source.
 *
 * Required: id, caseId, sourceId, type, statement, sourceExcerpt,
 *           status, origin, createdAt, updatedAt.
 * Optional: sourceLocation, interpretation, relevance, confidence.
 *
 * Invariants:
 *   - caseId === KnowledgeSource(sourceId).caseId (referential integrity)
 *   - origin === "human" for all S-027 UI-created contributions
 *   - confidence: 0 ≤ value ≤ 1 when present
 */
export interface Contribution {
  /** Stable unique identifier (format: cn_<timestamp>_<random>). */
  id: string;
  /** ID of the UnderstandingCase this contribution belongs to. */
  caseId: string;
  /** ID of the KnowledgeSource from which this contribution was extracted. */
  sourceId: string;
  /** Cognitive classification of the contribution. */
  type: ContributionType;
  /**
   * The contribution statement — the analyst's formulation of the cognitive unit.
   * Must be original, not a verbatim copy of the source. Max 2 000 characters.
   */
  statement: string;
  /**
   * The exact fragment from the source that supports this contribution.
   * Verbatim excerpt — not paraphrased. Min 10 characters.
   */
  sourceExcerpt: string;
  /** Where in the source the excerpt appears. Optional; typed for extensibility. */
  sourceLocation?: SourceLocation;
  /**
   * Analyst's interpretation — why this fragment constitutes a contribution.
   * Not mandatory; encouraged for non-obvious contributions. Max 1 000 characters.
   */
  interpretation?: string;
  /**
   * Analyst's note on potential relevance to the analysis goal.
   * Not mandatory. Max 500 characters.
   */
  relevance?: string;
  /** Lifecycle state. Governed by VALID_CONTRIBUTION_STATUS_TRANSITIONS. */
  status: ContributionStatus;
  /**
   * How the contribution was produced.
   * All S-027 UI contributions: "human".
   * "agent-assisted": reserved for future AI extraction sprints.
   */
  origin: ContributionOrigin;
  /**
   * Optional analyst confidence in this contribution (0–1).
   * 0 = very uncertain; 1 = fully confident.
   */
  confidence?: number;
  /** ISO-8601 timestamp: when the contribution was first created. Immutable. */
  createdAt: string;
  /** ISO-8601 timestamp: last modification to any field. */
  updatedAt: string;
}

// ─── Service I/O ──────────────────────────────────────────────────────────────

/** Fields supplied by the analyst when creating a contribution. */
export interface ContributionInput {
  caseId: string;
  sourceId: string;
  type: ContributionType;
  statement: string;
  sourceExcerpt: string;
  sourceLocation?: SourceLocation;
  interpretation?: string;
  relevance?: string;
  /** Defaults to "draft" when omitted. */
  status?: ContributionStatus;
  /** Defaults to "human" when omitted (required in S-027 UI). */
  origin?: ContributionOrigin;
  /** Optional; validated to be in [0, 1] when present. */
  confidence?: number;
}

/** Fields that can be updated (id, caseId, sourceId, createdAt are immutable). */
export type ContributionUpdate = Partial<
  Omit<Contribution, "id" | "caseId" | "sourceId" | "createdAt" | "updatedAt">
>;

/** Result of structural validation of a ContributionInput. */
export interface ContributionValidationResult {
  valid: boolean;
  errors: string[];
}

/** Result of referential validation. */
export interface ContributionReferentialValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Labels and transitions ───────────────────────────────────────────────────

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  finding: "Hallazgo",
  definition: "Definición",
  fact: "Hecho",
  claim: "Afirmación",
  "causal-mechanism": "Mecanismo causal",
  recommendation: "Recomendación",
  limitation: "Limitación",
  assumption: "Supuesto",
  contradiction: "Contradicción",
  question: "Pregunta abierta",
  other: "Otro",
};

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  draft: "Borrador",
  proposed: "Propuesta",
  validated: "Validada",
  rejected: "Rechazada",
  archived: "Archivada",
};

export const CONTRIBUTION_ORIGIN_LABELS: Record<ContributionOrigin, string> = {
  human: "Analista",
  "agent-assisted": "Asistido por agente",
};

/**
 * Valid status transitions from a given state.
 * Attempting a transition not listed here must be rejected by ContributionService.
 */
export const VALID_CONTRIBUTION_STATUS_TRANSITIONS: Record<
  ContributionStatus,
  ContributionStatus[]
> = {
  draft:     ["proposed", "archived"],
  proposed:  ["validated", "rejected", "draft", "archived"],
  validated: ["archived"],
  rejected:  ["draft", "archived"],
  archived:  [],
};

/**
 * KnowledgeSource statuses that permit new contribution creation.
 * S-027 rule: only "registered" and "ready-for-analysis" sources
 * may receive new contributions. Draft, rejected, and archived
 * sources are read-only — existing contributions may be viewed
 * but no new ones may be added.
 */
export const ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS = [
  "registered",
  "ready-for-analysis",
] as const;

export type EnabledSourceStatus = typeof ENABLED_SOURCE_STATUSES_FOR_CONTRIBUTIONS[number];
