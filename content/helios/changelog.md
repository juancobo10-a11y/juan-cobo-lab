# HELIOS — Changelog

---

## v0.5.1 — 2026-07-15

### Consolidación de HELIOS Core

**Objetivo:** reducir deuda técnica y preparar el núcleo para IA semántica, nuevos Knowledge Packs y mayor escala. Sin cambios visuales ni de flujo.

---

#### Tarea 1 — RoutingAlgorithm asíncrono

`RoutingAlgorithm.score()` ahora retorna `Promise<{ score, terminosCoincidentes }>`.

- `KeywordAlgorithm.ts`: marcado `async`; el cómputo sigue siendo síncrono pero satisface el contrato
- `KnowledgeRouter.ts`: `await this.algorithm.score(...)` en todos los call-sites
- `smoke.ts`: actualizado con `await`

**Beneficio:** cualquier implementación futura (embeddings, LLM, RAG) es un drop-in sin tocar `KnowledgeRouter` ni `Helios.tsx`.

---

#### Tarea 2 — Decisión sobre descubrimiento de Knowledge Packs

**Decisión: mantener registry explícito.**

`import.meta.glob` fue evaluado contra el registro explícito bajo los siguientes criterios:

| Criterio | Registry explícito | import.meta.glob |
|---|---|---|
| Compatibilidad con Vite + `fs.strict` | ✅ Funciona hoy | ❌ No puede cruzar el project root |
| Tipado completo | ✅ | ⚠️ Requiere casting manual |
| Lazy loading de contenido | ✅ | ✅ |
| Facilidad para agregar packs | Modificar 1 archivo (registry.ts) | Automático |
| Control sobre packs inactivos | ✅ Campo `estado` | ✅ |
| Facilidad de prueba | ✅ Inyección por constructor | ⚠️ Más difícil de aislar |

**Causa técnica de la incompatibilidad de glob:** Vite project root = `artifacts/juan-cobo-lab/`; `content/` está en el workspace root (2 niveles arriba). `server.fs.strict: true` bloquea el glob fuera del root. Los imports estáticos funcionan porque Rollup los resuelve antes que la restricción fs.

**Path a auto-descubrimiento futuro:** mover `content/` dentro de `artifacts/juan-cobo-lab/` desbloquea `glob("./content/*/metadata.json")` sin cambios de seguridad.

**Mejora implementada:** KnowledgeRouter ahora acepta un registry inyectable (`new KnowledgeRouter(algo, registry)`), lo que permite tests con packs mock sin modificar `Helios.tsx`.

---

#### Tarea 3 — PackMetadata enriquecido

Nuevos campos en `types.ts` y en ambos `metadata.json`:

```typescript
autor: string;
institucion: string;
ultimaActualizacion: string;
fuentes: string[];
licencia: string;
estadoRevision: "experimental" | "revisado" | "validado";
```

Valores iniciales en ambos packs: `"Juan Cobo Lab"`, `"2026-07-15"`, `[]`, `"Todos los derechos reservados"`, `"experimental"`. Los campos no se muestran en la UI todavía.

---

#### Tarea 4 — Caché del Router

`KnowledgeRouter` ahora incluye una caché `Map<string, RouterResult>`:

- Clave: texto normalizado del input (misma función `normalizeText` que usa el algoritmo)
- Primer llamado calcula y cachea; llamados idénticos devuelven la misma instancia de `RouterResult`
- `clearCache(): void` disponible para tests y actualizaciones de packs

---

#### Tarea 5 — PantallaSinPack dinámica

La pantalla de "área no reconocida" ya no enumera dominios hardcodeados. Ahora consume `heliosRouter.getActivePacks()` y renderiza la lista desde el registry:

```tsx
packsActivos={heliosRouter.getActivePacks()}
// → lista construida desde REGISTRY en tiempo de ejecución
```

Agregar un nuevo pack activo lo hace aparecer automáticamente en esta pantalla sin modificar `Helios.tsx`.

---

#### Tarea 6 — Constantes centralizadas

Nuevo archivo `src/router/constants.ts` con `ROUTER_THRESHOLDS` como única fuente de verdad:

```typescript
{ ninguna: 0.05, baja: 0.20, alta: 0.42, tieDelta: 0.09 }
```

`KnowledgeRouter.ts` y `smoke.ts` importan desde aquí. Los valores duplicados en el test fueron eliminados.

---

#### Tarea 7 — Validación de scores

`KnowledgeRouter._route()` aplica `guardScore()` a cada score retornado por el algoritmo:

- Si el score está en `[0, 1]`: pasa sin modificación
- Si está fuera de rango: se clampea a `[0, 1]` y en `DEV` se imprime `console.warn` con el pack ID y el valor problemático
- Comportamiento estable garantizado cuando se integre un algoritmo que devuelva logits u otras distribuciones no normalizadas

---

#### Utilidades compartidas

Nuevo `src/router/utils.ts` con `normalizeText()`:
- Usada por `KeywordAlgorithm` (scoring) y `KnowledgeRouter` (clave de caché)
- Elimina duplicación de la función de normalización

---

#### Resultados de pruebas — 9/9 ✅

| # | Consulta | Resultado esperado | Score |
|---|---|---|---|
| 1 | "¿Por qué persiste la brecha digital en Colombia?" | TIC (alta) | 0.788 |
| 2 | "¿Por qué aumenta la deserción escolar?" | Educación (alta) | 0.773 |
| 3 | "Habilidades digitales en adultos mayores" | TIC (media) | 0.409 |
| 4 | "¿Cómo reducir la mortalidad materna?" | ninguno | 0 |
| 5 | "Conectividad en escuelas rurales" | candidatos (empate) | 0.242 / 0.182 |
| 6 | Repetir consulta #1 | TIC (caché hit) | mismo objeto |
| 7 | "¿Cómo reducir la mortalidad materna?" (3 packs) | Salud (alta) | 0.818 |
| C1 | Misma consulta → misma instancia RouterResult | ✅ caché funciona | — |
| C2 | `clearCache()` → nueva instancia | ✅ caché vaciada | — |

---

#### Deuda técnica eliminada en este sprint

- ✅ `RoutingAlgorithm` bloqueaba IA asíncrona
- ✅ Umbrales duplicados entre `KnowledgeRouter.ts` y `smoke.ts`
- ✅ `normalizeText` duplicada entre `KeywordAlgorithm` y el router (ahora en `utils.ts`)
- ✅ Scores sin validación de rango (ahora `guardScore()` con clamp + warn)
- ✅ `PantallaSinPack` con dominios hardcodeados (ahora dinámica)
- ✅ Registry sin documentación de la decisión de diseño (documentada en `registry.ts`)
- ✅ KnowledgeRouter no testeable en aislamiento (ahora acepta registry inyectable)

---

#### Riesgos pendientes

| Riesgo | Impacto | Decisión |
|---|---|---|
| Denominador de score sensible a longitud del input | Consultas largas con vocabulario neutro obtienen scores más bajos aunque el tema coincida | Aceptado — comportamiento correcto por diseño; documentar en guía de autoría de packs |
| Stemmer con falsos colapsos en `-sis`, `-ción` | Packs de salud, derecho o economía pueden generar stems incorrectos | Bajo riesgo con packs actuales; revisar al agregar el tercer pack real |
| Carga de contenido de packs secundarios en caso de ganador claro | Con 10+ packs, cargar todos los candidatos sobre el umbral mínimo puede ser innecesario | Mitigar al escalar: separar selección de carga, pasar pack ganador sin contenido y cargarlo en la transición |
| Build requiere `PORT` y `BASE_PATH` como env vars | `pnpm run build` bare falla sin ellas | Pendiente: hacer opcionales con defaults en `vite.config.ts` |

---

## v0.5 — 2026-07-14

### Knowledge Router (RFC-0001)

**Arquitectura nueva — sin cambios visuales al usuario**

#### Módulos creados

- `src/router/types.ts` — contratos públicos: `PackMetadata`, `KnowledgePack`, `RouterInput`, `MatchedTerm`, `PackCandidate`, `RouterResult`, `RoutingAlgorithm`
- `src/router/algorithms/KeywordAlgorithm.ts` — algoritmo v1 determinista:
  - Normalización de tildes (NFD + strip diacritics)
  - Eliminación de palabras vacías (40+ stopwords español)
  - Stemmer básico singular/plural (`-es`, `-s`)
  - Reconocimiento de frases completas (`"brecha digital"` > `"digital"`)
  - Pesos por campo: keyword-frase 0.55 > keyword-token 0.30 > tema 0.20 > título 0.15 > descripción 0.10
  - Deduplicación: tokens cubiertos por una frase no se vuelven a puntuar
- `src/router/KnowledgeRouter.ts` — instancia configurable; singleton `heliosRouter`; umbrales alta ≥ 0.42, baja < 0.20, ninguna < 0.05, tieDelta = 0.09
- `src/router/__tests__/smoke.ts` — script tsx que prueba los 5 criterios de aceptación contra el algoritmo directamente

#### Knowledge Pack Educación (nuevo)

- `content/educacion/` con 5 archivos JSON: metadata, contexto, hipotesis (3), pestel (6 dimensiones), chips
- Tema: deserción escolar en Colombia — causas económicas, geográficas y pedagógicas

#### Knowledge Pack TIC (actualizado)

- `content/tic/metadata.json` — campo `keywords` añadido (18 términos de dominio)

#### Integración en Helios.tsx

- Eliminados los 4 imports estáticos de JSON hardcoded
- Nuevo estado de pantalla: `"enrutando"` → `"confirmacion-candidatos"` → `"sin-pack"`
- `PantallaEnrutando`: spinner mientras el router procesa la consulta
- `PantallaConfirmacion`: muestra candidatos con score, confianza y términos coincidentes cuando hay empate o baja confianza; el usuario elige
- `PantallaSinPack`: respuesta cuando ningún pack supera el umbral mínimo
- Las 4 pantallas originales (Entrada, Hipótesis, PESTEL, Descubrimiento) sin cambios visuales

#### Resultados de los casos de aceptación (smoke tests 5/5 ✅)

| Consulta | Decisión | Pack | Score |
|---|---|---|---|
| "¿Por qué persiste la brecha digital?" | seleccionado | TIC | 0.955 (alta) |
| "¿Por qué aumenta la deserción escolar?" | seleccionado | Educación | 0.773 (alta) |
| "Habilidades digitales en adultos mayores" | seleccionado | TIC | 0.409 (media) |
| "¿Cómo reducir la mortalidad materna?" | ninguno | — | 0 |
| "Conectividad en escuelas rurales" | candidatos (empate) | TIC + Educación | 0.242 / 0.182 |

---

## v0.4 — 2026-07-11

### Arquitectura de contenido
- Knowledge Pack TIC externalizado a `content/tic/` (5 archivos JSON): `metadata.json`, `contexto.json`, `hipotesis.json`, `pestel.json`, `chips.json`
- `Helios.tsx` eliminó todo el contenido hardcoded — ahora consume exclusivamente los archivos JSON del Knowledge Pack
- Tipos TypeScript (`Hipotesis`, `PestelItem`) definidos explícitamente para garantizar seguridad de tipos en la importación JSON
- `metadata.json` introduce el esquema de identidad del caso (`id`, `titulo`, `tema`, `herramienta`, `estado`) como infraestructura para el Router (Sprint 0.5)
- Experiencia del usuario sin cambios: flujo de 4 pantallas, animaciones, chips y accesibilidad idénticos

---

## v0.3 — 2026-07-11

### Caso real: Índice de Brecha Digital Colombia
- Contexto: reemplaza deserción escolar por párrafo sobre brecha digital (~120 palabras)
- Hipótesis: 3 nuevas hipótesis sobre brecha digital con campo `nextStep` por hipótesis
  - "La infraestructura dejó de ser el cuello de botella principal" — Alta
  - "Las soluciones uniformes no funcionan en territorios tan diversos" — Alta
  - "Los indicadores actuales miden cobertura, no transformación" — Media
- PESTEL: 6 dimensiones adaptadas (Ministerio TIC, costo de datos, habilidades digitales, calidad de conexión, geografía colombiana, espectro radioeléctrico)
- Chips "Otros usuarios han explorado": 7 temas metodológicos de brecha digital
- Chips "Por ejemplo": 4 ejemplos de brecha digital, el primero formulado como pregunta
- Pantalla 4: "Problema inicial" → "Problema analizado"; "Lo aprendido" → "Próximo paso recomendado" (dinámico según hipótesis elegida)

---

## v0.2 — 2026-07-10

### Pantalla 1 (Entrada)
- Nuevo subtítulo: "HELIOS no comienza proponiendo soluciones. Comienza ayudándote a comprender mejor el problema."
- Placeholder actualizado: "Describe el fenómeno que observas..."
- Chips de ejemplo rápido: Deserción escolar rural, Baja ejecución presupuestal, Conectividad significativa, Violencia intrafamiliar
- Nueva sección "Otros usuarios han explorado" con siete chips clicables
- Foco automático en el textarea al cargar la pantalla

### Pantalla 2 (Hipótesis)
- Nuevo título: "Antes de proponer soluciones, comprendamos el problema."
- Tarjetas de hipótesis ahora incluyen badge de nivel de confianza (Alta / Media / Exploratoria)
- Texto de respaldo: "Basada en evidencia y literatura internacional."
- Tarjetas son botones semánticos con soporte completo de teclado

### Pantalla 3 (PESTEL)
- Texto introductorio nuevo: "No todos los problemas públicos deben analizarse de la misma manera..."
- Dimensiones renombradas al español: Política, Economía, Sociedad, Tecnología, Ambiente, Marco Legal

### Pantalla 4 (Descubrimiento) — nueva
- Reemplaza el cierre provisional de v0.1
- Muestra journey visual: Problema → Hipótesis → Herramienta → Lo aprendido
- Texto de cierre: "En pocos minutos pasaste de describir un fenómeno a construir una hipótesis de trabajo..."
- Tres botones: Analizar otro problema / Explorar otra hipótesis / Conocer HELIOS
- Cita de cierre: "Las respuestas cambian. Las buenas preguntas permanecen."

### Navbar
- Enlace HELIOS muestra badge naranja "Beta" (desktop + mobile)

### Accesibilidad
- Gestión de foco programática en cada transición de pantalla
- Focus ring visible en todos los elementos interactivos
- Roles ARIA correctos en listas de hipótesis

---

## v0.1 — 2026-07-09

- Prototipo inicial: tres pantallas (entrada, hipótesis, PESTEL)
- Contenido estático hardcoded para "deserción escolar"
- Transiciones AnimatePresence entre pantallas
- Ruta `/helios` registrada en Juan Cobo Lab
