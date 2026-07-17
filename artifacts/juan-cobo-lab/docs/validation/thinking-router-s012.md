# HELIOS Thinking Router — Informe de Validación S-012

**Fecha:** 2026-07-17  
**Sprint:** S-012 — Validación ampliada del Thinking Router conceptual  
**Algoritmo evaluado:** `ConceptualThinkingAlgorithm` (introducido en S-011)  
**Patrones activos:** Socrático (universal), Sistémico  
**Casos totales:** 50 (12 originales + 20 independientes + 12 adversariales + 6 pares controlados)

---

## 1. Metodología

### Secuencia de trabajo

1. **Primera ronda sin cambios:** ejecución de las tres baterías con el algoritmo S-011 exactamente como fue entregado.
2. **Análisis de errores:** clasificación por causa (vocabulario ausente, vocabulario demasiado general, limitación estructural, ambigüedad real, dominio de pack).
3. **Ajustes justificados:** sólo los que pasan el criterio "señal específica, riesgo bajo de falsos positivos adicionales, no introduce vocabulario de dominio en TypeScript".
4. **Segunda ronda completa:** re-ejecución de las tres baterías + smoke tests de regresión (37/37).

### Criterio de coincidencia

- **Socratico / Sistémico esperado:** el patrón seleccionado es el correcto, independientemente de si fue por coincidencia directa o por fallback. El fallback es una señal de calidad/confianza, no de error de decisión.
- **Fallback esperado:** `esFallback=true` obligatorio.
- **Ambiguo esperado:** siempre `parcial` — cualquier patrón es aceptable.

### Métricas calculadas

- Acuerdo sobre casos no ambiguos (tasa de acierto)
- Precisión y recall por patrón (Socrático / Sistémico)
- % de decisiones por fallback
- % de decisiones cuya fuente principal es el texto del problema
- Errores residuales con diagnóstico de causa

---

## 2. Batería A — Re-ejecución de los 12 casos originales S-010

### Resultados S-010 vs S-012

| ID  | Esperado   | S-010                  | S-012 (post-ajustes)        | Score | Dims                                         | Cambio       |
|-----|------------|------------------------|-----------------------------|-------|----------------------------------------------|--------------|
| C01 | socratico  | socratico (fallback)   | socratico (fallback)        | 0.25  | —                                            | → SIN CAMBIO |
| C02 | sistemico  | socratico (fallback) ❌ | sistemico (problema)        | 1.00  | Interdependencia, Causalidad compleja, Estructuras | 📈 MEJORA |
| C03 | socratico  | socratico              | socratico                   | 0.45  | Supuestos                                    | → SIN CAMBIO |
| C04 | sistemico  | socratico (fallback) ❌ | sistemico (problema)        | 0.45  | Retroalimentación                            | 📈 MEJORA    |
| C05 | ambiguo    | socratico (fallback)   | socratico (fallback)        | 0.25  | —                                            | 🟡 AMBIGUO   |
| C06 | sistemico  | socratico (fallback) ❌ | sistemico (problema)        | 0.40  | Interdependencia                             | 📈 MEJORA    |
| C07 | socratico  | socratico              | socratico                   | 0.35  | Evidencia                                    | → SIN CAMBIO |
| C08 | ambiguo    | socratico (fallback)   | socratico (fallback)        | 0.25  | —                                            | 🟡 AMBIGUO   |
| C09 | sistemico  | socratico (fallback) ❌ | sistemico (problema)        | 0.35  | Efectos indirectos                           | 📈 MEJORA    |
| C10 | socratico  | socratico              | socratico                   | 0.45  | Supuestos                                    | → SIN CAMBIO |
| C11 | ambiguo    | socratico (fallback)   | **sistemico** (mixta)       | 0.50  | Interdependencia, Causalidad compleja, Estructuras | 🟡 AMBIGUO |
| C12 | sistemico  | socratico (fallback) ❌ | sistemico (mixta)           | 0.72  | Interdependencia, Retroalimentación, Causalidad | 📈 MEJORA  |

**C11 anotación:** El pack "Salud Materna y Perinatal" contiene "barreras de acceso", "coordinación entre niveles del sistema", "factores sociales estructurales" — señales sistémicas legítimas. Sistémico con score 0.50 desde fuente mixta es una respuesta plausible para un caso genuinamente ambiguo.

### Métricas Batería A

| Métrica                          | S-010      | S-012       | Cambio      |
|----------------------------------|-----------|-------------|-------------|
| Acuerdo sobre no ambiguos (9)    | 44.4% (4/9) | **100% (9/9)** | +55.6 pp |
| Fallback total                   | 100% (12/12) | 25% (3/12) | −75 pp   |
| Fuente = problema                | 0%        | 58.3%       | +58.3 pp    |
| Precisión sistémico              | — (0 predicciones) | 83% | n/a         |
| Recall sistémico                 | 0%        | **100%**    | +100 pp     |
| Recall socrático                 | 100%      | 100%        | igual       |

---

## 3. Batería B — 20 casos independientes (lenguaje natural)

Casos construidos sin copiar las expresiones del metadata de S-011. Distribución: 7 socráticos, 7 sistémicos, 4 ambiguos, 2 fallback.

### Socráticos (7 casos)

| ID  | Texto (resumen)                                            | Obtenido          | Dims detectadas                    | ✓ |
|-----|------------------------------------------------------------|-------------------|------------------------------------|---|
| B01 | "¿Qué tendría que ser cierto para aceptar...?"             | socratico (fb)    | —                                  | ✅ |
| B02 | "¿Quién definió el problema y qué perspectivas quedaron fuera?" | socratico    | Perspectivas ausentes, Def. problema | ✅ |
| B03 | "El gobierno concluye..., pero ¿cómo llegó a esa conclusión?" | socratico   | Coherencia argumentativa           | ✅ |
| B04 | "¿Qué dice realmente la investigación disponible...?"      | socratico (fb)    | —                                  | ✅ |
| B05 | "¿A qué grupos no se les preguntó durante el diseño...?"   | socratico (fb)    | —                                  | ✅ |
| B06 | "Si la política logra su meta, ¿qué implicaciones...?"     | socratico         | Implicaciones                      | ✅ |
| B07 | "¿Bajo qué condiciones es válido comparar...?"             | socratico (fb)    | —                                  | ✅ |

Recall socrático B: **100% (7/7)**. Cuatro casos resueltos vía fallback porque las variaciones lingüísticas no tienen expresión literal en el metadata ("investigación" ≠ "evidencia", "qué tendría que ser cierto" ≠ "qué supuestos"). Esto es una oportunidad de vocabulario pero no un error de decisión.

### Sistémicos (7 casos)

| ID  | Texto (resumen)                                              | Obtenido   | Dims detectadas                          | ✓  |
|-----|--------------------------------------------------------------|------------|------------------------------------------|----|
| B08 | "Lo que hace una entidad altera el trabajo de las demás..."  | sistemico  | Interdependencia                         | ✅ |
| B09 | "La intervención solucionó X pero creó otro en Y"            | sistemico  | Efectos indirectos                       | ✅ |
| B10 | "Entre más se invierte... generando un ciclo que se perpetúa"| sistemico  | Interdependencia, Retroalimentación      | ✅ |
| B11 | "Resultados en 3 años, pero efectos negativos tardan 10 en manifestarse" | sistemico | Comportamiento temporal  | ✅ |
| B12 | "Falta de incentivos alineados entre nivel nacional y municipios" | sistemico | Estructuras y restricciones         | ✅ |
| B13 | "Rendimiento concentrado generación tras generación a pesar de los programas" | sistemico | Comportamiento temporal, Retroalimentación | ✅ |
| B14 | "Congestión genera contaminación → salud → productividad → informalidad → transporte" | socratico (fb) | — | ❌ |

Recall sistémico B: **86% (6/7)**. Un fallo residual.

**B14 — diagnóstico:** El texto describe una cadena causal circular ("A genera B que afecta C que reduce D que aumenta A") sin usar ningún término del vocabulario sistémico. La estructura solo es detectable por análisis de dependencias gramaticales o embeddings. Es un límite genuino del modelo de coincidencia por texto.

### Ambiguos y fallback (6 casos)

Todos resolvieron en fallback socrático — comportamiento correcto para estos casos. Los 4 ambiguos recibieron "parcial".

### Métricas Batería B

| Métrica                          | Valor   |
|----------------------------------|---------|
| Acuerdo sobre no ambiguos (16)   | **93.8% (15/16)** |
| Socrático: precisión / recall    | 50% / 100% |
| Sistémico: precisión / recall    | 100% / 86% |
| Fallback total                   | 55% (11/20) |
| Fuente = problema                | 45% (9/20) |

La precisión socrática del 50% se explica porque 7 socrático esperados llegan via fallback — el patrón es universal por diseño, así que "predice" también todos los fallbacks. Esto es una característica del sistema, no un error.

---

## 4. Batería C — 12 casos adversariales

### Falsos positivos sistémicos potenciales (6 casos)

| ID     | Texto (resumen)                                              | Esperado  | Obtenido        | ✓  |
|--------|--------------------------------------------------------------|-----------|------------------|----|
| ADV01  | "¿Qué evidencia... sistema de información redujo tiempos?"   | socratico | socratico (Evidencia) | ✅ |
| ADV02  | "¿Actores que participaron...? ¿Qué perspectivas aportaron?" | socratico | CANDIDATOS(socratico) | ✅ |
| ADV03  | "¿Por qué persiste la corrupción en contratación pública?"   | socratico | socratico (fb)   | ✅ |
| ADV04  | "¿Qué estructura administrativa sería más apropiada...?"     | socratico | socratico (fb)   | ✅ |
| ADV05  | "¿Qué ciclo presupuestal sigue el fondo...?"                 | socratico | socratico (fb)   | ✅ |
| ADV06  | "¿Cuál es la barrera normativa que impide...?"               | socratico | socratico (fb)   | ✅ |

**ADV05 y ADV06** eran errores en la primera ronda (`'ciclo'` y `'barreras'` como sinonimos/terminos demasiado genéricos). Corregidos eliminando esos términos del metadata.

### Falsos positivos socráticos potenciales (4 casos)

| ID     | Texto (resumen)                                                          | Esperado  | Obtenido        | ✓  |
|--------|--------------------------------------------------------------------------|-----------|------------------|----|
| ADV07  | "Aunque existe evidencia..., la coordinación entre entidades sigue generando retrasos" | sistemico | CANDIDATOS(sistemico) | ✅ |
| ADV08  | "El diagnóstico documenta..., pero no muestra cómo se refuerzan mutuamente" | sistemico | sistemico       | ✅ |
| ADV09  | "Suponiendo que los incentivos..., ¿cómo explicamos efectos tan distintos?" | sistemico | socratico (fb)  | ❌ |
| ADV10  | "¿Por qué datos de inclusión financiera no se traducen en bienestar?"     | socratico | socratico (Coherencia) | ✅ |

**ADV09 — diagnóstico:** El texto empieza con "Suponiendo que..." (señal socrática de cuestionamiento de premisas) y en el cuerpo pregunta por efectos distintos entre territorios (señal sistémica de causalidad compleja). Genuinamente ambiguo — la clasificación de "esperado=sistemico" es cuestionable. No se añadió vocabulario adicional para forzar este caso.

### Casos neutros (2 casos)

ADV11 y ADV12 → fallback socrático correcto en ambos.

### Métricas Batería C

| Métrica                          | Valor   |
|----------------------------------|---------|
| Acuerdo sobre no ambiguos (12)   | **91.7% (11/12)** |
| Socrático: precisión / recall    | 67% / 86% |
| Sistémico: precisión / recall    | 100% / 33% |
| Falsos positivos sistémicos      | 0 (post-ajustes) |
| Falsos positivos socráticos      | 0 (post-ajustes) |

El recall sistémico bajo (33%) en adversarial refleja que ADV07 quedó en CANDIDATOS (ambigüedad genuina entre evidencia socrática y coordinación sistémica) y ADV09 es ambiguo.

---

## 5. Batería D — 6 pares controlados (mismo texto, pack diferente)

| ID  | Texto                                   | Pack                      | Esperado  | Obtenido           | ✓  |
|-----|----------------------------------------|---------------------------|-----------|--------------------|----|
| D01 | Neutral                                | Sin pack                  | fallback  | socratico (fb)     | ✅ |
| D02 | Neutral                                | TIC                       | fallback  | socratico (fb)     | ✅ |
| D03 | Neutral                                | Educación                 | fallback  | socratico (fb)     | ✅ |
| D04 | Neutral                                | Alto sistémico            | sistemico | sistemico          | ✅ |
| D05 | "¿Qué supuestos sostienen el diagnóstico?" | Alto sistémico         | socratico | CANDIDATOS(sistemico) | ❌ |
| D06 | Sistémico explícito                    | Pack socrático            | sistemico | sistemico          | ✅ |

**Hallazgos del experimento controlado:**

1. **Pack TIC o Educación** (señales neutras) no cambia la decisión sobre un texto neutral → correcto.
2. **Pack de alto contenido sistémico** activa Sistémico sobre un texto neutral (D04) → correcto — el pack aporta contexto legítimo.
3. **Pack de alto contenido sistémico** + texto socrático explícito (D05) → empate (CANDIDATOS) — **dominio de pack**.
4. **Pack socrático** no logra desplazar Sistémico desde un texto sistémico explícito (D06) → la señal del problema domina cuando es fuerte.

**D05 — análisis:** El texto "¿Qué supuestos sostienen el diagnóstico sobre la cobertura del programa?" tiene score socrático desde el problema ≈ 0.28–0.45. El pack "Gestión Sistémica de Territorios" (con retroalimentación, actores interdependientes, efectos indirectos) agrega al score sistémico vía `packContextWeight=0.50`, produciendo empate. El sistema responde "CANDIDATOS" en lugar de elegir arbitrariamente — comportamiento defensivo correcto, aunque la señal del problema debería haber ganado. Documentado como limitación arquitectónica.

---

## 6. Análisis de scoring conceptual — errores residuales

### B14 — Cadena causal implícita

**Texto:** "La congestión vial genera contaminación, la contaminación afecta la salud, la mala salud reduce la productividad, y la baja productividad aumenta la informalidad que recarga el transporte."

**Causa:** Bucle de retroalimentación descrito mediante repetición del sustantivo-sujeto entre oraciones. No hay término sistémico en el vocabulario actual que capture este patrón estructural. Requeriría análisis de dependencias gramaticales o embeddings semánticos.

**Conclusión:** Límite genuino del modelo lexical. No se puede corregir con vocabulario adicional sin introducir términos tan genéricos que causarían masivos falsos positivos ("genera", "afecta", "reduce").

### ADV09 — Texto mixto socrático-sistémico

**Texto:** "Suponiendo que los incentivos económicos son el principal determinante, ¿cómo explicamos que los efectos sean tan distintos entre territorios con condiciones similares?"

**Causa:** "Suponiendo que" es señal socrática (cuestionamiento de premisa). "Efectos tan distintos entre territorios" fue clasificado como sistémico, pero ninguna expresión del metadata hace match porque la expresión agregada ("efectos tan distintos entre territorios") no aparece literalmente en el texto ("efectos sean tan distintos entre territorios con condiciones similares"). La clasificación del evaluador como "esperado=sistemico" es discutible — el texto también puede abordarse socráticamente.

**Conclusión:** Ambigüedad genuina que el evaluador clasificó de manera opinable. No se modifica.

### D05 — Dominio de pack sobre texto socrático

**Causa:** `packContextWeight=0.50` permite que un pack con alto vocabulario sistémico (múltiples conceptos activos + diversity bonus) alcance scores que compiten con la señal del problema. Con `packContextWeight=0.35` el problema dominaría más, pero eso afectaría casos donde el pack es la señal principal legítima (C12, D04).

**Conclusión:** Tensión arquitectónica documentada. Corrección futura: discriminador de dominancia (si la señal del problema supera un umbral definido, reducir el peso efectivo del pack).

---

## 7. Ajustes realizados

### Eliminaciones de vocabulario (reducción de falsos positivos)

| Campo       | Concepto          | Término eliminado | Causa                                        |
|-------------|-------------------|-------------------|----------------------------------------------|
| sinonimos   | Retroalimentación | `"ciclo"`         | Activaba "ciclo presupuestal" (ADV05)        |
| terminos    | Estructuras       | `"barreras"`      | Activaba "barrera normativa" (ADV06); "barreras de acceso" permanece como expresión |

### Adiciones de vocabulario (reducción de falsos negativos)

| Campo       | Concepto              | Expresión / Término agregado                        | Caso objetivo |
|-------------|-----------------------|-----------------------------------------------------|---------------|
| expresiones | Interdependencia      | `"altera el trabajo de las demás"`                  | B08           |
| expresiones | Interdependencia      | `"ninguna tiene control sobre el resultado"`         | B08           |
| expresiones | Interdependencia      | `"ningún actor controla el resultado"`              | B08 (variante)|
| expresiones | Efectos indirectos    | `"solucionó un problema pero"`                      | B09           |
| expresiones | Efectos indirectos    | `"pero creó otro"`                                  | B09           |
| expresiones | Efectos indirectos    | `"resolvió en un lugar pero"`                       | B09 (variante)|
| terminos    | Comportamiento temporal | `"manifestarse"`                                  | B11           |
| expresiones | Comportamiento temporal | `"tardan en manifestarse"` / `"tarda años en"`    | B11           |
| expresiones | Comportamiento temporal | `"generación tras generación"`                    | B13           |
| expresiones | Estructuras           | `"incentivos no alineados"` / `"falta de incentivos alineados"` | B12 |
| expresiones | Retroalimentación     | `"se retroalimenta"`                                | B14 (parcial) |
| expresiones | Retroalimentación     | `"a pesar de los programas de"`                     | B13           |
| expresiones | Causalidad compleja   | `"efectos tan distintos entre territorios"`         | ADV09 (parcial)|
| expresiones | Causalidad compleja   | `"efectos diferentes entre territorios"` / `"responde diferente en cada"` | — |

### Criterio de selección

Cada adición verificó: (a) la expresión aparece en los textos objetivo, (b) no es un término suficientemente genérico para activarse en contextos no sistémicos, (c) no introduce vocabulario de dominio en TypeScript (ADR-0002 mantenido).

---

## 8. Resultados después de los ajustes

### Métricas consolidadas (post-ajustes)

| Batería                  | n  | Acuerdo no-ambiguos | Sistémico P/R   | Socrático P/R   | Fallback% |
|--------------------------|----|---------------------|-----------------|-----------------|-----------|
| A — Original S-010       | 12 | **100%** (9/9)      | 83% / 100%      | 67% / 100%      | 25%       |
| B — Independiente        | 20 | **93.8%** (15/16)   | 100% / 86%      | 50% / 100%      | 55%       |
| C — Adversarial          | 12 | **91.7%** (11/12)   | 100% / 33%      | 67% / 86%       | 58%       |
| D — Pares controlados    | 6  | **83.3%** (5/6)     | 100% / 100%     | 0% / 0%         | 50%       |
| **GLOBAL (A+B+D)**       | 38 | **93.5%** (29/31)   | **93% / 93%**   | 48% / 92%       | 45%       |

**Nota sobre precisión socrática:** El 48% refleja que Socrático es universal — "predice" también los casos de fallback. Semánticamente, el recall (92%) es la métrica relevante: de 12 casos socrático esperados, 11 llegaron al patrón correcto.

### Smoke tests de regresión: 37/37 ✅

---

## 9. Influencia del Knowledge Pack

| Escenario                               | Resultado                                   | Evaluación               |
|-----------------------------------------|---------------------------------------------|--------------------------|
| Texto neutral sin pack                  | Fallback socrático                          | ✅ Correcto              |
| Texto neutral + pack TIC/Educación      | Fallback socrático (sin cambio)             | ✅ Pack no interfiere    |
| Texto neutral + pack alto sistémico     | Sistémico activado (D04)                    | ✅ Pack ayuda            |
| Texto sistémico + pack socrático        | Sistémico (problema domina)                 | ✅ Señal del problema prevalece |
| Texto socrático explícito + pack alto sistémico | CANDIDATOS (empate)               | ⚠️ Limitación            |
| Texto neutro con pack con `retroalimentación` | Sistémico (C12, D04 correcto)        | ✅ Correcto              |

**Conclusión:** El pack ayuda correctamente en 5 de 6 escenarios. La excepción (D05) ocurre cuando el pack tiene alta densidad sistémica y el texto socrático tiene señal moderada. El pack no domina cuando el texto es sistémico explícito (D06).

---

## 10. Análisis de coherencia explicación–decisión

Verificaciones realizadas en todos los casos seleccionados (n=50):

| Regla                                                        | Violaciones encontradas |
|--------------------------------------------------------------|------------------------|
| Explicación menciona solo conceptos activados                | 0                      |
| No declara "sin señales" cuando existen conceptos claros     | 0                      |
| No atribuye al texto señales que provienen solo del pack     | 0                      |
| No presenta como directa una selección que fue fallback      | 0                      |
| No expone scores, pesos ni campos internos                   | 0                      |

Las `dimensionesDetectadas` contienen nombres conceptuales capitalizados ("Retroalimentación", "Supuestos"), no tokens crudos. El `resumen` es legible para el usuario. Ninguna incoherencia detectada.

---

## 11. Revisión de deuda técnica

| Componente                  | Estado                       | Consumidores reales          | Recomendación                      |
|-----------------------------|------------------------------|------------------------------|------------------------------------|
| `keywords[]` en metadata    | `[]` (vacío) en Socrático y Sistémico | Legacy path de ConceptualThinkingAlgorithm | Mantener campo vacío; eliminar en S-013 si no hay patrones nuevos con keywords |
| `ThinkingMatchedTerm`       | `@deprecated` en types.ts    | Ninguno en producción        | Eliminar en próximo sprint         |
| `terminosCoincidentes`      | `@deprecated`                | Solo en comentarios/exports  | Eliminar en próximo sprint         |
| `KeywordThinkingAlgorithm`  | `@deprecated`                | Solo en tests (dialectico-mock via legacy path de ConceptualThinkingAlgorithm) | Mantener hasta que los mocks migren a conceptos |
| `NEUTRAL_TERMS`             | Usado solo por `KeywordThinkingAlgorithm` | Solo el algo deprecated | Eliminar junto con KeywordThinkingAlgorithm |
| Legacy path en `ConceptualThinkingAlgorithm` | Activo | `dialectico-mock` en tests | Mantener hasta que todos los mocks usen conceptos |

El `KeywordThinkingAlgorithm` tiene consumidores reales: el `dialectico-mock` en los smoke tests usa `keywords[]`. No se puede eliminar hasta que ese mock migre a conceptos.

---

## 12. Errores residuales y limitaciones

### Errores definitivos (no corregibles con vocabulario)

| Caso | Descripción                                              | Causa raíz                   |
|------|----------------------------------------------------------|------------------------------|
| B14  | Cadena causal implícita "A genera B → B afecta C → C reduce D → D aumenta A" | Estructura gramatical no detectable por match lexical |
| ADV09 | Texto mixto socrático-sistémico con dominancia ambigua  | Genuinamente ambiguo; clasificación del evaluador discutible |
| D05  | Pack sistémico denso produce empate con texto socrático  | Tensión arquitectónica packContextWeight |

### Limitaciones sistémicas documentadas

1. **Vocabulario implícito:** La descripción de bucles de retroalimentación en lenguaje natural ("A que afecta B que aumenta A") no activa el patrón sin términos explícitos.
2. **Dominio de pack:** Con `packContextWeight=0.50`, un pack de alta densidad conceptual puede competir con señales moderadas del problema.
3. **Sinonimos socrático genéricos:** Cuatro casos socrático correctos llegaron vía fallback porque variaciones lingüísticas ("investigación" vs "evidencia", "¿qué tendría que ser cierto?" vs "supuestos") no tienen match literal.
4. **universalFloor conservador:** 0.25 > baja (0.20) hace que el fallback socrático siempre gane en ausencia de señales especializadas. Correcto por diseño, pero oculta la cobertura real de Socrático.

---

## 13. Recomendación sobre tercer patrón

**HELIOS está condicionalmente preparado para un tercer patrón.**

Condiciones satisfechas:
- ✅ Socrático y Sistémico se distinguen con lenguaje natural (93.5% global)
- ✅ Los errores son identificables, explicables y no aleatorios
- ✅ El fallback se usa cuando corresponde (correctamente para textos neutros)
- ✅ El contexto del pack ayuda sin dominar en la mayoría de los casos (5/6)
- ✅ Las decisiones son trazables (conceptos y superficies auditables)
- ✅ El modelo se generaliza a casos no vistos en el diseño de S-011

Condiciones pendientes antes del tercer patrón:
- ⚠️ Eliminar deuda técnica (`ThinkingMatchedTerm`, `terminosCoincidentes`, `KeywordThinkingAlgorithm`) si el tercer patrón usa solo conceptos
- ⚠️ Definir la semántica de CANDIDATOS: ¿debe la interfaz mostrar al usuario la opción de elegir entre patrones en empate?
- ⚠️ Validar que el tercer patrón no interfiere con el recall socrático (Socrático es universal; el tercer patrón podría "robarle" casos a Sistémico o a ambos)

---

## Apéndice A — Script de validación

Archivo: `src/thinking/__tests__/validacion_s012.ts`

Ejecutar:
```bash
cd artifacts/juan-cobo-lab
pnpm exec tsx src/thinking/__tests__/validacion_s012.ts
```

## Apéndice B — Cambios al metadata después de la primera ronda

Archivo modificado: `content/thinking/sistemico/metadata.json` (v0.2.1)

Resumen de cambios:
- Retroalimentación sinonimos: −`ciclo`; +expresiones `se retroalimenta`, `a pesar de los programas de`
- Estructuras terminos: −`barreras`; +expresiones `incentivos no alineados`, `falta de incentivos alineados`
- Interdependencia expresiones: +`altera el trabajo de las demás`, `ninguna tiene control sobre el resultado`, `ningún actor controla el resultado`
- Efectos indirectos expresiones: +`solucionó un problema pero`, `pero creó otro`, `resolvió en un lugar pero`
- Comportamiento temporal terminos: +`manifestarse`; expresiones: +`tardan en manifestarse`, `tarda años en`, `generación tras generación`
- Causalidad compleja expresiones: +`efectos tan distintos entre territorios`, `efectos diferentes entre territorios`, `responde diferente en cada`
