# S-021 Architecture Review — Motor de Consistencia Metodológica

> Fecha: 2026-07-17  
> Sprint: S-021  
> Reviewer: HELIOS Architecture Board  
> Referencia: ADR-0010, `src/methodological-consistency/`

---

## Q-01: ¿Por qué el MCS es un servicio de auditoría y no un validador en tiempo real?

El diseño deliberado fue **auditoría post-hoc** en lugar de validación en tiempo real por tres razones:

1. **Coherencia cruzada requiere vista completa.** Las reglas más importantes (IND-004, CON-003, TRA-001) solo se pueden evaluar cuando toda la cadena hypothesis→variable→indicator→source→op-row→ct-row está presente. Un validador por etapa vería datos incompletos y generaría falsos positivos masivos.
2. **No bloquea el flujo editorial.** El usuario puede construir su diseño metodológico en el orden que prefiera. La auditoría es una herramienta de revisión, no una puerta.
3. **Separación de concerns.** Cada servicio de etapa (ConceptualModelService, OperationalizationService, ContrastationService) valida su propia entidad localmente. El MCS valida relaciones *entre* entidades — responsabilidad que ninguno de los servicios previos puede asumir solo.

---

## Q-02: ¿Cómo se relacionan las reglas del MCS con los servicios de etapa anteriores?

Existe una jerarquía de responsabilidades:

| Capa | Servicio | Valida |
|---|---|---|
| 1 | `ConceptualModelService` | Estructura interna del modelo (variables, roles, coherencia básica) |
| 2 | `OperationalizationService` | Coherencia interna de la matriz de operacionalización |
| 3 | `ContrastationService` | Coherencia interna de la matriz de contrastación |
| 4 | `KnowledgeGraphService` | Integridad estructural del grafo (nodos huérfanos, aristas rotas) |
| 5 | `MethodologicalConsistencyService` | Coherencia *cruzada* entre todas las capas anteriores |

El MCS no duplica las validaciones de capas inferiores: asume que los datos son estructuralmente válidos y evalúa si forman una cadena metodológica coherente. Por ejemplo, VAR-003 ("variable con indicadores pero sin fila de operacionalización") requiere ver tanto el modelo conceptual como la matriz de operacionalización — imposible para un servicio de capa 2.

---

## Q-03: ¿Por qué 31 reglas y no más o menos?

Las 31 reglas cubren las 9 categorías de la taxonomía metodológica de política pública (HYP/VAR/IND/SRC/OPR/CON/TRA):

- **Mínimo suficiente:** cada regla detecta una violación metodológica específica que no puede ser inferida por otra regla.
- **Sin solapamiento:** las reglas fueron diseñadas para ser ortogonales — un hallazgo de HYP-001 no implica automáticamente uno de HYP-002.
- **Extensible:** el catálogo `ALL_RULES` en `rules.ts` acepta nuevas reglas sin modificar el evaluador central ni la UI.
- **Límite práctico:** 31 reglas producen entre 0 y ~15 hallazgos en diseños típicos — un número manejable en la UI de auditoría.

---

## Q-04: ¿Cómo se garantiza que las reglas son puras y no mutan el estado?

Cada evaluador en `rules.ts` es una función pura `(input: MethodologicalAuditInput, graph?: KnowledgeGraph) => MethodologicalFinding[]`:

1. **No hay efectos secundarios:** los evaluadores solo leen `input` y `graph`, nunca los modifican.
2. **TC-49** en la suite S-021 verifica explícitamente que `input.hypotheses.length` y `input.conceptualModels.length` permanecen iguales después de ejecutar el audit completo.
3. **Construcción inmutable de hallazgos:** cada `MethodologicalFinding` es un objeto nuevo creado con spread o literales — nunca se modifica un objeto existente.
4. **Idempotencia verificada:** TC-48 corre `runMethodologicalAudit` dos veces con el mismo input y verifica que los conteos son idénticos.

---

## Q-05: ¿Cuál es la distinción "orphan vs unused" y por qué importa?

Esta distinción fue introducida en S-021 §15.2 porque conflaban dos problemas metodológicos distintos:

- **Orphan (huérfano):** una entidad con una relación *obligatoria ausente*. Ejemplo: un indicador sin ningún enlace `derives-from/measures` a una variable. Esto es una violación estructural del grafo — el indicador no tiene origen metodológico.

- **Unused (no utilizado):** una entidad con su relación obligatoria *presente*, pero que no es referenciada por ninguna fila operacional o de contrastación. Ejemplo: una fuente con sus `indicadorIds` correctamente definidos, pero que ninguna `OperationalizationRow` ni `ContrastationRow` la usa. Esto es un problema de cobertura — la fuente existe pero no contribuye al análisis.

Tratarlos como la misma categoría habría producido falsos negativos (entidades "válidas" que SRC-002 debía detectar como no utilizadas).

---

## Q-06: ¿Cómo se integra `PantallaAuditoriaMetodologica` en el flujo de navegación de HELIOS?

La pantalla de auditoría se accede como destino explícito desde dos puntos:

```
PantallaRevisionFinal  ──onEjecutarAuditoria──▶  PantallaAuditoriaMetodologica
PantallaKnowledgeGraph ──onEjecutarAuditoria──▶  PantallaAuditoriaMetodologica
```

Y desde la auditoría se puede navegar a:
- `onVolver` → `PantallaRevisionFinal`
- `onIrAHipotesis` → `PantallaRevisionHipotesis`
- `onIrAModelo` → `PantallaConceptualModel`
- `onIrAOperacionalizacion` → `PantallaOperationalizationMatrix`
- `onIrAContrastation` → `PantallaContrastationMatrix`
- `onVerKnowledgeGraph` → `PantallaKnowledgeGraph` (optional)

La pantalla "auditoria" en `Helios.tsx` solo se renderiza si `hypotheses.length > 0` — evita el estado vacío.

---

## Q-07: ¿Por qué el audit se ejecuta en `useMemo` en mount y no con `useEffect`?

`useMemo` con array de dependencias vacío (apuntando al mount) garantiza:

1. **Sincronía:** el resultado está disponible en el primer render — sin flickering de pantalla vacía.
2. **Determinismo:** el audit no puede cambiar durante la vida del componente porque el input de sesión es inmutable desde la perspectiva de la pantalla de auditoría.
3. **Corrección:** `useEffect` ejecutaría después del primer render y requeriría estado adicional (`null | MethodologicalAudit`) — innecesario dado que el audit es puro y barato computacionalmente.

El array de dependencias vacío es intencional y documentado con `// eslint-disable-next-line react-hooks/exhaustive-deps`.

---

## Q-08: ¿Cómo se evita el "auto-correct" que el ADR-0010 prohíbe?

El MCS nunca modifica el estado de la sesión. Sus responsabilidades son:

1. Leer `MethodologicalAuditInput` (lectura inmutable).
2. Generar `MethodologicalFinding[]` (nuevo array, nuevos objetos).
3. Devolver `MethodologicalAudit` (nuevo objeto).

No existe ninguna función del tipo `fixRule()`, `autoComplete()`, o `suggestAndApply()`. El campo `suggestedAction` en cada `MethodologicalFinding` es **texto descriptivo** para el usuario — no una acción ejecutable por el sistema. La corrección requiere acción humana explícita en la pantalla correspondiente.

---

## Q-09: ¿Cómo se traza cada hallazgo hasta su regla y su evidencia estructural?

Cada `MethodologicalFinding` contiene:

```typescript
{
  ruleId: "VAR-001",              // código único de la regla
  title: "Variable sin indicador", // título legible
  explanation: "...",             // explicación del problema
  evidence: ["Variable 'X' (var-42) no tiene ningún indicador asociado"],
  entityRefs: [{ type: "conceptual-variable", id: "var-42", label: "X" }],
  suggestedAction: "Agregar al menos un indicador...",
  severity: "error",
  category: "VARIABLE"
}
```

La trazabilidad va de hallazgo → regla (por `ruleId`) → entidad (por `entityRefs`) → pantalla (por `entityNav()` en `PantallaAuditoriaMetodologica`).

---

## Q-10: ¿Qué pasa si el mismo indicador aparece en múltiples hipótesis? ¿Cuándo es error y cuándo es válido?

**IND-004** detecta indicadores compartidos entre hipótesis cuando el contexto de uso viola la coherencia metodológica:

- **Error:** un `ContrastationRow` de la hipótesis B usa un indicador que pertenece al modelo conceptual de la hipótesis A. La contrastación B está usando evidencia del diseño metodológico de A — esto implica que la hipótesis B no tiene su propio fundamento de medición.

- **Válido (no detectado):** si un indicador genérico (e.g., "tasa de desempleo") está definido en ambos modelos conceptuales (A y B) con sus propias entradas, y cada hipótesis lo usa en sus propias filas de operacionalización y contrastación, no hay cruce — son dos instancias independientes del mismo tipo de indicador.

La regla IND-004 evalúa cross-reference por `id` de instancia, no por nombre.

---

## Q-11: ¿Cómo escalaría el MCS si se agregan más hipótesis o más reglas?

**Hipótesis adicionales:** `runMethodologicalAudit` itera sobre todas las hipótesis en `input.hypotheses`. No hay estado acumulativo — cada regla recibe el input completo y puede examinar todas las hipótesis. TC-50 verifica que múltiples hipótesis son evaluadas independientemente.

**Reglas adicionales:** el catálogo `ALL_RULES` en `rules.ts` es un array `RegisteredRule[]`. Para agregar una regla nueva:
1. Definir `id`, `category`, `severity`, `title`, `description`, `evaluator`.
2. Agregar a `ALL_RULES`.
3. `runMethodologicalAudit` la ejecuta automáticamente.
4. La UI de filtros en `PantallaAuditoriaMetodologica` la muestra automáticamente en el filtro de categorías.

No se requiere modificar el evaluador central ni los componentes UI.

---

## Q-12: ¿Cuál es la diferencia entre `topologicalTraversalDependentsFirst` y `topologicalTraversalDependenciesFirst`, y cuándo usar cada uno?

Ambas son exportadas desde `KnowledgeGraphService.ts` (S-021 §15.1):

| Función | Orden | Primer elemento | Útil para |
|---|---|---|---|
| `topologicalTraversalDependentsFirst` | Kahn's original | Nodos con in-degree=0 (op-rows, ct-rows) | Procesar entidades derivadas antes de sus dependencias; detección de ciclos |
| `topologicalTraversalDependenciesFirst` | Reverso del anterior | Nodos con out-degree=0 (problema) | Generar documentación lineal; visualizar la cadena desde el origen |
| `topologicalTraversal` | Alias de `DependentsFirst` | — | Retrocompatibilidad con código S-020 |

En HELIOS, la convención de aristas es `source → target = "source depende de target"` (e.g., hypothesis → problem). Por esto, en el orden Kahn estándar, problem aparece **último** (máximo in-degree). `topologicalTraversalDependenciesFirst` invierte esto para exponer problem como la raíz del árbol.
