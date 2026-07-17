# ADR-0011 — La evidencia observada y su evaluación deben permanecer separadas

**Estado:** Aceptado  
**Fecha:** 2026-07-17  
**Sprint:** S-022  
**Contexto:** Motor de Evaluación de Evidencia

---

## Contexto

HELIOS S-022 agrega una capa de evaluación de evidencia empírica sobre la cadena metodológica ya establecida. Una decisión de diseño crítica es cómo estructurar los datos de evidencia: ¿deben mezclarse los datos brutos con la interpretación, o separarse en entidades distintas?

Existen dos antipatrones a evitar:

1. **Mezcla de datos e interpretación:** Si una sola entidad `EvidenceEntry` contiene tanto el valor observado como la dirección, la confianza y la justificación del investigador, resulta imposible distinguir qué es un dato y qué es un juicio.

2. **Auto-completado:** Si HELIOS derivara automáticamente una conclusión a partir de los datos, el sistema estaría sustituyendo el juicio del investigador — un error metodológico fundamental en análisis de política pública.

---

## Decisión

HELIOS mantiene **tres capas conceptuales distintas e irreducibles**:

```
ContrastationRow
↓ define qué evidencia debería buscarse
↓ (qué esperamos encontrar / qué falsificaría la hipótesis)

ObservedEvidence
↓ registra qué se encontró
↓ (datos, valores, hallazgos — atribuibles a una fuente)

EvidenceAssessment
↓ evalúa qué significa lo encontrado
↓ (dirección, confianza, justificación — atribuible al usuario)
```

Estas capas se relacionan por referencia (ID), nunca por copia:

```
EvidenceAssessment.observedEvidenceId → ObservedEvidence
ObservedEvidence.contrastationRowId  → ContrastationRow
ObservedEvidence.indicatorId         → ConceptualIndicator (no se copia su nombre)
ObservedEvidence.sourceId            → EvidenceSource (no se copia su nombre)
```

---

## Consecuencias

### Consecuencias positivas

- **Trazabilidad completa:** Cualquier evaluación puede rastrearse hasta su criterio de contrastación, indicador, fuente, variable e hipótesis.
- **Auditable:** Es posible verificar independientemente si la dirección declarada es consistente con los datos registrados.
- **Revisable:** El investigador puede actualizar su evaluación sin alterar los datos observados.
- **No ambigua:** "La fuente dijo X" (ObservedEvidence) está separado de "X implica que la hipótesis se debilita" (EvidenceAssessment).
- **Sin duplicación:** Los nombres de indicadores, fuentes, variables e hipótesis existen una sola vez en sus entidades originales.

### Consecuencias negativas (aceptadas)

- Más entidades en sesión (mayor complejidad de estado).
- El usuario debe completar explícitamente la evaluación — no hay atajos automáticos.
- La interfaz debe mostrar ambas capas (datos + evaluación) en paralelo para facilitar el juicio.

---

## Reglas que derivan de esta decisión

1. **No duplicar:** El servicio no copia el nombre del indicador, la fuente, la variable ni la hipótesis en ObservedEvidence.
2. **No auto-asignar:** `EvidenceAssessment.direction` y `EvidenceAssessment.confidence` no tienen valores por defecto computados por HELIOS.
3. **No inferir:** HELIOS no infiere que una evidencia "apoya" o "debilita" una hipótesis por ningún mecanismo automático.
4. **No promediar:** El sistema no calcula un "score" de validez ni una probabilidad de que la hipótesis sea verdadera.
5. **No auto-concluir:** `HypothesisEvidenceConclusion.conclusionStatus` lo elige el usuario — HELIOS puede mostrar un resumen descriptivo de las direcciones registradas pero no sugiere el estado final.

---

## Notas metodológicas explícitas

- `direction = "supports"` **no significa** prueba definitiva de la hipótesis.
- `direction = "weakens"` **no significa** refutación definitiva de la hipótesis.
- `confidence = "high"` **no equivale** a probabilidad estadística alta.
- HELIOS **no determina causalidad**. Registra la evaluación declarada por el investigador.
- La **conclusión es formulada por el usuario**, no por el sistema.

---

## Alternativas consideradas y descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Una sola entidad `EvidenceRecord` con todos los campos | Mezcla datos e interpretación; imposible distinguir fuente del hallazgo vs. juicio del usuario |
| Derivación automática de dirección desde el valor observado | Requiere inferencia semántica — introduce sesgos no auditables |
| Score numérico de validez | Crea falsa precisión; incompatible con evidencia cualitativa |
| Conclusión sugerida por el sistema | Sustituye el juicio del investigador — violación fundamental del principio de atribución |

---

## Relación con otros ADRs

- **ADR-0010** (S-021): Las reglas de consistencia metodológica validan la coherencia estructural; ADR-0011 extiende ese principio a la capa de evidencia observada.
- **ADR-0009** (S-020): Las relaciones son entidades de primer nivel — ObservedEvidence, EvidenceAssessment y HypothesisEvidenceConclusion se representan como nodos en el Knowledge Graph.
