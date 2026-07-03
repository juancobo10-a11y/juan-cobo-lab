// ─── Interface ────────────────────────────────────────────────────────────────

export interface Conversacion {
  id: number;
  titulo: string;
  /** Contexto breve: evento, institución o canal */
  tema: string;
  descripcion: string;
  categoria: string;
  fecha: string;          // "Febrero 2026"
  destacado?: boolean;    // aparece primero en el preview del home

  // ── Video ────────────────────────────────────────────────────────────────
  youtubeId?: string;     // ID del video (para thumbnail + link)
  youtubeUrl?: string;    // URL completa (puede incluir timestamp &t=Xs)
  duracion?: string;      // "2 h 20 min" — mostrado como badge

  // ── Otros recursos (opcionales) ──────────────────────────────────────────
  pdfUrl?: string;        // URL o ruta al PDF de la presentación
  articuloUrl?: string;   // URL del artículo relacionado
}

// ─── Videoteca ────────────────────────────────────────────────────────────────
// Para agregar un nuevo video:
//   {
//     id: N,
//     titulo: 'Título real del video',
//     tema: 'Evento o institución donde se presentó',
//     descripcion: 'Descripción breve (2-3 oraciones).',
//     categoria: 'Conferencias y ponencias',
//     fecha: 'Mes Año',
//     youtubeId: 'ID_DEL_VIDEO',
//     youtubeUrl: 'https://www.youtube.com/watch?v=ID_DEL_VIDEO',
//     duracion: 'X h Y min',
//     destacado: true,
//   },

export const conversations: Conversacion[] = [
  {
    id: 1,
    titulo: 'Conectividad digital en Colombia',
    tema: 'Ponencia — Contraloría General de la República',
    descripcion:
      'Análisis de la evolución de las políticas públicas de conectividad digital en Colombia, presentado ante la Contraloría General de la República. Indicadores, brechas persistentes y recomendaciones de política basadas en evidencia.',
    categoria: 'Conferencias y ponencias',
    fecha: 'Febrero 2026',
    destacado: true,
    youtubeId: 'YjbrfMKf2CA',
    youtubeUrl: 'https://www.youtube.com/watch?v=YjbrfMKf2CA&t=702s',
    duracion: '2 h',
  },
  {
    id: 2,
    titulo: 'De lo Tradicional a lo Digital: Impulsando el Comercio Electrónico',
    tema: 'Estudio intersectorial — Contraloría General de la República',
    descripcion:
      'Presentación del estudio intersectorial sobre la transición al comercio electrónico en Colombia: indicadores de adopción, brechas por región e ingreso, y oportunidades de política pública para acelerar la digitalización económica.',
    categoria: 'Conferencias y ponencias',
    fecha: 'Noviembre 2025',
    destacado: true,
    youtubeId: 'GAadUDFnglA',
    youtubeUrl: 'https://www.youtube.com/watch?v=GAadUDFnglA&t=109s',
    duracion: '2 h 20 min',
  },
  {
    id: 3,
    titulo: 'De la Brecha Digital a la Conectividad Significativa',
    tema: 'Conferencia — Contraloría General de la República',
    descripcion:
      'Más allá del acceso a internet: qué implica realmente una conexión útil para el desarrollo. Exploración del concepto de conectividad significativa y sus implicaciones para la política pública colombiana.',
    categoria: 'Conferencias y ponencias',
    fecha: 'Agosto 2025',
    destacado: true,
    youtubeId: '05-slhPX2NI',
    youtubeUrl: 'https://www.youtube.com/watch?v=05-slhPX2NI&t=914s',
    duracion: '28 min',
  },
  {
    id: 4,
    titulo: 'Foro «Conectividad Digital para todos»',
    tema: 'Foro regional — Leticia, Amazonas',
    descripcion:
      'Desde Leticia, Amazonas, expertos y funcionarios analizan el cierre de brechas en conectividad digital en regiones apartadas de Colombia. Control fiscal, indicadores satelitales y gobernanza del espectro.',
    categoria: 'Conferencias y ponencias',
    fecha: 'Marzo 2025',
    youtubeId: 'Dfy-m3FSfPY',
    youtubeUrl: 'https://www.youtube.com/watch?v=Dfy-m3FSfPY&t=12418s',
    duracion: '4 h 8 min',
  },
  {
    id: 5,
    titulo: 'Aciertos y desafíos de la educación inclusiva en Colombia',
    tema: 'Foro — Contraloría General de la República',
    descripcion:
      'Análisis de los aciertos y desafíos de la educación inclusiva en Colombia: políticas, evidencia empírica y recomendaciones desde el control fiscal. Perspectiva intersectorial con énfasis en poblaciones vulnerables.',
    categoria: 'Conferencias y ponencias',
    fecha: 'Junio 2024',
    youtubeId: '-Mabhr_kno4',
    youtubeUrl: 'https://www.youtube.com/watch?v=-Mabhr_kno4&t=11s',
    duracion: '3 h 55 min',
  },
  {
    id: 6,
    titulo: '10 Años del Acuerdo de Paz: reflexión desde el territorio',
    tema: 'Evento conmemorativo — UNAD y Contraloría General de la Nación',
    descripcion:
      'Reflexión, memoria y diálogo sobre los avances, retos y perspectivas de la construcción de paz en Colombia a diez años del Acuerdo. Espacio académico entre la UNAD y la Contraloría General de la Nación.',
    categoria: 'Conferencias y ponencias',
    fecha: 'Junio 2026',
    youtubeId: 'x6eYzfTVw8k',
    youtubeUrl: 'https://www.youtube.com/watch?v=x6eYzfTVw8k',
    duracion: '7 h 25 min',
  },
];
