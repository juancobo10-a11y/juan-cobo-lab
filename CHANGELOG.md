# Changelog — Juan Cobo Lab

Todos los cambios relevantes de este proyecto están documentados aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [0.2.1] — 2026-07-03

### Añadido
- **Nueva página: `/preguntas`** — "Las preguntas que me dan pereque" con las 16 preguntas reales de Juan Cobo.
- **Datos reales:** `src/data/questions.ts` con 16 preguntas categorizadas (Sentido, Política pública, Método, Investigación, Vida, Liderazgo, TIC, Educación, Productividad, TIC y Paz).
- **Buscador por palabra clave** en tiempo real sobre pregunta, pereque, importancia y categoría.
- **Filtros por categoría** con pills interactivos; se pueden combinar con la búsqueda.
- **Contador dinámico** "X preguntas abiertas" que refleja el resultado filtrado.
- **Estado vacío** con opción de limpiar filtros cuando ninguna pregunta coincide.
- **CTA final:** "¿Tienes una pregunta que te da pereque? Escríbeme." con link directo al correo.
- **Link en navbar:** nuevo ítem "Preguntas" entre los links de sección.
- **Link en footer:** nuevo ítem "Preguntas" en la barra de navegación inferior.
- **Link en sección Pereque del home:** "Ver las 16 preguntas →" en el header de la sección.

---

## [0.2.0] — 2026-07-03

### Identidad y contenido
- **Nueva sección: "Las preguntas que me dan pereque"** — reemplaza la sección genérica de "ideas en curso" con seis preguntas reales vinculadas a las áreas de trabajo de Juan Cobo (política TIC, control fiscal, IA en gobierno, comunicación de ciencia).
- **Nueva página: "La Constitución del Laboratorio"** (`/constitucion`) — documento fundacional con los principios del laboratorio, lo que es y lo que no es, y una promesa al lector.

### Limpieza de contenido
- Eliminados todos los artículos de blog ficticios (`src/data/articles.ts` → array vacío).
- Eliminadas todas las entradas de blog ficticias (`src/data/blog.ts` → array vacío).

### Experiencia
- La sección "Últimos artículos" se oculta automáticamente cuando no hay artículos con URL real publicada.
- La sección "Blog" se oculta automáticamente cuando no hay entradas con URL real publicada.
- Navbar route-aware: desde páginas internas, los links de sección apuntan a `/#hash`; el logo siempre navega a `/`.
- Agregado link a "La Constitución" en la barra de navegación y en el footer.

---

## [0.1.0] — 2026-06-30

### Lanzamiento inicial (MVP)
- Estructura completa del sitio: Hero, WhatIDo, Stats, About, Quote, Articles, Thinking, Publications, Tools, Blog, Footer.
- Paleta de diseño: navy `#0D1B2A` + blanco cálido `#F9F9F7` + cobre `hsl(24 69% 53%)`.
- Tipografía: Instrument Serif (headings) + Inter (body).
- Datos reales de publicaciones extraídos vía ORCID (`0000-0003-0138-7051`): artículos científicos, columnas de opinión, ponencias internacionales, capítulos de libro.
- Links reales: LinkedIn, Google Scholar, ORCID, correo institucional.
- Sincronización con GitHub: `github.com/juancobo10-a11y/juan-cobo-lab`.
