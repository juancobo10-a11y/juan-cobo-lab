# Technical Hardening — S-016

**Sprint:** S-016  
**Date:** 2026-07-17  
**Scope:** Tooling, scripts, build reproducibility, state correctness. No functional changes.

---

## 1. Diagnóstico inicial

### 1.1 Causa del problema de aliases

**No existía un problema real de aliases en los tests.** El resumen de sesión anterior asumía erróneamente que `tsx` no podía resolver los imports `@/` usados en los tests. En realidad, todos los archivos de validación (`validacion_s012.ts` a `validacion_s015.ts`, `smoke.ts`) usan **imports relativos** desde sus ubicaciones en `src/thinking/__tests__/` o `src/hypothesis/__tests__/`. Los aliases `@/` se usan únicamente en el código productivo (Vite los resuelve en tiempo de compilación) y nunca en los scripts de validación.

El error reportado en los sprints anteriores fue causado por **rutas incorrectas** en los comandos del runner (se pasaba `src/hypothesis/__tests__/validacion_s012.ts` cuando el archivo correcto estaba en `src/thinking/__tests__/validacion_s012.ts`).

**Suites afectadas:** s012, s013, s014 y `smoke.ts` — todas funcionaban correctamente al invocarse con la ruta correcta.

**Solución implementada:** Scripts individuales con las rutas correctas en `package.json`. No se modificaron imports ni configuración de aliases.

### 1.2 Causa de la dependencia de PORT en el build

`vite.config.ts` tenía estas comprobaciones al inicio del módulo:

```typescript
const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}
const basePath = process.env.BASE_PATH;
if (!basePath) {
  throw new Error('BASE_PATH environment variable is required but was not provided.');
}
```

Vite carga `vite.config.ts` **antes de compilar** tanto en `vite dev` como en `vite build`. Cuando la variable no está definida (entorno limpio, CI, `npm run build` directo), el proceso fallaba con excepción antes de iniciar la compilación.

En producción (`artifact.toml [services.env]`), `PORT=18800` y `BASE_PATH="/"` se inyectan automáticamente. En el entorno de desarrollo local con el workflow activo, también están presentes. Pero cualquier ejecución directa (`npm run build`, `pnpm run validate`) fuera del workflow fallaba.

---

## 2. Soluciones implementadas

### 2.1 Resolución de aliases

No fue necesario cambiar ninguna configuración de módulos. Se añadieron scripts explícitos en `package.json` con las rutas correctas:

```json
"validate:s012": "tsx src/thinking/__tests__/validacion_s012.ts",
"validate:s013": "tsx src/thinking/__tests__/validacion_s013.ts",
"validate:s014": "tsx src/thinking/__tests__/validacion_s014.ts",
"validate:s015": "tsx src/hypothesis/__tests__/validacion_s015.ts",
"validate:s016": "tsx src/hypothesis/__tests__/validacion_s016.ts",
"validate:smoke": "tsx src/thinking/__tests__/smoke.ts",
"validate:integration": "tsx src/thinking/__tests__/integration_flow.ts"
```

**Origen de verdad único para aliases:** El archivo `tsconfig.json` contiene la única definición de `"@/*": ["./src/*"]`. Vite lee esta configuración en `vite.config.ts`. Los tests no usan aliases — usan imports relativos dentro de sus propios paquetes de módulos.

### 2.2 Desacoplamiento del build de PORT

`vite.config.ts` fue modificado para usar fallbacks seguros:

```typescript
// S-016: PORT y BASE_PATH son opcionales — defaults seguros permiten
// que `vite build` funcione sin env vars pre-configuradas.
const rawPort = process.env.PORT;
const port = (() => {
  if (!rawPort || !rawPort.trim()) return 5000;
  const n = Number(rawPort.trim());
  return Number.isFinite(n) && n > 0 && n <= 65535 ? Math.floor(n) : 5000;
})();
const basePath = process.env.BASE_PATH ?? '/';
```

Se creó además `src/config/portConfig.ts` con las funciones puras `resolvePort()` y `resolveBasePath()` que pueden ser probadas de forma aislada (TC-05 a TC-08 en `validacion_s016.ts`).

La lógica de `server` y `preview` en Vite usa `port` como antes. El build en sí no escucha en ningún puerto — el campo `server.port` solo afecta al modo dev.

**Comportamiento con PORT ausente:** `port = 5000` (fallback). El build produce el mismo artefacto.

**Comportamiento con PORT=5050:** `port = 5050`. El servidor dev/preview usa ese puerto.

**Comportamiento con PORT inválido (non-numeric):** `port = 5000` (fallback documentado, sin excepción).

---

## 3. Correcciones de estado obsoleto (§10)

Se implementaron tres reglas de estado que el spec S-016 requería:

### Regla 1: Edición invalida revisión (TC-10)
`handleUpdateHypotheses` en `Helios.tsx` ahora siempre llama `setHypothesesReviewed(false)` cuando la lista de hipótesis cambia. Cualquier adición, eliminación, edición, o movimiento de hipótesis invalida el estado de revisión confirmada.

### Regla 2: Eliminación de principal limpia `primaryHypothesisId` (TC-11)
`handleUpdateHypotheses` actualiza `primaryHypothesisId` usando la forma funcional del setter: si el ID referenciado ya no existe en la lista actualizada, se limpia a `undefined`.

### Regla 3: Cambio de patrón marca desalineación (TC-14)
`handleUserSelectPattern` en `Helios.tsx` ahora llama `markPatternChanged(prev)` sobre las hipótesis existentes cuando el analista cambia la selección de Thinking Pattern. Las hipótesis no se eliminan — se marcan con `patternChangedWarning: true` para alertar al analista.

Nota: `markPatternChanged` ya existía en `HypothesisBuilderService.ts` (implementado en S-015) pero nunca se invocaba. S-016 conecta la llamada.

---

## 4. Comandos disponibles

```bash
# Validación completa (secuencial, resumen al final)
pnpm run validate

# Suites individuales
pnpm run validate:s012          # S-012 — Tres baterías ThinkingRouter
pnpm run validate:s013          # S-013 — Economía Política
pnpm run validate:s014          # S-014 — SelectionService
pnpm run validate:s015          # S-015 — HypothesisBuilderService
pnpm run validate:s016          # S-016 — Hardening técnico
pnpm run validate:smoke         # Smoke 37 casos
pnpm run validate:integration   # Flujo integrado Cases A-F

# Build sin PORT
pnpm run build                  # PORT y BASE_PATH son opcionales

# TypeCheck
pnpm run typecheck
```

---

## 5. Suites incluidas en `validate`

| Suite | Archivo | Casos |
|---|---|---|
| Typecheck | tsconfig.json | tsc --noEmit |
| S-012 | src/thinking/__tests__/validacion_s012.ts | 50 (49 pass + B14 doc.) |
| S-013 | src/thinking/__tests__/validacion_s013.ts | 24/24 |
| S-014 | src/thinking/__tests__/validacion_s014.ts | 50/50 |
| S-015 | src/hypothesis/__tests__/validacion_s015.ts | 18/18 |
| S-016 | src/hypothesis/__tests__/validacion_s016.ts | 15/15 |
| Smoke | src/thinking/__tests__/smoke.ts | 37/37 |
| Integration | src/thinking/__tests__/integration_flow.ts | 29/29 |
| Build | vite build | artefacto dist/ |

**Comportamiento de fallos:** el runner continúa en todos los casos para obtener el diagnóstico completo. Devuelve exit code 1 si cualquier suite falla.

---

## 6. Prueba desde entorno limpio

El entorno Replit no permite borrar `node_modules` de forma segura. La prueba más cercana realizada:

```bash
# Sin variables de entorno (PORT y BASE_PATH ausentes):
unset PORT && unset BASE_PATH && cd artifacts/juan-cobo-lab && pnpm run build
# → Compilación exitosa; usa port=5000 y basePath="/" como defaults.

# Con PORT explícito:
PORT=5050 pnpm run build
# → Compilación exitosa; usa port=5050.
```

La cadena `tsx scripts/validate-all.ts` puede ejecutarse sin PORT desde cualquier terminal — no levanta servidor.

**Restricción documentada:** el entorno Replit gestiona `node_modules` a nivel del workspace compartido (`pnpm store`). No es posible ejecutar `rm -rf node_modules && npm ci` de forma aislada sin afectar a otros artefactos. Las dependencias están todas declaradas en `package.json` y en el `pnpm-workspace.yaml` catalog.

---

## 7. Resultados finales

```
HELIOS — Validation Suite  (S-016)
────────────────────────────────────────────
  Typecheck       PASS
  S-012           PASS   ← B14 documentado, no bloquea exit code
  S-013           PASS
  S-014           PASS
  S-015           PASS
  S-016           PASS
  Smoke           PASS
  Integration     PASS
  Build           PASS

  Result: 9/9 suites passed
```

TypeCheck: 0 errores.

---

## 8. Errores y warnings en consola

Se verificó el workflow de dev activo. No hay:
- Errores React
- Warnings de keys duplicadas
- HTML inválido (corregido en S-015: `PreguntaItem` restructurado)
- Excepciones no controladas
- Imports fallidos

---

## 9. Limitaciones restantes

- **B14 (S-012):** El caso `"La congestión vial genera contaminación..."` sigue seleccionando `socratico` (fallback) en lugar de `sistemico`. Esto es una limitación conocida del algoritmo conceptual — ningún concepto sistémico activa con ese texto en el corpus actual. La suite reporta el caso pero no falla con exit code 1 (comportamiento heredado de S-012, no alterado en S-016).

- **Clean install:** Prueba completa de `rm -rf node_modules && npm ci` no disponible en el entorno Replit por arquitectura del workspace compartido.

- **`port` en `vite.config.ts` en producción:** En producción (deploy), `PORT` siempre se inyecta via `[services.env]`, por lo que el fallback a 5000 nunca se activa en ese contexto.

---

## 10. Decisiones arquitectónicas (no ADR — decisiones operativas)

- **Puerto por defecto:** 5000 (rango seguro, no privilegiado).
- **BASE_PATH por defecto:** `"/"` (Vite build sin prefix — compatible con despliegue en raíz).
- **Runner continúa en fallos:** se eligió continuar todas las suites para diagnóstico completo (vs. bail-on-first-fail).
- **portConfig.ts separado:** módulo puro para facilitar testing aislado. No se importa en `vite.config.ts` para mantener la config de Vite sin dependencias en `src/`.
- **No se creó ADR:** todas las decisiones son operativas (tooling, fallbacks). No afectan comportamiento metodológico.

---

## 11. ¿Está HELIOS listo para continuar con variables e indicadores?

**Sí.** La cadena funcional completa está probada de forma reproducible:

- KnowledgeRouter → ThinkingEngine → multi-candidate selection → pereque con reflexión → HypothesisBuilder → revisión de hipótesis
- Todas las suites pasan con exit codes correctos
- Build reproducible sin PORT
- Estado obsoleto corregido (edición invalida revisión, eliminación limpia primary, cambio de patrón marca desalineación)
- TypeCheck limpio (0 errores)
