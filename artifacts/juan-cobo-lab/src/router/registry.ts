/**
 * Knowledge Pack Registry
 *
 * Single source of truth for pack registration. To add a new pack:
 *   1. Create content/<slug>/ with its JSON files.
 *   2. Add one entry below — metadata (eager) + a lazy loader for content.
 *
 * HELIOS and KnowledgeRouter never need to change.
 */

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
