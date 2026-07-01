// ──────────────────────────────────────────────────────────
//  ARTÍCULOS — edita aquí para agregar, quitar o modificar
// ──────────────────────────────────────────────────────────
//
// Campos de cada artículo:
//   title    → título del artículo
//   tag      → categoría visible en la tarjeta
//   teaser   → descripción corta (1-2 frases)
//   readTime → tiempo estimado de lectura (ej: "5 min")
//   url      → enlace al artículo (pon "" si no tienes)
//
// El primer artículo de la lista se muestra destacado (tarjeta grande oscura).

export interface Article {
  title: string;
  tag: string;
  teaser: string;
  readTime: string;
  url?: string;
}

export const articles: Article[] = [
  {
    title: "Cómo convertir una idea en un artículo publicable",
    tag: "Metodología",
    teaser: "El paso a paso que sigo para transformar un hallazgo en Excel en un documento que alguien más quiera leer.",
    readTime: "5 min",
    url: "",
  },
  {
    title: "Lo que nadie te dice sobre analizar políticas públicas",
    tag: "Políticas públicas",
    teaser: "Más allá de los modelos causales perfectos: cómo lidiar con datos incompletos y tiempos políticos urgentes.",
    readTime: "7 min",
    url: "",
  },
  {
    title: "IA para investigar sin dejar que piense por ti",
    tag: "Inteligencia Artificial",
    teaser: "Flujos de trabajo útiles con LLMs para revisión de literatura, sin perder el rigor crítico.",
    readTime: "6 min",
    url: "",
  },
  {
    title: "De Excel a la decisión pública",
    tag: "Análisis de datos",
    teaser: "Por qué el mejor análisis no sirve si no cabe en un memo de una página para el ministro.",
    readTime: "4 min",
    url: "",
  },
  {
    title: "Por qué una buena gráfica también puede mentir",
    tag: "Visualización",
    teaser: "Errores comunes (y tentaciones) al presentar resultados de evaluaciones de impacto.",
    readTime: "8 min",
    url: "",
  },
];
