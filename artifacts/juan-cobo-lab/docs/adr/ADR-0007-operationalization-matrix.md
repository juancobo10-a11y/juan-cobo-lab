# ADR-0007 — Todo constructo debe poder operacionalizarse explícitamente

**Date:** 2026-07-17  
**Status:** Accepted  
**Sprint:** S-018  
**Relates to:** ADR-0006 (hypothesis operationalization)

---

## Context

S-017 introdujo el modelo conceptual: variables, indicadores y fuentes de evidencia
vinculadas a una hipótesis. Sin embargo, la cadena metodológica quedó incompleta:
existía una brecha entre el concepto teórico (variable) y su medición concreta.

En metodología de investigación cuantitativa y de evaluación de políticas, esa brecha
se cierra con una **matriz de operacionalización**: una tabla que traduce cada constructo
en dimensiones observables, cada dimensión en indicadores medibles, y cada indicador en
una fuente de evidencia y una escala de medición.

Sin esta capa explícita, HELIOS puede generar hipótesis bien estructuradas que nunca
se convierten en instrumentos de medición concretos.

---

## Decision

**Toda variable conceptual utilizada en una hipótesis debe poder operacionalizarse
explícitamente en la matriz de operacionalización de HELIOS.**

Reglas derivadas:

1. **No indicadores sin operacionalización previa.** Un indicador que no está vinculado
   a una dimensión explícita con definición operacional no está metodológicamente
   justificado.

2. **Las dimensiones son el puente.** Cada fila de la matriz corresponde a una dimensión
   de una variable. La dimensión descompone el concepto en un aspecto observable concreto.
   La definición operacional responde: *¿Cómo sabré que esta dimensión está presente?*

3. **Sin generación automática.** HELIOS no genera dimensiones ni definiciones operacionales.
   La operacionalización es una decisión metodológica que exige el juicio del analista.

4. **Reutilización sin duplicación.** Los indicadores y fuentes definidos en el modelo
   conceptual (S-017) se referencian por ID en la matriz — no se duplican.

5. **La escala es obligatoria para confirmación.** Elegir una escala de medición
   (nominal, ordinal, intervalo, razón, índice compuesto) es un requisito para confirmar
   la matriz. No se asume ninguna escala automáticamente.

6. **Una fila = una dimensión.** Una variable puede descomponerse en múltiples
   dimensiones, cada una con su propio indicador y fuente. No hay límite en el número
   de dimensiones.

---

## Consequences

**Positivas:**
- La cadena analítica queda completa: problema → hipótesis → modelo conceptual →
  matriz de operacionalización.
- El analista debe ser explícito sobre cómo medir cada constructo — no puede dejar
  variables "flotando".
- La matriz sirve como puente directo hacia el diseño de un plan de contrastación
  (sprint futuro).
- Los futuros módulos de generación asistida tienen un contrato claro de lo que deben
  producir.

**Limitaciones:**
- Persistencia session-only: recargar la página pierde la matriz.
- No hay validación semántica de las escalas elegidas — el analista puede asignar
  "nominal" a un índice compuesto sin que HELIOS lo detecte.
- Sin exportación a PDF o instrumento de recolección de datos (sprint futuro).

---

## Alternatives considered

**A. Generar la matriz automáticamente desde el modelo conceptual.**
Rechazada: la operacionalización requiere decisiones metodológicas sobre cómo medir
cada dimensión en el contexto sectorial específico. Un LLM podría sugerir dimensiones,
pero no validar si son adecuadas para el contexto.

**B. Incorporar la dimensión directamente en ConceptualVariable (sin nueva entidad).**
Rechazada: `ConceptualVariable.definicionOperacional` ya existe pero no permite múltiples
dimensiones. Modificar el modelo de S-017 rompería la separación de concerns y acoplaría
dos capas metodológicas distintas.

**C. Hacer la escala informativa (sin bloquear confirmación).**
Rechazada: una operacionalización sin escala está metodológicamente incompleta.
Sin escala no puede determinarse qué estadísticos son apropiados ni qué tipo de
fuente puede satisfacer el indicador.
