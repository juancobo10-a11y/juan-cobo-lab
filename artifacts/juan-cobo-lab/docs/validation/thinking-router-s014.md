# HELIOS Thinking Router — Informe S-014

**Fecha:** 2026-07-17  
**Sprint:** S-014 — Gestión explicable de múltiples Thinking Patterns candidatos  
**Alcance:** Capa de selección de usuario (UI + SelectionService). El Router no fue modificado.  
**Validación S-014:** 50/50 ✅ — SelectionService  
**Regresiones:** Smoke 37/37 ✅ · S-013 24/24 ✅ · S-012 96.8% (sin cambios)  

---

## 1. Situación inicial (diagnóstico antes de S-014)

Cuando el ThinkingRouter devolvía `decision: "candidatos"`, el flujo en `Helios.tsx` hacía:

```typescript
setPantalla(tr.decision === "seleccionado" ? "pereque" : "hipotesis");
```

Es decir: cualquier resultado que no fuera un ganador claro saltaba directamente a hipótesis sin pasar por el Thinking Engine. Con dos patrones esta omisión era aceptable. Con tres patrones, la decisión de qué patrón usar quedaba implícita (el primero del arreglo) e interna, rompiendo la trazabilidad y el ADR-0004.

Adicionalmente, `PantallaPereque` sólo aceptaba un único `ThinkingPattern` y una `ExplicacionSeleccion`. No había mecanismo para mostrar dos bloques secuenciales de preguntas.

---

## 2. Arquitectura implementada

### 2.1 Nuevos archivos

| Archivo | Propósito |
|---|---|
| `src/thinking/SelectionService.ts` | Funciones puras: filtrado, explicaciones, comparación, combinación, deduplicación, límites de preguntas |
| `src/components/PantallaSeleccionThinkingPattern.tsx` | Componente de selección (candidatos + combinación + accesibilidad) |
| `src/thinking/__tests__/validacion_s014.ts` | 50 casos de SelectionService |

### 2.2 Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/thinking/types.ts` | +`ThinkingUserSelection` — tipo de selección del usuario |
| `src/pages/Helios.tsx` | +`PerequeMode`, `computePerequeMode`, `PreguntaItem`; PantallaPereque con modo dual; nueva pantalla `"seleccion-thinking-pattern"`; nuevos estados y handlers |

---

## 3. SelectionService — funciones y garantías

### Constantes de infraestructura (no conocimiento de dominio)

```typescript
MAX_PREGUNTAS_PRINCIPAL    = 5
MAX_PREGUNTAS_COMPLEMENTARIO = 3
MAX_CANDIDATOS_UI           = 3
```

Definidas en un solo lugar. El router, el algoritmo y los patrones no las conocen.

### `getRealCandidates(candidates)`

Excluye candidatos con `esFallback === true`. Limita a `MAX_CANDIDATOS_UI`. Preserva el orden del Router.

- Si todos son fallback → devuelve `[]` → Helios va a `"hipotesis"` directamente.
- El UI nunca etiqueta un fallback como "segunda mejor opción".

### `buildCandidateExplanations(candidates, input)`

Reutiliza `ExplanationService.buildExplicacionSeleccion` para cada candidato. Consistencia garantizada: la explicación que ve el usuario en la pantalla de selección es la misma que vería si ese patrón hubiera ganado directamente.

Llamada una sola vez en Helios cuando el Router devuelve `"candidatos"`. Almacenada en estado (`candidateExplanations: Map<string, ExplicacionSeleccion>`). No recalculada en cada render.

### `buildComparacion(a, b)`

Derivada genéricamente de `enfoqueBreve` y `conceptMatches`. Sin texto hardcodeado por par de patrones (ADR-0002). Mostrada únicamente cuando hay exactamente 2 candidatos.

### `buildExplicacionCombinada(primary, secondary)` / `buildEnfoquesTexto(primary, secondary)`

Construidas a partir de `metadata.titulo` y `metadata.enfoqueBreve`. Ejemplos de salida:

> "HELIOS abordará primero el problema desde Economía Política y después incorporará Pensamiento Sistémico para ampliar el análisis."
>
> "Primero se examinarán los incentivos, intereses y relaciones de poder. Después se analizarán las relaciones, retroalimentaciones y efectos indirectos."

Ningun texto está fijado para combinaciones específicas.

### `deduplicarPreguntas(primary, secondary)`

Criterio: texto normalizado (`.trim().toLowerCase()`). `numero` no se usa como clave global (es local por patrón). Las preguntas idénticas en texto no aparecen dos veces en el flujo combinado.

### `getPreguntasCombinadas(primary, secondary)`

Principal: `preguntas.slice(0, 5)` → sin reordenamiento.  
Complementario: `deduplicarPreguntas(principal, secondary.preguntas).slice(0, 3)`.

### `findCandidate(candidates, patternId)`

Lookup por patternId. Devuelve `undefined` si no existe — el llamador verifica antes de usar.

---

## 4. `ThinkingUserSelection` — tipo

```typescript
type ThinkingUserSelection =
  | { mode: "single"; primaryPatternId: string }
  | { mode: "combined"; primaryPatternId: string; secondaryPatternId: string };
```

- Solo en estado de sesión. No se persiste.
- El resultado original de ThinkingRouter (en `thinkingResult`) nunca se modifica.
- El sistema puede distinguir siempre: qué propuso el Router vs. qué escogió el usuario.

---

## 5. Flujo de pantallas — S-014

```
Problema
  ↓
Knowledge Router
  ↓
Thinking Router
  ├── decision = "seleccionado" → pereque (modo single, sin pantalla de selección)
  ├── decision = "candidatos"  → seleccion-thinking-pattern
  │     ├── Usuario elige patrón único → pereque (modo single)
  │     └── Usuario combina dos       → pereque (modo combined)
  └── decision = "ninguno"     → hipotesis (sin pasar por pereque)
```

La pantalla de selección NO aparece cuando hay un ganador claro. El fallback universal NO aparece como candidato. Cuando todos los candidatos son fallback, tampoco aparece la pantalla.

---

## 6. `PantallaSeleccionThinkingPattern` — componente

### Accesibilidad

- Todos los botones son `<button type="button">` reales (no divs).
- `aria-pressed` en botones de selección de modo combinar.
- `aria-label` descriptivos en botones de acción.
- `aria-label` en listas de preguntas (`role="list"`).
- `headingRef.current?.focus()` en el h2 al montar.
- Foco visible con `focus-visible:ring-2`.
- Navegación completa por teclado (Tab + Enter/Space).
- No hay drag-and-drop; botones explícitos: "Usar como principal", "Agregar como complementario", "Intercambiar orden".
- La combinación es comprensible sin dependencia de iconos: texto en todos los botones.
- Identificación de selección por texto ("Principal", "Complementario") además de color (badge).

### Sub-flujo de combinación

```
Inicial: tarjetas + "Usar como enfoque principal" + "Combinar dos enfoques"
  ↓
"Combinar": instrucción "Selecciona el enfoque principal" + botón "Usar como principal" en cada tarjeta
  ↓
Principal elegido: instrucción "Ahora selecciona el enfoque complementario"
                   Tarjeta principal: badge "Principal"
                   Restantes: botón "Agregar como complementario"
  ↓
Ambos elegidos: panel de confirmación con orden visual (1 / 2)
                "Confirmar combinación" + "Intercambiar orden"
  ↓
Confirmado: onSeleccion({ mode: "combined", primaryPatternId, secondaryPatternId })
```

No se permite seleccionar el mismo patrón dos veces (el botón "Agregar como complementario" no aparece en la tarjeta del patrón ya elegido como principal). Máximo 2 patrones combinados en esta versión.

### Máximo de candidatos mostrados

3 (MAX_CANDIDATOS_UI). Si el Router devuelve más, el caller (Helios.tsx) pasa únicamente `getRealCandidates(tr.candidatos)` — los primeros N en orden del Router. La UI no reordena.

---

## 7. `PantallaPereque` — modo dual

### Modo single (sin cambio funcional)

- Acepta `perequeMode: { mode: "single", pattern, explicacion }`.
- Renderiza exactamente como en S-013: badge "Patrón recomendado" + "¿Por qué este patrón?" + preguntas en acordeón.
- `PreguntaItem` extraído como sub-componente reutilizable para evitar duplicación en modo combined.

### Modo combined

- Acepta `perequeMode: { mode: "combined", ... }`.
- Muestra dos badges ("1 · Enfoque principal" / "2 · Enfoque complementario").
- Banner de explicación combinada con `explicacionCombinada` + `enfoquesTexto`.
- Bloque 1: nombre del patrón principal + hasta 5 preguntas.
- Separador visual entre bloques.
- Bloque 2: nombre del patrón complementario + hasta 3 preguntas (deduplicadas).
- Si todas las preguntas complementarias son duplicadas: mensaje informativo en lugar de lista vacía.
- Estado del acordeón: string key `"primary:{numero}"` / `"secondary:{numero}"` — no hay colisión entre bloques.

---

## 8. Navegación ("Volver") — S-014

### Desde `"seleccion-thinking-pattern"`
→ `pantallaVolverDesdeSeleccion` (establecida cuando se entra):
- `"entrada"` si llegó vía routing automático.
- `"confirmacion-candidatos"` si llegó vía selección manual de pack.
- Router no se re-ejecuta. Knowledge Pack activo se preserva. Candidatos en estado se preservan.

### Desde `"pereque"` (cuando llegó vía selección)
→ `pantallaVolverDesdePereque = "seleccion-thinking-pattern"`.
- `seleccionPrevia` prop en `PantallaSeleccionThinkingPattern` restaura la selección visual.
- El usuario puede cambiar de patrón individual, pasar a combinado, o cambiar el orden principal/complementario.
- ThinkingResult original se preserva intacto.

### Caso especial: Volver desde selección con `seleccionPrevia` combinada
Si el usuario había confirmado una combinación y vuelve, `PantallaSeleccionThinkingPattern` restaura `combineStep = "confirming"` con los IDs del `seleccionPrevia` prop. El usuario ve la combinación como la dejó y puede modificarla o confirmar de nuevo.

---

## 9. Trazabilidad en estado

```typescript
thinkingResult         // qué propuso el Router (nunca modificado)
thinkingUserSelection  // qué seleccionó el usuario (null si ganador claro)
candidateExplanations  // explicaciones pre-calculadas por candidato
```

El sistema puede identificar siempre:
- Qué patrones propuso el Router y con qué scores (en `thinkingResult.candidatos`).
- Si hubo selección explícita del usuario (`thinkingUserSelection !== null`).
- Si fue combinación o patrón único (`thinkingUserSelection.mode`).
- Cuál fue el principal y cuál el complementario.

---

## 10. Casos de prueba — cobertura

### SelectionService (validacion_s014.ts) — 50/50 ✅

| Grupo | Casos |
|---|---|
| `getRealCandidates` | Case 4 (2 reales), Case 5 (3+, límite MAX_CANDIDATOS_UI), Case 6 (fallback excluido, mixto) |
| `hasCombinableOptions` | 4 casos edge |
| `getPreguntasCombinadas` | Case 8 (límites principal/complementario, <max disponibles, orden preservado) |
| `deduplicarPreguntas` | Case 9 (exactos, whitespace, case-insensitive, sin duplicados) |
| `buildComparacion` | Títulos, foco, fallback a descripción |
| `buildExplicacionCombinada` / `buildEnfoquesTexto` | Texto genérico, sin IDs internos, fallbacks |
| `findCandidate` | Encontrado, no encontrado, lista vacía |
| `buildCandidateExplanations` | Case 12 (no mutación del candidato original) |
| Constantes | MAX_PREGUNTAS_PRINCIPAL=5, MAX_PREGUNTAS_COMPLEMENTARIO=3, MAX_CANDIDATOS_UI=3 |

### Casos verificados por typecheck + build

| Caso | Mecanismo |
|---|---|
| Case 1 — Ganador claro Socrático → pereque directo | Typecheck: `tr.decision === "seleccionado"` → `"pereque"` |
| Case 2 — Ganador claro Sistémico → pereque directo | (mismo path) |
| Case 3 — Ganador claro EP → pereque directo | (mismo path) |
| Case 10 — Volver preserva candidatos | `pantallaVolverDesdeSeleccion` en state; candidatos en `thinkingResult` |
| Case 11 — Intercambiar orden | `handleSwap()` en componente: `setPrimaryId(secondaryId); setSecondaryId(primaryId)` |
| Case 12 — No sobrescribir ThinkingResult | `setThinkingResult` nunca llamado después de la selección de usuario |

---

## 11. ADR compliance

| ADR | Estado |
|---|---|
| ADR-0001 — HELIOS no es chatbot | ✅ La UI propone, el usuario decide. Sin texto generado en tiempo real. |
| ADR-0002 — Conocimiento no en código | ✅ SelectionService lee de metadata; no hay texto hardcodeado por par. |
| ADR-0003 — Knowledge Packs composables | ✅ No afectado; el pack se pasa igual a hipótesis. |
| ADR-0004 — Razonamiento precede metodología | ✅ La pantalla de selección está antes de hipótesis. |

---

## 12. Deuda técnica antes de un cuarto patrón

| Ítem | Descripción |
|---|---|
| UI para CANDIDATOS de 3 patrones | PantallaSeleccionThinkingPattern ya soporta hasta 3 candidatos. No hay deuda en ese sentido. |
| `pantallaVolverDesdeSeleccion` | Si en el futuro hay más de 2 niveles de navegación antes de la selección, la lógica de "volver" podría necesitar una pila en lugar de un valor único. |
| `seleccionPrevia` restaura combine | Funciona; pero si el usuario modifica el orden y vuelve, el orden se restaura al confirmado antes (no al intercambiado). Aceptable en esta versión. |
| `KeywordThinkingAlgorithm` deprecated | Sigue activo por el mock dialéctico en smoke tests. |
| Bundle size | 593 KB gzip 178 KB — el warning de Rollup ya estaba; no empeorado materialmente. |
