# HELIOS — Changelog

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
- `src/router/KnowledgeRouter.ts` — instancia configurable; inyecta `RoutingAlgorithm`; umbrales de confianza (alta ≥ 0.42, media ≥ 0.20, ninguna < 0.05); detección de empate (delta ≤ 0.09); solo carga contenido del pack ganador (lazy imports)
- `src/router/registry.ts` — registro explícito de packs; añadir un pack = 1 entrada nueva sin tocar Helios.tsx ni KnowledgeRouter.ts

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

#### Preparado para escalar

- Interfaz `RoutingAlgorithm` estable para reemplazar por embeddings, LLM o RAG sin modificar el Router
- Registry como única línea de cambio al añadir un nuevo pack
- Metadata lazy-loading: solo se carga el contenido del pack seleccionado

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
