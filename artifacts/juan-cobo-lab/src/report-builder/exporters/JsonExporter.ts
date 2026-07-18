/**
 * S-023 — JsonExporter
 *
 * Exports the full GeneratedReport structure as JSON.
 * Does NOT export the entire HELIOS session state.
 * Includes traceabilityMap for downstream tooling.
 */

import type { GeneratedReport } from "../types";
import type { ReportExporter } from "../types";

export class JsonExporter implements ReportExporter {
  readonly format = "json" as const;

  export(report: GeneratedReport): string {
    return JSON.stringify(report, null, 2);
  }
}
