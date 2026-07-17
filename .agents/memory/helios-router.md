---
name: HELIOS Knowledge Router & Thinking Engine
description: Arquitectura de routers de Sprint 0.5–S-010; decisiones de algoritmo, umbrales, caché, explicaciones y flujo de integración
---

## Knowledge Router (Sprint 0.5 / 0.5.1)

- `src/router/` — KnowledgeRouter, KeywordAlgorithm, registry, types, constants
- Registry usa imports estáticos para metadata + lazy loaders para content
- Singleton: `heliosRouter`
- Smoke tests: 9/9 ✅

## Thinking Engine (Sprint 0.6 / S-007 / S-008 / S-009 / S-010)

- `src/thinking/` — ThinkingRouter, KeywordThinkingAlgorithm, registry, types, constants, utils, ExplanationService
- Singleton: `heliosThinkingEngine`
- Producción: [Socrático (universal), Sistémico (específico)]

---

## Scoring Contextual v0.3 (S-009) — FÓRMULA

```
scoreProblema     = scoreSurface(texto, metadata, 'problema')    / (tokens_texto * W.keywordPhrase)
scoreNombrePack   = scoreSurface(packNombre, metadata, 'packNombre') / (tokens_nombre * W.keywordPhrase)
scoreContextoPack = scoreSurface(packContexto, metadata, 'packContexto') / (tokens_ctx * W.keywordPhrase)

finalScore = min(
  scoreProblema     * 1.00 +
  scoreNombrePack   * 0.35 +
  scoreContextoPack * 0.50,
  1.0
)
```

**Why:** En v0.2, la concatenación inflaba el denominador y penalizaba patrones que ganaban por el texto. Superficies independientes garantizan que agregar contexto nunca reduce scoreProblema.

---

## NEUTRAL_TERMS (S-010) — términos neutralizados en fases 4-5

Lista en `constants.ts`. Aplicados SOLO en Phase 4 (titulo) y Phase 5 (descripcion) de `scoreSurface()`. Las fases 1-2 (keywords del autor) no se filtran.

Términos: sector/sectores, problema/problemas, programa/programas, gobierno/gobiernos, publica/publico/publicas/publicos, politica/politicas, analisis, marco, multiple/multiples.

**Why:** Estos tokens aparecen en la descripción de virtually every pattern de análisis de política pública. Sin filtrarlos, matchean débilmente en cualquier consulta genérica → scores espurios que sesgaban la selección (ver deuda detectada en S-009 review).

**How to apply:** Si un nuevo patrón necesita uno de estos términos como señal genuina, sacarlo de NEUTRAL_TERMS y ponerlo como keyword explícita en metadata.json.

---

## superficie en ThinkingMatchedTerm (S-010)

Cada `ThinkingMatchedTerm` tiene `superficie: 'problema' | 'packNombre' | 'packContexto'`. Asignado por `scoreSurface()` en el algoritmo. Usado por ExplanationService para calcular `fuentePrincipal`.

Dedup sigue siendo `termino::campo`; primer hit (problema) gana — la proveniencia de la superficie no se sobreescribe por pack.

---

## ExplanationService (S-010) — src/thinking/ExplanationService.ts

`buildExplicacionSeleccion(candidate, input) → ExplicacionSeleccion`

Campos:
- `resumen: string` — 1-2 oraciones para no técnicos. Plantilla por fuentePrincipal.
- `dimensionesDetectadas: string[]` — keyword matches (campo==='keyword'), no neutros, superficie problema primero; pack después; máx 5.
- `fuentePrincipal: 'problema' | 'contexto-pack' | 'mixta' | 'fallback'`

**fuentePrincipal derivation:**
- esFallback → 'fallback'
- motivoSeleccion==='contexto-del-pack' → 'contexto-pack'
- coincidencia-directa + keyword matches de pack surface → 'mixta'
- coincidencia-directa + sólo problema keyword matches → 'problema'

**Contrato:** puro (sin efectos secundarios, sin LLM, sin imports desde React). ThinkingRouter lo llama justo antes de retornar "seleccionado".

**enfoqueBreve:** campo opcional en metadata.json. ExplanationService usa `pattern.metadata.enfoqueBreve ?? 'aplicar el ${titulo}'`. Vive en JSON (ADR-0002).

---

## universalFloor — condición crítica (dos capas)

### Capa 1: ¿se activa el floor?
`s.score < THINKING_THRESHOLDS.baja` (0.20)

### Capa 2: ¿un patrón específico suprime el floor?
`hasSpecificAboveThreshold = any(esUniversal=false && score >= baja (0.20))`

**Why (S-009):** Umbral en baja (no ninguna) porque tokens genéricos de descripción (score ~0.07) nunca deben suprimir el fallback. Con NEUTRAL_TERMS (S-010) el problema se redujo, pero el umbral en baja es belt-and-suspenders.

---

## esFallback y motivoSeleccion

- `esFallback: boolean` — true ← floor fue aplicado; NO inferir comparando score === universalFloor
- `motivoSeleccion: 'coincidencia-directa' | 'contexto-del-pack' | 'fallback-universal'`

---

## Clave de caché

`normalizeText(texto + "::" + (packId ?? "ninguno"))`

---

## extractContextSummary (S-009)

`src/thinking/utils.ts`. Reemplaza `.slice(0, 300)` ad-hoc en Helios.tsx. `CONTEXT_SUMMARY_CHARS = 300` en constants.ts.

---

## ThinkingRouterInput (S-008)

```typescript
{ texto, packId?, packNombre?, packContextoResumido? }
```

---

## Patrones en producción

| id | esUniversal | cuandoGana |
|----|-------------|-----------|
| socratico | true | Siempre que ningún específico alcance baja (0.20). Floor a 0.25. |
| sistemico | false | Keywords de sistema, interdependencia, retroalimentación, etc. |

---

## ThinkingResult — forma con explicación (S-010)

```typescript
{
  decision: 'seleccionado',
  seleccionado: ThinkingCandidate,
  candidatos: ThinkingCandidate[],
  explicacionSeleccion: ExplicacionSeleccion   ← NEW en S-010
}
```

Solo el variant 'seleccionado' tiene explicacionSeleccion.

---

## Flujo de integración en Helios.tsx (S-008 / S-009 / S-010)

**Orden estricto:** KnowledgeRouter → ThinkingRouter (enriquecido con pack)

**Estado en Helios:**
- `thinkingResult: ThinkingResult | null` — resultado completo
- `pantallaVolverDesdePereque: Pantalla`
- `PantallaEntrada` acepta `initialValue?: string`

**PantallaPereque props (S-010):**
- `explicacion: ExplicacionSeleccion | null` — pasada desde `thinkingResult.explicacionSeleccion`
- Sección "¿Por qué este patrón?" — entre badge y accordion de preguntas
  - Fondo amber-50/40, borde, resumen en texto sm
  - Pills de dimensionesDetectadas (accent/10, sólo si dims.length > 0)

**categoriaStyle:** Socrático (clarificacion, supuestos, evidencia, perspectivas, implicaciones) + Sistémico (elementos, relaciones, retroalimentacion, efectos, dinamica).

---

## ADRs en vigor

- ADR-0001: HELIOS no es chatbot (flujo forward)
- ADR-0002: Conocimiento no vive en código (JSON externos; enfoqueBreve en metadata.json)
- ADR-0003: Packs composables y no exclusivos
- ADR-0004: Razonamiento precede a metodología (TR corre antes de hipótesis)
- ADR-S-010: NEUTRAL_TERMS — lista centralizada > reducción de peso (explícita, auditable)

## Smoke tests

- Knowledge Router: 9/9 ✅
- Thinking Engine v0.4 (S-010): 25/25 ✅ + 6 verificaciones auxiliares
