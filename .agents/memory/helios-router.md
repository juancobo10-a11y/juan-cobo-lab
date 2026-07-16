---
name: HELIOS Knowledge Router
description: Arquitectura, decisiones de diseño y umbrales del Knowledge Router (Sprint 0.5 y 0.5.1) para HELIOS en Juan Cobo Lab
---

## Contexto

HELIOS es un copiloto editorial de análisis de política pública en `artifacts/juan-cobo-lab/src/pages/Helios.tsx`, ruta `/helios`. El contenido vive en `content/<pack>/` como archivos JSON.

## Estructura del Router

```
src/router/
  types.ts                    ← contratos públicos (no modificar sin revisar todos los consumidores)
  constants.ts                ← ROUTER_THRESHOLDS — fuente única; importar aquí, no duplicar
  utils.ts                    ← normalizeText() compartida entre KeywordAlgorithm y KnowledgeRouter
  KnowledgeRouter.ts          ← clase configurable; acepta algoritmo + registry inyectables
  registry.ts                 ← lista explícita de packs; añadir pack = 1 entrada aquí
  algorithms/
    KeywordAlgorithm.ts       ← v1 determinista (async, lógica síncrona internamente)
  __tests__/
    smoke.ts                  ← 9 criterios de aceptación; ejecutar con:
                                 pnpm exec tsx src/router/__tests__/smoke.ts
```

## Umbrales de KnowledgeRouter (en constants.ts)

| Parámetro | Valor | Significado |
|---|---|---|
| `ninguna` | 0.05 | Mínimo para ser candidato |
| `baja` | 0.20 | Por debajo → pedir confirmación al usuario |
| `alta` | 0.42 | Alta confianza → auto-seleccionar |
| `tieDelta` | 0.09 | Diferencia entre top-2 que define empate |

## Pesos del algoritmo (KeywordAlgorithm)

- Frase multi-palabra en keywords: **0.55**
- Token único en keywords: **0.30**
- Coincidencia en campo `tema`: **0.20**
- Token en `titulo`: **0.15**
- Token en `descripcion`: **0.10**

Normalización: `raw_score / (inputTokenCount × 0.55)`, clamped a [0,1].

## Caché del Router

`KnowledgeRouter` tiene un `Map<string, RouterResult>` interno. Clave = `normalizeText(input.texto)`.
`clearCache()` disponible para tests y actualizaciones de packs.

## Registry — Por qué explícito (decisión documentada)

`fs.strict: true` en vite.config.ts impide que `import.meta.glob` cruce el límite del project root (`artifacts/juan-cobo-lab/`) hacia `content/` (en el workspace root). Los imports estáticos sí funcionan porque Rollup los resuelve antes de la restricción.

Path a auto-descubrimiento: mover `content/` dentro de `artifacts/juan-cobo-lab/`.

## Cómo añadir un nuevo Pack

1. Crear `content/<slug>/` con: `metadata.json` (incluir campo `keywords` y todos los campos de provenance), `contexto.json`, `hipotesis.json`, `pestel.json`, `chips.json`
2. Agregar una entrada a `src/router/registry.ts` — **único archivo a modificar**
3. Helios.tsx no necesita cambios (incluyendo `PantallaSinPack`, que lee el registry dinámicamente)

## Cómo reemplazar el algoritmo (futuro — IA semántica)

`RoutingAlgorithm.score()` ya es async. Drop-in sin tocar Router ni Helios:
```typescript
const router = new KnowledgeRouter(new EmbeddingAlgorithm(...));
```

## Tests con registry inyectable (para mocks)

```typescript
const router = new KnowledgeRouter(new KeywordAlgorithm(), mockRegistry);
```

## Build

El build requiere `PORT` y `BASE_PATH` como env vars:
```
PORT=3000 BASE_PATH=/juan-cobo-lab pnpm run build
```

## Thinking Engine (Sprint 0.6)

Infraestructura paralela al Knowledge Router. Vive en `src/thinking/` y `content/thinking/`.
Singleton: `heliosThinkingEngine` exportado desde `ThinkingRouter.ts`.

**Decisión arquitectónica clave — universalFloor:**
Patrones con `esUniversal: true` en metadata reciben score garantizado (`THINKING_THRESHOLDS.universalFloor = 0.25`)
cuando ningún patrón específico supera el umbral mínimo (`ninguna = 0.05`). Así el Socrático actúa como
respaldo universal para cualquier problema de política, sin competir contra patrones específicos que ganen por keywords.

**Cómo agregar un Thinking Pattern:**
1. Crear `content/thinking/<slug>/metadata.json` y `preguntas.json`
2. Añadir una entrada a `src/thinking/registry.ts` — único archivo a modificar
3. `ThinkingRouter.ts` y `Helios.tsx` no requieren cambios

**Patrón Socrático (v0.1):** 5 preguntas — clarificacion, supuestos, evidencia, perspectivas, implicaciones.
Cada pregunta tiene: `pregunta` (con `{{problema}}` placeholder), `proposito`, `orientacion`.

## Estado del repositorio

Sprint 0.5.1: commit `7969f8e`. Sprint 0.6 (Thinking Engine v0.1): commit `8c7320f`. Ambos en `main`.
