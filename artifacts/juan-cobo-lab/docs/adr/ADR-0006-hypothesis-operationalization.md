# ADR-0006 — Toda hipótesis debe poder operacionalizarse

**Status:** Accepted  
**Date:** 2026-07-17  
**Sprint:** S-017  
**Author:** HELIOS Project

---

## Contexto

Después de S-011 a S-016, HELIOS permite identificar Thinking Patterns, capturar reflexiones, construir hipótesis explícitas (ADR-0005) y revisar su coherencia metodológica.

Sin embargo, una hipótesis bien formulada que no puede conectarse con evidencia observable permanece como enunciado teórico sin valor analítico práctico. El paso siguiente es transformar cada hipótesis en un **modelo de investigación verificable**.

La pregunta central de S-017:

> *¿Qué tendría que observar para evaluar si esta hipótesis es correcta?*

---

## Decisión

**Toda hipótesis ingresada en HELIOS debe poder operacionalizarse.**

Una hipótesis adquiere valor analítico cuando puede traducirse en:
1. **Variables observables** con roles claros dentro del modelo causal
2. **Indicadores verificables** con criterios de medición explícitos
3. **Fuentes de evidencia identificables** con información sobre acceso y limitaciones

HELIOS no produce indicadores automáticamente — ayuda a estructurarlos.

---

## Consecuencias

### Lo que cambia

- El flujo de HELIOS se extiende con una nueva etapa: **Modelo Conceptual**, posterior a la revisión de hipótesis.
- Cada hipótesis puede tener exactamente un `ConceptualModel` asociado (relación 1:1).
- El modelo es session-only (in-memory) — no persiste entre recargas.

### Restricciones de integridad

| Regla | Consecuencia en violación |
|---|---|
| Los indicadores sin variable no están permitidos | Error bloqueante en `validateConceptualModel()` |
| Las fuentes sin indicador no están permitidas | Error bloqueante en `validateConceptualModel()` |
| Los modelos sin variables bloquean la confirmación | Error bloqueante en `validateConceptualModel()` |
| Las variables sin indicadores son toleradas | Advertencia (no bloqueo de edición) |
| Los indicadores sin fuentes son tolerados | Advertencia (no bloqueo de edición) |

### Lo que NO cambia

- ADR-0001 a ADR-0005 permanecen intactos.
- El Router, el ThinkingEngine y el HypothesisBuilder no se modifican.
- No se incorpora generación automática de indicadores ni llamadas a LLMs.
- No se precargan instituciones ni fuentes — el usuario las define.

### Principio de separación de preocupaciones

`ConceptualModelService.ts` no contiene conocimiento sectorial. Ninguna función asume un dominio de política específico. Las variables, indicadores y fuentes son entidades genéricas definidas completamente por el analista.

---

## Alternativas descartadas

### Alternativa 1: Enriquecer `PolicyHypothesis` con campos de variables/indicadores directamente

**Razón de descarte:** `PolicyHypothesis` ya tiene `variables: HypothesisVariable[]` para el esquema causal básico. Mezclar los indicadores y fuentes en la misma entidad crearía una estructura monolítica difícil de validar y extender. La separación en `ConceptualModel` permite que la hipótesis y su operacionalización evolucionen independientemente.

### Alternativa 2: Generación automática de indicadores sugeridos

**Razón de descarte:** Requeriría LLM o embeddings, introduciendo dependencias externas y latencia. El sprint especifica explícitamente: *"No introducir LLM, embeddings ni servicios externos."* La generación asistida puede ser una extensión futura (sprint posterior).

### Alternativa 3: Modelos compartidos entre hipótesis

**Razón de descarte:** Cada hipótesis tiene un modelo causal diferente. Compartir un modelo entre hipótesis generaría acoplamiento y haría imposible la eliminación limpia de una hipótesis sin afectar otras. La relación 1:1 (una hipótesis → un modelo) es más simple y correcta.

---

## Modelo de datos resultante

```
PolicyHypothesis
  └── ConceptualModel
        ├── ConceptualVariable[]
        │     ├── nombre
        │     ├── descripcion
        │     ├── definicionOperacional
        │     └── rol: causa | resultado | mediadora | moderadora | control
        ├── ConceptualIndicator[]
        │     ├── nombre
        │     ├── variableId  ← FK a ConceptualVariable.id
        │     ├── unidad
        │     ├── formulaOCriterio
        │     ├── periodicidad
        │     ├── nivelTerritorial
        │     └── disponibilidad
        └── EvidenceSource[]
              ├── nombre
              ├── tipo
              ├── responsable
              ├── frecuencia
              ├── acceso
              ├── limitaciones
              └── indicadorIds[]  ← FK → ConceptualIndicator.id (many-to-many)
```

---

## Trazabilidad

El modelo conceptual extiende la cadena de trazabilidad ya establecida:

```
Problema
  ↓
Thinking Pattern (identificado por ThinkingRouter)
  ↓
Reflexión (capturada en pereque)
  ↓
Hipótesis (formulada en HypothesisBuilder, revisada en RevisionHipotesis)
  ↓
Variables (¿qué observar?)
  ↓
Indicadores (¿cómo medir?)
  ↓
Fuentes de evidencia (¿de dónde obtener los datos?)
```

Cada nivel es construido explícitamente por el analista. HELIOS estructura sin generar.

---

## Deuda técnica

1. **Persistencia**: el modelo es session-only. Una sesión recargada pierde todo. Solución futura: exportar a JSON o integrar localStorage.
2. **Generación asistida**: HELIOS podría sugerir indicadores estándar para variables frecuentes. Requiere un catálogo o LLM — fuera del alcance de S-017.
3. **Visualización relacional**: la vista jerárquica es suficiente para S-017. Un diagrama de relaciones entre variables (tipo DAG) es una mejora futura.
4. **Validación semántica**: HELIOS valida la estructura pero no el significado. Una variable "resultado" sin al menos un indicador de medición directa es estructuralmente válida pero metodológicamente débil — revisión futura.
