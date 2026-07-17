---
name: HELIOS Knowledge Router & Thinking Engine
description: Arquitectura de routers de Sprint 0.5–S-009; decisiones de algoritmo, umbrales, caché y flujo de integración
---

## Knowledge Router (Sprint 0.5 / 0.5.1)

- `src/router/` — KnowledgeRouter, KeywordAlgorithm, registry, types, constants
- Registry usa imports estáticos para metadata + lazy loaders para content
- Singleton: `heliosRouter`
- Smoke tests: 9/9 ✅

## Thinking Engine (Sprint 0.6 / S-007 / S-008 / S-009)

- `src/thinking/` — ThinkingRouter, KeywordThinkingAlgorithm, registry, types, constants, utils
- Singleton: `heliosThinkingEngine`
- Producción: [Socrático (universal), Sistémico (específico)]

---

## Scoring Contextual v0.3 (S-009) — FÓRMULA

```
scoreProblema     = scoreSurface(texto, metadata) / (tokens_texto * W.keywordPhrase)
scoreNombrePack   = scoreSurface(packNombre, metadata) / (tokens_nombre * W.keywordPhrase)
scoreContextoPack = scoreSurface(packContexto, metadata) / (tokens_ctx * W.keywordPhrase)

finalScore = min(
  scoreProblema     * 1.00 +
  scoreNombrePack   * 0.35 +
  scoreContextoPack * 0.50,
  1.0
)
```

**Why:** En v0.2, la concatenación `texto + contexto` inflaba el denominador y penalizaba patrones que ya ganaban por el texto del problema. Con superficies independientes, agregar contexto nunca reduce `scoreProblema` — solo puede sumar.

**ThinkingAlgorithm.score()** retorna: `{ score, scoreProblema, terminosCoincidentes }`

---

## universalFloor — condición crítica (dos capas)

### Capa 1: ¿se activa el floor?
**Condición (S-009):** `s.score < THINKING_THRESHOLDS.baja` (0.20) — igual que S-008.

### Capa 2: ¿un patrón específico suprime el floor?
**Condición (S-009):** `hasSpecificAboveThreshold = any(esUniversal=false && score >= THINKING_THRESHOLDS.baja)` — umbral es `baja` (0.20), no `ninguna` (0.05).

**Why (S-009):** En S-009 se añadió Sistémico (esUniversal=false). Cualquier consulta de política pública matchea débilmente "pública" o "sectores" en la descripción de Sistémico (score ~0.07, por encima de ninguna=0.05 pero por debajo de baja=0.20). Con el umbral anterior (ninguna), este score espurio suprimía el floor de Socrático y devolvía "candidatos-baja" en consultas genéricas. Al subir el umbral a baja (0.20), un patrón específico solo suprime el floor cuando tiene suficiente confianza real.

**How to apply:** Si se añade un nuevo patrón `esUniversal=false`, asegurarse de que sus keywords NO causan scores en [ninguna, baja) para consultas genéricas — esos matches son ruido y suprimirían el fallback incorrecto solo con el umbral anterior (hoy ya están protegidos).

---

## esFallback y motivoSeleccion (S-009)

Campos tipados en `ThinkingCandidate`:

- `esFallback: boolean` — true ← floor fue aplicado; **no inferir comparando score === universalFloor numéricamente**
- `motivoSeleccion: 'coincidencia-directa' | 'contexto-del-pack' | 'fallback-universal'`
  - `'fallback-universal'` → esFallback=true
  - `'coincidencia-directa'` → scoreProblema ≥ ninguna (texto del usuario contiene señal)
  - `'contexto-del-pack'` → scoreProblema < ninguna, pero score compuesto ≥ ninguna por contexto

`flooredIds: Set<string>` — rastreado en ThinkingRouter._route() para asignar esFallback limpiamente.

---

## Clave de caché

`normalizeText(texto + "::" + (packId ?? "ninguno"))`

**Why:** El mismo texto enrutado con distintos packs produce resultados distintos (vocabulario de contexto diferente). La clave por texto-solo daba cache hits incorrectos en el path candidatos.

---

## extractContextSummary (S-009)

`src/thinking/utils.ts` — reemplaza todos los `.slice(0, 300)` ad-hoc en Helios.tsx.

Algoritmo: cortar al límite de oración más cercano (. ? !) dentro del 60-100% de maxChars. Si no hay límite, cortar en último espacio. En último caso, hard-cut.

`CONTEXT_SUMMARY_CHARS = 300` en `constants.ts` — fuente de verdad.

---

## ThinkingRouterInput (S-008)

```typescript
{ texto, packId?, packNombre?, packContextoResumido? }
```

- `packId` → componente de clave de caché
- `packNombre` → scoring superficie 2 (peso 0.35)
- `packContextoResumido` → scoring superficie 3 (peso 0.50), extraído con `extractContextSummary()`

---

## Patrones en producción

| id | esUniversal | cuandoGana |
|----|-------------|-----------|
| socratico | true | Siempre que ningún específico alcance baja (0.20). Floor a 0.25. |
| sistemico | false | Keywords de sistema, interdependencia, retroalimentación, etc. |

**Criterio de distinción Socrático vs Sistémico:**
- Socrático: supuestos, evidencia, diagnóstico, cuestionamiento, perspectivas
- Sistémico: efectos indirectos, consecuencias no intencionadas, actores interdependientes, retroalimentación, ciclo de retroalimentación, interdependencia

**Zona ambigua:** consultas con "actores" (cubre ambos) o "consecuencias" (cubre ambos). El desempate lo gana el que tiene más keywords coincidentes.

---

## Flujo de integración en Helios.tsx (S-008 / S-009)

**Orden estricto:** KnowledgeRouter → ThinkingRouter (enriquecido con pack)

**Estado en Helios:**
- `thinkingResult: ThinkingResult | null` — resultado completo
- `pantallaVolverDesdePereque: Pantalla`
- `PantallaEntrada` acepta `initialValue?: string`

**Volver desde pereque:**
- Path seleccionado → "entrada" con problema pre-llenado
- Path candidatos → "confirmacion-candidatos"
- `handleReiniciar` NO se llama desde Volver

**categoriaStyle en Helios.tsx:** Socrático (clarificacion, supuestos, evidencia, perspectivas, implicaciones) + Sistémico (elementos, relaciones, retroalimentacion, efectos, dinamica). Fallback: "bg-muted/30 text-muted-foreground ring-border".

---

## ADRs en vigor

- ADR-0001: HELIOS no es chatbot (flujo forward)
- ADR-0002: Conocimiento no vive en código (JSON externos)
- ADR-0003: Packs composables y no exclusivos
- ADR-0004: Razonamiento precede a metodología (TR corre antes de hipótesis)

## Smoke tests

- Knowledge Router: 9/9 ✅
- Thinking Engine v0.3 (S-009): 20/20 ✅ + 6 verificaciones auxiliares
