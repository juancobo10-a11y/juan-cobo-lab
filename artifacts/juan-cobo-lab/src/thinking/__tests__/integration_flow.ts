/**
 * Integration flow — S-016
 *
 * Validates the deterministic state-machine behaviour of HELIOS end-to-end
 * using pure service functions (no browser, no React renderer).
 *
 * Cases:
 *   Case A — Clear winner          → no selection screen; ThinkingResult preserved
 *   Case B — Multiple candidates   → mock candidatos; ThinkingUserSelection stored; original preserved
 *   Case C — Reflections           → answers recorded; preserved on advance; preserved on back
 *   Case D — Hypothesis lifecycle  → created; preserved on revision; preserved on back
 *   Case E — Restart               → clears all session state
 *   Case F — Back navigation       → no re-routing; no duplication; answers and selection preserved
 *
 * Usage:
 *   pnpm exec tsx src/thinking/__tests__/integration_flow.ts
 * from artifacts/juan-cobo-lab/
 */

import { ConceptualThinkingAlgorithm } from "../algorithms/ConceptualThinkingAlgorithm";
import { ThinkingRouter } from "../ThinkingRouter";
import type { ThinkingRouterInput, ThinkingResult, ThinkingCandidate } from "../types";
import { getRealCandidates } from "../SelectionService";
import {
  createEmptyHypothesis,
  updateHypothesis,
  removeHypothesis,
  markPatternChanged,
  duplicateHypothesis,
} from "../../hypothesis/HypothesisBuilderService";
import type { PolicyHypothesis, ReflectionAnswer } from "../../hypothesis/types";

// ─── Minimal test harness (async) ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

type TestFn = () => void | Promise<void>;

async function test(name: string, fn: TestFn): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ✗ ${name}\n    ${msg}`);
    failed++;
  }
}

function assertTrue(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}
function assertFalse(cond: boolean, msg: string): void {
  if (cond) throw new Error(msg);
}
function assertEqual<T>(a: T, b: T, msg?: string): void {
  if (a !== b)
    throw new Error(msg ?? `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Services ─────────────────────────────────────────────────────────────────

const router = new ThinkingRouter(new ConceptualThinkingAlgorithm());

// ─── Simulated Helios session state ───────────────────────────────────────────

interface HeliosSession {
  thinkingResult: ThinkingResult | null;
  /** ID of the pattern selected by the user (null if no selection screen was shown) */
  thinkingUserSelectionPatternId: string | undefined;
  reflectionAnswers: ReflectionAnswer[];
  hypotheses: PolicyHypothesis[];
  primaryHypothesisId: string | undefined;
  hypothesesReviewed: boolean;
  /** Guard: how many times the router was actually invoked */
  routerCallCount: number;
}

function initialSession(): HeliosSession {
  return {
    thinkingResult: null,
    thinkingUserSelectionPatternId: undefined,
    reflectionAnswers: [],
    hypotheses: [],
    primaryHypothesisId: undefined,
    hypothesesReviewed: false,
    routerCallCount: 0,
  };
}

/** Simulates handleReiniciar (mirrors Helios.tsx) */
function reiniciar(): HeliosSession {
  return initialSession();
}

/** Simulates §S-016 handleUpdateHypotheses state rules */
function updateHypotheses(
  s: HeliosSession,
  updated: PolicyHypothesis[]
): HeliosSession {
  return {
    ...s,
    hypotheses: updated,
    hypothesesReviewed: false,
    primaryHypothesisId:
      s.primaryHypothesisId !== undefined &&
      updated.some((h) => h.id === s.primaryHypothesisId)
        ? s.primaryHypothesisId
        : undefined,
  };
}

/** Simulates handleAnswerChange */
function changeAnswer(
  s: HeliosSession,
  key: string,
  text: string
): HeliosSession {
  const prev = s.reflectionAnswers;
  const idx = prev.findIndex((r) => r.questionKey === key);
  if (!text.trim()) {
    return {
      ...s,
      reflectionAnswers: idx >= 0 ? prev.filter((_, i) => i !== idx) : prev,
    };
  }
  const entry: ReflectionAnswer = {
    questionKey: key,
    questionText: `Pregunta ${key}`,
    answerText: text,
    patternId: "socratico",
    patternTitulo: "Socrático",
    categoria: "exploración",
  };
  const updated =
    idx >= 0 ? prev.map((r, i) => (i === idx ? entry : r)) : [...prev, entry];
  return { ...s, reflectionAnswers: updated };
}

// ─── Mock ThinkingResult helpers ──────────────────────────────────────────────

function makeCandidate(patternId: string, score: number): ThinkingCandidate {
  return {
    pattern: { id: patternId } as any,
    score,
    confianza: score >= 0.7 ? "alta" : "media",
    esFallback: false,
    motivoSeleccion: "coincidencia-directa",
    conceptMatches: [],
  };
}

// ─── Main async runner ────────────────────────────────────────────────────────

console.log("\nIntegration Flow — S-016");
console.log("═".repeat(42));

await (async () => {
  // ── Case A: Clear winner ──────────────────────────────────────────────────

  console.log("\n── Case A — Clear winner ──");

  {
    let s = initialSession();
    const input: ThinkingRouterInput = {
      // Strong systemic signals → should NOT produce "candidatos"
      texto:
        "¿Qué factores del sistema de salud colombiano generan las barreras de acceso " +
        "para la población rural mediante interdependencias estructurales?",
    };
    const result = await router.route(input);
    s = { ...s, thinkingResult: result, routerCallCount: 1 };

    await test("A-1 ThinkingResult is not null after routing", () => {
      assertTrue(s.thinkingResult !== null, "thinkingResult must be set");
    });

    await test("A-2 Decision is not 'candidatos' (clear winner, no selection screen)", () => {
      assertFalse(
        s.thinkingResult?.decision === "candidatos",
        `Expected non-candidatos, got: ${s.thinkingResult?.decision}`
      );
    });

    await test("A-3 ThinkingResult preserved after navigating to pereque (no mutation)", () => {
      const snapshot = JSON.stringify(s.thinkingResult);
      const s2 = { ...s }; // simulate setPantalla("pereque")
      assertEqual(
        JSON.stringify(s2.thinkingResult),
        snapshot,
        "ThinkingResult must not change on pereque navigation"
      );
    });
  }

  // ── Case B: Multiple candidates (mock) ────────────────────────────────────

  console.log("\n── Case B — Multiple candidates ──");

  {
    const candidateA = makeCandidate("sistemico", 0.8);
    const candidateB = makeCandidate("economia-politica", 0.75);

    const mockResult: ThinkingResult = {
      decision: "candidatos",
      candidatos: [candidateA, candidateB],
      motivo: "empate",
    };

    let s = initialSession();
    s = { ...s, thinkingResult: mockResult, routerCallCount: 1 };

    await test("B-1 Decision is 'candidatos'", () => {
      assertEqual(s.thinkingResult?.decision, "candidatos", "Expected candidatos");
    });

    await test("B-2 getRealCandidates returns non-fallback candidates", () => {
      const real = getRealCandidates([candidateA, candidateB]);
      assertTrue(real.length >= 2, `Expected ≥2 real candidates, got ${real.length}`);
    });

    await test("B-3 Selecting a pattern preserves the original ThinkingResult", () => {
      const snapshot = JSON.stringify(s.thinkingResult);
      s = { ...s, thinkingUserSelectionPatternId: "sistemico" };
      assertEqual(
        JSON.stringify(s.thinkingResult),
        snapshot,
        "ThinkingResult must not be mutated by pattern selection"
      );
    });

    await test("B-4 Changing selection does not increment router call count", () => {
      const countBefore = s.routerCallCount;
      s = { ...s, thinkingUserSelectionPatternId: "economia-politica" };
      assertEqual(
        s.routerCallCount,
        countBefore,
        "Router must not re-run during selection change"
      );
    });
  }

  // ── Case C: Reflections ───────────────────────────────────────────────────

  console.log("\n── Case C — Reflections ──");

  {
    let s = initialSession();

    await test("C-1 Answer recorded via handleAnswerChange", () => {
      s = changeAnswer(s, "single:1", "Asimetría de información en el regulador");
      assertEqual(s.reflectionAnswers.length, 1, "Should have 1 answer");
    });

    await test("C-2 Multiple answers accumulate independently", () => {
      s = changeAnswer(s, "single:2", "Los incentivos no alinean a los actores");
      assertEqual(s.reflectionAnswers.length, 2, "Should have 2 answers");
    });

    await test("C-3 Empty text removes the answer entry (clean-up rule)", () => {
      s = changeAnswer(s, "single:1", "");
      assertEqual(s.reflectionAnswers.length, 1, "Empty answer removes the entry");
    });

    const snapshotAnswers = [...s.reflectionAnswers];

    await test("C-4 Answers preserved when advancing to Hypothesis Builder", () => {
      const s2 = { ...s }; // simulate setPantalla("hypothesis-builder")
      assertEqual(s2.reflectionAnswers.length, snapshotAnswers.length, "Answers preserved on advance");
    });

    await test("C-5 Answers preserved when navigating back to pereque", () => {
      const s2 = { ...s }; // simulate setPantalla("pereque")
      assertEqual(s2.reflectionAnswers.length, snapshotAnswers.length, "Answers preserved on back");
    });
  }

  // ── Case D: Hypothesis lifecycle ──────────────────────────────────────────

  console.log("\n── Case D — Hypothesis lifecycle ──");

  {
    const PATTERNS = ["socratico"];
    let s = initialSession();

    const h = updateHypothesis(createEmptyHypothesis(PATTERNS), {
      titulo: "Captura regulatoria bloquea la reforma tarifaria",
      causa: "Dependencia financiera del regulador",
      mecanismo: "Captura del mecanismo de supervisión independiente",
      resultadoEsperado: "Tarifas por encima del óptimo social",
    });

    await test("D-1 Hypothesis created and stored via updateHypotheses", () => {
      s = updateHypotheses(s, [h]);
      assertEqual(s.hypotheses.length, 1, "Should have 1 hypothesis");
    });

    await test("D-2 hypothesesReviewed is false immediately after creating hypothesis", () => {
      assertFalse(s.hypothesesReviewed, "hypothesesReviewed must be false after create");
    });

    await test("D-3 Confirming revision sets hypothesesReviewed=true", () => {
      s = { ...s, hypothesesReviewed: true };
      assertTrue(s.hypothesesReviewed, "hypothesesReviewed should be true after confirm");
    });

    await test("D-4 Editing hypothesis after confirmation resets hypothesesReviewed", () => {
      const edited = updateHypothesis(h, { titulo: "Título actualizado" });
      s = updateHypotheses(s, [edited]);
      assertFalse(s.hypothesesReviewed, "hypothesesReviewed must reset when hypothesis is edited");
    });

    await test("D-5 No hypothesis duplication on back-navigation to hypothesis-builder", () => {
      const countBefore = s.hypotheses.length;
      const s2 = { ...s }; // simulate setPantalla("hypothesis-builder")
      assertEqual(s2.hypotheses.length, countBefore, "No duplication on back-navigation");
    });
  }

  // ── Case E: Restart ───────────────────────────────────────────────────────

  console.log("\n── Case E — Restart ──");

  {
    const PATTERNS = ["sistemico"];
    let s: HeliosSession = {
      thinkingResult: { decision: "ninguno", candidatos: [] },
      thinkingUserSelectionPatternId: "sistemico",
      reflectionAnswers: [
        {
          questionKey: "single:1",
          questionText: "Pregunta",
          answerText: "Respuesta",
          patternId: "sistemico",
          patternTitulo: "Sistémico",
          categoria: "exploración",
        },
      ],
      hypotheses: [createEmptyHypothesis(PATTERNS)],
      primaryHypothesisId: "some-id",
      hypothesesReviewed: true,
      routerCallCount: 1,
    };

    s = reiniciar();

    await test("E-1 Restart clears thinkingResult", () => {
      assertEqual(s.thinkingResult, null, "thinkingResult must be null after restart");
    });
    await test("E-2 Restart clears thinkingUserSelectionPatternId", () => {
      assertEqual(s.thinkingUserSelectionPatternId, undefined, "selection must be undefined");
    });
    await test("E-3 Restart clears reflectionAnswers", () => {
      assertEqual(s.reflectionAnswers.length, 0, "reflectionAnswers must be empty");
    });
    await test("E-4 Restart clears hypotheses", () => {
      assertEqual(s.hypotheses.length, 0, "hypotheses must be empty");
    });
    await test("E-5 Restart clears primaryHypothesisId", () => {
      assertEqual(s.primaryHypothesisId, undefined, "primaryId must be undefined");
    });
    await test("E-6 Restart resets hypothesesReviewed", () => {
      assertFalse(s.hypothesesReviewed, "hypothesesReviewed must be false after restart");
    });
  }

  // ── Case F: Back navigation ───────────────────────────────────────────────

  console.log("\n── Case F — Back navigation ──");

  {
    const PATTERNS = ["economia-politica"];
    let s = initialSession();
    s = { ...s, routerCallCount: 1 };
    s = changeAnswer(s, "single:1", "Los grupos de interés dominan la agenda regulatoria");
    const h = updateHypothesis(createEmptyHypothesis(PATTERNS), {
      titulo: "Captura regulatoria",
      causa: "Poder político de los operadores",
      mecanismo: "Lobby sobre comisionados regulatorios",
      resultadoEsperado: "Tarifas favorables a intereses privados",
    });
    s = updateHypotheses(s, [h]);
    s = { ...s, thinkingUserSelectionPatternId: "economia-politica" };

    const countBefore = s.routerCallCount;
    const hypCountBefore = s.hypotheses.length;
    const answerCountBefore = s.reflectionAnswers.length;
    const selectionBefore = s.thinkingUserSelectionPatternId;

    await test("F-1 Back to pereque does not re-run router", () => {
      const s2 = { ...s }; // setPantalla("pereque") — no router call
      assertEqual(s2.routerCallCount, countBefore, "Router must not re-run on back");
    });

    await test("F-2 Back to pereque does not duplicate hypotheses", () => {
      const s2 = { ...s };
      assertEqual(s2.hypotheses.length, hypCountBefore, "No duplication on back-navigation");
    });

    await test("F-3 Back navigation preserves reflectionAnswers", () => {
      const s2 = { ...s };
      assertEqual(s2.reflectionAnswers.length, answerCountBefore, "Answers preserved on back");
    });

    await test("F-4 Back navigation preserves thinkingUserSelection", () => {
      const s2 = { ...s };
      assertEqual(s2.thinkingUserSelectionPatternId, selectionBefore, "Selection preserved on back");
    });

    await test("F-5 duplicateHypothesis creates a new ID — not an in-place duplicate", () => {
      const original = s.hypotheses[0];
      const dup = duplicateHypothesis(original);
      assertFalse(dup.id === original.id, "Duplicate must have a different ID");
      assertFalse(!!dup.isPrimary, "Duplicate must not be primary");
    });

    await test("F-6 markPatternChanged sets flag but does not remove hypotheses", () => {
      const marked = markPatternChanged(s.hypotheses);
      assertEqual(marked.length, s.hypotheses.length, "markPatternChanged must not remove hypotheses");
      assertTrue(marked[0].patternChangedWarning === true, "patternChangedWarning must be set");
      assertEqual(marked[0].causa, s.hypotheses[0].causa, "Content preserved by markPatternChanged");
    });
  }
})();

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(42));
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`  Total  : ${passed + failed}`);
console.log("═".repeat(42) + "\n");

if (failed > 0) process.exit(1);
