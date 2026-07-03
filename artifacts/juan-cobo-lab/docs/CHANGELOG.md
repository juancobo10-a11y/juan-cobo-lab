# Changelog — Juan Cobo Lab

---

## v0.4.2 — Fotografías de identidad (2026-07-03)

### Nuevo
- **Hero `/juan-cobo`**: retrato editorial de Juan Cobo a la derecha en layout de dos columnas. En móvil: texto primero, foto debajo. Sombra decorativa cobre detrás de la imagen.
- **Bloque Martina**: foto de Juan y Martina en columna lateral (derecha en desktop, debajo en móvil). Caption: *"Martina. Mi mayor proyecto de vida."*
- Imágenes optimizadas con ImageMagick para web: `public/images/juan-cobo.jpg` (45 KB) y `public/images/juan-martina.jpg` (93 KB).
- Paths de imagen via `import.meta.env.BASE_URL` para compatibilidad entre dev y producción.

---

## v0.4.1 — ¿Quién es Juan Cobo? (2026-07-03)

### Nuevo
- Página `/juan-cobo` con 6 secciones: Hero, Texto principal, Bloque Martina, Bloque Método (ciclo visual de 8 pasos), Pilares (4 tarjetas), CTA final.
- Ruta `"/juan-cobo"` registrada en `App.tsx`.
- Enlace "Juan Cobo" añadido al navbar (desktop y móvil) y al footer.

---

## v0.4.0 — Documento fundacional (2026-07-03)

### Nuevo
- `docs/BRAND.md` — identidad completa: filosofía, método, tono, sistema de diseño, arquitectura, 10 reglas para IA/devs.
- `docs/CHANGELOG.md` — historial de versiones.

---

## v0.3.1 — Videoteca real (2026-07-02)

### Nuevo
- 6 videos de YouTube con metadatos reales (título, fecha, duración).
- Thumbnail `maxresdefault` con fallback a `hqdefault` y placeholder.
- Botón "Ver en YouTube" activo.

---

## v0.3.0 — Conversaciones rediseñada (2026-07-02)

### Nuevo
- Tarjeta unificada con tres botones: Ver video / Leer artículo / Presentación.
- Botones desactivados muestran "Próximamente".
- Filtros por categoría autogenerados desde datos.
- Hero con subtítulo "Algunas preguntas también necesitan ser habladas."

---

## v0.2.3 — Conversaciones v1 (2026-07-01)

### Nuevo
- Tipos separados `video | pdf | articulo`.
- Navbar, footer y ruta `/conversaciones`.

---

## v0.2.2 — Página /preguntas/:id (2026-07-01)

### Nuevo
- Ruta `/preguntas/:id` con 3 estados: artículo publicado / en preparación / no existe.
- Template de 7 secciones (`PreguntaTemplate.tsx`).
- Fix accesibilidad: eliminado `<Link><button>` anidado.

---

## v0.2.1 — Página /preguntas (2026-07-01)

### Nuevo
- 16 preguntas reales con buscador y filtros por categoría.
- Cards clickables hacia `/preguntas/:id`.

---

## v0.2 — Limpieza y nuevas páginas (2026-06-30)

### Cambios
- Eliminado contenido ficticio.
- Sección `Pereque.tsx` en home.
- Página `/constitucion`.
- Navbar route-aware.

---

## v0.1 — MVP (2026-06-29)

### Nuevo
- Hero, WhatIDo, Stats, About, Quote, Articles, Publications (ORCID reales), Tools, Blog, Footer.
- Secciones ocultas automáticamente si su array de datos está vacío.
