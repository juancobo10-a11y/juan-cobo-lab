# PROJECT_CURRENT_STATE.md
# Auditoría técnica completa — Juan Cobo Lab
**Fecha de auditoría:** 2026-07-23  
**Commit auditado:** S-026 — Knowledge Sources Foundation (Fuentes de Conocimiento)  
**Estado general:** Producción funcional en desarrollo activo. 20/20 suites de validación en verde.

---

## 1. Stack tecnológico actual

### Framework y lenguaje
| Componente | Versión | Notas |
|-----------|---------|-------|
| React | 18 (catalog) | Functional components + hooks |
| TypeScript | (catalog) | Strict mode, path aliases `@/` → `src/` |
| Vite | (catalog) | Bundler + dev server; `@tailwindcss/vite` plugin |
| Node.js | 18+ | Requerido para Web Crypto API nativa |

### Librerías principales
| Librería | Propósito |
|---------|----------|
| **Wouter 3.3.5** | Enrutamiento client-side (ligero, sin React Router) |
| **Framer Motion** (catalog) | Animaciones de pantallas HELIOS |
| **Radix UI** (suite completa) | Primitivos accesibles: Accordion, Dialog, Select, Tabs, Tooltip, Popover, etc. |
| **Tailwind CSS** (catalog) | Utility-first CSS, Tailwind v4 via `@tailwindcss/vite` |
| **@tailwindcss/typography** 0.5.15 | Estilos para contenido prose |
| **Lucide React** (catalog) | Iconografía principal |
| **React Icons** 5.4.0 | Iconografía complementaria |
| **TanStack Query** (catalog) | Query management (instalado, uso limitado actualmente) |
| **React Hook Form** 7.55 + **Zod** (catalog) | Formularios y validación de esquemas |
| **Sonner** 2.0.7 | Notificaciones toast |
| **Recharts** 2.15.2 | Gráficos (disponible, uso limitado) |
| **tw-animate-css** 1.4.0 | Animaciones CSS adicionales |
| **class-variance-authority** + **clsx** + **tailwind-merge** | Composición de clases Tailwind |
| **cmdk** 1.1.1 | Command palette |
| **date-fns** 3.6.0 | Utilidades de fecha |
| **Vaul** 1.1.2 | Drawer/bottom sheet |
| **tsx** (dev) | Ejecutor TypeScript directo para scripts de validación |
| **@workspace/api-client-react** | Cliente workspace interno (monorepo) |

### Sistema de estilos
- **Tailwind CSS v4** con variables CSS propias (`--background`, `--foreground`, `--accent`, `--primary`, etc.)
- **`src/index.css`**: variables de design token + layer utilities
- **`src/lib/utils.ts`**: función `cn()` para combinar clases
- **`src/components/ui/`**: 50+ componentes Shadcn-style basados en Radix UI
- Paleta visual: fondo oscuro azul marino (`#0B1929` aprox.), acento naranja (`#E8600D` aprox.), tipografía serif + sans
- No hay CSS Modules ni Styled Components

### Base de datos
**Ninguna.** Todo el estado es **en memoria** (React `useState`). No hay:
- Base de datos relacional ni NoSQL
- LocalStorage ni SessionStorage
- IndexedDB
- Cookies de sesión
- Persistencia entre recargas de página

El único mecanismo de persistencia implementado es la exportación/importación de archivos `.helios.json` (sprint S-024), que son paquetes JSON descargables por el usuario.

### Autenticación
**Ninguna.** No hay login, roles, sesiones ni control de acceso. La aplicación es completamente pública y anónima.

### Servicios externos
**Ninguno activo.** No hay:
- Llamadas a APIs externas en producción
- Servicios de IA / LLM (hay extensión points preparados pero no conectados)
- CDN de media
- Analytics
- Formularios de contacto conectados a backend

### Variables de entorno necesarias
| Variable | Requerida | Uso | Default |
|---------|----------|-----|---------|
| `PORT` | Recomendada | Puerto del servidor Vite dev | `5000` |
| `BASE_PATH` | Recomendada | Ruta base del artifact en el proxy | `/` |
| `NODE_ENV` | Automática | Controla plugins de Replit (Cartographer, DevBanner) | — |
| `REPL_ID` | Automática | Activa plugins solo en entorno Replit | — |

No hay secrets de API, claves de base de datos ni tokens de servicios externos.

---

## 2. Estructura completa del proyecto

### Árbol de carpetas (`artifacts/juan-cobo-lab/src/`)

```
src/
├── App.tsx                          # Punto de entrada: Wouter router, rutas URL
├── main.tsx                         # Bootstrap React (ReactDOM.createRoot)
├── index.css                        # Variables CSS globales + Tailwind
│
├── pages/                           # Páginas de primer nivel (una por ruta)
│   ├── Home.tsx                     # Página principal (74 líneas)
│   ├── Helios.tsx                   # Motor HELIOS — orquestador (2 509 líneas)
│   ├── JuanCobo.tsx                 # Perfil extendido Juan Cobo (414 líneas)
│   ├── Metodologias.tsx             # Página de metodologías
│   ├── Constitucion.tsx             # Página constitución
│   ├── Preguntas.tsx                # Listado de preguntas
│   ├── PreguntaPage.tsx             # Detalle de una pregunta (/preguntas/:id)
│   ├── Conversaciones.tsx           # Conversaciones
│   └── not-found.tsx                # Página 404
│
├── components/
│   ├── layout/
│   │   └── Navbar.tsx               # Barra de navegación global
│   │
│   ├── sections/                    # Secciones de la Home page
│   │   ├── Hero.tsx                 # Sección hero principal
│   │   ├── WhatIDo.tsx              # Qué hace Juan Cobo
│   │   ├── Stats.tsx                # Métricas/estadísticas
│   │   ├── About.tsx                # Acerca de
│   │   ├── Quote.tsx                # Cita destacada
│   │   ├── Articles.tsx             # Artículos
│   │   ├── Pereque.tsx              # Sección Pereque
│   │   ├── Publications.tsx         # Publicaciones académicas
│   │   ├── Tools.tsx                # Herramientas
│   │   ├── Blog.tsx                 # Blog
│   │   ├── Conversaciones.tsx       # Conversaciones (242 líneas)
│   │   └── Footer.tsx               # Pie de página
│   │
│   ├── Pantalla*.tsx                # Pantallas del motor HELIOS (17 archivos)
│   │   ├── PantallaSeleccionThinkingPattern.tsx  (504 l.)
│   │   ├── PantallaHypothesisBuilder.tsx         (1 037 l.)
│   │   ├── PantallaRevisionHipotesis.tsx         (567 l.)
│   │   ├── PantallaConceptualModel.tsx           (1 010 l.)
│   │   ├── PantallaOperationalizationMatrix.tsx  (1 105 l.)
│   │   ├── PantallaContrastationMatrix.tsx       (908 l.)
│   │   ├── PantallaRevisionFinal.tsx             (486 l.)
│   │   ├── PantallaKnowledgeGraph.tsx            (603 l.)
│   │   ├── PantallaAuditoriaMetodologica.tsx     (519 l.)
│   │   ├── PantallaEvidenceEvaluation.tsx        (1 069 l.)
│   │   ├── PantallaHypothesisEvidenceConclusion.tsx (619 l.)
│   │   ├── PantallaReportBuilder.tsx             (570 l.)
│   │   ├── PantallaProjectVersions.tsx           (495 l.)
│   │   ├── PantallaVersionComparison.tsx         (275 l.)
│   │   └── PantallaProjectImport.tsx             (433 l.)
│   │
│   └── ui/                          # ~50 componentes Shadcn (Radix UI)
│       # accordion, alert, button, card, dialog, dropdown-menu,
│       # input, select, tabs, tooltip, badge, progress, table,
│       # sheet, skeleton, sonner, chart, calendar, etc.
│
├── data/                            # Datos estáticos hardcoded (mock)
│   ├── articles.ts                  # Artículos (11 l. — mínimo)
│   ├── blog.ts                      # Entradas de blog (10 l. — mínimo)
│   ├── conversations.ts             # Conversaciones (114 l.)
│   ├── publications.ts              # Publicaciones ORCID reales (245 l.)
│   ├── questions.ts                 # Preguntas con categorías (142 l.)
│   └── questionArticles.ts          # Artículos relacionados a preguntas (92 l.)
│
├── config/
│   └── portConfig.ts                # Resolución de PORT y BASE_PATH (pura, testeable)
│
├── hooks/
│   ├── use-mobile.tsx               # Detección de viewport móvil
│   └── use-toast.ts                 # Hook para toasts
│
├── lib/
│   └── utils.ts                     # Función cn() para clases Tailwind
│
├── templates/
│   └── PreguntaTemplate.tsx         # Template para páginas de pregunta
│
├── router/                          # Knowledge Router (S-0.5)
│   ├── KnowledgeRouter.ts           # Motor de enrutamiento de packs (167 l.)
│   ├── types.ts                     # KnowledgePack, RouterResult, PackCandidate
│   ├── registry.ts                  # Registro de packs disponibles
│   ├── constants.ts                 # Umbrales y constantes del router
│   ├── utils.ts                     # Utilidades
│   └── algorithms/
│       └── KeywordAlgorithm.ts      # Algoritmo de scoring por keywords
│
├── thinking/                        # Thinking Engine (S-012 → S-014)
│   ├── ThinkingRouter.ts            # Selección de patrones de pensamiento (230 l.)
│   ├── SelectionService.ts          # Lógica de selección multi-candidato (235 l.)
│   ├── ExplanationService.ts        # Generación de explicaciones (155 l.)
│   ├── types.ts                     # ThinkingPattern, ThinkingResult, etc. (295 l.)
│   ├── registry.ts                  # Registro de patrones de pensamiento
│   ├── constants.ts                 # Umbrales de scoring (109 l.)
│   ├── utils.ts                     # Extracción de resumen de contexto
│   └── algorithms/
│       ├── ConceptualThinkingAlgorithm.ts   # Algoritmo conceptual (S-011)
│       └── KeywordThinkingAlgorithm.ts      # Algoritmo keyword (legacy)
│
├── hypothesis/                      # Hypothesis Builder (S-015 → S-016)
│   ├── HypothesisBuilderService.ts  # CRUD + reflexión + marcado (446 l.)
│   ├── types.ts                     # PolicyHypothesis, ReflectionAnswer (210 l.)
│   └── __tests__/
│       ├── validacion_s015.ts
│       └── validacion_s016.ts
│
├── conceptual/                      # Modelo Conceptual (S-017)
│   ├── ConceptualModelService.ts    # CRUD variables + indicadores (499 l.)
│   ├── types.ts                     # ConceptualModel, Variable, Indicator (231 l.)
│   └── __tests__/validacion_s017.ts
│
├── operationalization/              # Matriz de Operacionalización (S-018)
│   ├── OperationalizationService.ts (452 l.)
│   ├── types.ts                     (168 l.)
│   └── __tests__/validacion_s018.ts
│
├── contrastation/                   # Matriz de Contrastación (S-019)
│   ├── ContrastationService.ts      (344 l.)
│   ├── types.ts                     (151 l.)
│   └── __tests__/validacion_s019.ts
│
├── knowledge-graph/                 # Knowledge Graph (S-020)
│   ├── KnowledgeGraphService.ts     # Grafo de dependencias (879 l.)
│   ├── types.ts                     (189 l.)
│   └── __tests__/validacion_s020.ts
│
├── methodological-consistency/      # Consistencia Metodológica (S-021)
│   ├── MethodologicalConsistencyService.ts (247 l.)
│   ├── rules.ts                     # Catálogo de reglas (1 910 l. — el más grande)
│   ├── types.ts                     (171 l.)
│   └── __tests__/validacion_s021.ts
│
├── evidence-evaluation/             # Evaluación de Evidencia (S-022)
│   ├── EvidenceEvaluationService.ts (506 l.)
│   ├── HypothesisEvidenceConclusionService.ts (256 l.)
│   ├── types.ts                     (275 l.)
│   └── __tests__/validacion_s022.ts
│
├── report-builder/                  # Report Builder (S-023)
│   ├── ReportBuilderService.ts      (976 l.)
│   ├── types.ts                     (192 l.)
│   ├── index.ts                     # Barrel
│   ├── exporters/
│   │   ├── HtmlExporter.ts
│   │   ├── MarkdownExporter.ts
│   │   ├── JsonExporter.ts
│   │   └── index.ts
│   └── __tests__/validacion_s023.ts
│
└── project-versioning/              # Versionamiento (S-024 → S-024.1)
    ├── types.ts                     # 18 interfaces + CURRENT_PROJECT_SCHEMA_VERSION
    ├── SnapshotService.ts           # Creación/verificación async SHA-256
    ├── VersionComparisonService.ts  # Diff semántico entre snapshots
    ├── ProjectPackageService.ts     # Exportación/importación .helios.json
    ├── breaking-change-rules.ts     # Catálogo de 10 reglas de breaking changes
    ├── errors.ts                    # Errores tipados (6 clases)
    ├── index.ts                     # Barrel de API pública
    ├── crypto/
    │   ├── CryptoHashAdapter.ts     # SHA-256 (Web Crypto + Node fallback)
    │   └── canonicalize.ts          # Canonicalización NFC + ordenamiento de claves
    ├── migrations/
    │   ├── MigrationService.ts      # BFS para rutas de migración
    │   ├── registry.ts              # Registro declarativo de migraciones
    │   └── migration-0.9.0-to-1.0.0.ts
    └── __tests__/
        ├── validacion_s024.ts       # 106/106 aserciones
        └── validacion_s024_1.ts     # 117/117 aserciones
```

### Punto de entrada
`src/main.tsx` → `src/App.tsx` → Wouter Router → páginas específicas

### Rutas URL registradas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Home` | Página principal del sitio |
| `/juan-cobo` | `JuanCobo` | Perfil extendido |
| `/metodologias` | `Metodologias` | Página de metodologías |
| `/constitucion` | `Constitucion` | Página constitución |
| `/preguntas` | `Preguntas` | Listado de preguntas |
| `/preguntas/:id` | `PreguntaPage` | Detalle de pregunta |
| `/conversaciones` | `ConversacionesPage` | Conversaciones |
| `/helios` | `Helios` | Motor de análisis metodológico |
| `*` | `NotFound` | 404 |

---

## 3. Funcionalidades ya implementadas

### Página principal (`/`)
- **Hero**: Presentación con CTA "Explorar el laboratorio"
- **WhatIDo**: Descripción de servicios/áreas de trabajo
- **Stats**: Métricas numéricas de carrera
- **About**: Sección biográfica
- **Quote**: Cita destacada
- **Articles**: Artículos (datos en `src/data/articles.ts`)
- **Pereque**: Sección Pereque (filosófica/reflexiva)
- **Publications**: Publicaciones académicas reales desde ORCID (245 líneas de datos, categorías: Artículos científicos, Columnas de opinión, Estudios técnicos, Ponencias, Capítulos de libro)
- **Conversaciones**: Conversaciones destacadas con datos en `src/data/conversations.ts`
- **Tools**: Herramientas
- **Blog**: Entradas de blog
- **Footer**: Pie de página
- **Navbar**: Navegación global fija

Secciones **planificadas pero no implementadas** (comentadas en `Home.tsx`):
- `<Courses />` — Cursos y talleres
- `<AITools />` — Herramientas con IA
- `<Library />` — Biblioteca de recursos
- `<Chatbot />` — Asistente de investigación

### Página Juan Cobo (`/juan-cobo`)
Página de 414 líneas con perfil extendido.

### Otras páginas
- `/metodologias`: Página de metodologías
- `/constitucion`: Página constitución
- `/preguntas`: Listado de preguntas con 10 categorías (Sentido, Política pública, Método, Investigación, Vida, Liderazgo, TIC, Educación, Productividad, TIC y Paz)
- `/preguntas/:id`: Detalle individual por ID
- `/conversaciones`: Página de conversaciones

### Motor HELIOS (`/helios`)
Ver sección 4 para detalle completo.

### Formularios
- Formulario de entrada de problema en HELIOS (`PantallaEntrada`)
- Formularios de hipótesis en `PantallaHypothesisBuilder`
- Formularios de variables/indicadores en `PantallaConceptualModel`
- Formularios de filas en `PantallaOperationalizationMatrix`
- Formularios de criterios en `PantallaContrastationMatrix`
- Formularios de fuentes y evaluación en `PantallaEvidenceEvaluation`
- Formulario de configuración de reporte en `PantallaReportBuilder`
- Formulario de creación de snapshot con metadatos en `PantallaProjectVersions`

### Integraciones con IA
**Ninguna activa.** Los extension points (`ThinkingAlgorithm`, `RoutingAlgorithm`) están diseñados para swapear el algoritmo de scoring por embeddings o LLM sin cambiar el código UI, pero actualmente solo se usan algoritmos de scoring locales basados en keywords y conceptos.

---

## 4. Estado específico de HELIOS

### Arquitectura de HELIOS
HELIOS es una Single-Page Application anidada dentro de `/helios`. No tiene subrutas URL. La navegación entre sus pantallas se maneja mediante un estado `pantalla: Pantalla` en `Helios.tsx` (2 509 líneas), que actúa como orquestador maestro.

### Flujo de pantallas (estado interno en Helios.tsx)

```
entrada
  └─► enrutando (KnowledgeRouter)
        ├─► confirmacion-candidatos (si hay múltiples packs)
        ├─► sin-pack (si no hay pack)
        └─► seleccion-thinking-pattern (ThinkingRouter)
              ├─► pereque (preguntas de reflexión)
              │     └─► hypothesis-builder
              │           └─► revision-hipotesis
              │                 └─► conceptual-model
              │                       └─► operationalization-matrix
              │                             └─► contrastation-matrix
              │                                   └─► revision-final
              │                                         └─► knowledge-graph
              │                                               └─► auditoria
              │                                                     └─► evidence-evaluation
              │                                                           └─► hypothesis-conclusion
              │                                                                 └─► report-builder
              │                                                                       └─► project-versions
              │                                                                             ├─► version-comparison
              │                                                                             └─► project-import
              └─► (selection forced) → mismo flujo
```

### Componentes y archivos HELIOS

| Componente | Sprint | Estado | Líneas |
|-----------|--------|--------|--------|
| `PantallaEntrada` | S-012 | ✅ Completo | Inline en Helios.tsx |
| `PantallaSeleccionThinkingPattern` | S-014 | ✅ Completo | 504 |
| `PantallaHypothesisBuilder` | S-015 | ✅ Completo | 1 037 |
| `PantallaRevisionHipotesis` | S-015 | ✅ Completo | 567 |
| `PantallaConceptualModel` | S-017 | ✅ Completo | 1 010 |
| `PantallaOperationalizationMatrix` | S-018 | ✅ Completo | 1 105 |
| `PantallaContrastationMatrix` | S-019 | ✅ Completo | 908 |
| `PantallaRevisionFinal` | S-019 | ✅ Completo | 486 |
| `PantallaKnowledgeGraph` | S-020 | ✅ Completo | 603 |
| `PantallaAuditoriaMetodologica` | S-021 | ✅ Completo | 519 |
| `PantallaEvidenceEvaluation` | S-022 | ✅ Completo | 1 069 |
| `PantallaHypothesisEvidenceConclusion` | S-022 | ✅ Completo | 619 |
| `PantallaReportBuilder` | S-023 | ✅ Completo | 570 |
| `PantallaProjectVersions` | S-024 | ✅ Completo | 495 |
| `PantallaVersionComparison` | S-024 | ✅ Completo | 275 |
| `PantallaProjectImport` | S-024 | ✅ Completo | 433 |

### Módulos de servicio HELIOS

| Módulo | Sprint | Función | Estado |
|--------|--------|---------|--------|
| `KnowledgeRouter` | S-0.5 | Enruta problema a Knowledge Pack | ✅ Completo |
| `ThinkingRouter` | S-012/013/014 | Selecciona Thinking Pattern | ✅ Completo |
| `HypothesisBuilderService` | S-015 | CRUD hipótesis, reflexión | ✅ Completo |
| `ConceptualModelService` | S-017 | Variables + indicadores conceptuales | ✅ Completo |
| `OperationalizationService` | S-018 | Matriz de operacionalización | ✅ Completo |
| `ContrastationService` | S-019 | Criterios de contrastación | ✅ Completo |
| `KnowledgeGraphService` | S-020 | Grafo de dependencias entre entidades | ✅ Completo |
| `MethodologicalConsistencyService` | S-021 | Auditoría por reglas explícitas | ✅ Completo |
| `EvidenceEvaluationService` | S-022 | Evaluación de fuentes y evidencia | ✅ Completo |
| `HypothesisEvidenceConclusionService` | S-022 | Conclusiones por hipótesis | ✅ Completo |
| `ReportBuilderService` | S-023 | Generación de reportes HTML/MD/JSON | ✅ Completo |
| `SnapshotService` | S-024.1 | Snapshots inmutables SHA-256 async | ✅ Completo |
| `VersionComparisonService` | S-024.1 | Diff semántico entre versiones | ✅ Completo |
| `ProjectPackageService` | S-024.1 | Exportar/importar `.helios.json` | ✅ Completo |
| `MigrationService` | S-024.1 | Migraciones de esquema con BFS | ✅ Completo |

### Knowledge Packs (contenido)
Los Knowledge Packs se cargan desde archivos estáticos (probablemente en `content/` o importados en `src/router/registry.ts`). Cada pack contiene:
- `metadata.json`: id, titulo, descripcion, tema, keywords, herramienta, nivelComplejidad, versión, estado, autor, institución, fuentes, licencia
- `contexto/`: texto de contexto del dominio
- `hipotesis`: hipótesis plantilla con nivel de confianza (Alta / Media / Exploratoria)
- `pestel`: dimensiones PESTEL del dominio
- `chips`: ejemplos de problemas

### Thinking Patterns (contenido)
Cargados desde `content/thinking/<pattern>/metadata.json`. Cada patrón contiene:
- Metadatos del patrón (id, titulo, descripcion, etiqueta, estado, autor)
- `conceptos`: modelo conceptual (términos, sinónimos, expresiones con pesos)
- `preguntas`: lista de preguntas metodológicas con propósito y orientación
- `esUniversal`: flag para patrón de fallback

### Datos mock vs. lógica real
| Área | Tipo | Notas |
|------|------|-------|
| Knowledge Packs | **Datos reales** | Contenido metodológico real |
| Thinking Patterns | **Datos reales** | Patrones de análisis validados |
| Publicaciones | **Datos reales** | Fuente: ORCID 0000-0003-0138-7051 |
| Conversaciones | **Datos reales / curados** | 114 líneas de contenido |
| Preguntas | **Datos reales** | 142 líneas, categorías reales |
| Artículos/Blog | **Datos mínimos** | 11 y 10 líneas respectivamente — por expandir |
| Estado HELIOS | **In-memory** | Volátil, sin persistencia entre sesiones |

### Funcionalidades parcialmente construidas
- **Secciones Home futuras**: `Courses`, `AITools`, `Library`, `Chatbot` — comentadas en `Home.tsx`, sin implementar
- **`PantallaVersionComparison`**: funcional pero UI básica para `reordered` (diff extendido de S-024.1 pendiente de pulido visual)

### Pendientes y errores conocidos
- No hay errores TypeScript (0 errores al cierre de S-024.1)
- No hay bugs conocidos en producción
- El estado de HELIOS se pierde al recargar la página — diseñado así por ahora
- Helios.tsx con 2 509 líneas es el mayor riesgo de mantenibilidad

---

## 5. Modelo de datos

### Naturaleza del almacenamiento
**Todo en memoria (React state).** No hay tablas, colecciones, ni migraciones de base de datos. El modelo de datos vive en TypeScript interfaces en `src/*/types.ts`.

### Jerarquía de entidades HELIOS

```
ProjectSnapshot (raíz del modelo de persistencia)
  └── ProjectSnapshotPayload
        ├── problema: string
        ├── packActivo: KnowledgePack | null
        │     └── metadata, contexto, hipotesis[], pestel[], chips
        ├── thinkingUserSelection: { mode, primaryPatternId, secondaryPatternId? }
        ├── reflectionAnswers: ReflectionAnswer[]
        │     └── { questionId, patternId, respuesta, pregunta, proposito }
        ├── hypotheses: PolicyHypothesis[]
        │     └── { id, titulo, descripcion, tipo, fundamento, nivelConfianza,
        │           reflexiones[], variables[], primaryHypothesis? }
        ├── primaryHypothesisId: string | undefined
        ├── conceptualModels: ConceptualModel[]
        │     └── { id, hypothesisId, variables[], indicators[] }
        ├── operationalizationMatrices: OperationalizationMatrix[]
        │     └── { id, hypothesisId, rows[] }
        ├── contrastationMatrices: ContrastationMatrix[]
        │     └── { id, hypothesisId, criteria[] }
        ├── evidenceEvaluationMatrices: EvidenceEvaluationMatrix[]
        │     └── { id, hypothesisId, sources[], evaluations[] }
        ├── hypothesisEvidenceConclusions: HypothesisEvidenceConclusion[]
        │     └── { id, hypothesisId, conclusion, supportLevel }
        └── reportDefinitions: ReportDefinition[]
              └── { id, hypothesisId, sections[], format, metadata }
```

### Modelo de versionamiento (`project-versioning/types.ts`)

| Entidad | Campos clave | Propósito |
|---------|-------------|----------|
| `ProjectSnapshot` | id, version, schemaVersion, metadata, payload, contentHash (SHA-256), createdAt | Representación inmutable del estado |
| `ProjectSnapshotMetadata` | projectId, projectName, versionLabel, description, author, tags, sourceSnapshotId, changeSummary | Metadatos descriptivos del snapshot |
| `ProjectVersion` | id, snapshotId, versionLabel, description, createdAt, tags | Apuntador a un snapshot |
| `ProjectPackage` | manifest, snapshots[], versions[] | Paquete exportable `.helios.json` |
| `ProjectPackageManifest` | format, packageVersion, schemaVersion, projectId, exportedAt, snapshotCount, packageHash (SHA-256) | Cabecera del paquete |
| `ImportTransaction` | id, status, originalPackage, strategy, preparedPackage?, conflicts[], errors[], warnings[] | Estado transaccional de importación |
| `ProjectDiff` | baseSnapshot, targetSnapshot, changes[], summary | Diff entre dos snapshots |
| `ProjectEntityChange` | entityType, entityId, changeType, changedFields?, reordered?, beforeIndex?, afterIndex?, breakingRuleId? | Cambio atómico en un diff |

### Esquema de versiones
- `CURRENT_PROJECT_SCHEMA_VERSION = "1.2.0"` (constante en `types.ts`)
- Migraciones disponibles (cadena BFS):
  - `0.9.0 → 1.0.0` — agrega `reportDefinitions`, `primaryHypothesisId`, normaliza `evidenceMatrices`
  - `1.0.0 → 1.1.0` — sintetiza `UnderstandingCase` desde `problema` (S-025)
  - `1.1.0 → 1.2.0` — añade `knowledgeSources: []` (S-026)
- Ruta completa `0.9.0 → 1.2.0` disponible automáticamente vía BFS
- El motor BFS de `MigrationService` soporta rutas encadenadas de múltiples saltos

### Datos persistentes (entre recargas)
**Ninguno**, salvo lo que el usuario descargue como `.helios.json`.

### Datos temporales (en sesión)
- Todo el estado de HELIOS: `problema`, `pantalla`, `hypotheses`, `routerResult`, `thinkingResult`, todos los arrays de entidades metodológicas
- `projectSnapshots[]` y `projectVersions[]` — en memoria, exportables por el usuario

---

## 6. Arquitectura actual

### Frontend
- **React SPA** servida por Vite dev server (desarrollo) o `vite preview` (producción)
- **Sin SSR, sin hidratación** — puramente client-side
- **Estado local**: todo en `useState` en `Helios.tsx` para el motor; estado de sección en cada pantalla hija
- **Sin estado global**: no hay Redux, Zustand, Context API de alcance global ni TanStack Query activo
- **Animaciones**: Framer Motion con variants tipadas para transiciones entre pantallas

### Backend
**No hay backend activo.** Existe un artifact `artifacts/api-server` configurado en el monorepo pero no tiene integraciones con el frontend actual de Juan Cobo Lab.

### API
**Sin API activa.** El workspace tiene `@workspace/api-client-react` como dependencia (monorepo), pero no se consume en la aplicación actualmente.

### Almacenamiento
- **Código fuente**: monorepo pnpm en Replit, push a GitHub (`juancobo10-a11y/juan-cobo-lab`)
- **Contenido**: archivos estáticos en el repositorio (`src/data/`, `content/`)
- **Proyectos HELIOS del usuario**: descarga manual como `.helios.json` — sin servidor

### Flujo de navegación

```
/ (Home)
├── /juan-cobo
├── /metodologias
├── /constitucion
├── /preguntas
│   └── /preguntas/:id
├── /conversaciones
└── /helios  ← SPA anidada con estado propio
    ├── entrada → enrutando → [packs] → seleccion-thinking-pattern
    ├── pereque → hypothesis-builder → revision-hipotesis
    ├── conceptual-model → operationalization-matrix
    ├── contrastation-matrix → revision-final → knowledge-graph
    ├── auditoria → evidence-evaluation → hypothesis-conclusion
    ├── report-builder → project-versions
    └── project-versions ↔ version-comparison / project-import
```

### Componentes reutilizables
- **`src/components/ui/`**: ~50 componentes UI genéricos (button, card, dialog, tabs, etc.)
- **`src/components/layout/Navbar.tsx`**: navbar compartida entre páginas
- **`src/lib/utils.ts`**: `cn()` — utilidad de clases

### Extensión points preparados (no usados)
- `ThinkingAlgorithm` interface → swappable por embeddings o LLM
- `RoutingAlgorithm` interface → swappable por vector search o RAG
- `CryptoHashAdapter` interface → swappable por otro algoritmo de hash

---

## 7. Historial técnico

### Commits recientes (orden cronológico inverso)
```
a2011f2  Add async snapshot API memory and update memory index (local, no pusheado)
aa51cd5  S-024.1: Cryptographic Integrity & Versioning Hardening
b300154  S-024: Project Snapshot, Versioning & Reproducibility Engine (106/106, 17/17)
c9d534a  S-023: Report Builder & Traceable Export Engine
22c5e10  S-022: Motor de Evaluación de Evidencia (139/139, 15/15)
24f3ab9  S-021: Motor de Consistencia Metodológica (115/115, 14/14)
e6baaea  S-020: Knowledge Graph & Dependency Engine (52/52, 13/13)
c20cbe7  S-019: Matriz de Contrastación (55/55, 12/12)
20f23bc  S-018: Matriz de Operacionalización (34/34, 11/11)
f225492  S-017: Modelo Conceptual (20/20, 10/10)
7873b2a  S-016: Hardening técnico (29/29, 9/9)
dceb053  S-015: Hypothesis Builder (18/18)
4394dfa  S-014: Gestión de múltiples Thinking Pattern candidatos
3a68353  S-013: Incorporación del patrón Economía Política
```

### Sprints completados
| Sprint | Contenido |
|--------|----------|
| S-0.5 | Knowledge Router, Knowledge Packs |
| S-012 | Thinking Router base + PantallaEntrada |
| S-013 | Patrón Economía Política |
| S-014 | Multi-candidatos, PantallaSeleccionThinkingPattern |
| S-015 | Hypothesis Builder, ReflectionAnswer |
| S-016 | Hardening: PORT, validate runner, integration tests |
| S-017 | Modelo Conceptual (variables + indicadores) |
| S-018 | Matriz de Operacionalización |
| S-019 | Matriz de Contrastación, PantallaRevisionFinal |
| S-020 | Knowledge Graph, grafo de dependencias |
| S-021 | Consistencia Metodológica, catálogo de reglas |
| S-022 | Evaluación de Evidencia, conclusiones por hipótesis |
| S-023 | Report Builder, exportadores HTML/MD/JSON |
| S-024 | Snapshots inmutables, versionamiento, diff, import/export |
| S-024.1 | SHA-256, canonización NFC, ImportTransaction, Breaking Change Rules |

### Documentación técnica generada (en `docs/`)
- **8 ADRs**: ADR-0006 a ADR-0013A (decisiones de arquitectura por sprint)
- **5 revisiones de arquitectura**: S-021 a S-024.1
- **3 docs de validación de S-017 a S-020**
- **5 docs de versionamiento**: formato snapshot, formato paquete, migraciones, informes reproducibles, canonización, modelo transaccional de importación
- **1 doc de seguridad**: integridad vs. autenticidad
- **CHANGELOG.md** con entradas por sprint

### Regresiones e incompletos conocidos
- Ninguna regresión conocida a la fecha de auditoría
- `src/data/articles.ts` y `src/data/blog.ts` tienen datos mínimos (11 y 10 líneas), indicando que estas secciones tienen placeholder data

---

## 8. Riesgos antes de continuar

### 🔴 Riesgos altos

| Riesgo | Detalle | Mitigación recomendada |
|--------|---------|----------------------|
| **`Helios.tsx` monolítico** | 2 509 líneas. Orquestador de todo el estado y la navegación. Muy difícil de modificar sin romper flujos. | No fragmentar sin un plan claro. Cualquier cambio aquí requiere revisión del tipo `Pantalla` y todos sus handlers. |
| **Estado en memoria sin persistencia** | El usuario pierde todo al recargar. | No añadir persistencia (localStorage, backend) sin diseñarla primero — afectaría snapshots, hidratación, seguridad. |
| **Sin autenticación** | La app es pública. Si se añade contenido privado o IA con costos, requiere auth. | No añadir auth sin decidir el proveedor (Clerk, Replit Auth) y diseñar la integración. |

### 🟡 Riesgos medios

| Riesgo | Detalle |
|--------|---------|
| **Content packs acoplados al código fuente** | Los Knowledge Packs y Thinking Patterns viven en el repositorio como archivos estáticos. Añadir o editar contenido requiere un deploy. |
| **Algoritmos de scoring locales** | Sin LLM ni embeddings, el routing depende de keywords + conceptos. Funciona bien para problemas con lenguaje cercano al contenido de los packs. |
| **TanStack Query instalado pero inactivo** | Presencia de dependencia no utilizada. No es un problema activo. |
| **Recharts instalado pero poco usado** | Similar al anterior. |
| **`src/data/articles.ts` y `blog.ts` con datos placeholder** | Las secciones Articles y Blog en Home muestran contenido mínimo. |

### 🟢 Áreas estables — no tocar sin necesidad

| Área | Por qué es delicada |
|------|-------------------|
| `src/project-versioning/` completo | 223 aserciones en dos suites. Cualquier cambio requiere pasar `pnpm run validate`. |
| `src/router/KnowledgeRouter.ts` + `registry.ts` | Núcleo del enrutamiento. Cambios en umbrales o registro afectan toda la cadena. |
| `src/thinking/ThinkingRouter.ts` + `constants.ts` | Umbrales de confianza calibrados. Cambios rompen el flow de selección. |
| `src/*/types.ts` | Los tipos son contratos entre módulos. Cambios cascadenean. |
| `scripts/validate-all.ts` | Script de CI interno. Mantener sincronizado con cada nueva suite. |
| `src/methodological-consistency/rules.ts` | 1 910 líneas de reglas de consistencia. El archivo más grande del proyecto. |
| Interfaces de extensión (`ThinkingAlgorithm`, `RoutingAlgorithm`, `CryptoHashAdapter`) | Diseñadas para no cambiar aunque cambie la implementación. |

### Código que NO debe modificarse sin revisión
- Cualquier función async que compute SHA-256 en `project-versioning/`
- El tipo `Pantalla` en `Helios.tsx` — las 21 pantallas registradas son la espina dorsal del flujo (incluye `"fuentes"` desde S-026)
- `CURRENT_PROJECT_SCHEMA_VERSION` — bumpearlo rompe compatibilidad con paquetes exportados

---

## 9. Plan recomendado para incorporar funcionalidades nuevas

### Principios que deben respetarse
1. **No crear una nueva aplicación** — todo dentro del artifact `juan-cobo-lab` existente
2. **No reemplazar la interfaz actual** — las páginas Home, JuanCobo, etc. se mantienen intactas
3. **No tocar las 20 suites de validación** sin actualizar `validate-all.ts`
4. **No añadir rutas URL** sin registrarlas en `App.tsx` y `Navbar.tsx`
5. **No añadir estado global** sin decidir la estrategia (Context, Zustand, etc.)

### Para añadir una nueva sección a la Home
1. Crear `src/components/sections/NuevaSección.tsx`
2. Importar en `Home.tsx` y añadir en el bloque JSX correspondiente
3. Añadir anchor en `Navbar.tsx` si requiere navegación directa
4. Añadir datos en `src/data/` si son estáticos

### Para añadir una nueva pantalla a HELIOS
1. Añadir el valor al tipo `Pantalla` en `Helios.tsx`
2. Crear el componente `src/components/PantallaNueva.tsx`
3. Añadir el handler de navegación en `Helios.tsx`
4. Añadir el bloque de render en el switch de `Helios.tsx`
5. Pasar las props necesarias desde el estado de `Helios.tsx`

### Para conectar un servicio de IA
1. Implementar `ThinkingAlgorithm` o `RoutingAlgorithm` en un archivo nuevo
2. Registrar la implementación en `ThinkingRouter` o `KnowledgeRouter`
3. Gestionar la API key como secret de Replit (nunca en código)
4. No modificar los tipos ni la UI — los contratos existentes ya lo soportan

### Para añadir persistencia real (si se decide)
1. Decidir entre: localStorage, Replit DB (PostgreSQL), o backend externo
2. Diseñar hidratación del estado de `Helios.tsx` al cargar
3. El formato `ProjectSnapshotPayload` ya está definido — usar como esquema base
4. No duplicar la lógica de serialización ya implementada en `ProjectPackageService`

---

## Resumen ejecutivo

Juan Cobo Lab es un sitio web profesional con una SPA embebida (HELIOS) que implementa una cadena metodológica completa de análisis de políticas públicas. El proyecto tiene **3 000+ líneas de servicios de dominio** rigurosamente documentados, **20/20 suites de validación en verde**, y una arquitectura de extensión limpia que permite incorporar IA, persistencia y autenticación sin reescribir lo existente. Esquema de versiones: `1.2.0`. Cadena de migración: `0.9.0 → 1.0.0 → 1.1.0 → 1.2.0`.

El principal riesgo técnico es el tamaño de `Helios.tsx` (2 509 líneas). El principal riesgo de producto es la volatilidad del estado (todo se pierde al recargar). Ambos son conocidos y por diseño en el estado actual.

**No hay bloqueadores para continuar con nuevas funcionalidades.** El repositorio está limpio, los tests pasan, y la arquitectura tiene puntos de extensión bien definidos.
