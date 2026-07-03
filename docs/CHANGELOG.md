# Changelog — Juan Cobo Lab

Todos los cambios notables del proyecto están documentados aquí.  
Formato: `vX.Y.Z — Descripción corta` seguido del detalle.

---

## v0.4.0 — Documento fundacional de marca (3 jul 2026)

### Nuevo
- **`docs/BRAND.md`** — Documento fundacional de identidad del proyecto. Incluye:
  - Definición del laboratorio (qué es y qué no es)
  - Filosofía y método de trabajo (el ciclo de las 9 etapas)
  - Tono de voz (curioso, humilde, riguroso, humano)
  - Principio y regla de oro
  - Sistema de diseño completo (paleta, tipografía, espaciado, animaciones, componentes)
  - Arquitectura del contenido (secciones, páginas, archivos de datos)
  - Objetivo del proyecto (referente, no influencer)
  - Identidad del autor con links reales
  - Contexto técnico del stack
  - 10 reglas para cualquier IA o desarrollador que modifique el sitio
- **`docs/CHANGELOG.md`** — Este archivo. Historial completo del proyecto.

---

## v0.3.1 — Videoteca con 6 videos reales de YouTube (3 jul 2026)

### Nuevo
- 6 videos reales integrados en `src/data/conversations.ts` con metadatos extraídos automáticamente de YouTube (título real, fecha, duración en segundos → formato legible)
- Diseño de tarjeta de video con miniatura real (`maxresdefault.jpg`), play overlay, badge de duración y badge de categoría sobre la imagen
- Fallback de dos niveles de thumbnail: `maxresdefault` → `hqdefault` → placeholder SVG
- Botón "Ver en YouTube" activo con timestamp exacto de la intervención
- Botones "Artículo" y "Presentación" desactivados como "Próximamente"

### Videos incluidos
| Título | Fecha | Duración |
|---|---|---|
| Conectividad digital en Colombia | Feb 2026 | 2 h |
| De lo Tradicional a lo Digital: Comercio Electrónico | Nov 2025 | 2 h 20 min |
| De la Brecha Digital a la Conectividad Significativa | Ago 2025 | 28 min |
| Foro «Conectividad Digital para todos» | Mar 2025 | 4 h 8 min |
| Aciertos y desafíos de la educación inclusiva | Jun 2024 | 3 h 55 min |
| 10 Años del Acuerdo de Paz — UNAD–Contraloría | Jun 2026 | 7 h 25 min |

---

## v0.3.0 — Conversaciones: tarjeta unificada (3 jul 2026)

### Nuevo
- Nueva interfaz `Conversacion` unificada: cada entrada puede tener los tres recursos (YouTube + PDF + artículo) en lugar de ser un tipo exclusivo
- Campo `tema` para el eje temático o evento de cada conversación
- Página `/conversaciones` rediseñada con filtros por categoría (generados automáticamente desde los datos) y buscador de texto libre
- Sección home `<Conversaciones />` con mismo diseño de tarjeta
- Hero con título "Conversaciones" y subtítulo "Algunas preguntas también necesitan ser habladas."
- Estadísticas en tiempo real: conversaciones totales, videos disponibles, presentaciones, artículos
- Estado vacío elegante con reset de filtros

### Cambiado
- Reemplazado el sistema de tipos `video | pdf | articulo` por tarjeta unificada con tres botones
- Labels uniformes entre sección home y página completa ("Leer artículo", "Presentación")

---

## v0.2.3 — Conversaciones: prototipo inicial (jul 2026)

### Nuevo
- Primera versión de la sección y página Conversaciones
- Tres tipos de tarjeta: Video (con thumbnail YouTube), PDF (con slide count), Artículo (con etiquetas)
- Filtros por tipo + buscador en la página `/conversaciones`
- Contadores por tipo en el hero
- Link en navbar, footer y sección Pereque

---

## v0.2.2 — Página de pregunta individual (jul 2026)

### Nuevo
- Plantilla de lectura `/preguntas/:id` con 7 secciones
- Tres estados: artículo publicado / en preparación / pregunta no encontrada
- Template de 7 secciones: Hero, ¿Por qué me da pereque?, ¿Por qué debería importarte?, Lo que sabemos, Lo que no sabemos, Mi posición hoy, Sigamos dando pereque
- Botón de compartir con Web Share API y fallback a clipboard

### Arreglado
- Eliminado patrón anti-accesibilidad `<Link><button>` (anidamiento inválido)
- Todos los cards de `/preguntas` son ahora clickables con `<Link>` directo

---

## v0.2.1 — Página /preguntas (jul 2026)

### Nuevo
- Página `/preguntas` con las 16 preguntas reales del laboratorio
- Buscador en tiempo real
- Filtros por categoría
- Contador dinámico
- Estado vacío con CTA de email
- Link en navbar, footer y sección Pereque

---

## v0.2.0 — Limpieza y nueva sección Pereque (jul 2026)

### Nuevo
- Sección `Pereque.tsx` en el home con 6 preguntas destacadas
- Página `/constitucion` — documento fundacional visible
- Navbar route-aware (links de sección usan `/#hash` desde páginas internas)

### Cambiado
- Eliminado todo el contenido ficticio del MVP
- Secciones Articles y Blog se ocultan automáticamente cuando el array está vacío
- Logo siempre navega a `/`

---

## v0.1.0 — MVP (jul 2026)

### Nuevo
- Primer despliegue funcional del sitio
- Hero, WhatIDo, Stats, About, Quote, Articles, Publications, Tools, Blog, Footer
- Publicaciones reales vía ORCID `0000-0003-0138-7051`
- Stack: React + Vite + Tailwind v4 + Framer Motion + Wouter + Lucide
- Paleta: Navy `#0D1B2A` + Blanco cálido `#F9F9F7` + Cobre `hsl(24 69% 53%)`
- Tipografía: Instrument Serif (headings) + Inter (body)
