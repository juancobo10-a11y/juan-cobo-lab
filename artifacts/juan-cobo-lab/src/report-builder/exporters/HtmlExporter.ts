/**
 * S-023 — HtmlExporter
 *
 * Full HTML document with:
 * - Internal navigation (anchor links)
 * - Table of contents with anchor links
 * - Semantic headings (h1–h4)
 * - Accessible tables (scope="col")
 * - Cross-references via data-entity-type and data-entity-id attributes
 * - Responsive structure
 */

import type { GeneratedReport, GeneratedSection, ReportBlock } from "../types";
import type { ReportExporter } from "../types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionAnchor(sectionType: string): string {
  return `section-${sectionType}`;
}

function entityAttr(block: ReportBlock): string {
  if (block.entityType && block.entityId) {
    return ` data-entity-type="${esc(block.entityType)}" data-entity-id="${esc(block.entityId)}"`;
  }
  return "";
}

function renderBlock(block: ReportBlock): string {
  const attr = entityAttr(block);
  switch (block.tipo) {
    case "heading": {
      const level = block.nivel ?? 2;
      return `<h${level}${attr}>${esc(block.contenido)}</h${level}>`;
    }
    case "paragraph":
      return `<p${attr}>${esc(block.contenido)}</p>`;
    case "metadata":
      return `<p class="metadata"${attr}>${esc(block.contenido)}</p>`;
    case "divider":
      return `<hr />`;
    case "list": {
      const header = block.contenido
        ? `<p class="list-label">${esc(block.contenido)}</p>`
        : "";
      const items = (block.items ?? [])
        .map((item) => `<li>${esc(item)}</li>`)
        .join("\n");
      return `${header}<ul${attr}>\n${items}\n</ul>`;
    }
    case "table": {
      if (!block.headers || !block.tableRows) return "";
      const headers = block.headers
        .map((h) => `<th scope="col">${esc(h)}</th>`)
        .join("");
      const rows = block.tableRows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`
        )
        .join("\n");
      return `<div class="table-wrapper"><table${attr}>\n<thead><tr>${headers}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table></div>`;
    }
    case "evidence-block":
      return `<blockquote class="evidence-block"${attr}>${esc(block.contenido)}</blockquote>`;
    default:
      return `<p${attr}>${esc(block.contenido)}</p>`;
  }
}

function renderSection(section: GeneratedSection): string {
  const anchor = sectionAnchor(section.sectionType);
  const blocks = section.blocks.map(renderBlock).join("\n");
  return `<section id="${anchor}" aria-label="${esc(section.titulo)}">\n${blocks}\n</section>`;
}

const CSS = `
  body { font-family: Georgia, serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.65; }
  nav#toc { background: #f5f5f5; border-left: 4px solid #b45309; padding: 1.25rem 1.5rem; margin-bottom: 2.5rem; border-radius: 4px; }
  nav#toc h2 { margin-top: 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.07em; color: #78350f; }
  nav#toc ol { margin: 0; padding-left: 1.5rem; }
  nav#toc li a { color: #b45309; text-decoration: none; }
  nav#toc li a:hover { text-decoration: underline; }
  section { border-top: 1px solid #e5e7eb; padding-top: 2rem; margin-top: 2.5rem; }
  h1 { font-size: 2rem; border-bottom: 3px solid #b45309; padding-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; color: #78350f; margin-top: 2rem; }
  h3 { font-size: 1.15rem; color: #92400e; }
  h4 { font-size: 1rem; font-weight: 600; }
  p.metadata { color: #6b7280; font-size: 0.9rem; border-left: 3px solid #d1d5db; padding-left: 0.75rem; }
  .table-wrapper { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
  th { background: #fef3c7; color: #78350f; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #d97706; }
  td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fffbeb; }
  ul { padding-left: 1.5rem; }
  li { margin: 0.25rem 0; }
  p.list-label { font-weight: 600; margin-bottom: 0.25rem; }
  blockquote.evidence-block { border-left: 4px solid #d97706; margin: 1rem 0; padding: 0.75rem 1rem; background: #fffbeb; font-style: italic; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  .back-top { font-size: 0.8rem; color: #9ca3af; text-align: right; display: block; margin-top: 1.5rem; }
  @media (max-width: 600px) { body { padding: 0 1rem; } h1 { font-size: 1.4rem; } }
`;

export class HtmlExporter implements ReportExporter {
  readonly format = "html" as const;

  export(report: GeneratedReport): string {
    // Table of contents
    const tocItems = report.sections
      .map(
        (s, i) =>
          `<li><a href="#${sectionAnchor(s.sectionType)}">${i + 1}. ${esc(s.titulo)}</a></li>`
      )
      .join("\n");

    const toc = `<nav id="toc" aria-label="Índice del informe">
  <h2>Índice</h2>
  <ol>${tocItems}</ol>
</nav>`;

    const sectionsHtml = report.sections
      .map((s) => renderSection(s) + `\n<a class="back-top" href="#toc">↑ Volver al índice</a>`)
      .join("\n\n");

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(report.nombre)}</title>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <h1>${esc(report.nombre)}</h1>
    <p class="metadata">Problema: ${esc(report.problema)}</p>
    <p class="metadata">Generado: ${esc(report.generatedAt)}</p>
  </header>
  ${toc}
  <main>
    ${sectionsHtml}
  </main>
  <footer>
    <p class="metadata" style="margin-top:3rem;text-align:center;">
      Generado por HELIOS — Informe metodológico trazable
    </p>
  </footer>
</body>
</html>`;
  }
}
