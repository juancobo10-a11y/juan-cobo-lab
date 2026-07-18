/**
 * S-023 — MarkdownExporter
 *
 * GitHub-compatible Markdown output.
 * Preserves: headings, tables, lists, evidence blocks.
 */

import type { GeneratedReport, GeneratedSection, ReportBlock } from "../types";
import type { ReportExporter } from "../types";

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderBlock(block: ReportBlock): string {
  switch (block.tipo) {
    case "heading": {
      const prefix = "#".repeat(block.nivel ?? 2);
      return `${prefix} ${block.contenido}`;
    }
    case "paragraph":
      return block.contenido;
    case "metadata":
      return `> ${block.contenido}`;
    case "divider":
      return "---";
    case "list": {
      const header = block.contenido ? `**${block.contenido}**\n\n` : "";
      const items = (block.items ?? []).map((item) => `- ${item}`).join("\n");
      return `${header}${items}`;
    }
    case "table": {
      if (!block.headers || !block.tableRows) return "";
      const headerRow = `| ${block.headers.map(escapeCell).join(" | ")} |`;
      const separator = `| ${block.headers.map(() => "---").join(" | ")} |`;
      const dataRows = block.tableRows.map(
        (row) => `| ${row.map(escapeCell).join(" | ")} |`
      );
      return [headerRow, separator, ...dataRows].join("\n");
    }
    case "evidence-block": {
      return `> **Evidencia:** ${block.contenido}`;
    }
    default:
      return block.contenido;
  }
}

function renderSection(section: GeneratedSection, idx: number): string {
  const parts: string[] = [];
  if (idx > 0) parts.push("---");
  parts.push(...section.blocks.map(renderBlock).filter(Boolean));
  return parts.join("\n\n");
}

export class MarkdownExporter implements ReportExporter {
  readonly format = "markdown" as const;

  export(report: GeneratedReport): string {
    const sections = report.sections.map((s, i) => renderSection(s, i));

    // Table of contents
    const tocItems = report.sections.map((s) => {
      const anchor = s.titulo
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-");
      return `- [${s.titulo}](#${anchor})`;
    });

    const header = [
      `# ${report.nombre}`,
      ``,
      `> **Problema:** ${report.problema}  `,
      `> **Generado:** ${report.generatedAt}`,
      ``,
      `## Índice`,
      ``,
      tocItems.join("\n"),
    ].join("\n");

    return [header, ...sections].join("\n\n");
  }
}
