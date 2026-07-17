// ─── Thinking Pattern Registry — explicit and typed ───────────────────────
//
// WHY EXPLICIT, NOT import.meta.glob
//
// Same constraint as the Knowledge Pack registry: Vite's project root is
// `artifacts/juan-cobo-lab/` with server.fs.strict enabled. The `content/`
// directory lives at the workspace root — two levels above the project root.
// Static imports cross that boundary at build time (Rollup resolves them
// independently of the fs restriction). import.meta.glob cannot.
//
// Path to enable auto-discovery in the future:
//   Option A — Move `content/thinking/` inside `artifacts/juan-cobo-lab/`.
//              Changes the monorepo layout; unlocks glob.
//   Option B — Add the workspace content dir to server.fs.allow.
//              Requires a vite.config.ts change; widens the exposed filesystem.
//
// HOW TO ADD A NEW THINKING PATTERN
//
//   1. Create content/thinking/<slug>/ with: metadata.json, preguntas.json.
//   2. Add one entry below — import the metadata eagerly and provide a
//      lazy loader for preguntas.json.
//
// That is the only change required. ThinkingRouter and Helios.tsx are
// unaffected.

import type { ThinkingPatternMetadata, ThinkingPattern } from "./types";

import socraticoMeta       from "../../../../content/thinking/socratico/metadata.json";
import sistemicoMeta       from "../../../../content/thinking/sistemico/metadata.json";
import economiaPoliticaMeta from "../../../../content/thinking/economia-politica/metadata.json";

export type ThinkingRegistryEntry = {
  metadata: ThinkingPatternMetadata;
  /** Lazy-loads the pattern's questions only after the router selects it */
  load: () => Promise<Omit<ThinkingPattern, "metadata">>;
};

export const THINKING_REGISTRY: ThinkingRegistryEntry[] = [
  // ── Pensamiento Socrático (universal) ─────────────────────────────────────
  {
    metadata: socraticoMeta as ThinkingPatternMetadata,
    load: async () => ({
      preguntas: (
        await import(
          "../../../../content/thinking/socratico/preguntas.json"
        )
      ).default as ThinkingPattern["preguntas"],
    }),
  },

  // ── Pensamiento Sistémico ──────────────────────────────────────────────────
  {
    metadata: sistemicoMeta as ThinkingPatternMetadata,
    load: async () => ({
      preguntas: (
        await import(
          "../../../../content/thinking/sistemico/preguntas.json"
        )
      ).default as ThinkingPattern["preguntas"],
    }),
  },

  // ── Economía Política ──────────────────────────────────────────────────────
  {
    metadata: economiaPoliticaMeta as ThinkingPatternMetadata,
    load: async () => ({
      preguntas: (
        await import(
          "../../../../content/thinking/economia-politica/preguntas.json"
        )
      ).default as ThinkingPattern["preguntas"],
    }),
  },
];
