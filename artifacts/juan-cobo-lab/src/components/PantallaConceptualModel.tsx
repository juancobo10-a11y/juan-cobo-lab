/**
 * PantallaConceptualModel — S-017
 *
 * Screen for building the conceptual model that operationalises a hypothesis.
 * Hierarchy: Hypothesis → Variables → Indicators → Evidence Sources
 *
 * Accessibility:
 *   - keyboard navigation throughout
 *   - aria-labels on all interactive elements
 *   - visible focus rings
 *   - real <button> elements only
 *   - no drag-and-drop
 */

import { useRef, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Plus, Trash2, ChevronDown, ChevronRight as ChevronRight2,
  CheckCircle2, AlertCircle, Info, ArrowLeft, ArrowRight,
  RotateCcw, FlaskConical,
} from "lucide-react";

import type { PolicyHypothesis } from "@/hypothesis/types";
import type {
  ConceptualModel,
  ConceptualVariable,
  ConceptualVariableRole,
  ConceptualIndicator,
  EvidenceSource,
  ConceptualModelValidation,
} from "@/conceptual/types";
import {
  createVariable,
  updateVariable,
  removeVariable,
  createIndicator,
  updateIndicator,
  removeIndicator,
  createEvidenceSource,
  updateEvidenceSource,
  removeEvidenceSource,
  validateConceptualModel,
  createEmptyConceptualModel,
} from "@/conceptual/ConceptualModelService";

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROL_LABELS: Record<ConceptualVariableRole, string> = {
  causa: "Causa",
  resultado: "Resultado",
  mediadora: "Mediadora",
  moderadora: "Moderadora",
  control: "Control",
};

const ROL_COLORS: Record<ConceptualVariableRole, string> = {
  causa: "bg-blue-100 text-blue-700 border-blue-200",
  resultado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  mediadora: "bg-purple-100 text-purple-700 border-purple-200",
  moderadora: "bg-amber-100 text-amber-700 border-amber-200",
  control: "bg-slate-100 text-slate-600 border-slate-200",
};

const AVAILABLE_ROLES: ConceptualVariableRole[] = [
  "causa", "resultado", "mediadora", "moderadora", "control",
];

const DISPONIBILIDAD_LABELS = {
  disponible: "Disponible",
  parcial: "Parcial",
  "no-disponible": "No disponible",
  desconocida: "Desconocida",
};

const TIPO_FUENTE_LABELS = {
  administrativo: "Administrativo",
  encuesta: "Encuesta",
  observacional: "Observacional",
  documental: "Documental",
  experimental: "Experimental",
  mixto: "Mixto",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-foreground/70 mb-1">
      {children}
    </label>
  );
}

function TextField({
  id, value, onChange, placeholder, multiline, rows,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const cls =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow";
  if (multiline) {
    return (
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 2}
        className={cls + " resize-y min-h-[64px]"}
      />
    );
  }
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cls}
    />
  );
}

// ─── Variable Editor ──────────────────────────────────────────────────────────

function VariableEditor({
  variable,
  model,
  onUpdate,
  onRemove,
  onAddIndicator,
  onUpdateIndicator,
  onRemoveIndicator,
  onAddSource,
  onUpdateSource,
  onRemoveSource,
}: {
  variable: ConceptualVariable;
  model: ConceptualModel;
  onUpdate: (id: string, fields: Partial<ConceptualVariable>) => void;
  onRemove: (id: string) => void;
  onAddIndicator: (variableId: string, nombre: string) => void;
  onUpdateIndicator: (indicatorId: string, fields: Partial<ConceptualIndicator>) => void;
  onRemoveIndicator: (indicatorId: string) => void;
  onAddSource: (indicatorId: string, nombre: string) => void;
  onUpdateSource: (sourceId: string, fields: Partial<EvidenceSource>) => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [newIndicatorName, setNewIndicatorName] = useState("");

  const indicators = model.indicators.filter((i) => i.variableId === variable.id);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border/60">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Colapsar" : "Expandir"} variable ${variable.nombre}`}
          className="flex items-center gap-2 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          ) : (
            <ChevronRight2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          )}
          <span className="text-sm font-medium text-foreground">
            {variable.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}
          </span>
          <span
            className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${ROL_COLORS[variable.rol]}`}
          >
            {ROL_LABELS[variable.rol]}
          </span>
          <span className="ml-auto text-xs text-muted-foreground/60">
            {indicators.length} indicador{indicators.length !== 1 ? "es" : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(variable.id)}
          aria-label={`Eliminar variable ${variable.nombre}`}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Variable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor={`var-nombre-${variable.id}`}>Nombre *</FieldLabel>
              <TextField
                id={`var-nombre-${variable.id}`}
                value={variable.nombre}
                onChange={(v) => onUpdate(variable.id, { nombre: v })}
                placeholder="¿Qué representa?"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`var-rol-${variable.id}`}>Rol *</FieldLabel>
              <select
                id={`var-rol-${variable.id}`}
                value={variable.rol}
                onChange={(e) => onUpdate(variable.id, { rol: e.target.value as ConceptualVariableRole })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROL_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor={`var-desc-${variable.id}`}>Descripción conceptual</FieldLabel>
            <TextField
              id={`var-desc-${variable.id}`}
              value={variable.descripcion}
              onChange={(v) => onUpdate(variable.id, { descripcion: v })}
              placeholder="¿Qué representa analíticamente?"
              multiline
            />
          </div>
          <div>
            <FieldLabel htmlFor={`var-op-${variable.id}`}>Definición operacional</FieldLabel>
            <TextField
              id={`var-op-${variable.id}`}
              value={variable.definicionOperacional}
              onChange={(v) => onUpdate(variable.id, { definicionOperacional: v })}
              placeholder="¿Cómo se observaría o mediría?"
              multiline
            />
          </div>

          {/* Indicators */}
          <div className="mt-2">
            <SectionHeader
              title="Indicadores"
              subtitle="¿Qué mediría? ¿Cómo? ¿Con qué unidad? ¿Cada cuánto? ¿En qué nivel territorial?"
            />
            <div className="space-y-3">
              {indicators.map((ind) => (
                <IndicatorEditor
                  key={ind.id}
                  indicator={ind}
                  model={model}
                  onUpdate={onUpdateIndicator}
                  onRemove={onRemoveIndicator}
                  onAddSource={onAddSource}
                  onUpdateSource={onUpdateSource}
                  onRemoveSource={onRemoveSource}
                />
              ))}
            </div>
            {/* Add indicator inline */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newIndicatorName}
                onChange={(e) => setNewIndicatorName(e.target.value)}
                placeholder="Nombre del indicador…"
                aria-label="Nombre del nuevo indicador"
                className="flex-1 rounded-lg border border-dashed border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newIndicatorName.trim()) {
                    onAddIndicator(variable.id, newIndicatorName.trim());
                    setNewIndicatorName("");
                  }
                }}
              />
              <button
                type="button"
                disabled={!newIndicatorName.trim()}
                onClick={() => {
                  if (newIndicatorName.trim()) {
                    onAddIndicator(variable.id, newIndicatorName.trim());
                    setNewIndicatorName("");
                  }
                }}
                aria-label="Agregar indicador"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden />
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Indicator Editor ─────────────────────────────────────────────────────────

function IndicatorEditor({
  indicator,
  model,
  onUpdate,
  onRemove,
  onAddSource,
  onUpdateSource,
  onRemoveSource,
}: {
  indicator: ConceptualIndicator;
  model: ConceptualModel;
  onUpdate: (id: string, fields: Partial<ConceptualIndicator>) => void;
  onRemove: (id: string) => void;
  onAddSource: (indicatorId: string, nombre: string) => void;
  onUpdateSource: (sourceId: string, fields: Partial<EvidenceSource>) => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");

  const sources = model.evidenceSources.filter((s) =>
    s.indicadorIds.includes(indicator.id)
  );

  return (
    <div className="rounded-lg border border-border/80 bg-slate-50/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Colapsar" : "Expandir"} indicador ${indicator.nombre}`}
          className="flex items-center gap-2 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
          ) : (
            <ChevronRight2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
          )}
          <span className="text-sm text-foreground/90">
            {indicator.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}
          </span>
          {indicator.unidad && (
            <span className="ml-1 text-xs text-muted-foreground/60">— {indicator.unidad}</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground/50">
            {sources.length} fuente{sources.length !== 1 ? "s" : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(indicator.id)}
          aria-label={`Eliminar indicador ${indicator.nombre}`}
          className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <FieldLabel htmlFor={`ind-nombre-${indicator.id}`}>Nombre</FieldLabel>
              <TextField
                id={`ind-nombre-${indicator.id}`}
                value={indicator.nombre}
                onChange={(v) => onUpdate(indicator.id, { nombre: v })}
                placeholder="¿Qué mediría?"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`ind-unidad-${indicator.id}`}>Unidad</FieldLabel>
              <TextField
                id={`ind-unidad-${indicator.id}`}
                value={indicator.unidad}
                onChange={(v) => onUpdate(indicator.id, { unidad: v })}
                placeholder="Horas, %, número…"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`ind-period-${indicator.id}`}>Periodicidad</FieldLabel>
              <select
                id={`ind-period-${indicator.id}`}
                value={indicator.periodicidad}
                onChange={(e) => onUpdate(indicator.id, { periodicidad: e.target.value })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {[
                  "diaria","semanal","mensual","trimestral",
                  "semestral","anual","bienal","irregular","otra",
                ].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor={`ind-nivel-${indicator.id}`}>Nivel territorial</FieldLabel>
              <TextField
                id={`ind-nivel-${indicator.id}`}
                value={indicator.nivelTerritorial}
                onChange={(v) => onUpdate(indicator.id, { nivelTerritorial: v })}
                placeholder="Municipal, Departamental…"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`ind-disp-${indicator.id}`}>Disponibilidad</FieldLabel>
              <select
                id={`ind-disp-${indicator.id}`}
                value={indicator.disponibilidad}
                onChange={(e) =>
                  onUpdate(indicator.id, {
                    disponibilidad: e.target.value as ConceptualIndicator["disponibilidad"],
                  })
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {Object.entries(DISPONIBILIDAD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor={`ind-formula-${indicator.id}`}>Fórmula o criterio</FieldLabel>
            <TextField
              id={`ind-formula-${indicator.id}`}
              value={indicator.formulaOCriterio}
              onChange={(v) => onUpdate(indicator.id, { formulaOCriterio: v })}
              placeholder="¿Cómo se calcularía o verificaría?"
              multiline
              rows={2}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`ind-desc-${indicator.id}`}>Descripción</FieldLabel>
            <TextField
              id={`ind-desc-${indicator.id}`}
              value={indicator.descripcion}
              onChange={(v) => onUpdate(indicator.id, { descripcion: v })}
              placeholder="Descripción del indicador"
              multiline
              rows={2}
            />
          </div>

          {/* Sources */}
          <div>
            <p className="text-xs font-medium text-foreground/60 mb-2 uppercase tracking-wide">Fuentes de evidencia</p>
            <div className="space-y-2">
              {sources.map((src) => (
                <SourceEditor
                  key={src.id}
                  source={src}
                  onUpdate={onUpdateSource}
                  onRemove={onRemoveSource}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="Nombre de la fuente…"
                aria-label="Nombre de la nueva fuente de evidencia"
                className="flex-1 rounded-lg border border-dashed border-border bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSourceName.trim()) {
                    onAddSource(indicator.id, newSourceName.trim());
                    setNewSourceName("");
                  }
                }}
              />
              <button
                type="button"
                disabled={!newSourceName.trim()}
                onClick={() => {
                  if (newSourceName.trim()) {
                    onAddSource(indicator.id, newSourceName.trim());
                    setNewSourceName("");
                  }
                }}
                aria-label="Agregar fuente"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden />
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Source Editor ────────────────────────────────────────────────────────────

function SourceEditor({
  source,
  onUpdate,
  onRemove,
}: {
  source: EvidenceSource;
  onUpdate: (id: string, fields: Partial<EvidenceSource>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Colapsar" : "Expandir"} fuente ${source.nombre}`}
          className="flex items-center gap-2 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
          ) : (
            <ChevronRight2 className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
          )}
          <span className="text-xs text-foreground/90">
            {source.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}
          </span>
          <span className="ml-1 text-xs text-muted-foreground/50">
            — {TIPO_FUENTE_LABELS[source.tipo]}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(source.id)}
          aria-label={`Eliminar fuente ${source.nombre}`}
          className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
        >
          <Trash2 className="w-3 h-3" aria-hidden />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <FieldLabel htmlFor={`src-nombre-${source.id}`}>Nombre</FieldLabel>
              <TextField
                id={`src-nombre-${source.id}`}
                value={source.nombre}
                onChange={(v) => onUpdate(source.id, { nombre: v })}
                placeholder="DANE, MinTIC, encuesta…"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`src-tipo-${source.id}`}>Tipo</FieldLabel>
              <select
                id={`src-tipo-${source.id}`}
                value={source.tipo}
                onChange={(e) =>
                  onUpdate(source.id, { tipo: e.target.value as EvidenceSource["tipo"] })
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {Object.entries(TIPO_FUENTE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor={`src-resp-${source.id}`}>Responsable</FieldLabel>
              <TextField
                id={`src-resp-${source.id}`}
                value={source.responsable}
                onChange={(v) => onUpdate(source.id, { responsable: v })}
                placeholder="Entidad productora"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`src-frec-${source.id}`}>Frecuencia</FieldLabel>
              <TextField
                id={`src-frec-${source.id}`}
                value={source.frecuencia}
                onChange={(v) => onUpdate(source.id, { frecuencia: v })}
                placeholder="Anual, cada 5 años…"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`src-acceso-${source.id}`}>Acceso</FieldLabel>
              <select
                id={`src-acceso-${source.id}`}
                value={source.acceso}
                onChange={(e) =>
                  onUpdate(source.id, { acceso: e.target.value as EvidenceSource["acceso"] })
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="publico">Público</option>
                <option value="restringido">Restringido</option>
                <option value="privado">Privado</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor={`src-lim-${source.id}`}>Limitaciones conocidas</FieldLabel>
            <TextField
              id={`src-lim-${source.id}`}
              value={source.limitaciones}
              onChange={(v) => onUpdate(source.id, { limitaciones: v })}
              placeholder="Sesgos, cobertura, periodicidad…"
              multiline
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Validation panel ─────────────────────────────────────────────────────────

function ValidationPanel({ validation }: { validation: ConceptualModelValidation }) {
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
        <p className="text-sm text-emerald-700">Modelo estructuralmente completo.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {validation.blockingIssues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3" role="alert">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-red-700">{issueLabel(issue)}</p>
        </div>
      ))}
      {validation.warnings.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-amber-700">{issueLabel(issue)}</p>
        </div>
      ))}
    </div>
  );
}

function issueLabel(issue: ReturnType<typeof validateConceptualModel>["blockingIssues"][number]): string {
  switch (issue.code) {
    case "hipotesis-sin-variables":
      return "La hipótesis no tiene variables. Agrega al menos una variable.";
    case "variable-sin-rol":
      return `La variable "${issue.nombre}" no tiene un rol asignado.`;
    case "variable-sin-indicadores":
      return `La variable "${issue.nombre}" no tiene indicadores.`;
    case "indicador-sin-variable":
      return `El indicador "${issue.nombre}" no está asociado a ninguna variable válida.`;
    case "indicador-sin-fuente":
      return `El indicador "${issue.nombre}" no tiene fuentes de evidencia.`;
    case "fuente-sin-indicador":
      return `La fuente "${issue.nombre}" no está asociada a ningún indicador válido.`;
    case "duplicado-variable":
      return `Nombre de variable duplicado: "${issue.nombre}".`;
    case "duplicado-indicador":
      return `Nombre de indicador duplicado: "${issue.nombre}".`;
    case "duplicado-fuente":
      return `Nombre de fuente duplicado: "${issue.nombre}".`;
    default:
      return "Error estructural desconocido.";
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PantallaConceptualModel({
  problema,
  hypothesis,
  model: initialModel,
  onUpdateModel,
  onConfirmar,
  onVolver,
  onReiniciar,
}: {
  problema: string;
  hypothesis: PolicyHypothesis;
  model: ConceptualModel | null;
  onUpdateModel: (model: ConceptualModel) => void;
  onConfirmar: (model: ConceptualModel) => void;
  onVolver: () => void;
  onReiniciar: () => void;
}) {
  const [model, setModel] = useState<ConceptualModel>(
    () => initialModel ?? createEmptyConceptualModel(hypothesis.id)
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [newVarName, setNewVarName] = useState("");
  const [newVarRol, setNewVarRol] = useState<ConceptualVariableRole>("causa");

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Sync up on every change
  function applyAndSync(updated: ConceptualModel) {
    setModel(updated);
    onUpdateModel(updated);
  }

  const validation = validateConceptualModel(model);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAddVariable() {
    if (!newVarName.trim()) return;
    const updated = createVariable(model, { nombre: newVarName.trim(), rol: newVarRol });
    applyAndSync(updated);
    setNewVarName("");
    setNewVarRol("causa");
  }

  function handleUpdateVariable(id: string, fields: Partial<ConceptualVariable>) {
    applyAndSync(updateVariable(model, id, fields));
  }

  function handleRemoveVariable(id: string) {
    applyAndSync(removeVariable(model, id));
  }

  function handleAddIndicator(variableId: string, nombre: string) {
    try {
      applyAndSync(createIndicator(model, { nombre, variableId }));
    } catch { /* guard: variable not found — should not happen in UI */ }
  }

  function handleUpdateIndicator(id: string, fields: Partial<ConceptualIndicator>) {
    applyAndSync(updateIndicator(model, id, fields));
  }

  function handleRemoveIndicator(id: string) {
    applyAndSync(removeIndicator(model, id));
  }

  function handleAddSource(indicatorId: string, nombre: string) {
    try {
      applyAndSync(
        createEvidenceSource(model, {
          nombre,
          tipo: "administrativo",
          indicadorIds: [indicatorId],
        })
      );
    } catch { /* guard */ }
  }

  function handleUpdateSource(id: string, fields: Partial<EvidenceSource>) {
    applyAndSync(updateEvidenceSource(model, id, fields));
  }

  function handleRemoveSource(id: string) {
    applyAndSync(removeEvidenceSource(model, id));
  }

  function handleConfirmar() {
    if (!validation.isValid) return;
    onConfirmar({ ...model, confirmed: true });
  }

  return (
    <motion.div
      key="conceptual-model"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6"
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-5 h-5 text-primary/70" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary/60">
            Modelo Conceptual
          </span>
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-foreground mb-3 focus:outline-none"
        >
          Operacionalizar la hipótesis
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          ¿Qué tendrías que observar para evaluar si esta hipótesis es correcta?
          Define variables, indica cómo medirlas e identifica las fuentes de evidencia disponibles.
        </p>
      </motion.div>

      {/* ── Hypothesis summary ───────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="mb-8 rounded-xl border border-border bg-slate-50/60 px-5 py-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Hipótesis a operacionalizar
        </p>
        <p className="text-sm font-medium text-foreground">
          {hypothesis.titulo || <span className="italic text-muted-foreground">Sin título</span>}
        </p>
        {hypothesis.formulacion && (
          <p className="text-sm text-muted-foreground/80 mt-1 leading-relaxed">
            {hypothesis.formulacion}
          </p>
        )}
        {hypothesis.resultadoEsperado && (
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            Resultado esperado: {hypothesis.resultadoEsperado}
          </p>
        )}
      </motion.div>

      {/* ── Variables ────────────────────────────────────────────── */}
      <motion.section variants={fadeUp} aria-label="Variables del modelo conceptual" className="mb-8">
        <SectionHeader
          title="Variables"
          subtitle="Cada variable responde: ¿Qué representa? ¿Cómo se observaría? ¿Qué papel cumple?"
        />

        <div className="space-y-4 mb-4">
          {model.variables.length === 0 && (
            <p className="text-sm text-muted-foreground/60 italic py-3 text-center border border-dashed border-border rounded-xl">
              Aún no hay variables. Agrega la primera a continuación.
            </p>
          )}
          {model.variables.map((v) => (
            <VariableEditor
              key={v.id}
              variable={v}
              model={model}
              onUpdate={handleUpdateVariable}
              onRemove={handleRemoveVariable}
              onAddIndicator={handleAddIndicator}
              onUpdateIndicator={handleUpdateIndicator}
              onRemoveIndicator={handleRemoveIndicator}
              onAddSource={handleAddSource}
              onUpdateSource={handleUpdateSource}
              onRemoveSource={handleRemoveSource}
            />
          ))}
        </div>

        {/* Add variable */}
        <div className="flex flex-wrap gap-2 items-end rounded-xl border border-dashed border-border bg-white/60 px-4 py-4">
          <div className="flex-1 min-w-[160px]">
            <FieldLabel htmlFor="new-var-nombre">Nombre de la variable</FieldLabel>
            <TextField
              id="new-var-nombre"
              value={newVarName}
              onChange={setNewVarName}
              placeholder="Ej: Continuidad del servicio"
            />
          </div>
          <div className="min-w-[140px]">
            <FieldLabel htmlFor="new-var-rol">Rol</FieldLabel>
            <select
              id="new-var-rol"
              value={newVarRol}
              onChange={(e) => setNewVarRol(e.target.value as ConceptualVariableRole)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROL_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!newVarName.trim()}
            onClick={handleAddVariable}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Agregar variable
          </button>
        </div>
      </motion.section>

      {/* ── Traceability chain (read-only summary) ───────────────── */}
      {model.variables.length > 0 && (
        <motion.section variants={fadeUp} aria-label="Cadena de trazabilidad" className="mb-8">
          <SectionHeader title="Trazabilidad" subtitle="Resumen del modelo construido." />
          <div className="rounded-xl border border-border bg-white/60 px-5 py-4 space-y-2 text-sm">
            <p className="text-muted-foreground/70 text-xs mb-2">
              <span className="font-medium text-foreground/80">Problema:</span> {problema.slice(0, 120)}{problema.length > 120 ? "…" : ""}
            </p>
            <p className="text-muted-foreground/70 text-xs mb-2">
              <span className="font-medium text-foreground/80">Hipótesis:</span> {hypothesis.titulo}
            </p>
            {model.variables.map((v) => {
              const inds = model.indicators.filter((i) => i.variableId === v.id);
              return (
                <div key={v.id} className="pl-3 border-l-2 border-primary/20 space-y-1">
                  <p className="font-medium text-foreground/90 text-xs">
                    {v.nombre}
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] border ${ROL_COLORS[v.rol]}`}>
                      {ROL_LABELS[v.rol]}
                    </span>
                  </p>
                  {inds.map((ind) => {
                    const srcs = model.evidenceSources.filter((s) =>
                      s.indicadorIds.includes(ind.id)
                    );
                    return (
                      <div key={ind.id} className="pl-3 border-l border-border/60">
                        <p className="text-xs text-foreground/70">
                          ↳ {ind.nombre}{ind.unidad ? ` (${ind.unidad})` : ""}
                        </p>
                        {srcs.map((src) => (
                          <p key={src.id} className="text-[11px] text-muted-foreground/60 pl-4">
                            ↳ {src.nombre} — {TIPO_FUENTE_LABELS[src.tipo]}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Validation ───────────────────────────────────────────── */}
      <motion.section variants={fadeUp} aria-label="Estado del modelo" className="mb-8">
        <ValidationPanel validation={validation} />
      </motion.section>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={!validation.isValid}
          className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-medium tracking-wide hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 transition-all duration-200"
        >
          Confirmar modelo
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Volver a la revisión
        </button>
        <button
          type="button"
          onClick={onReiniciar}
          className="flex items-center gap-1.5 text-sm text-muted-foreground/50 hover:text-red-500 transition-colors duration-200"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden />
          Reiniciar análisis
        </button>
      </motion.div>
    </motion.div>
  );
}
