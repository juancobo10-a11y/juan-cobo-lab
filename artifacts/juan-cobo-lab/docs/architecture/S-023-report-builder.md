# S-023 Architecture Review — Report Builder & Traceable Export Engine

**Sprint:** S-023  
**Fecha:** 2026-07-17  
**Estado:** Completado

---

## 1. ¿Cómo se representa un informe?

Un informe tiene dos representaciones:

**`ReportDefinition`** (almacenada en sesión):
- Sólo configuración: `nombre`, `descripcion`, `fecha`, `hypothesisId`, `secciones[]` (tipo, visible, orden).
- Sin contenido.

**`GeneratedReport`** (generada dinámicamente, nunca almacenada):
- `sections[]`: lista de `GeneratedSection`, cada una con bloques (`ReportBlock[]`).
- `traceabilityMap[]`: lista de `TraceabilityEntry` que mapea `blockId → entityType + entityId + sectionType`.
- Toda la información viene del estado de sesión — no de copias.

**`ReportBlock`** (unidad mínima de contenido):
- `tipo`: `heading | paragraph | table | list | evidence-block | divider | metadata`.
- `entityType` + `entityId`: apuntan a la entidad del modelo de HELIOS que originó el bloque.

---

## 2. ¿Cómo se reconstruye desde el Knowledge Graph?

`generateReport(def, input)` trabaja así:
1. Filtra `def.secciones` por `visible: true` y las ordena por `orden`.
2. Para cada sección activa, llama `generateSection(tipo, def, input)`.
3. Cada builder de sección (`buildHipotesis`, `buildModeloConceptual`, etc.) extrae datos del `input` — que incluye `hypotheses`, `conceptualModels`, `contrastationMatrices`, `evidenceEvaluationMatrices`, `hypothesisEvidenceConclusions`, `audit`.
4. Cada bloque generado referencia su entidad de origen con `entityType` + `entityId`.
5. El `traceabilityMap` se construye al final recorriendo todos los bloques con referencias.

La función es pura: mismo input → mismo output. Sin efectos secundarios.

---

## 3. ¿Cómo se preserva la trazabilidad?

Cada bloque tiene `entityType` y `entityId` opcionales. Por ejemplo:
- Una fila de la tabla de hipótesis tiene `entityType: "hypothesis"`, `entityId: "hyp-001"`.
- Una fila de la tabla de evaluaciones tiene `entityType: "evidence-evaluation-matrix"`, `entityId: "eem-001"`.
- Los bloques de conclusión tienen `entityType: "hypothesis-conclusion"`, `entityId: "conc-001"`.

`findTraceability(report, entityId)` devuelve todas las apariciones de esa entidad en el informe, con la sección y el bloque.

En los exportadores HTML, estos atributos se emiten como `data-entity-type` y `data-entity-id`, lo que permite tooling externo navegar de vuelta al modelo.

---

## 4. ¿Qué información nunca se duplica?

Nunca se copian en `ReportDefinition`:
- El texto de ningún campo (ni `formulacion`, ni `conclusionText`, ni `evidenciaEsperada`).
- Las listas de variables, indicadores, fuentes.
- Las evaluaciones o evidencias observadas.

La referencia es siempre por ID en `ReportDefinition`. El contenido lo aporta el `ReportBuildInput` en cada llamada a `generateReport`.

---

## 5. ¿Cómo se agregan nuevos exportadores?

La interfaz `ReportExporter` define:
```typescript
interface ReportExporter {
  readonly format: "markdown" | "html" | "json" | string;
  export(report: GeneratedReport): string;
}
```

Para agregar PDF (sprint futuro):
1. Crear `PdfExporter.ts` que implemente `ReportExporter`.
2. Recibir `GeneratedReport` y convertir los bloques a PDF usando `HtmlExporter` como origen + una librería como `puppeteer` o `jsPDF`.
3. Exportar desde `src/report-builder/exporters/index.ts`.

Para agregar DOCX, PPTX, o cualquier otro formato: mismo patrón.

---

## 6. ¿Cómo se valida un informe?

`validateReport(def, input)` retorna `ReportValidationResult`:

**Errores (bloquean generación):**
- `RPT-001`: sin `hypothesisId`.
- `RPT-002`: hipótesis no encontrada en el input.
- `RPT-003`: sin secciones activas.
- `RPT-004`: problema vacío.

**Advertencias (no bloquean, informan):**
- `RPT-W001`: sección conclusiones activa, sin conclusión formulada.
- `RPT-W002`: sección auditoría activa, sin auditoría ejecutada.
- `RPT-W003`: sección evidencia activa, sin matrices de evaluación.
- `RPT-W004`: anexos activos, sin modelo ni contrastación.

La UI muestra los errores antes del botón de exportación y deshabilita los exportadores cuando `canGenerate: false`.

---

## 7. ¿Cómo se integra con la auditoría metodológica?

`PantallaReportBuilder` recibe `audit?: MethodologicalAudit | null` como prop. Si se proporciona, `buildInput.audit` incluye la auditoría y `generateSection("auditoria-metodologica", ...)` genera la tabla de hallazgos agrupada por severidad.

La auditoría se computa en `Helios.tsx` y se pasa al componente — no se recomputa dentro del Report Builder para mantener coherencia con la sesión.

En `PantallaRevisionFinal` y `PantallaAuditoriaMetodologica`, se añade el botón "Generar informe" que navega a `report-builder`.

---

## 8. ¿Qué limitaciones permanecen?

1. **Sin PDF en este sprint.** El exportador HTML está diseñado como origen para PDF — puede usarse con `window.print()` o una librería en un sprint futuro.
2. **Sin persistencia de `GeneratedReport`.** Si el usuario quiere el informe en una sesión futura, debe regenerarlo (la `ReportDefinition` sí persiste en sesión).
3. **Sin colaboración.** El informe es de un único investigador — no hay versioning ni comentarios.
4. **Sin imágenes.** Los exportadores no incluyen figuras del Knowledge Graph visual.
5. **Sin LaTeX.** El exportador Markdown es GitHub-compatible, no académico-LaTeX.

---

## 9. ¿Qué deuda técnica queda?

| Ítem | Prioridad | Sprint sugerido |
|------|-----------|-----------------|
| PdfExporter usando HtmlExporter como base | Alta | S-024 |
| Exportar grafo de conocimiento como imagen SVG en el informe | Media | S-025 |
| Persist GeneratedReport con hash de integridad | Baja | S-026 |
| Soporte multi-hipótesis en un solo informe comparativo | Media | S-026 |
| DOCX exporter (Word) | Baja | S-027 |

---

## 10. ¿Está HELIOS preparado para generar documentos reproducibles?

**Sí, con las siguientes condiciones:**

- El informe es reproducible si el estado de sesión no cambia entre generaciones (por diseño de las funciones puras).
- Cada bloque es trazable hasta su entidad de origen — un auditor puede verificar que el informe refleja el modelo.
- La conclusión del informe es el texto que el investigador formuló explícitamente — no una derivación automática.
- Los exportadores (MD, HTML, JSON) producen el mismo output para el mismo input (idempotentes).

Lo que **no** es reproducible automáticamente si cambia el estado de sesión: si el usuario modifica la hipótesis después de exportar el informe, la próxima exportación será diferente. Esto es correcto por diseño — el informe refleja el conocimiento actual, no un snapshot.
