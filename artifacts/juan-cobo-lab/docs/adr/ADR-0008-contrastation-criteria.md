# ADR-0008 — Toda hipótesis debe tener criterios explícitos de contrastación

**Sprint:** S-019  
**Status:** Accepted  
**Date:** 2026-07-17

---

## Contexto

Tras implementar el modelo conceptual (S-017) y la matriz de operacionalización (S-018),
HELIOS puede describir *qué* se quiere medir y *cómo* se mediría. Sin embargo, no existe
todavía un mecanismo para que el analista especifique explícitamente *qué evidencia
apoyaría* o *refutaría* cada hipótesis.

Una hipótesis sin criterios de contrastación es irrefutable en la práctica — el analista
puede siempre encontrar una interpretación favorable. Esto constituye un defecto
metodológico grave en análisis de política pública.

## Decisión

**Toda hipótesis debe tener una Matriz de Contrastación antes de ser considerada
metodológicamente completa.**

La Matriz de Contrastación obliga al analista a responder explícitamente:

1. ¿Qué evidencia apoyaría esta hipótesis? (`evidenciaEsperada`)
2. ¿Qué evidencia la debilitaría? (`evidenciaContraria`)
3. ¿Cómo interpretar los resultados del indicador? (`criterioInterpretacion`)
4. ¿Con qué indicadores se contrastaría? (FK → `ConceptualIndicator`)
5. ¿Con qué fuentes? (FK → `EvidenceSource`)
6. ¿Qué limitaciones tiene cada criterio? (`limitaciones`)

## Reglas de implementación

- **HELIOS no decide si una hipótesis es verdadera.** Su rol es estructurar el proceso
  de contrastación, no ejecutarlo.
- **Sin generación automática.** Ni la evidencia esperada ni la contraria se infieren del
  modelo conceptual — el analista debe escribirlas explícitamente.
- **La contrastación referencia, no duplica.** Los indicadores y fuentes se reutilizan
  del modelo conceptual por FK. No se copian datos.
- **La prioridad no se asigna automáticamente.** El analista decide qué criterios son más
  importantes para el análisis.
- **Blocking vs. warnings:** Solo se bloquea la *confirmación* — nunca la edición.
  Criterios sin evidencia esperada/contraria/indicador/fuente bloquean. Criterios sin
  prioridad, sin criterio de interpretación o sin limitaciones son advertencias.

## Consecuencias

**Positivas:**
- La cadena metodológica en HELIOS es ahora completa y falsificable.
- El analista no puede afirmar que una hipótesis fue "contrastada" sin haber definido
  explícitamente qué tipo de evidencia la hubiera refutado.
- La trazabilidad es total: problema → patrón → hipótesis → modelo → operacionalización
  → contrastación.

**Negativas / deuda técnica:**
- Aún no existe soporte para diseño de evaluación formal (tipo de diseño empírico,
  estrategia estadística, cronograma).
- La contrastación es session-only — no persiste entre recargas.
- No hay exportación del protocolo de contrastación a ningún formato estándar (ICDP, PDF).

## Alternativas consideradas

| Opción | Razón de descarte |
|---|---|
| Generar automáticamente la evidencia esperada desde el modelo conceptual | Viola el principio de autonomía metodológica del analista. La inferencia automática crea ilusión de rigor sin sustancia. |
| Incluir la contrastación dentro del modelo conceptual | Mezclaría dos capas distintas: el qué (modelo) y el cómo contrastar (protocolo). ADR-0006 establece que estas capas son separadas. |
| No requerir contrastación explícita | Deja hipótesis irrefutables en la práctica, defecto metodológico mayor. |
