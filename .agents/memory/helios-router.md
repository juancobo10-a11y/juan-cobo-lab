---
name: HELIOS Knowledge Router
description: Arquitectura, decisiones de diseño y umbrales del Knowledge Router (Sprint 0.5) para HELIOS en Juan Cobo Lab
---

## Contexto

HELIOS es un copiloto editorial de análisis de política pública en `artifacts/juan-cobo-lab/src/pages/Helios.tsx`, ruta `/helios`. El contenido vive en `content/<pack>/` como archivos JSON.

## Estructura del Router

```
src/router/
  types.ts                    ← contratos públicos (no modificar sin revisar todos los consumidores)
  KnowledgeRouter.ts          ← instancia configurable; exporta singleton `heliosRouter`
  registry.ts                 ← lista explícita de packs; añadir pack = 1 entrada aquí
  algorithms/
    KeywordAlgorithm.ts       ← v1 determinista
    __tests__/smoke.ts        ← 5 casos de aceptación; correr con `pnpm exec tsx src/router/__tests__/smoke.ts`
```

## Umbrales de KnowledgeRouter

| Parámetro | Valor | Significado |
|---|---|---|
| `THRESHOLD.ninguna` | 0.05 | Mínimo para ser candidato |
| `THRESHOLD.baja` | 0.20 | Por debajo → pedir confirmación al usuario |
| `THRESHOLD.alta` | 0.42 | Alta confianza → auto-seleccionar |
| `THRESHOLD.tieDelta` | 0.09 | Diferencia entre top-2 que define empate |

**Why:** Calibrados para que "brecha digital" → TIC (0.955), "deserción escolar" → Educación (0.773), "habilidades digitales" → TIC (0.409, media pero auto-select), "mortalidad materna" → ninguno (0.0), "conectividad en escuelas" → empate (0.242/0.182).

## Pesos del algoritmo (KeywordAlgorithm)

- Frase multi-palabra en keywords: **0.55**
- Token único en keywords: **0.30**
- Coincidencia en campo `tema`: **0.20**
- Token en `titulo`: **0.15**
- Token en `descripcion`: **0.10**

**Why:** Las frases deben dominar sobre tokens individuales. La deduplicación evita que "brecha digital" (frase) sume también "digital" (token).

Normalización: `raw_score / (inputTokenCount × 0.55)`, clamped a [0,1].

## Packs registrados

| Pack | Carpeta | Keywords clave |
|---|---|---|
| TIC | `content/tic/` | "brecha digital", "habilidades digitales", "conectividad" |
| Educación | `content/educacion/` | "deserción escolar", "abandono escolar", "escuela" |

## Cómo añadir un nuevo Pack

1. Crear `content/<slug>/` con: `metadata.json` (incluir campo `keywords`), `contexto.json`, `hipotesis.json`, `pestel.json`, `chips.json`
2. Agregar una entrada a `src/router/registry.ts` — **único archivo a modificar**
3. Helios.tsx y KnowledgeRouter.ts no necesitan cambios

## Cómo reemplazar el algoritmo (futuro)

Implementar `RoutingAlgorithm` de `types.ts` y pasarlo al constructor:
```typescript
const router = new KnowledgeRouter(new EmbeddingAlgorithm(...));
```

## Build

El build requiere `PORT` y `BASE_PATH` como env vars:
```
PORT=3000 BASE_PATH=/juan-cobo-lab pnpm run build
```
En el workflow de Replit estas variables las inyecta el runtime automáticamente.

## Estado del repositorio

Sprint 0.5 mergeado a `main` (commit `e244daa`). Push exitoso a GitHub.
