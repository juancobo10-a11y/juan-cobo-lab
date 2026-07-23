/**
 * S-025 — PantallaCaseSetup
 *
 * Entry screen for creating a new Understanding Case (Caso de Comprensión).
 * Appears before PantallaEntrada in the HELIOS flow.
 *
 * The Understanding Case is the epistemic container — it holds the question
 * being understood before the analytical problem is formulated.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, BookOpen, AlertCircle, Library } from "lucide-react";
import { createCase, validateCase, STATUS_LABELS } from "@/understanding-case/UnderstandingCaseService";
import type { UnderstandingCase, UnderstandingCaseInput } from "@/understanding-case/types";

// ─── Animation variants ───────────────────────────────────────────────────────
const screenEnter: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-mono uppercase tracking-[0.15em] text-foreground/60 mb-2"
    >
      {children}
      {required && (
        <span className="text-accent ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PantallaCaseSetupProps {
  onSubmit: (c: UnderstandingCase) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PantallaCaseSetup({ onSubmit }: PantallaCaseSetupProps) {
  const firstRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const [fields, setFields] = useState<{
    name: string;
    understandingQuestion: string;
    purpose: string;
    domain: string;
    scope: string;
    description: string;
  }>({
    name: "",
    understandingQuestion: "",
    purpose: "",
    domain: "",
    scope: "",
    description: "",
  });

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const set = (k: keyof typeof fields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFields((prev) => ({ ...prev, [k]: e.target.value }));

  // Derive per-field errors only after first submit attempt
  const validation = submitted
    ? validateCase(fields)
    : { valid: true, errors: [] };

  const fieldError = (field: string): string | undefined => {
    if (!submitted) return undefined;
    if (field === "name" && !fields.name.trim())
      return "El nombre es obligatorio.";
    if (field === "understandingQuestion" && !fields.understandingQuestion.trim())
      return "La pregunta de comprensión es obligatoria.";
    if (field === "purpose" && !fields.purpose.trim())
      return "El propósito es obligatorio.";
    if (field === "domain" && !fields.domain.trim())
      return "El dominio es obligatorio.";
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const input: UnderstandingCaseInput = {
      name: fields.name,
      understandingQuestion: fields.understandingQuestion,
      purpose: fields.purpose,
      domain: fields.domain,
      scope: fields.scope || undefined,
      description: fields.description || undefined,
      status: "active",
    };

    const v = validateCase(input);
    if (!v.valid) return;

    try {
      const c = createCase(input);
      onSubmit(c);
    } catch {
      // createCase re-validates — errors already surfaced via fieldError()
    }
  };

  const inputBase =
    "w-full rounded-xl border border-border bg-white px-5 py-3.5 text-base text-primary " +
    "placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 " +
    "focus:ring-accent/40 focus:border-accent/60 transition-all duration-200 font-sans";

  const textareaBase =
    inputBase + " resize-none leading-relaxed";

  return (
    <motion.div
      key="case-setup"
      variants={screenEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-[calc(100vh-4rem)] flex flex-col justify-center"
    >
      <motion.div
        variants={stagger}
        className="max-w-2xl mx-auto px-6 py-16 w-full"
      >
        {/* Header */}
        <motion.p
          variants={fadeUp}
          className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-7 flex items-center gap-2"
        >
          <BookOpen className="size-3.5" />
          HELIOS · Caso de Comprensión
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="font-serif text-4xl md:text-5xl leading-[1.15] text-primary mb-3"
        >
          ¿Qué deseas comprender?
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-base text-foreground/60 leading-relaxed mb-10"
        >
          Un Caso de Comprensión define el espacio epistémico del análisis.
          Puedes refinarlo en cualquier momento.
        </motion.p>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6"
        >
          {/* Name */}
          <div>
            <FieldLabel htmlFor="case-name" required>
              Nombre del caso
            </FieldLabel>
            <input
              ref={firstRef}
              id="case-name"
              type="text"
              value={fields.name}
              onChange={set("name")}
              placeholder="ej. Crisis hídrica en municipios rurales de Cundinamarca"
              className={inputBase}
            />
            <FieldError message={fieldError("name")} />
          </div>

          {/* Understanding question */}
          <div>
            <FieldLabel htmlFor="case-question" required>
              ¿Qué deseas comprender?
            </FieldLabel>
            <textarea
              id="case-question"
              value={fields.understandingQuestion}
              onChange={set("understandingQuestion")}
              rows={3}
              placeholder="La pregunta central que guía este análisis…"
              className={textareaBase}
            />
            <FieldError message={fieldError("understandingQuestion")} />
          </div>

          {/* Purpose + Domain (two columns on md+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="case-purpose" required>
                Propósito
              </FieldLabel>
              <input
                id="case-purpose"
                type="text"
                value={fields.purpose}
                onChange={set("purpose")}
                placeholder="ej. Orientar una decisión de política"
                className={inputBase}
              />
              <FieldError message={fieldError("purpose")} />
            </div>
            <div>
              <FieldLabel htmlFor="case-domain" required>
                Dominio
              </FieldLabel>
              <input
                id="case-domain"
                type="text"
                value={fields.domain}
                onChange={set("domain")}
                placeholder="ej. Política pública de agua"
                className={inputBase}
              />
              <FieldError message={fieldError("domain")} />
            </div>
          </div>

          {/* Scope */}
          <div>
            <FieldLabel htmlFor="case-scope">
              Alcance{" "}
              <span className="normal-case text-[10px] text-foreground/40">
                (opcional)
              </span>
            </FieldLabel>
            <input
              id="case-scope"
              type="text"
              value={fields.scope}
              onChange={set("scope")}
              placeholder="ej. Período 2020-2025, municipios con menos de 20 000 hab."
              className={inputBase}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel htmlFor="case-description">
              Descripción inicial{" "}
              <span className="normal-case text-[10px] text-foreground/40">
                (opcional)
              </span>
            </FieldLabel>
            <textarea
              id="case-description"
              value={fields.description}
              onChange={set("description")}
              rows={3}
              placeholder="Contexto adicional, antecedentes o hipótesis iniciales…"
              className={textareaBase}
            />
          </div>

          {/* Global error summary (only if submitted and invalid) */}
          {submitted && !validation.valid && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5"
            >
              <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 leading-snug">
                Completa los campos obligatorios para continuar.
              </p>
            </motion.div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="group flex items-center gap-2.5 rounded-xl bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            >
              Iniciar análisis
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.form>

        {/* Footer note */}
        <motion.p
          variants={fadeUp}
          className="mt-10 text-xs text-foreground/35 leading-relaxed"
        >
          Los campos marcados con{" "}
          <span className="text-accent font-medium">*</span> son obligatorios.
          Los campos opcionales pueden completarse después.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ─── Case summary band ────────────────────────────────────────────────────────

/**
 * Thin contextual bar showing the active Understanding Case.
 * Rendered above the main content area in Helios.tsx when a case is active.
 */
export function CaseSummaryBand({
  understandingCase,
  sourcesCount = 0,
  onNavigateToFuentes,
}: {
  understandingCase: UnderstandingCase;
  /** Number of knowledge sources associated with this case. */
  sourcesCount?: number;
  /** Called when the user clicks the "Fuentes de conocimiento" pill. */
  onNavigateToFuentes?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSynthesized = understandingCase.migrationOrigin !== undefined;

  return (
    <div className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="px-6 py-2 flex items-center gap-3">
        {/* Toggle button for case details */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left hover:bg-accent/5 -mx-2 px-2 py-0.5 rounded-lg transition-colors duration-150"
          aria-expanded={expanded}
          aria-label="Ver detalles del caso de comprensión"
        >
          <BookOpen className="size-3.5 text-accent shrink-0" />
          <span className="text-xs font-mono text-foreground/50 uppercase tracking-[0.15em] shrink-0">
            Caso
          </span>
          <span className="text-xs font-medium text-primary truncate">
            {understandingCase.name}
          </span>
          <span className="hidden sm:block text-xs text-foreground/40 truncate flex-1 min-w-0">
            · {understandingCase.understandingQuestion}
          </span>
          {isSynthesized && (
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200/60">
              Sintetizado
            </span>
          )}
          <span className="shrink-0 text-[10px] text-foreground/30">
            {expanded ? "▲" : "▼"}
          </span>
        </button>

        {/* Fuentes de conocimiento pill — always visible when handler is provided */}
        {onNavigateToFuentes && (
          <button
            type="button"
            onClick={onNavigateToFuentes}
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] px-3 py-1 rounded-full border border-border bg-white text-foreground/60 hover:border-accent/50 hover:text-primary hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
            aria-label={`Fuentes de conocimiento — ${sourcesCount} fuente${sourcesCount !== 1 ? "s" : ""}`}
          >
            <Library className="size-3 shrink-0" />
            <span>Fuentes de conocimiento</span>
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">
              {sourcesCount}
            </span>
          </button>
        )}
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-6 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs border-t border-border/40"
        >
          <DetailRow label="Pregunta" value={understandingCase.understandingQuestion} />
          <DetailRow label="Propósito" value={understandingCase.purpose} />
          <DetailRow label="Dominio" value={understandingCase.domain} />
          {understandingCase.scope && (
            <DetailRow label="Alcance" value={understandingCase.scope} />
          )}
          {understandingCase.description && (
            <DetailRow
              label="Descripción"
              value={understandingCase.description}
              wide
            />
          )}
          {isSynthesized && understandingCase.migrationOrigin && (
            <DetailRow
              label="Nota"
              value={`Generado automáticamente desde un proyecto con esquema ${understandingCase.migrationOrigin.fromSchemaVersion}. Considera editar este caso.`}
              wide
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <span className="block font-mono uppercase tracking-[0.12em] text-[10px] text-foreground/40 mb-0.5">
        {label}
      </span>
      <span className="text-foreground/80 leading-snug">{value}</span>
    </div>
  );
}
