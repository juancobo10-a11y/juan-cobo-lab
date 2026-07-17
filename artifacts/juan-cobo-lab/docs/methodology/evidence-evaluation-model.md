# Modelo de Evaluación de Evidencia — HELIOS S-022

**Fecha:** 2026-07-17  
**Versión:** 1.0  
**Estado:** Vigente

---

## Principios epistemológicos del modelo

Este documento establece los límites metodológicos explícitos del motor de evaluación de evidencia de HELIOS. Estos límites no son restricciones técnicas — son principios metodológicos que definen qué puede y qué no puede afirmar el sistema.

---

## 1. `supports` ≠ prueba definitiva

Cuando una evaluación marca `direction: "supports"`, esto significa:

> El investigador declara que, a su juicio, la evidencia observada es consistente con lo que la hipótesis predice.

Esto **no implica**:
- Que la hipótesis sea verdadera.
- Que la relación causal postulada exista.
- Que la evidencia sea representativa de la población en general.
- Que la hipótesis no pueda ser refutada por evidencia adicional.

**Por qué importa:** En análisis de política pública, ninguna evidencia aislada "prueba" una hipótesis causal. La evidencia acumulada puede fortalecer o debilitar la plausibilidad de una hipótesis, pero la prueba definitiva requiere diseños cuasiexperimentales, contrafactuales o comparaciones causales que HELIOS no gestiona.

---

## 2. `weakens` ≠ refutación definitiva

Cuando una evaluación marca `direction: "weakens"`, esto significa:

> El investigador declara que la evidencia observada es inconsistente con lo que la hipótesis predice, o apunta en una dirección contraria.

Esto **no implica**:
- Que la hipótesis sea falsa.
- Que la relación causal postulada no exista.
- Que la hipótesis no pueda ser revisada para explicar la evidencia.
- Que una hipótesis alternativa sea correcta.

**Por qué importa:** Las hipótesis en políticas públicas suelen ser multidimensionales. Una evidencia contraria en un indicador puede coexistir con evidencia favorable en otros. La síntesis es un juicio del investigador, no un algoritmo.

---

## 3. `confidence` ≠ probabilidad estadística

El campo `EvidenceAssessment.confidence` tiene tres valores: `low`, `medium`, `high`.

Estos valores representan:

> La valoración subjetiva del investigador sobre la solidez de la fuente, la calidad del dato y la adecuación del hallazgo para el criterio que se evalúa.

Estos valores **no representan**:
- Un intervalo de confianza estadístico.
- Una probabilidad bayesiana de que la hipótesis sea verdadera.
- Un índice de calidad de la evidencia comparable entre estudios.
- Una medida de significancia estadística.

**Por qué importa:** La investigación en políticas públicas frecuentemente trabaja con evidencia cualitativa, datos secundarios incompletos, o estudios de caso que no permiten asignar probabilidades formales. HELIOS trata la confianza como una declaración del investigador, no como una medida objetiva.

---

## 4. HELIOS no determina causalidad

HELIOS registra, organiza y evalúa evidencia, pero **no determina relaciones causales**.

Lo que HELIOS hace:
- Registra que el investigador considera que la evidencia "apoya" o "debilita" una hipótesis.
- Organiza esa evidencia en una estructura trazable hasta la hipótesis original.
- Verifica que las referencias sean estructuralmente consistentes.
- Muestra estadísticas descriptivas de las evaluaciones.

Lo que HELIOS **no hace**:
- Inferir que X causa Y a partir de la evidencia.
- Calcular un estimado de efecto causal.
- Determinar si una política fue efectiva.
- Reemplazar el análisis econométrico, cuasi-experimental o de síntesis causal.

**Por qué importa:** La causalidad en políticas públicas requiere diseños de investigación específicos (experimentos naturales, diferencia en diferencias, variables instrumentales, etc.) que van más allá del alcance de HELIOS. HELIOS organiza el argumento analítico — no lo resuelve.

---

## 5. La conclusión es formulada por el usuario

El campo `HypothesisEvidenceConclusion.conclusionText` y `conclusionStatus` son completados **por el investigador**.

HELIOS proporciona:
- Un resumen descriptivo de las evaluaciones registradas (conteos por dirección y confianza).
- Un listado de criterios sin evidencia.
- Un acceso estructurado a todas las evaluaciones relevantes.

HELIOS **no**:
- Sugiere un `conclusionStatus` basado en mayoría de votos de evaluaciones.
- Produce automáticamente el texto de conclusión.
- Recomienda si la política debería adoptarse, modificarse o abandonarse.

**Por qué importa:** La conclusión metodológica sobre una hipótesis de política pública involucra juicios de valor, consideraciones contextuales, limitaciones de los datos disponibles, y compromisos con la incertidumbre que solo el investigador puede articular. HELIOS facilita la transparencia del proceso — no lo sustituye.

---

## 6. La evaluación de evidencia es un proceso iterativo

HELIOS permite:
- Actualizar evaluaciones existentes sin perder las evidencias registradas.
- Marcar evaluaciones como `needs-review` para revisión posterior.
- Registrar interpretaciones alternativas y evidencia adicional necesaria.

Esto reconoce que:
- La comprensión de la evidencia puede cambiar con nuevos hallazgos.
- Las limitaciones metodológicas pueden surgir en el proceso de evaluación.
- El juicio sobre la dirección y confianza es susceptible de revisión.

---

## 7. Relación entre este modelo y los demás componentes de HELIOS

```
Problema
↓
Hipótesis (PolicyHypothesis)
↓
Modelo Conceptual (variables → indicadores → fuentes)
↓
Operacionalización (dimensiones → indicadores → fuentes → escala)
↓
Contrastación (criterios: evidencia esperada / contraria / interpretación)
↓
Evaluación de evidencia [S-022]
  ObservedEvidence — qué se encontró
  EvidenceAssessment — qué significa lo encontrado (juicio del investigador)
↓
Conclusión metodológica [S-022]
  HypothesisEvidenceConclusion — formulada por el investigador
↓
Revisión final — cadena metodológica completa + auditoría
```

Cada etapa es trazable y auditada por el Motor de Consistencia Metodológica (S-021 + EVD rules S-022).

---

## Implicaciones para usuarios de HELIOS

1. **El sistema registra su proceso analítico**, no lo ejecuta por usted.
2. **Las etiquetas de dirección** ("apoya", "debilita") son categorías interpretativas — use el campo de justificación para documentar el razonamiento.
3. **Las limitaciones son obligatorias en el espíritu del método** — toda evidencia tiene restricciones de representatividad, temporalidad, o acceso.
4. **La conclusión final pertenece al investigador** — HELIOS organiza la evidencia que la sustenta.
5. **La auditoría metodológica** (Motor de Consistencia S-021 + EVD rules S-022) verifica coherencia estructural, no validez epistemológica de sus juicios.
