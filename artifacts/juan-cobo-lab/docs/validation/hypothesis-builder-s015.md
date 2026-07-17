# Architecture Review — S-015 Hypothesis Builder

**Sprint:** S-015  
**ADR:** ADR-0005  
**Date:** 2026-07-17  
**Test result:** 18/18 (validacion_s015.ts), TypeCheck: 0 errors

---

## §23 Architecture Review Questions

### 1. Why is `buildProvisionalFormulacion` a pure function that never auto-applies?

The analyst's manual text must take precedence. If the function auto-applied its output whenever cause, mechanism, and expected result were all filled, any edit to one of those fields would silently overwrite a manually crafted sentence. The function is called **only on explicit user action** ("Generar formulación provisional"), and the result is shown in a preview card with Accept/Discard options before touching `formulacion`.

### 2. How is `computeHypothesisStatus` kept independent of `confianza`?

`computeHypothesisStatus` reads only structural fields: `causa`, `mecanismo`, `resultadoEsperado` (core completeness), `formulacion`, `variables` (by role), and `evidenciaNecesaria`. It never reads `confianza`. An analyst can mark a hypothesis "exploratoria" and still advance it to "lista-para-contrastar" once the structural requirements are met, which is the intended behaviour (§15).

**Status rules:**
- `borrador`: any of causa / mecanismo / resultadoEsperado is empty
- `incompleta`: core complete but missing any of {formulacion, causaVar, resultVar, evidenciaNecesaria}
- `lista-para-contrastar`: all four above present

### 3. How does the accordion key scheme (`"single:N"`, `"primary:N"`, `"secondary:N"`) ensure uniqueness?

`PantallaPereque` renders three mutually exclusive question blocks. In single mode, keys are `"single:{pregunta.numero}"`. In combined mode, the primary block uses `"primary:{numero}"` and the secondary block uses `"secondary:{numero}"`. Since the prefix distinguishes the mode/block and `numero` is unique within a block, no collision is possible across a session. These same keys are used as `sourceQuestionIds` on `PolicyHypothesis`, creating a direct traceability link.

### 4. Why does `ReflectionAnswer` store `questionText`, `patternTitulo`, and `categoria` redundantly?

Once the analyst navigates away from the pereque screen, the question text is no longer available without re-deriving `perequeMode`. Storing it on the answer makes `PantallaHypothesisBuilder` and `PantallaRevisionHipotesis` self-contained: they can display context-rich summaries without receiving `perequeMode` as an additional prop.

### 5. How does `handleAnswerChange` prevent accumulating empty answers?

When `answerText.trim()` is empty (user clears a textarea), the handler removes the corresponding entry from `reflectionAnswers` rather than storing an empty string. This keeps the list clean and ensures `getAnsweredReflections()` always returns only non-empty answers.

### 6. What prevents two hypotheses from being primary simultaneously?

`setPrimaryHypothesis(list, id)` maps over the entire list, setting `isPrimary: false` on every element, then `isPrimary: true` only on the target. It returns a new array — it never mutates state directly. Helios calls `handleUpdatePrimaryId(id)` and `handleUpdateHypotheses(updated)` together (the builder calls both), so the two state variables stay synchronized.

### 7. How does `markPatternChanged` preserve hypotheses when the analyst reverts?

`markPatternChanged(hypotheses)` sets `patternChangedWarning: true` on every hypothesis but returns the list unchanged otherwise. The analyst's work is never deleted. Both `PantallaHypothesisBuilder` and `PantallaRevisionHipotesis` surface the flag as an amber badge, prompting review without forcing any action. The flag can only be set, never cleared programmatically (the analyst resolves it by editing or confirming).

### 8. Why is `PreguntaItem` restructured so the expanded panel is outside the `<button>`?

Placing a `<textarea>` inside a `<button>` element is invalid HTML (interactive element nested inside interactive element). Browsers handle this inconsistently — some swallow click events from the textarea, others propagate them to the button. The fix separates the header (`<button>`, toggle only) from the expanded panel (`<div>` with `role="region"`), which is also the standard accessible accordion pattern (WAI-ARIA).

### 9. How is the "Construir hipótesis" button non-blocking when no answers are typed?

The button is always enabled. When `hasAnswers` is false (no `reflectionAnswers` entry has a non-empty `answerText`), an amber advisory is shown above the buttons noting that proceeding without notes is possible but reduces richness. The analyst can click "Construir hipótesis" at any time. No answers are required.

### 10. How does `PantallaHypothesisBuilder` avoid re-running router logic?

`PantallaHypothesisBuilder` receives `perequeMode: PerequeMode` (already computed and frozen by `computePerequeMode()` in Helios's render phase) and `patternIds` derived from it. It never calls `computePerequeMode()`, `heliosThinkingEngine`, or `heliosRouter`. All analytical computation stays in Helios.tsx.

### 11. What is the "confirmar" contract in `PantallaRevisionHipotesis`?

"Confirmar hipótesis" sets `hypothesesReviewed = true` in Helios state and keeps the analyst on the same screen in a "completed" state. No data is sent to any server, no localStorage is written, and no additional Pantalla transition occurs. The completion state is shown in-place. This is session-only memory: data is lost on page reload.

### 12. How does `validateHypothesis` communicate with the UI without blocking drafts?

`validateHypothesis` returns `{ isComplete, errors, warnings, strengths }`. Errors block the "Confirmar hipótesis" button in `PantallaRevisionHipotesis` (`hasBlockingErrors` guard). They do NOT prevent:
- saving changes in `PantallaHypothesisBuilder` (every change is immediate)
- duplicating or moving a hypothesis
- navigating between builder and revision

Warnings are advisory — shown inline as amber info items. Strengths are shown as green checklist items to reward completeness without penalising incompleteness.

### 13. What happens to hypothesis state when the analyst navigates back from builder to pereque?

`handleVolverDesdeBuilder` sets `pantalla = "pereque"`. `hypotheses` and `reflectionAnswers` remain in Helios state unchanged. When the analyst returns to `"hypothesis-builder"`, all hypotheses are restored exactly as left. No data is lost in back-navigation.

### 14. How is the `>5 hypotheses` recommendation implemented without blocking?

`exceedsRecommendedCount(hypotheses)` returns `hypotheses.length > MAX_RECOMMENDED_HYPOTHESES` (default 5). When true, `PantallaHypothesisBuilder` renders an amber `role="status"` info block. The analyst can still add more hypotheses. The "Nueva hipótesis" button is never disabled.

### 15. Why are `handleAnswerChange`, `handleUpdateHypotheses`, etc. wrapped in `useCallback`?

These handlers are passed as props to child components (`PantallaPereque`, `PantallaHypothesisBuilder`, `PantallaRevisionHipotesis`). Without `useCallback`, every render of `Helios` would create new function references, forcing all children to re-render. `useCallback` with an empty dependency array (where state is updated via functional form of the setter) prevents unnecessary re-renders and satisfies the "stable references" contract expected by memoised children.

---

## Files created / modified in S-015

| File | Change |
|---|---|
| `src/hypothesis/types.ts` | New — full type definitions including ReflectionAnswer, PolicyHypothesis |
| `src/hypothesis/HypothesisBuilderService.ts` | New — all pure service functions |
| `src/hypothesis/__tests__/validacion_s015.ts` | New — 18 test cases, 18/18 passing |
| `src/components/PantallaHypothesisBuilder.tsx` | New — S-015 hypothesis builder screen |
| `src/components/PantallaRevisionHipotesis.tsx` | New — S-015 review/confirmation screen |
| `src/pages/Helios.tsx` | Modified — PreguntaItem restructure, PantallaPereque new props/CTA, state machine, new handlers, JSX render cases |

---

## Test coverage (S-015)

| # | Test case | Result |
|---|---|---|
| TC-01 | createEmptyHypothesis defaults | ✓ |
| TC-02 | buildProvisionalFormulacion sentence structure | ✓ |
| TC-03 | provisional formulacion not auto-applied | ✓ |
| TC-04 | validateHypothesis — incomplete has errors | ✓ |
| TC-05 | validateHypothesis — complete passes | ✓ |
| TC-06 | computeHypothesisStatus — independent of confianza | ✓ |
| TC-07 | computeHypothesisStatus — borrador when empty | ✓ |
| TC-08 | computeHypothesisStatus — incompleta when partial | ✓ |
| TC-09 | variable roles preserved through update | ✓ |
| TC-10 | sourceQuestionIds traceability — link and unlink | ✓ |
| TC-11 | linkReflectionAnswer — idempotent | ✓ |
| TC-12 | duplicateHypothesis — new ID, isPrimary=false | ✓ |
| TC-13 | moveHypothesis up and down | ✓ |
| TC-14 | setPrimaryHypothesis — single primary | ✓ |
| TC-15 | removeHypothesis — removes correct element | ✓ |
| TC-16 | markPatternChanged — sets flag, preserves content | ✓ |
| TC-17 | vague terms trigger warning | ✓ |
| TC-18 | exceedsRecommendedCount — threshold | ✓ |
