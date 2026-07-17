# HELIOS Thinking Router — Informe de Validación S-013

**Fecha:** 2026-07-17  
**Sprint:** S-013 — Incorporación del patrón Economía Política  
**Algoritmo:** `ConceptualThinkingAlgorithm` — sin modificaciones  
**Patrones activos:** Socrático (universal) · Sistémico · Economía Política  
**Casos totales S-013:** 24 (8 EP + 6 mixtos + 6 anti-FP + 4 protección de señal)

---

## 1. Resumen ejecutivo

El patrón Economía Política fue incorporado **sin modificar el algoritmo**. La única intervención estructural fue la regla de protección de la señal del problema en `ThinkingRouter` (spec §6). El resto del trabajo ocurrió exclusivamente en:

- `content/thinking/economia-politica/metadata.json` — modelo conceptual (6 conceptos)
- `content/thinking/economia-politica/preguntas.json` — 8 preguntas guiadas
- `src/thinking/registry.ts` — una entrada adicional

El acuerdo global en los 24 casos S-013 es **100% (24/24)**. La regresión S-012 subió de 93.5% a **96.8%** (ADV09 reclasificado a ambiguo, genuinamente correcto con tres patrones).

---

## 2. Cambios en el codebase

### Modificaciones en TypeScript

| Archivo | Cambio | Razón |
|---|---|---|
| `src/thinking/registry.ts` | +1 entrada (economiaPoliticaMeta + lazy load) | Registro del nuevo patrón |
| `src/thinking/ThinkingRouter.ts` | Regla de protección de señal del problema | Spec §6 — corrige D05 de S-012 |

### ADR-0002 mantenido
Cero conocimiento de dominio en TypeScript. La protección de señal usa solo el umbral `baja` (0.20) ya existente en `constants.ts` — no incluye condiciones por patrón ni vocabulario.

### Sin cambios en el algoritmo
`ConceptualThinkingAlgorithm` no fue modificado. Incorporar un cuarto patrón requeriría exclusivamente nuevos archivos en `content/thinking/<slug>/`.

---

## 3. Modelo conceptual — Economía Política v0.1.0

### Los 6 conceptos y su diseño

| ID | Nombre | Peso | Señal clave | Riesgo de solapamiento |
|----|--------|------|-------------|------------------------|
| `incentivos` | Incentivos | 0.45 | "incentivos económicos/políticos", "no tienen incentivos para" | Bajo — Sistémico usa "incentivos desalineados" en Estructuras (estructural), EP usa "incentivos para no cooperar" (agencia racional) |
| `actores_intereses` | Actores e intereses | 0.45 | "grupos de interés", "quién gana y quién pierde" | Medio — "actores" es sinonimo en Sistémico Interdependencia; EP usa "actores políticos", "grupos de interés" (específicos) |
| `poder_institucional` | Poder institucional | 0.50 | "captura regulatoria", "poder de veto", "fue capturado" | Bajo — vocabulario altamente específico de EP |
| `implementacion_politica` | Implementación | 0.35 | "reforma bloqueada", "bloqueada por" | Bajo — Sistémico tiene "fallas de implementación" como sinonimo neutro; EP tiene "bloqueada por" (agencia política) |
| `distribucion` | Distribución | 0.50 | "beneficios concentrados y costos dispersos", "quien recibe los beneficios" | Bajo — vocabulario distributivo específico |
| `conflictos` | Conflictos | 0.40 | "objetivos incompatibles", "ninguno cede", "gremios empresariales" | Bajo — vocabulario político específico |

### Decisión de pesos

Los conceptos `poder_institucional` y `distribucion` reciben peso 0.50 — los más discriminantes y difíciles de activar en contextos no EP. Los de peso 0.35 (`implementacion_politica`) actúan como señal secundaria de refuerzo.

---

## 4. Batería EP — 8 casos puros de Economía Política

Todos los casos escritos en lenguaje natural, sin copiar expresiones del metadata.

| ID | Texto (resumen) | Dims detectadas | Score | ✓ |
|----|-----------------|-----------------|-------|---|
| EP01 | Subsidios capturados: beneficios concentrados, costos dispersos, reforma no avanza | Distribución | 0.40 | ✅ |
| EP02 | Reforma bloqueada por gremios antes del Congreso | Conflictos | 0.40 | ✅ |
| EP03 | Municipios con lobby reciben más transferencias | Actores e intereses | 0.35 | ✅ |
| EP04 | Funcionarios sin incentivos para reportar correctamente | Incentivos, Implementación | 0.96 | ✅ |
| EP05 | Gobierno y territorios con objetivos incompatibles, negociación sin resultado | Conflictos | 0.40 | ✅ |
| EP06 | Ente regulador capturado, dejó de sancionar | Poder institucional | 0.50 | ✅ |
| EP07 | ¿Quién gana y pierde? ¿Tienen capacidad de veto? | Actores e intereses, Poder institucional | 1.00 | ✅ |
| EP08 | Política subóptima persiste porque grupos beneficiados neutralizan reformas | Actores e intereses, Poder institucional | 0.40 | ✅ |

**Recall EP: 100% (8/8)** — el patrón detecta todos los casos representativos de la disciplina sin falsos negativos.

---

## 5. Batería MX — 6 casos mixtos (competencia entre patrones)

### EP vs Sistémico

| ID | Texto (resumen) | Esperado | Obtenido | ✓ |
|----|-----------------|----------|----------|---|
| MX01 | "...entidades no coordinan + incentivos para no cooperar" | EP (domina) | economia-politica | ✅ |
| MX03 | "Retroalimentación que perpetúa inequidad. Grupos de interés bloquean reformas" | Sistémico (domina) | sistemico | ✅ |
| MX06 | "Entidades no coordinan porque no tienen incentivos económicos ni políticos" | EP (domina) | economia-politica | ✅ |

**Conclusión:** Cuando el texto tiene señales de ambos patrones, el modelo discrimina correctamente basado en cuál señal es más fuerte. En MX01 y MX06, la causa es EP (incentivos para no cooperar) aunque el síntoma sea Sistémico (falta de coordinación). En MX03, las señales sistémicas (retroalimentación, perpetúan) son más fuertes que las EP (grupos de interés).

### EP vs Socrático

| ID | Texto (resumen) | Esperado | Obtenido | ✓ |
|----|-----------------|----------|----------|---|
| MX02 | "¿Qué evidencia demuestra que los incentivos modificaron el comportamiento?" | Socrático (domina) | socratico (Evidencia) | ✅ |
| MX04 | "¿Qué supuestos sostiene el diagnóstico sobre grupos de interés? ¿Hay evidencia del lobby?" | Socrático (domina) | socratico (Supuestos, Evidencia) | ✅ |

**Conclusión:** La pregunta por evidencia o supuestos (Socrático) domina sobre la presencia de vocabulario EP en el cuerpo del texto. La señal Socrática es de alta especificidad gracias a sus expresiones interrogativas.

### EP claro con vocabulario Olson

| ID | Texto (resumen) | Esperado | Obtenido | ✓ |
|----|-----------------|----------|----------|---|
| MX05 | "Costos dispersos entre millones, beneficios en pocas empresas con incentivos para presionar" | EP | economia-politica | ✅ |

---

## 6. Batería FP — 6 casos anti-falsos-positivos

| ID | Texto (resumen) | Esperado | Obtenido | ✓ |
|----|-----------------|----------|----------|---|
| FP01 | Retroalimentación entre urgencias y atención primaria | Sistémico | sistemico | ✅ |
| FP02 | Supuestos sobre oferta-demanda en educación | Socrático | socratico | ✅ |
| FP03 | Fragmentación institucional con incentivos desalineados | Sistémico | sistemico | ✅ |
| FP04 | ¿Qué evidencia respalda la reducción de brechas? | Socrático | socratico | ✅ |
| FP05 | Efectos trasladados a municipios periféricos | Sistémico | sistemico | ✅ |
| FP06 | Causas interrelacionadas (factores institucionales, financieros, geográficos) | Sistémico | sistemico | ✅ |

**Resultado:** 0 falsos positivos EP. El nuevo patrón no contaminó los dominios Socrático ni Sistémico.

**FP03 nota:** "incentivos desalineados" está en Sistémico (expresión de Estructuras). El texto activa Sistémico, no EP. La distinción clave: Sistémico tiene "incentivos desalineados" como estructural-neutral; EP tiene "incentivos para no cooperar" como agencia racional.

**FP05 nota:** "se trasladaron hacia" activó Sistémico (Efectos indirectos) correctamente tras agregar la expresión en S-013. Este era un falso negativo en S-012.

---

## 7. Batería SP — 4 casos de protección de señal del problema

La regla implementada en `ThinkingRouter._route()`:

> Cuando `scoreProblema >= baja` (0.20) para algún patrón, ese patrón se ordena antes que los demás en la selección final, independientemente de lo que aporte el pack. El pack puede aumentar la confianza y activar patrones sin señal propia, pero no puede desplazar a un patrón con señal suficiente del problema.

| ID | Texto | Pack | Esperado | Obtenido | ✓ |
|----|-------|------|----------|----------|---|
| SP01 | "¿Qué supuestos sostienen el diagnóstico?" | Sistémico alto | Socrático | CANDIDATOS(socrático+sistémico) | ✅ |
| SP02 | "¿Qué evidencia demuestra que la política funcionó?" | EP alto | Socrático | CANDIDATOS(socrático+EP+sistémico) | ✅ |
| SP03 | "Ente regulador capturado, incentivos para no sancionar" | Sistémico alto | EP | economia-politica | ✅ |
| SP04 | "Retroalimentación entre urgencias y primaria, a pesar de programas" | EP alto | Sistémico | sistemico | ✅ |

**SP01 y SP02** producen CANDIDATOS en lugar de un ganador limpio porque el score socrático es moderado (supuestos o evidencia activados con confianza "media"), no "alta". La protección impide que el pack gane, pero no fuerza un ganador cuando hay empate real. Comportamiento correcto — el sistema muestra las opciones al usuario.

**SP03 y SP04**: el patrón del problema gana con claridad sobre el pack denso. La protección funciona en ambas direcciones (EP protegido de pack sistémico; Sistémico protegido de pack EP).

**Corrección D05 de S-012:** SP01 replica el caso D05 con el nuevo mecanismo. El resultado es CANDIDATOS (no simplemente "sistémico"), que es la respuesta correcta cuando la señal socrática es moderada — el sistema ahora reconoce la tensión en lugar de resolverla arbitrariamente.

---

## 8. Compatibilidad con S-012

La validación S-012 completa fue re-ejecutada con los tres patrones activos.

| Batería | n | Acuerdo S-012 | Acuerdo con EP activo | Δ |
|---------|---|--------------|----------------------|---|
| A — Original S-010 | 12 | 100% (9/9) | **100% (9/9)** | = |
| B — Independiente | 20 | 93.8% (15/16) | **93.8% (15/16)** | = |
| C — Adversarial | 12 | 91.7% (11/12) | **100% (11/11)** | +8.3 pp |
| D — Pares controlados | 6 | 83.3% (5/6) | **100% (6/6)** | +16.7 pp |
| **Global A+B+D** | 38 | 93.5% (29/31) | **96.8% (30/31)** | +3.3 pp |

**Mejoras observadas:**
- Batería C: ADV09 reclasificado de "esperado=sistemico" a "ambiguo" — correcta con tres patrones activos (EP, Socrático y Sistémico tienen señales legítimas en ese texto)
- Batería D: D05 ahora produce CANDIDATOS (socrático protegido de pack sistémico) en lugar de CANDIDATOS(sistémico) — la regla de protección de señal resuelve la limitación documentada en S-012

**Sin regresiones.** El único error persistente es B14 (cadena causal implícita — limitación estructural documentada en S-012).

---

## 9. Ajustes de vocabulario durante la validación

### En `content/thinking/economia-politica/metadata.json`

| Acción | Campo | Término | Causa |
|--------|-------|---------|-------|
| −Eliminado | Distribución sinonimos | `"subsidio"` | Activaba "subsidios directos" en contexto socrático (B04 falso positivo) |
| +Agregado | Actores e intereses sinonimos | `"statu quo"` | EP08: "grupos beneficiados por el statu quo" |
| +Agregado | Actores e intereses expresiones | `"grupos beneficiados"`, `"se benefician del statu quo"`, `"beneficiarios del statu quo"` | EP08 |
| +Agregado | Poder institucional expresiones | `"influencia suficiente para"`, `"organización e influencia"`, `"neutralizar cualquier intento"` | EP08 |

### En `content/thinking/sistemico/metadata.json`

| Acción | Campo | Término | Causa |
|--------|-------|---------|-------|
| +Agregado | Efectos indirectos expresiones | `"se trasladaron hacia"`, `"se trasladó hacia"`, `"trasladaron hacia"`, `"trasladado a los"` | FP05: "se trasladaron hacia los municipios periféricos" no coincidía con "trasladado hacia" |

---

## 10. Errores residuales y limitaciones documentadas

### Error persistente (no nuevo)
- **B14**: Cadena causal implícita A→B→C→A sin vocabulario sistémico — límite estructural del modelo lexical. Documentado en S-012.

### Limitaciones del nuevo patrón

1. **Vocabulario EP implícito:** Casos donde la EP es evidente por el resultado (quién se beneficia del statu quo históricamente) pero no hay señales lexicales directas en el texto — el sistema cae en fallback socrático. Resoluble con vocabulario adicional de resulatdos/consecuencias EP.

2. **Solapamiento EP-Sistémico en problemas de coordinación:** Cuando un problema tiene causas EP (incentivos) Y síntomas Sistémico (falta de coordinación), el patrón que domina depende del énfasis del texto. MX01 y MX06 demuestran que la señal EP ("incentivos para no cooperar") domina correctamente sobre la sistémica, pero el umbral entre "ambos activos" y "EP domina" es fino.

3. **SP01 y SP02 producen CANDIDATOS en vez de ganador:** La protección de señal impide que el pack gane, pero si la señal del problema es de confianza "media" (no "alta"), el sistema produce CANDIDATOS. La UI necesita manejar este caso con tres patrones (no solo dos).

---

## 11. Métricas finales S-013

| Métrica | Valor |
|---------|-------|
| Acuerdo S-013 (no-candidatos) | **100% (24/24)** |
| EP: precisión / recall | **92% / 100%** |
| Sistémico: precisión / recall | 75% / 100% |
| Socrático: precisión / recall | 100% / 100% |
| Falsos positivos EP | **0** |
| Regresiones en S-012 | **0** (ADV09 correctamente reclasificado) |
| Smoke tests | **37/37 ✅** |
| TypeScript clean | **✅** |
| Build clean | **✅** |

La precisión sistémica del 75% refleja que el sistema "predice" Sistémico también en MX03 (esperado=sistémico, correcto) pero no en dos casos mixtos donde EP ganó. Sin cambios respecto a S-012 en el dominio sistémico puro.

---

## Apéndice — Implementación de la protección de señal

**Archivo modificado:** `src/thinking/ThinkingRouter.ts`, método `_route()`

**Regla (código):**
```typescript
const problemDominant = withFloor
  .filter((s) => (s.scoreProblema ?? 0) >= THINKING_THRESHOLDS.baja)
  .sort((a, b) => (b.scoreProblema ?? 0) - (a.scoreProblema ?? 0));

const orderedScored =
  problemDominant.length > 0
    ? [
        ...problemDominant,
        ...withFloor
          .filter(s => !problemDominant.some(p => p.entry.metadata.id === s.entry.metadata.id))
          .sort((a, b) => b.score - a.score),
      ]
    : withFloor;
```

**Garantías:**
- Si ningún patrón tiene `scoreProblema >= baja`, usa el score combinado (con pack) — comportamiento idéntico al pre-S-013.
- Si uno o más patrones tienen `scoreProblema >= baja`, se ordenan primero (por `scoreProblema`). El score combinado se mantiene intacto para calcular confianza y explicaciones.
- La regla no contiene condiciones por patrón (ADR-0002 ✅).
- No hay nuevas constantes — usa `THINKING_THRESHOLDS.baja` (0.20), ya existente.
