// ────────────────────────────────────────────────────────────
//  PUBLICACIONES — edita aquí para agregar, quitar o modificar
// ────────────────────────────────────────────────────────────
//
// Fuente: ORCID 0000-0003-0138-7051 + Google Scholar (USgdRhcAAAAJ)
//
// Campos de cada publicación:
//   title    → título completo
//   category → debe ser uno de los valores de CATEGORIES
//   venue    → revista, editorial, institución, congreso, etc.
//   year     → año de publicación (string)
//   url      → enlace DOI u otro (pon "" si no tienes)
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

  // ── Artículos científicos ─────────────────────────────────────────────

  {
    title: "Social Innovation in University-Community Partnerships in Latin America: Exploring Collaborative Models",
    category: "Artículos científicos",
    venue: "Sustainable Technology and Entrepreneurship",
    year: "2023",
    url: "https://doi.org/10.1016/j.stae.2023.100061",
  },
  {
    title: "Design of a Model Instructional Applied to a Virtual Guide in Clinical Simulation",
    category: "Artículos científicos",
    venue: "Universitas Médica, 60(3), 5-19",
    year: "2019",
    url: "https://doi.org/10.11144/javeriana.umed60-3.mdis",
  },
  {
    title: "Efectividad en el aprendizaje de la punción venosa en estudiantes de enfermería utilizando dos estrategias didácticas: Una experiencia investigativa en aula",
    category: "Artículos científicos",
    venue: "Investigación en Enfermería: Imagen y Desarrollo, 18(2), 61-75",
    year: "2016",
    url: "",
  },
  {
    title: "Characterization of the Muscular Strength Increase in University Students",
    category: "Artículos científicos",
    venue: "Official Journal of the American College of Sports Medicine",
    year: "2016",
    url: "",
  },

  // ── Columnas de opinión ───────────────────────────────────────────────

  {
    title: "Presidente: la conectividad ya no es el reto",
    category: "Columnas de opinión",
    venue: "El Meridiano",
    year: "2026",
    url: "",
  },
  {
    title: "Tecnología para la paz: ¿conectamos territorios o transformamos oportunidades?",
    category: "Columnas de opinión",
    venue: "El Meridiano",
    year: "2026",
    url: "",
  },
  {
    title: "Inteligencia Artificial en la educación: oportunidad real para cerrar brechas",
    category: "Columnas de opinión",
    venue: "El Meridiano",
    year: "2026",
    url: "https://elmeridiano.co/cordoba/opinion/inteligencia-artificial-en-la-educacion-oportunidad-real-para--cerrar-brechas",
  },
  {
    title: "Innovación social, beneficio más allá del crecimiento económico",
    category: "Columnas de opinión",
    venue: "Pesquisa — Pontificia Universidad Javeriana",
    year: "2021",
    url: "",
  },
  {
    title: "El Coronavirus también enferma al peso colombiano",
    category: "Columnas de opinión",
    venue: "Pesquisa — Pontificia Universidad Javeriana",
    year: "2020",
    url: "",
  },

  // ── Estudios técnicos ─────────────────────────────────────────────────

  {
    title: "Measuring Digital Inequality for Public Policy Oversight: A Subnational Index and Evidence of Territorial Convergence in Colombia",
    category: "Estudios técnicos",
    venue: "SSRN Working Paper",
    year: "2026",
    url: "https://doi.org/10.2139/ssrn.6574551",
  },

  // ── Ponencias ─────────────────────────────────────────────────────────

  {
    title: "Affordability as a Core Enabler of Meaningful Connectivity: A Fiscal Assessment of Progress for Low-Income Households in Colombia",
    category: "Ponencias",
    venue: "INTED 2026",
    year: "2026",
    url: "https://doi.org/10.21125/inted.2026.1808",
  },
  {
    title: "Beyond Execution: Allocative Efficiency, Traceability, and Governance in the Comprehensive Protection of Children and Adolescents in Colombia (2018–2025)",
    category: "Ponencias",
    venue: "INTED 2026",
    year: "2026",
    url: "https://doi.org/10.21125/inted.2026.2141",
  },
  {
    title: "The Digital Divide Index of the Colombian Supreme Audit Institution (IBD-CGR): Conceptual Foundations, Methodology and Evidence of Territorial Convergence (2019–2024)",
    category: "Ponencias",
    venue: "INTED 2026",
    year: "2026",
    url: "https://doi.org/10.21125/inted.2026.1437",
  },
  {
    title: "Availability of ICT Resources and Rural Education in Colombia (2018–2024): Gaps in Access, Use, and Appropriation",
    category: "Ponencias",
    venue: "ICERI 2025",
    year: "2025",
    url: "https://doi.org/10.21125/iceri.2025.1801",
  },
  {
    title: "Digital Education in Colombia Under Scrutiny: The Role of the Supreme Audit Institution and its Information and Communication Technologies Division",
    category: "Ponencias",
    venue: "ICERI 2025",
    year: "2025",
    url: "https://doi.org/10.21125/iceri.2025.1810",
  },
  {
    title: "Emerging Technologies and Rural Education",
    category: "Ponencias",
    venue: "ICERI 2025",
    year: "2025",
    url: "https://doi.org/10.21125/iceri.2025.1680",
  },
  {
    title: "Transforming Indigenous Early Childhood Education Through Culture and Technology",
    category: "Ponencias",
    venue: "ICERI 2025",
    year: "2025",
    url: "https://doi.org/10.21125/iceri.2025.1800",
  },
  {
    title: "Bridging the Digital Divide in Rural Education: Challenges and Policy Gaps in Colombia",
    category: "Ponencias",
    venue: "EDULEARN 2025",
    year: "2025",
    url: "https://doi.org/10.21125/edulearn.2025.1693",
  },
  {
    title: "Equity and Challenges in Colombia's School Feeding Program: Insights from Gini Index Analysis and Food Security Prioritization, and Educational Policy Implications",
    category: "Ponencias",
    venue: "EDULEARN 2025",
    year: "2025",
    url: "https://doi.org/10.21125/edulearn.2025.1721",
  },
  {
    title: "Technology and Educational Quality Gaps in Colombia: Contributions from Supreme Audit Institutions to Ensure Equitable and Efficient Education through Digital Transformation",
    category: "Ponencias",
    venue: "EDULEARN 2025",
    year: "2025",
    url: "https://doi.org/10.21125/edulearn.2025.1283",
  },
  {
    title: "The Unintended Consequences of Internet Expansion in Indigenous Communities: A Cultural Disruption in Colombia",
    category: "Ponencias",
    venue: "EDULEARN 2025",
    year: "2025",
    url: "https://doi.org/10.21125/edulearn.2025.1827",
  },
  {
    title: "Inclusive Education in Colombia: Colombian Regional Overview — A Perspective from Fiscal Management",
    category: "Ponencias",
    venue: "ICERI 2024",
    year: "2024",
    url: "https://doi.org/10.21125/iceri.2024.0154",
  },
  {
    title: "Developing Social Responsibility in University Students",
    category: "Ponencias",
    venue: "ACM International Conference Proceeding Series",
    year: "2019",
    url: "https://doi.org/10.1145/3369255.3369275",
  },

  // ── Capítulos de libro ────────────────────────────────────────────────

  {
    title: "Cuidadores en Colombia: Hacia un Futuro de Empoderamiento en el Cuidado de Personas con Discapacidad",
    category: "Capítulos de libro",
    venue: "Editorial pendiente",
    year: "2024",
    url: "",
  },
  {
    title: "Desafíos de la educación inclusiva en Colombia: Un análisis desde el control fiscal con enfoque regional",
    category: "Capítulos de libro",
    venue: "Contraloría General de la República",
    year: "2024",
    url: "",
  },
  {
    title: "Abordando la calidad educativa: Un análisis a nivel nacional y territorial",
    category: "Capítulos de libro",
    venue: "¿Por qué seguimos siendo pobres en Colombia?",
    year: "2024",
    url: "",
  },
  {
    title: "Un siglo de transformación: La Contraloría General de la República, el control fiscal y la educación en Colombia",
    category: "Capítulos de libro",
    venue: "Pasado, presente y futuro de la Contraloría General de la República",
    year: "2023",
    url: "",
  },
];
