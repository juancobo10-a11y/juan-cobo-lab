# HELIOS — Changelog

## S-012 (2026-07-17) — Validación ampliada del Thinking Router conceptual

### Resumen
Sprint de validación y calibración del `ConceptualThinkingAlgorithm` introducido en S-011.
Sin nuevos patrones. Sin cambios de interfaz. Sin cambios algorítmicos estructurales.

### Resultados de validación

| Batería                  | n  | Acuerdo     | Sistémico P/R | Socrático Recall |
|--------------------------|----|-------------|---------------|------------------|
| A — Original S-010       | 12 | 100% (9/9)  | 83% / 100%    | 100%             |
| B — Independiente        | 20 | 93.8% (15/16)| 100% / 86%   | 100%             |
| C — Adversarial          | 12 | 91.7% (11/12)| 100% / 33%   | 86%              |
| Global (A+B+D)           | 38 | 93.5% (29/31)| 93% / 93%    | 92%              |

Regresión: 37/37 smoke tests ✅

### Ajustes al metadata (content/thinking/sistemico/metadata.json → v0.2.1)

**Eliminaciones (reducción de falsos positivos):**
- Retroalimentación sinonimos: eliminado `"ciclo"` (activaba "ciclo presupuestal")
- Estructuras terminos: eliminado `"barreras"` (activaba "barrera normativa"); "barreras de acceso" permanece en expresiones

**Adiciones (reducción de falsos negativos en lenguaje natural):**
- Interdependencia expresiones: "altera el trabajo de las demás", "ninguna tiene control sobre el resultado"
- Efectos indirectos expresiones: "solucionó un problema pero", "pero creó otro"
- Comportamiento temporal terminos: "manifestarse"
- Comportamiento temporal expresiones: "tardan en manifestarse", "generación tras generación"
- Estructuras expresiones: "incentivos no alineados", "falta de incentivos alineados"
- Retroalimentación expresiones: "se retroalimenta", "a pesar de los programas de"
- Causalidad compleja expresiones: "efectos tan distintos entre territorios"

### Nuevos archivos

- `src/thinking/__tests__/validacion_s012.ts` — 50 casos en 4 baterías (original, independiente, adversarial, pares controlados)
- `docs/validation/thinking-router-s012.md` — informe completo

### Limitaciones documentadas

- B14: cadenas causales implícitas (A→B→C→A) sin vocabulario explícito son indetectables con match lexical
- D05: pack de alta densidad sistémica puede empatar con texto socrático moderado (tensión arquitectónica `packContextWeight`)
- ADV09: caso genuinamente ambiguo socrático/sistémico

---

## S-011 (2026-07-17) — Modelo de conocimiento ThinkingConcept (tres niveles)

### Resumen
Reemplaza el modelo plano `keywords[]` con `ThinkingConcept` — objetos con `terminos`, `sinonimos` y `expresiones` — para cada patrón de pensamiento.

### Corrección principal
Eliminada la normalización por `totalTokens × W.keywordPhrase` que impedía a Sistémico superar el umbral `baja` (0.20) con 1–3 coincidencias naturales.

### Cambios técnicos
- **`src/thinking/types.ts`** — `ThinkingConcept`, `ThinkingConceptMatch`; `ThinkingMatchedTerm` y `terminosCoincidentes` marcados `@deprecated`
- **`src/thinking/algorithms/ConceptualThinkingAlgorithm.ts`** — nuevo algoritmo primario; diminishing returns por concepto, diversity bonus, legacy path para `keywords[]`
- **`src/thinking/algorithms/KeywordThinkingAlgorithm.ts`** — interfaz actualizada, marcado `@deprecated`
- **`src/thinking/ThinkingRouter.ts`** — usa `ConceptualThinkingAlgorithm`
- **`src/thinking/ExplanationService.ts`** — `dimensionesDetectadas` = nombres conceptuales
- **`content/thinking/sistemico/metadata.json`** → v0.2.0 — 6 conceptos
- **`content/thinking/socratico/metadata.json`** → v0.2.0 — 6 conceptos
- **`src/thinking/__tests__/smoke.ts`** → v0.5.0 — 37 casos, 37/37 ✅

---

## S-010 (2026-07-17) — ExplanationService

- `buildExplicacionSeleccion`: `fuentePrincipal`, `dimensionesDetectadas`, `resumen`
- `ThinkingConceptMatch` con campo `surface` para trazabilidad
- `NEUTRAL_TERMS` en constants.ts

---

## S-009 (2026-07-17) — ThinkingEngine v0.3 (Sistémico)

- Patrón Sistémico con scoring por superficie separado
- `esFallback`, `motivoSeleccion` en `ThinkingCandidate`
- 20/20 tests ✅

---

## S-008 (2026-07-17) — Orquestación trazable v0.2

- KnowledgeRouter → ThinkingRouter secuencial
- Cache key `texto::packId`
- `universalFloor` (0.25) para patrones universales

---

## S-007 (2026-07-17) — PantallaPereque integración UI

- UI integra ThinkingEngine con PerequeContainer
- 9/9 smoke tests ✅

---

## S-006 (2026-07-17) — ThinkingEngine v0.1 (Socrático)

- `ThinkingRouter`, `KeywordThinkingAlgorithm`
- Patrón Socrático activo

---

## S-005 / S-005.1 (2026-07-17) — KnowledgeRouter

- Router de conocimiento para Knowledge Packs
- 9/9 smoke tests ✅
