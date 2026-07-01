// ────────────────────────────────────────────────────────────
//  PUBLICACIONES — edita aquí para agregar, quitar o modificar
// ────────────────────────────────────────────────────────────
//
// Campos de cada publicación:
//   title    → título completo
//   category → debe ser uno de los valores de CATEGORIES
//   venue    → revista, editorial, institución, congreso, etc.
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
  // ── Artículos científicos ────────────────────────────────
  {
    title: "Social Innovation in University-Community Partnerships in Latin America: Exploring Collaborative Models",
    category: "Artículos científicos",
    venue: "Sustainable Technology and Entrepreneurship",
    year: "2023",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Instructional Design Model Applied to a Virtual Guide in Clinical Simulation",
    category: "Artículos científicos",
    venue: "Universitas Médica, 60(3), 5-19",
    year: "2019",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Developing social responsibility in university students",
    category: "Artículos científicos",
    venue: "Developing Social Responsibility in University Students, 2(NA)",
    year: "2019",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Efectividad en el aprendizaje de la punción venosa en estudiantes de enfermería utilizando dos estrategias didácticas: Una experiencia investigativa en aula",
    category: "Artículos científicos",
    venue: "Investigación en Enfermería: Imagen y Desarrollo, 18(2), 61-75",
    year: "2016",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },

  // ── Ponencias ───────────────────────────────────────────
  {
    title: "The Unintended Consequences of Internet Expansion in Indigenous Communities: A Cultural Disruption in Colombia",
    category: "Ponencias",
    venue: "EDULEARN25 Proceedings, 7425-7434",
    year: "2025",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Bridging the Digital Divide in Rural Education: Challenges and Policy Gaps in Colombia",
    category: "Ponencias",
    venue: "EDULEARN25 Proceedings, 6906-6911",
    year: "2025",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Equity and Challenges in Colombia's School Feeding Program: Insights from Gini Index Analysis and Food Security Prioritization, and Educational Policy Implications",
    category: "Ponencias",
    venue: "EDULEARN25 Proceedings, 6986-6990",
    year: "2025",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Technology and Educational Quality Gaps in Colombia: Contributions from Supreme Audit Institutions to Ensure Equitable and Efficient Education through Digital Transformation",
    category: "Ponencias",
    venue: "EDULEARN25 Proceedings, 5086-5090",
    year: "2025",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },

  // ── Capítulos de libro ──────────────────────────────────
  {
    title: "Abordando la calidad educativa: un análisis a nivel nacional e internacional",
    category: "Capítulos de libro",
    venue: "¿Por qué seguimos siendo pobres en Colombia?",
    year: "2023",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },
  {
    title: "Un siglo de transformación: La Contraloría General de la República, el control fiscal y la educación en Colombia",
    category: "Capítulos de libro",
    venue: "1923-2023 Pasado, presente y futuro",
    year: "2023",
    url: "https://scholar.google.com/citations?user=USgdRhcAAAAJ&hl=es",
  },

  // ── Columnas de opinión — agrega las tuyas aquí ────────
  // {
  //   title: "Tu columna aquí",
  //   category: "Columnas de opinión",
  //   venue: "El Espectador / La Silla Vacía / etc.",
  //   year: "2024",
  //   url: "",
  // },

  // ── Estudios técnicos — agrega los tuyos aquí ──────────
  // {
  //   title: "Tu estudio técnico aquí",
  //   category: "Estudios técnicos",
  //   venue: "Contraloría General de la República / DNP / etc.",
  //   year: "2024",
  //   url: "",
  // },
];
