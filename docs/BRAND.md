# Juan Cobo Lab — Documento Fundacional de Marca

> Este archivo es el documento de identidad del proyecto. No es una página visible.  
> Cualquier desarrollador, diseñador o IA que trabaje en este sitio debe leerlo primero.  
> Antes de construir cualquier componente, sección o tono de comunicación, consulta aquí.

---

## ¿Qué es Juan Cobo Lab?

Un laboratorio de ideas donde las preguntas se convierten en evidencia  
y la evidencia en propuestas.

**No es un blog.**  
No es una página personal.  
No es una hoja de vida.

Es un laboratorio para pensar mejor.

---

## Filosofía

Aquí no venimos a tener la razón.  
Venimos a poner las ideas a prueba.

Las buenas ideas nacen preguntando.  
Las mejores mejoran conversando.  
Y todas deben terminar en una propuesta.

---

## Método Juan Cobo Lab

El proceso que sigue cada idea, pregunta o publicación del laboratorio:

1. Algo me da **pereque** *(inquietud, curiosidad, incomodidad intelectual)*.
2. Hago **preguntas**.
3. **Investigo**.
4. Recojo **evidencia**.
5. Rayo un **documento mártir** *(borrador sin miedo a equivocarse)*.
6. Construyo un **Producto Mínimo Viable**.
7. Lo **converso**.
8. Lo **mejoro**.
9. Lo vuelvo a **poner sobre la mesa**.

---

## Tono de voz

| Atributo | Descripción |
|---|---|
| **Curioso** | Pregunta antes de afirmar. Duda antes de concluir. |
| **Humilde** | Reconoce lo que no sabe. No finge certezas. |
| **Riguroso** | Cita fuentes. Distingue dato de opinión. Explicita limitaciones. |
| **Humano** | Habla como persona, no como institución. |

**Nunca arrogante.**  
**Nunca académico por parecer académico.**  
**Nunca vende humo.**  
**Siempre propone.**

---

## Principio

No creo en las ideas perfectas.  
Creo en las ideas que se atreven a empezar.

---

## Regla de oro

Toda crítica debe terminar en una propuesta.

---

## Sistema de diseño

### Paleta de color

| Nombre | Valor | Uso |
|---|---|---|
| **Navy oscuro** | `#0D1B2A` | Fondos oscuros, hero sections, CTAs |
| **Navy medio** | `#162840` | Gradientes, fondos secundarios oscuros |
| **Blanco cálido** | `#F9F9F7` | Fondos claros, secciones alternas |
| **Cobre / Accent** | `hsl(24 69% 53%)` — ≈ `#C2713A` | Acentos, badges, títulos especiales, CTAs principales |
| **Borde** | `rgba(13,27,42,0.1)` | Separadores, bordes de tarjeta en fondos claros |

### Tipografía

| Rol | Fuente | Clase Tailwind | Uso |
|---|---|---|---|
| **Headings / Títulos** | Instrument Serif | `font-serif` | H1, H2, nombres de sección, títulos de tarjeta |
| **Cuerpo / UI** | Inter | `font-sans` (default) | Párrafos, labels, metadata, botones |

**Regla tipográfica:** Los números de datos importantes van en `font-serif` y tamaño grande. Las etiquetas de categoría van en `uppercase tracking-wide text-xs font-bold`.

### Espaciado

- Premium: **mucho espacio en blanco**. Las secciones respiran.
- Padding vertical de secciones: `py-24` a `py-28` en desktop.
- Padding horizontal: `px-6` con `max-w-6xl mx-auto` para el contenido.
- Los heroes tienen `pt-32 pb-24`.

### Patrón de grid (fondos oscuros)

Usar el patrón de rejilla sutil en fondos navy para dar textura premium:

```tsx
<div
  aria-hidden
  className="pointer-events-none absolute inset-0 opacity-[0.03]"
  style={{
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
  }}
/>
```

### Animaciones

Usar `framer-motion` con el variant `fadeUp` reutilizable:

```tsx
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.09 },
  }),
};
```

- Entrar con `whileInView` + `viewport={{ once: true }}` para evitar re-animaciones.
- Stagger de `0.06`–`0.09` entre elementos de una lista.

### Componentes recurrentes

**Sección alternada (claro / oscuro):** Las secciones del home alternan entre `bg-[#F9F9F7]` y `bg-[#0D1B2A]`.

**Badge de categoría:** `text-[10px] font-bold tracking-[0.18em] uppercase` con borde y fondo semitransparente.

**Botón primario (CTA):**
```tsx
className="inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25"
```

**Botón fantasma / outline:**
```tsx
className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-accent/30 text-accent font-medium text-sm hover:bg-accent hover:text-white hover:border-accent transition-all duration-300"
```

**Línea de acento izquierda (cards premium):**
```tsx
<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent opacity-70" />
```

---

## Arquitectura del contenido

### Secciones del Home (en orden)

| Sección | Descripción |
|---|---|
| **Hero** | Pregunta o declaración de intención. No es un banner corporativo. |
| **WhatIDo** | Qué hace Juan Cobo. En pocas palabras. |
| **Stats** | Números que importan, no que impresionan. |
| **About** | Quién es Juan Cobo. Sin hoja de vida. |
| **Quote** | Una cita que define el espíritu del laboratorio. |
| **Pereque** | Las preguntas abiertas. Las que dan inquietud. |
| **Conversaciones** | Videos, ponencias y presentaciones reales. |
| **Publications** | Publicaciones académicas reales (ORCID). |
| **Tools** | Herramientas del laboratorio. |
| **Footer** | Mínimo. Elegante. Sin ruido. |

### Páginas

| Ruta | Propósito |
|---|---|
| `/` | Home — laboratorio completo en una sola vista |
| `/preguntas` | Las 16 preguntas abiertas del laboratorio |
| `/preguntas/:id` | Artículo completo de una pregunta (3 estados) |
| `/conversaciones` | Videoteca — ponencias y conferencias |
| `/constitucion` | Documento fundacional del laboratorio |

### Datos locales (`src/data/`)

| Archivo | Contenido |
|---|---|
| `conversations.ts` | Videos, ponencias y presentaciones |
| `questions.ts` | 16 preguntas reales del laboratorio |
| `questionArticles.ts` | Análisis publicados por pregunta |
| `publications.ts` | Publicaciones académicas (ORCID) |
| `articles.ts` | Artículos externos (vacío → sección oculta) |
| `blog.ts` | Entradas de blog (vacío → sección oculta) |

---

## Objetivo del proyecto

**No convertir a Juan Cobo en influencer.**  
**Convertirlo en un referente.**

La diferencia:
- El influencer acumula seguidores.
- El referente acumula argumentos.

Juan Cobo Lab es el repositorio público de los argumentos.

---

## Identidad del autor

**Juan Carlos Cobo Gómez**  
PhD. Economista. Director de Estudios Sectoriales TIC.  
Contraloría General de la República de Colombia.

- ORCID: [0000-0003-0138-7051](https://orcid.org/0000-0003-0138-7051)
- Google Scholar: [Juan Cobo](https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es)
- LinkedIn: [juan-cobo-ph-d](https://linkedin.com/in/juan-cobo-ph-d-9801672b)
- Email: juan.cobo@contraloria.gov.co

---

## Contexto técnico

| Item | Detalle |
|---|---|
| **Stack** | React + Vite + Tailwind v4 + Framer Motion + Wouter |
| **Monorepo** | pnpm workspaces |
| **Artifact path** | `artifacts/juan-cobo-lab/` |
| **Dev port** | `$PORT` (18800 en desarrollo) |
| **GitHub** | `github.com/juancobo10-a11y/juan-cobo-lab` |
| **Deploy** | Replit static + API artifact |
| **Sin backend** | No hay base de datos, login ni IA en el cliente |

---

## Reglas para cualquier IA o desarrollador que modifique este sitio

1. **Lee este archivo antes de tocar cualquier componente.**
2. **El tono siempre es curioso y humilde.** Si un texto suena a comunicado institucional, reescríbelo.
3. **El diseño siempre es premium.** Si un componente se ve genérico, refinarlo.
4. **No inventes datos.** Si no hay información real, muestra un estado provisional elegante.
5. **Las secciones se ocultan cuando el array está vacío.** No forzar contenido ficticio.
6. **El cobre es el acento.** Úsalo con moderación y propósito.
7. **Instrument Serif para títulos. Inter para todo lo demás.**
8. **Nada de Lorem Ipsum.** Nunca. Usar textos provisionales coherentes con la voz del laboratorio.
9. **Toda nueva sección debe tener un estado vacío elegante.**
10. **Commit semántico:** `vX.Y.Z: descripción del cambio en español`.

---

*Última actualización: Julio 2026*  
*Mantenido por: Juan Carlos Cobo Gómez + Agentes de desarrollo*
