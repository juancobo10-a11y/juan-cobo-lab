// ─── Knowledge Pack Registry — explicit and typed ─────────────────────────
//
// WHY EXPLICIT, NOT import.meta.glob
//
// Vite's project root is `artifacts/juan-cobo-lab/` and server.fs.strict
// is enabled. The `content/` directory lives two levels above the project
// root (at the workspace root). While static imports that cross the root
// boundary work at build time (Rollup resolves them independently of the
// fs restriction), import.meta.glob patterns are processed by Vite's own
// plugin pipeline which respects the strict fs boundary and cannot glob
// outside the project root.
//
// Path to enable auto-discovery in the future:
//   Option A — Move `content/` inside `artifacts/juan-cobo-lab/`. Changes
//              the monorepo layout but unlocks glob("./content/*/metadata.json").
//   Option B — Set server.fs.allow to include the workspace content dir.
//              Requires a vite.config.ts change; widens the dev server's
//              exposed filesystem.
//
// For the current scale (2–10 packs), the explicit registry is preferable:
// full TypeScript types, zero runtime surprises, and it is the ONLY file
// to update when a new pack is added — Helios.tsx never changes.
//
// HOW TO ADD A NEW PACK
//
//   1. Create content/<slug>/ with: metadata.json, contexto.json,
//      hipotesis.json, pestel.json, chips.json.
//   2. Add one entry below — import the metadata eagerly and provide a
//      lazy loader for the content files.
//
// That is the only change required. KnowledgeRouter and Helios.tsx are
// unaffected.

import type { PackMetadata, KnowledgePack } from "./types";

import ticMeta from "../../../../content/tic/metadata.json";
import educacionMeta from "../../../../content/educacion/metadata.json";

export type RegistryEntry = {
  metadata: PackMetadata;
  /** Lazy-loads the rest of the pack only after the router selects it */
  load: () => Promise<Omit<KnowledgePack, "metadata">>;
};

export const REGISTRY: RegistryEntry[] = [
  {
    metadata: ticMeta as PackMetadata,
    load: async () => ({
      contexto: (await import("../../../../content/tic/contexto.json")).default,
      hipotesis: (await import("../../../../content/tic/hipotesis.json"))
        .default as KnowledgePack["hipotesis"],
      pestel: (await import("../../../../content/tic/pestel.json"))
        .default as KnowledgePack["pestel"],
      chips: (await import("../../../../content/tic/chips.json")).default,
    }),
  },
  {
    metadata: educacionMeta as PackMetadata,
    load: async () => ({
      contexto: (
        await import("../../../../content/educacion/contexto.json")
      ).default,
      hipotesis: (
        await import("../../../../content/educacion/hipotesis.json")
      ).default as KnowledgePack["hipotesis"],
      pestel: (
        await import("../../../../content/educacion/pestel.json")
      ).default as KnowledgePack["pestel"],
      chips: (await import("../../../../content/educacion/chips.json")).default,
    }),
  },
];
