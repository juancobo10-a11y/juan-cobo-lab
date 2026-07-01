// ──────────────────────────────────────────────────────────────────
//  ENTRADAS DEL BLOG — edita aquí para agregar, quitar o modificar
// ──────────────────────────────────────────────────────────────────
//
// Campos de cada entrada:
//   date   → fecha visible (ej: "14 Oct 2023")
//   title  → título de la entrada
//   teaser → descripción corta (2-3 frases)
//   url    → enlace a la entrada completa (pon "" si no tienes)

export interface BlogPost {
  date: string;
  title: string;
  teaser: string;
  url?: string;
}

export const blogPosts: BlogPost[] = [
  {
    date: "14 Oct 2023",
    title: "Lo que aprendí fallando en mi primera evaluación de impacto",
    teaser: "Una confesión sobre tamaños de muestra insuficientes, variables de confusión que no vi venir y por qué la humildad metodológica es vital.",
    url: "",
  },
  {
    date: "28 Sep 2023",
    title: "Cuando la IA alucinó mi bibliografía: crónica de un viernes",
    teaser: "Le pedí a un modelo de lenguaje que me encontrara papers sobre gasto público. Me inventó tres autores y una revista que sonaba espectacularmente real.",
    url: "",
  },
  {
    date: "05 Sep 2023",
    title: "Por qué los dashboards bonitos no sirven si nadie los mira",
    teaser: "El fetiche de la visualización en el sector público y cómo construir herramientas de datos que los tomadores de decisión realmente usen.",
    url: "",
  },
];
