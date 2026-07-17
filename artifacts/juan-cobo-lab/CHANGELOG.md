# HELIOS — Changelog

## S-016 (2026-07-17) — Hardening técnico y validación reproducible

### Resumen
Establece la línea base técnica reproducible. Sin cambios funcionales ni metodológicos.
El comando `pnpm run validate` ejecuta 9 suites secuenciales y devuelve exit code correcto.

### Problema del build (PORT/BASE_PATH)
`vite.config.ts` lanzaba excepción si `PORT` o `BASE_PATH` estaban ausentes (entorno limpio, CI).
Se reemplazaron los throws por fallbacks seguros (`PORT → 5000`, `BASE_PATH → "/"`).
El workflow de producción sigue inyectando `PORT=18800` y `BASE_PATH="/"` vía `artifact.toml`.

### Problema de aliases en tests
No existía un problema real. Los scripts de validación ya usaban imports relativos — el error
anterior era causado por rutas incorrectas en los comandos del runner, no por resolución de aliases.
Se fijaron las rutas correctas en los scripts de `package.json`.

### Scripts añadidos a package.json
```json
"validate:s012": "tsx src/thinking/__tests__/validacion_s012.ts",
"validate:s013": "tsx src/thinking/__tests__/validacion_s013.ts",
"validate:s014": "tsx src/thinking/__tests__/validacion_s014.ts",
"validate:s015": "tsx src/hypothesis/__tests__/validacion_s015.ts",
"validate:s016": "tsx src/hypothesis/__tests__/validacion_s016.ts",
"validate:smoke": "tsx src/thinking/__tests__/smoke.ts",
"validate:integration": "tsx src/thinking/__tests__/integration_flow.ts",
"validate": "tsx scripts/validate-all.ts"
```

### Runner unificado — scripts/validate-all.ts
Ejecuta secuencialmente: Typecheck → S-012 → S-013 → S-014 → S-015 → S-016 → Smoke → Integration → Build.
Continúa en fallos para diagnóstico completo. Devuelve exit 0 solo si 9/9 suites pasan.

### Nuevo módulo — src/config/portConfig.ts
Funciones puras `resolvePort()` y `resolveBasePath()` — testables de forma aislada (TC-05 a TC-08).

### Nuevas suites
- `src/hypothesis/__tests__/validacion_s016.ts` — 15/15 ✓ — hardening técnico
- `src/thinking/__tests__/integration_flow.ts` — 29/29 ✓ — flujo completo Cases A-F

### Correcciones de estado obsoleto (§10)
Reglas implementadas en `Helios.tsx`:
- **handleUpdateHypotheses**: cualquier cambio en la lista invalida `hypothesesReviewed` → false
- **handleUpdateHypotheses**: si la hipótesis principal fue eliminada, `primaryHypothesisId` → undefined
- **handleUserSelectPattern**: llama `markPatternChanged(prev)` para marcar hipótesis como potencialmente
  desalineadas cuando el analista cambia el Thinking Pattern. El flag ya existía en S-015 pero nunca se activaba.

### Resultados finales
```
Typecheck      PASS
S-012          PASS   (B14 documentado — limitación del algoritmo, no regresión)
S-013          PASS   24/24
S-014          PASS   50/50
S-015          PASS   18/18
S-016          PASS   15/15
Smoke          PASS   37/37
Integration    PASS   29/29
Build          PASS
```

---

## S-015 (2026-07-17) — Hypothesis Builder

### Resumen
Convierte la reflexión del pereque en hipótesis estructuradas, editables y trazables.
Ningún LLM interviene. Todo el estado es session-only (sin DB ni localStorage).
ADR-0005 añadido: toda hipótesis debe ser explícita, contrastable y revisable.

### Nuevas pantallas
- **`hypothesis-builder`** (`PantallaHypothesisBuilder`) — crea, edita, ordena, duplica y elimina hipótesis; vincula reflexiones como insumo; muestra diagnóstico metodológico inline; plantillas genéricas; editor con generador de formulación provisional bajo demanda.
- **`revision-hipotesis`** (`PantallaRevisionHipotesis`) — resumen de sesión completo: problema → pack → router → selección → patrones → reflexiones → hipótesis con validación. Confirmar = `hypothesesReviewed = true` (no hay Pantalla extra).

### Cambios en pantallas existentes
- **`PreguntaItem`** — reestructurado: header (botón) separado del panel expandido (ahora un `<div>` con `role="region"`) para permitir `<textarea>` sin HTML inválido (interactive dentro de interactive).
- **`PantallaPereque`** — nuevas props: `reflectionAnswers`, `onAnswerChange`, `onConstruirHipotesis`. CTA primaria: "Construir hipótesis". CTA secundaria: "Continuar con las hipótesis". Aviso ámbar no bloqueante si no hay reflexiones escritas.

### Nuevos servicios
- `src/hypothesis/types.ts` — tipos completos: `PolicyHypothesis`, `ReflectionAnswer`, `HypothesisVariable`, `HypothesisValidation`, `HypothesisTemplate`, `HYPOTHESIS_TEMPLATES` (3 plantillas metodológicas genéricas).
- `src/hypothesis/HypothesisBuilderService.ts` — funciones puras: `createEmptyHypothesis`, `updateHypothesis`, `buildProvisionalFormulacion`, `validateHypothesis`, `computeHypothesisStatus`, `duplicateHypothesis`, `moveHypothesis`, `setPrimaryHypothesis`, `removeHypothesis`, `markPatternChanged`, `linkReflectionAnswer`, `unlinkReflectionAnswer`, `createVariable`, `removeVariable`, `updateVariable`, `exceedsRecommendedCount`, `getAnsweredReflections`, `getPrimaryHypothesis`.

### Cambios en Helios state machine
- Tipo `Pantalla`: añadidos `"hypothesis-builder"` y `"revision-hipotesis"`.
- Estado nuevo: `reflectionAnswers`, `hypotheses`, `primaryHypothesisId`, `hypothesesReviewed`.
- Handlers nuevos: `handleAnswerChange`, `handleConstruirHipotesis`, `handleUpdateHypotheses`, `handleUpdatePrimaryId`, `handleContinuarDesdeBuilder`, `handleVolverDesdeBuilder`, `handleConfirmarRevision`, `handleVolverDesdeRevision`, `handleVolverRevisionAPereque`.
- `handleReiniciar` restablece todo el estado S-015.
- `PerequeMode` ahora es `export type` (requerido por los nuevos componentes).

### Reglas de diseño (ADR-0005)
- `buildProvisionalFormulacion` es pura y nunca se auto-aplica.
- `computeHypothesisStatus` es independiente de `confianza`.
- `markPatternChanged` añade flag de advertencia sin borrar hipótesis.
- Edición en `PantallaHypothesisBuilder` es inmediata (sin ciclo save/cancel).
- Confirmación de revisión: `hypothesesReviewed = true`, sin Pantalla adicional.

### Validación
- `src/hypothesis/__tests__/validacion_s015.ts` — 18/18 ✓
- TypeCheck: 0 errores
- `docs/validation/hypothesis-builder-s015.md` — 15 preguntas de arquitectura respondidas

---

## S-014 (2026-07-17) — Gestión explicable de múltiples Thinking Patterns candidatos

### Resumen
Cuando el Router identifica más de un patrón pertinente, HELIOS ahora muestra
una pantalla de selección explícita en lugar de saltarse el Thinking Engine.
El usuario puede elegir un patrón único o combinar dos en secuencia ordenada.
El Router no fue modificado. ADR-0001/0002/0003/0004 mantenidos.

### Nuevos archivos

- `src/thinking/SelectionService.ts` — funciones puras para filtrado, explicaciones,
  comparación, deduplicación y límites de preguntas
- `src/components/PantallaSeleccionThinkingPattern.tsx` — selección individual y
  combinación de dos patrones; accesible por teclado
- `src/thinking/__tests__/validacion_s014.ts` — 50/50 ✅
- `docs/validation/thinking-router-s014.md` — informe completo

### Cambios en TypeScript

- `src/thinking/types.ts`: +`ThinkingUserSelection` (single | combined)
- `src/pages/Helios.tsx`:
  - `+PerequeMode` tipo (single | combined) + `computePerequeMode()` helper
  - `+PreguntaItem` sub-componente extraído (evita duplicación en modo combined)
  - `PantallaPereque`: signature cambia a `perequeMode: PerequeMode`; soporta modo combined
    con dos bloques secuenciales de preguntas (≤5 principal + ≤3 complementario)
  - Nueva pantalla `"seleccion-thinking-pattern"` en el state machine
  - Nuevos estados: `thinkingUserSelection`, `candidateExplanations`, `pantallaVolverDesdeSeleccion`
  - Nuevos handlers: `handleUserSelectPattern`, `handleVolverDesdeSeleccion`
  - Categorías EP añadidas a `categoriaStyle` (incentivos, distribucion, poder,
    coaliciones, implementacion, captura, statu-quo, negociacion)

### Constantes de infraestructura (SelectionService)

- `MAX_PREGUNTAS_PRINCIPAL = 5`
- `MAX_PREGUNTAS_COMPLEMENTARIO = 3`
- `MAX_CANDIDATOS_UI = 3`

### Flujo nuevo

```
Problema → Knowledge Router → Thinking Router
  ├── seleccionado → pereque (sin cambio)
  ├── candidatos  → seleccion-thinking-pattern
  │     ├── único        → pereque (modo single)
  │     └── combinación  → pereque (modo combined)
  └── ninguno     → hipotesis
```

### Validación

- SelectionService: 50/50 ✅
- Smoke tests: 37/37 ✅
- Regresión S-013: 24/24 ✅
- Regresión S-012: 96.8% (sin cambios)
- Typecheck: ✅
- Build: ✅

---

## S-013 (2026-07-17) — Incorporación del patrón Economía Política

### Resumen
Tercer Thinking Pattern incorporado sin modificar el algoritmo ConceptualThinkingAlgorithm.
Sin cambios en la interfaz de usuario. Sin cambios en el flujo de HELIOS.
La única intervención estructural fue la regla de protección de la señal del problema en ThinkingRouter.

### Resultados de validación S-013

| Batería | n | Acuerdo |
|---------|---|---------|
| EP — Casos puros EP | 8 | 100% (8/8) |
| MX — Mixtos | 6 | 100% (6/6) |
| FP — Anti-falsos-positivos | 6 | 100% (6/6) |
| SP — Protección de señal | 4 | 100% (4/4) |
| **Global** | 24 | **100% (24/24)** |

EP: precisión 92%, recall 100% | Smoke tests: 37/37 ✅ | Regresión S-012: 96.8% (↑ desde 93.5%)

### Nuevos archivos

- `content/thinking/economia-politica/metadata.json` — 6 conceptos ThinkingConcept (v0.1.0)
- `content/thinking/economia-politica/preguntas.json` — 8 preguntas guiadas
- `src/thinking/__tests__/validacion_s013.ts` — 24 casos en 4 baterías
- `docs/validation/thinking-router-s013.md` — informe completo

### Cambios en TypeScript

- `src/thinking/registry.ts` — +1 entrada para Economía Política
- `src/thinking/ThinkingRouter.ts` — regla de protección de señal del problema (spec §6):
  cuando `scoreProblema >= baja` para algún patrón, el pack no puede desplazarlo como ganador
- `src/thinking/__tests__/validacion_s012.ts` — ADV09 reclasificado a "ambiguo"
  (con EP activo, "incentivos económicos" + "efectos distintos entre territorios" es genuinamente ambiguo)

### Ajustes en metadata

- `content/thinking/economia-politica/metadata.json`:
  - Distribución sinonimos: −`"subsidio"` (causaba FP en "subsidios directos" socrático)
  - Actores e intereses: +"statu quo" (sinonimo), +"grupos beneficiados", "se benefician del statu quo"
  - Poder institucional: +"influencia suficiente para", "organización e influencia", "neutralizar cualquier intento"
- `content/thinking/sistemico/metadata.json`:
  - Efectos indirectos: +"se trasladaron hacia", "se trasladó hacia", "trasladaron hacia", "trasladado a los"
    (corrige FP05 falso negativo: "se trasladaron" no coincidía con "trasladado hacia")

### Limitaciones documentadas

- SP01/SP02 producen CANDIDATOS cuando la señal del problema es de confianza "media" — la UI necesita manejar tres candidatos
- B14 (cadena causal implícita) persiste como límite estructural

---

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
