export interface Article {
  title: string;
  tag: string;
  teaser: string;
  readTime: string;
  url?: string;
}

// Agrega artículos reales aquí cuando estén publicados.
// Mientras el array esté vacío, la sección no se renderiza.
export const articles: Article[] = [];
