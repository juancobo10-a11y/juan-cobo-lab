export interface BlogPost {
  date: string;
  title: string;
  teaser: string;
  url?: string;
}

// Agrega entradas reales aquí cuando estén publicadas.
// Mientras el array esté vacío, la sección no se renderiza.
export const blogPosts: BlogPost[] = [];
