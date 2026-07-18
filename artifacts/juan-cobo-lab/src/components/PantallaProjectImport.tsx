/**
 * S-024 — PantallaProjectImport
 *
 * Guided import flow for .helios.json project packages.
 * Steps: Select → Validate → Integrity → Schema → Migrations → Conflicts → Strategy → Confirm
 * Never imports without explicit user confirmation.
 */

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, CheckCircle2, XCircle, AlertTriangle, ArrowLeft,
  ShieldCheck, ShieldX, FileJson, ArrowRight, RotateCcw
} from "lucide-react";
import type { ProjectSnapshot, ProjectVersion, ImportStrategy, ProjectImportResult } from "@/project-versioning/types";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "@/project-versioning/types";
import {
  deserializeProjectPackage,
  validateProjectPackage,
  importProjectPackage,
} from "@/project-versioning/ProjectPackageService";
import { canMigrate } from "@/project-versioning/migrations/MigrationService";

const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

type Step = "select" | "validating" | "review" | "confirm" | "done" | "error";

interface Props {
  currentSnapshots: ProjectSnapshot[];
  currentVersions: ProjectVersion[];
  onImportComplete: (
    snapshots: ProjectSnapshot[],
    versions: ProjectVersion[],
    result: ProjectImportResult
  ) => void;
  onVolver: () => void;
}

export function PantallaProjectImport({
  currentSnapshots,
  currentVersions,
  onImportComplete,
  onVolver,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [filename, setFilename] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [validation, setValidation] = useState<ReturnType<typeof validateProjectPackage> | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>("create-copy");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ProjectImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setStep("validating");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setRawContent(content);
      const pkg = deserializeProjectPackage(content);
      if (!pkg) {
        setErrorMsg("El archivo no es un JSON válido o no tiene el formato esperado.");
        setStep("error");
        return;
      }
      const val = validateProjectPackage(pkg);
      setValidation(val);
      setStep("review");
    };
    reader.onerror = () => {
      setErrorMsg("No se pudo leer el archivo.");
      setStep("error");
    };
    reader.readAsText(file);
  }, []);

  const pkg = rawContent ? deserializeProjectPackage(rawContent) : null;

  const schemaVersion = pkg?.manifest?.schemaVersion ?? "";
  const isFutureSchema = schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION;
  const needsMigration = schemaVersion !== CURRENT_PROJECT_SCHEMA_VERSION && !isFutureSchema;
  const migrationAvailable = needsMigration && canMigrate(schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION);
  const blocked = !validation?.valid || isFutureSchema || (needsMigration && !migrationAvailable);

  const handleConfirm = useCallback(() => {
    if (!pkg || blocked) return;
    const importResult = importProjectPackage(
      pkg,
      currentSnapshots,
      currentVersions,
      strategy
    );
    setResult(importResult);
    if (importResult.success) {
      onImportComplete(importResult.resultingSnapshots, importResult.resultingVersions, importResult);
      setStep("done");
    } else {
      setErrorMsg(importResult.errors.join("\n"));
      setStep("error");
    }
  }, [pkg, blocked, strategy, currentSnapshots, currentVersions, onImportComplete]);

  const handleReset = useCallback(() => {
    setStep("select");
    setFilename("");
    setRawContent("");
    setValidation(null);
    setStrategy("create-copy");
    setConfirmed(false);
    setResult(null);
    setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  return (
    <motion.div
      initial="hidden" animate="show" variants={container}
      className="min-h-screen bg-background/95 px-4 py-10 sm:px-8"
    >
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2.5">
            <Upload className="w-6 h-6 text-primary/70" aria-hidden="true" />
            Importar proyecto
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importa un archivo <code className="text-xs font-mono bg-muted rounded px-1">.helios.json</code> para recuperar snapshots y versiones.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* Step: Select */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <label
                htmlFor="import-file"
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-white/60 cursor-pointer p-12 transition-all focus-within:ring-2 focus-within:ring-primary/40"
              >
                <FileJson className="w-10 h-10 text-muted-foreground/40" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground/70">Selecciona un archivo .helios.json</span>
                <span className="text-xs text-muted-foreground">Haz clic o arrastra el archivo aquí</span>
                <input
                  id="import-file"
                  ref={fileRef}
                  type="file"
                  accept=".json,.helios.json"
                  onChange={handleFileSelect}
                  className="sr-only"
                  aria-label="Seleccionar archivo de proyecto HELIOS"
                />
              </label>
            </motion.div>
          )}

          {/* Step: Validating */}
          {step === "validating" && (
            <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" aria-label="Validando…" role="status" />
              <p className="text-sm text-muted-foreground mt-4">Validando {filename}…</p>
            </motion.div>
          )}

          {/* Step: Review */}
          {step === "review" && pkg && validation && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* File info */}
              <div className="rounded-xl border border-border bg-white/80 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Información del paquete</h2>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Proyecto</dt>
                  <dd className="font-medium text-foreground">{pkg.manifest.projectName}</dd>
                  <dt className="text-muted-foreground">Schema version</dt>
                  <dd className="font-mono text-foreground">{schemaVersion}</dd>
                  <dt className="text-muted-foreground">Snapshots</dt>
                  <dd>{pkg.snapshots.length}</dd>
                  <dt className="text-muted-foreground">Versiones</dt>
                  <dd>{pkg.versions.length}</dd>
                  <dt className="text-muted-foreground">Exportado</dt>
                  <dd>{new Date(pkg.manifest.exportedAt).toLocaleDateString("es-CO")}</dd>
                </dl>
              </div>

              {/* Integrity */}
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${validation.hashMatch ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
                role="status"
                aria-label={validation.hashMatch ? "Hash de paquete verificado" : "Error de integridad"}
              >
                {validation.hashMatch
                  ? <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" aria-hidden="true" />
                  : <ShieldX    className="w-4 h-4 text-red-600 mt-0.5"     aria-hidden="true" />
                }
                <div>
                  <p className="text-sm font-medium">
                    {validation.hashMatch ? "Integridad verificada" : "Error de integridad"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {validation.hashMatch
                      ? "El hash del paquete coincide. El archivo no ha sido modificado."
                      : "El hash no coincide. El archivo puede estar corrupto o haber sido modificado."}
                  </p>
                </div>
              </div>

              {/* Schema */}
              {isFutureSchema && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Versión futura — no compatible</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Schema version {schemaVersion} es posterior a la versión actual ({CURRENT_PROJECT_SCHEMA_VERSION}). No se puede importar.
                    </p>
                  </div>
                </div>
              )}

              {needsMigration && migrationAvailable && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Migración disponible</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      El paquete usa schema {schemaVersion}. Se aplicará migración automática a {CURRENT_PROJECT_SCHEMA_VERSION}.
                    </p>
                  </div>
                </div>
              )}

              {needsMigration && !migrationAvailable && !isFutureSchema && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Sin ruta de migración</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      No existe una migración de {schemaVersion} a {CURRENT_PROJECT_SCHEMA_VERSION}. Importación bloqueada.
                    </p>
                  </div>
                </div>
              )}

              {/* Validation errors */}
              {validation.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
                  <p className="text-sm font-medium text-red-800 mb-2">Errores de validación:</p>
                  <ul className="space-y-1">
                    {validation.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                        <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strategy */}
              {!blocked && (
                <div className="rounded-xl border border-border bg-white/80 p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Estrategia de importación</h2>
                  <fieldset className="space-y-3">
                    <legend className="sr-only">Elige cómo importar el proyecto</legend>
                    {([
                      {
                        value: "create-copy" as ImportStrategy,
                        label: "Crear copia (recomendado)",
                        description: "Se asignan nuevos IDs a todos los snapshots y versiones. No afecta el proyecto activo.",
                      },
                      {
                        value: "replace-current" as ImportStrategy,
                        label: "Reemplazar proyecto actual",
                        description: "Usa los IDs originales. Puede reemplazar snapshots existentes con el mismo ID.",
                      },
                    ] as const).map(({ value, label, description }) => (
                      <label
                        key={value}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${strategy === value ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"}`}
                      >
                        <input
                          type="radio"
                          name="import-strategy"
                          value={value}
                          checked={strategy === value}
                          onChange={() => setStrategy(value)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                          {value === "replace-current" && strategy === "replace-current" && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <input
                                type="checkbox"
                                id="confirm-replace"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="rounded"
                              />
                              <label htmlFor="confirm-replace" className="text-xs text-red-600 font-medium cursor-pointer">
                                Confirmo que quiero reemplazar el proyecto activo
                              </label>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </fieldset>

                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    disabled={strategy === "replace-current" && !confirmed}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
                    aria-disabled={strategy === "replace-current" && !confirmed}
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              <button type="button" onClick={handleReset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Seleccionar otro archivo
              </button>
            </motion.div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && pkg && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-800 mb-2">Confirma la importación</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Proyecto: <strong>{pkg.manifest.projectName}</strong></li>
                  <li>• Snapshots a importar: <strong>{pkg.snapshots.length}</strong></li>
                  <li>• Versiones a importar: <strong>{pkg.versions.length}</strong></li>
                  <li>• Estrategia: <strong>{strategy === "create-copy" ? "Crear copia" : "Reemplazar actual"}</strong></li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Importar ahora
                </button>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="px-5 py-3 rounded-xl border border-border text-sm text-foreground/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}

          {/* Step: Done */}
          {step === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5" role="status">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Importación completada</p>
                  <ul className="text-xs text-emerald-700 mt-2 space-y-1">
                    <li>• Snapshots importados: {result.snapshotsImported}</li>
                    <li>• Versiones importadas: {result.versionsImported}</li>
                    {result.migrationsApplied.length > 0 && (
                      <li>• Migraciones aplicadas: {result.migrationsApplied.length}</li>
                    )}
                    {result.conflictsDetected.length > 0 && (
                      <li>• Conflictos resueltos: {result.conflictsDetected.length}</li>
                    )}
                  </ul>
                </div>
              </div>
              <button type="button" onClick={onVolver} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Ir a versiones
              </button>
            </motion.div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Error de importación</p>
                  <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap">{errorMsg}</pre>
                </div>
              </div>
              <button type="button" onClick={handleReset} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium">
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Intentar de nuevo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div variants={fadeUp} className="pt-2">
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-sm font-medium text-foreground/70 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default PantallaProjectImport;
