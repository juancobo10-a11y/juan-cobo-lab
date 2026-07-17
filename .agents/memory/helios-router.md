---
name: HELIOS Knowledge Router & Thinking Engine
description: Arquitectura de routers de Sprint 0.5–S-008; decisiones de algoritmo, umbrales, caché y flujo de integración
---

## Knowledge Router (Sprint 0.5 / 0.5.1)

- `src/router/` — KnowledgeRouter, KeywordAlgorithm, registry, types, constants
- Registry usa imports estáticos para metadata + lazy loaders para content (fs.strict:true bloquea import.meta.glob cross-root)
- Singleton: `heliosRouter`
- Smoke tests: 9/9 ✅

## Thinking Engine (Sprint 0.6 / S-007 / S-008)

- `src/thinking/` — ThinkingRouter, KeywordThinkingAlgorithm, registry, types, constants
- Singleton: `heliosThinkingEngine`

### ThinkingRouterInput (S-008)
```typescript
{ texto, packId?, packNombre?, packContextoResumido? }
```
- `contexto?` (S-007) fue reemplazado por los tres campos estructurados
- El algoritmo combina `texto + packNombre + packContextoResumido` como superficie de scoring

### Clave de caché
`normalizeText(texto + "::" + (packId ?? "ninguno"))`

**Why:** el mismo texto del problema enrutado a distintos packs produce resultados distintos (vocabulario de contexto diferente). La clave por texto-solo daba cache hits incorrectos en el path candidatos.

### universalFloor — condición crítica

**Condición actual (S-008):** el floor se aplica cuando `score < THINKING_THRESHOLDS.baja` (0.20), NO cuando `< ninguna` (0.05).

**Why:** enriquecer el input con packNombre+packContextoResumido aumenta `meaningfulCount` (tokenizador), lo que dilata el denominador de normalización. Un patrón universal puede llegar a score=0.10 si matchea algunas keywords del contexto — este score está sobre `ninguna` (0.05) pero bajo `baja` (0.20), así que la condición original `< ninguna` no activaba el floor y devolvía "candidatos-baja". Semánticamente incorrecto para un patrón universal.

**How to apply:** si se añaden nuevos patrones `esUniversal: true`, asegurarse que el test con input enriquecido verifica "seleccionado" (no "candidatos-baja"). Si la condición de floor vuelve a dar problemas, revisar si `meaningfulCount` creció demasiado.

### Smoke tests (v0.2.0 / S-008)
- 15/15 ✅
- Tests 1-6: heredados de S-007, migrados al nuevo ThinkingRouterInput
- Test 7: Pack TIC + input enriquecido → seleccionado:socratico
- Test 8: Pack Educación + input enriquecido → seleccionado:socratico
- Test 9: Selección manual candidatos → seleccionado:socratico
- Test 10: Sin patrón universal → ninguno
- Cache tests A-D: hit por texto::packId, clearCache, caché diferenciada, hit diferenciado
- Test Volver: misma consulta+packId → caché hit (problema preservado)

## Flujo de integración en Helios.tsx (S-008)

**Orden estricto:**
1. `handleSubmitProblema`: KnowledgeRouter → (si seleccionado) ThinkingRouter con pack enriquecido → pereque o hipotesis
2. `handleSeleccionarPack` (path candidatos): async → ThinkingRouter con pack enriquecido → pereque o hipotesis

**Estado en Helios:**
- `thinkingResult: ThinkingResult | null` — resultado completo (score, confianza, motivo, esFallback preservados)
- `pantallaVolverDesdePereque: Pantalla` — "entrada" o "confirmacion-candidatos"
- `PantallaEntrada` acepta `initialValue?: string` para pre-llenar el textarea al volver desde pereque

**Volver desde pereque:**
- Path seleccionado: → "entrada" con `initialValue={problema}` (textarea pre-llenado, sin reiniciar)
- Path candidatos: → "confirmacion-candidatos" (candidatos todavía en estado)
- `handleReiniciar` NO se llama desde pereque — solo desde descubrimiento o sin-pack

## ADRs en vigor
- ADR-0001: HELIOS no es chatbot (flujo forward)
- ADR-0002: Conocimiento no vive en código (JSON externos)
- ADR-0003: Packs composables y no exclusivos
- ADR-0004: Razonamiento precede a metodología (TR corre antes de hipótesis)
