# ADR-0010 — La consistencia metodológica se evalúa mediante reglas explícitas y trazables

**Estado:** Aceptado  
**Sprint:** S-021  
**Fecha:** 2026-07-17

---

## Contexto

Después de S-020, HELIOS puede construir un Knowledge Graph de la sesión y validar
su integridad estructural (ciclos, referencias rotas, nodos huérfanos). Sin embargo,
la integridad estructural no garantiza consistencia metodológica. Una cadena puede estar
técnicamente conectada y, aun así, presentar hipótesis causales sin variable de resultado,
indicadores cruzados entre hipótesis, fuentes no utilizadas, o criterios de contrastación
desconectados del modelo conceptual.

El sistema necesita un motor capaz de detectar estas inconsistencias de forma explicable:
no como puntuaciones opacas ni semáforos, sino como observaciones derivadas de reglas
identificables y verificables.

---

## Decisión

Se crea un **MotordeConsistenciaMetodológica** (`MethodologicalConsistencyService`)
con las siguientes reglas de diseño:

### 1. Toda evaluación deriva de una regla documentada

Cada observación metodológica debe poder referenciarse a una regla con:
- **ID estable** (e.g., `HYP-002`)
- **Nombre** y descripción
- **Categoría** (`hypothesis-structure`, `variable-coverage`, etc.)
- **Severidad** (`error` | `warning` | `suggestion`)
- **Función evaluadora pura**

### 2. Todo hallazgo debe ser trazable

Cada `MethodologicalFinding` incluye:
- La regla que lo originó (`ruleId`)
- Las entidades involucradas (`entityRefs` con type + id + label)
- Evidencia estructural concreta (`evidence[]`)
- Explicación determinista (no generada por LLM)
- Acción sugerida

### 3. Separación de responsabilidades

```
Servicios de dominio (S-017, S-018, S-019)
  └── validan cada entidad localmente, por instancia

KnowledgeGraphService (S-020)
  └── valida estructura del grafo: ciclos, referencias rotas, nodos huérfanos

MethodologicalConsistencyService (S-021)
  └── valida coherencia metodológica ENTRE entidades (cross-service)
```

El MCS **no** duplica validaciones locales de S-017–S-019. Evalúa únicamente
inconsistencias que solo pueden detectarse con visión de sesión completa.

### 4. El sistema no corrige automáticamente

El MCS produce `MethodologicalAudit` — un informe de solo lectura. No modifica
la sesión, no elimina entidades, no recomienda texto alternativo. El analista
decide qué hacer con cada hallazgo.

### 5. El motor evalúa consistencia estructural, no verdad científica

**El sistema no evalúa:**
- Calidad estadística de indicadores
- Validez de constructo
- Confiabilidad de fuentes
- Representatividad muestral
- Causalidad real
- Suficiencia empírica
- Pertinencia temática
- Calidad de la redacción
- Veracidad de la hipótesis

Estas limitaciones están documentadas en `docs/architecture/S-021-methodological-consistency-review.md`.

### 6. Severidad semántica

- **`error`:** Inconsistencia que impide considerar completa la cadena metodológica
  (e.g., hipótesis sin variable de resultado).
- **`warning`:** Debilidad que no invalida el diseño pero requiere revisión
  (e.g., indicador no contrastado).
- **`suggestion`:** Oportunidad de mejora que no afecta la completitud estructural
  (e.g., escala de medición ausente).

No se usan puntuaciones numéricas de 0 a 100.

### 7. Resultado derivado, nunca persistido

El `MethodologicalAudit` se genera en tiempo de ejecución desde la sesión.
Si la sesión cambia, la auditoría debe regenerarse. El estado de UI (filtros,
finding seleccionado) vive en el componente, no en la sesión HELIOS.

---

## Catálogo de reglas

| ID | Nombre | Categoría | Severidad |
|---|---|---|---|
| HYP-001 | Hipótesis causal sin variable causal | hypothesis-structure | error |
| HYP-002 | Hipótesis causal sin variable de resultado | hypothesis-structure | error |
| HYP-003 | Hipótesis sin modelo conceptual | hypothesis-structure | error |
| HYP-004 | Hipótesis sin operacionalización | completeness | warning |
| VAR-001 | Variable sin indicador | variable-coverage | error |
| VAR-002 | Variable de resultado no contrastada | variable-coverage | warning |
| VAR-003 | Variable sin definición operacional | variable-coverage | warning |
| VAR-004 | Variable aislada | variable-coverage | warning |
| IND-001 | Indicador sin variable | indicator-alignment | error |
| IND-002 | Indicador no operacionalizado | indicator-alignment | warning |
| IND-003 | Indicador no contrastado | indicator-alignment | suggestion |
| IND-004 | Indicador cruzado entre hipótesis | indicator-alignment | error |
| IND-005 | Indicador redundante | redundancy | warning |
| SRC-001 | Indicador contrastado sin fuente operacionalizada | evidence-coverage | error |
| SRC-002 | Fuente no utilizada (unused) | evidence-coverage | suggestion |
| SRC-003 | Fuente utilizada fuera del indicador correspondiente | evidence-coverage | warning |
| OPR-001 | Dimensión sin indicador | operationalization-coherence | error |
| OPR-002 | Dimensión sin fuente | operationalization-coherence | error |
| OPR-003 | Dimensión operacionalizada pero no contrastada | operationalization-coherence | warning |
| OPR-004 | Filas de operacionalización duplicadas | redundancy | warning |
| OPR-005 | Escala o unidad ausente | operationalization-coherence | suggestion |
| CON-001 | Evidencia esperada sin evidencia contraria | contrastation-coherence | error |
| CON-002 | Evidencia contraria sin criterio de interpretación | contrastation-coherence | warning |
| CON-003 | Contrastación con indicador no operacionalizado | contrastation-coherence | error |
| CON-004 | Contrastación con fuente no operacionalizada | contrastation-coherence | warning |
| CON-005 | Hipótesis sin criterios de contrastación | contrastation-coherence | error |
| CON-006 | Criterio de contrastación duplicado | redundancy | warning |
| TRA-001 | Cadena metodológica incompleta | traceability | error |
| TRA-002 | Referencia rota en el Knowledge Graph | traceability | error |
| TRA-003 | Entidad aislada | traceability | warning |
| TRA-004 | Dependencia circular ilegal | traceability | error |

---

## Consecuencias

**Positivas:**
- Cada hallazgo es auditable: el analista puede ver qué regla lo originó.
- El catálogo es extensible: agregar una regla no requiere modificar el servicio principal.
- El sistema no bloquea el flujo — solo informa.
- Compatible hacia atrás: MCS no modifica S-017–S-020.

**Negativas:**
- Las reglas no capturan similitud semántica ni pertinencia temática — el sistema
  puede no detectar errores metodológicos conceptuales profundos.
- El analista debe interpretar y actuar sobre los hallazgos manualmente.
