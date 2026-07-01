// ────────────────────────────────────────────────────────────
//  PUBLICACIONES — edita aquí para agregar, quitar o modificar
// ────────────────────────────────────────────────────────────
//
// Campos de cada publicación:
//   title    → título completo
//   category → debe ser uno de los valores de CATEGORIES
//   venue    → revista, editorial, institución, etc.
//   year     → año de publicación (string)
//   url      → enlace opcional (pon "" si no tienes)
//
// Categorías disponibles:
//   "Artículos científicos"
//   "Columnas de opinión"
//   "Estudios técnicos"
//   "Ponencias"
//   "Capítulos de libro"

export const CATEGORIES = [
  "Todos",
  "Artículos científicos",
  "Columnas de opinión",
  "Estudios técnicos",
  "Ponencias",
  "Capítulos de libro",
] as const;

export type PublicationCategory = (typeof CATEGORIES)[number];

export interface Publication {
  title: string;
  category: Exclude<PublicationCategory, "Todos">;
  venue: string;
  year: string;
  url?: string;
}

export const publications: Publication[] = [
  {
    title: "Evaluación de impacto de programas sociales en Colombia: una revisión de la última década",
    category: "Artículos científicos",
    venue: "Revista de Economía del Rosario",
    year: "2023",
    url: "",
  },
  {
    title: "¿Para qué sirven los indicadores si nadie los lee?",
    category: "Columnas de opinión",
    venue: "El Espectador",
    year: "2022",
    url: "",
  },
  {
    title: "Análisis territorial del gasto público en salud post-pandemia",
    category: "Estudios técnicos",
    venue: "DNP",
    year: "2021",
    url: "",
  },
  {
    title: "Inteligencia artificial en la política pública: oportunidades y riesgos reales",
    category: "Ponencias",
    venue: "CLAD",
    year: "2023",
    url: "",
  },
  {
    title: "Innovación pública en América Latina: de la teoría al escritorio",
    category: "Capítulos de libro",
    venue: "Universidad Externado de Colombia",
    year: "2020",
    url: "",
  },
  {
    title: "Desigualdad urbana y acceso a bienes públicos: el caso de Bogotá",
    category: "Artículos científicos",
    venue: "Desarrollo y Sociedad",
    year: "2019",
    url: "",
  },
  {
    title: "Manual práctico para estructurar proyectos de inversión local",
    category: "Estudios técnicos",
    venue: "ESAP",
    year: "2022",
    url: "",
  },
  {
    title: "El fin del Excel: por qué el sector público necesita mejores bases de datos",
    category: "Columnas de opinión",
    venue: "La Silla Vacía",
    year: "2023",
    url: "",
  },
];
