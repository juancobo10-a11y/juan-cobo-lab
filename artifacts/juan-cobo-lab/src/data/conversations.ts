// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversacionTipo = 'video' | 'pdf' | 'articulo';

export interface Conversacion {
  id: number;
  tipo: ConversacionTipo;
  titulo: string;
  descripcion: string;
  categoria: string;
  fecha: string;        // "Junio 2025"
  destacado?: boolean;  // aparece en el preview del home
  // Video (tipo: 'video')
  youtubeId?: string;   // ID del video (parte después de ?v= en YouTube)
  duracion?: string;    // "45 min"
  canal?: string;       // nombre del canal o presentador
  // Presentación PDF (tipo: 'pdf')
  pdfUrl?: string;      // URL absoluta o ruta relativa al archivo
  totalSlides?: number;
  evento?: string;      // nombre de la conferencia o evento
  // Artículo externo (tipo: 'articulo')
  articuloUrl?: string; // URL del artículo
  fuente?: string;      // "El Meridiano", "Razón Pública", etc.
  etiquetas?: string[];
}

// ─── Conversaciones ───────────────────────────────────────────────────────────
// Agrega aquí las conversaciones reales.
// Los campos marcados con * son obligatorios para ese tipo de contenido.
//
// Ejemplo de video:
//   { id: 1, tipo: 'video', titulo: '...', youtubeId: 'dQw4w9WgXcQ',
//     duracion: '45 min', canal: 'Canal XYZ', ... }
//
// Ejemplo de PDF:
//   { id: 2, tipo: 'pdf', titulo: '...', pdfUrl: '/presentaciones/mi-slides.pdf',
//     totalSlides: 32, evento: 'Congreso TIC Colombia 2025', ... }
//
// Ejemplo de artículo:
//   { id: 3, tipo: 'articulo', titulo: '...', articuloUrl: 'https://...',
//     fuente: 'Razón Pública', etiquetas: ['política', 'datos'], ... }

export const conversations: Conversacion[] = [
  // ── DEMO — eliminar o reemplazar con contenido real ──────────────────────

  {
    id: 1,
    tipo: 'video',
    titulo: 'Datos, contraloría y política pública: una conversación pendiente',
    descripcion:
      'Por qué los organismos de control necesitan hablar más con los productores de evidencia, y menos con los titulares de prensa.',
    categoria: 'Política pública',
    fecha: 'Próximamente',
    destacado: true,
    youtubeId: '',       // ← reemplazar con el ID real del video
    duracion: '—',
    canal: 'Juan Cobo Lab',
  },
  {
    id: 2,
    tipo: 'pdf',
    titulo: 'El sector TIC en Colombia: indicadores, brechas y lo que los datos no dicen',
    descripcion:
      'Presentación de 40 diapositivas con los principales hallazgos del análisis sectorial 2023–2025. Metodología, fuentes y limitaciones explícitas.',
    categoria: 'TIC',
    fecha: 'Próximamente',
    destacado: true,
    pdfUrl: '',          // ← reemplazar con la URL o ruta al PDF
    totalSlides: 40,
    evento: 'Evento por confirmar',
  },
  {
    id: 3,
    tipo: 'articulo',
    titulo: 'Por qué Colombia necesita una política de datos pública, urgente y valiente',
    descripcion:
      'El argumento que no alcanzó en 800 palabras de columna: qué implica gobernar con datos en un Estado que todavía teme la transparencia.',
    categoria: 'Política pública',
    fecha: 'Próximamente',
    destacado: true,
    articuloUrl: '',     // ← reemplazar con la URL del artículo publicado
    fuente: 'Por confirmar',
    etiquetas: ['datos abiertos', 'gobernanza', 'TIC'],
  },
];
