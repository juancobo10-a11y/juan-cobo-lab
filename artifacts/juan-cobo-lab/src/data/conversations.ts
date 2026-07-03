// ─── Interface ────────────────────────────────────────────────────────────────

export interface Conversacion {
  id: number;
  titulo: string;
  /** Frase corta que resume el eje temático de la conversación */
  tema: string;
  descripcion: string;
  categoria: string;
  fecha: string;         // "Junio 2025"
  destacado?: boolean;   // Aparece en el preview del home

  // ── Recursos (todos opcionales) ───────────────────────────────────────────
  // Si el campo está vacío o undefined → el botón se muestra como "Próximamente"
  youtubeUrl?: string;   // URL completa del video en YouTube
  pdfUrl?: string;       // URL o ruta al archivo PDF de la presentación
  articuloUrl?: string;  // URL del artículo relacionado
}

// ─── Datos ────────────────────────────────────────────────────────────────────
// Completa los campos youtubeUrl, pdfUrl y articuloUrl con los enlaces reales.
// Si un enlace aún no existe, déjalo vacío ('') o quítalo — el botón
// aparecerá automáticamente como "Próximamente" y desactivado.
//
// Para agregar una entrada nueva:
//   {
//     id: 4,
//     titulo: 'Título de la conversación',
//     tema: 'Eje temático en una frase',
//     descripcion: 'Descripción breve de qué se habló.',
//     categoria: 'TIC | Política pública | Regulación | Investigación',
//     fecha: 'Mes Año',
//     youtubeUrl: 'https://www.youtube.com/watch?v=...',
//     pdfUrl: 'https://... o /presentaciones/nombre.pdf',
//     articuloUrl: 'https://...',
//     destacado: true,
//   },

export const conversations: Conversacion[] = [
  // ── PENDIENTE DE COMPLETAR — reemplazar con contenido real ───────────────

  {
    id: 1,
    titulo: 'Datos, contraloría y política pública: una conversación pendiente',
    tema: 'Control fiscal y evidencia en Colombia',
    descripcion:
      'Por qué los organismos de control necesitan hablar más con los productores de evidencia, y menos con los titulares de prensa. Una mirada a la brecha entre la información disponible y las decisiones que se toman.',
    categoria: 'Política pública',
    fecha: 'Próximamente',
    destacado: true,
    youtubeUrl: '',      // ← pendiente de completar
    pdfUrl: '',          // ← pendiente de completar
    articuloUrl: '',     // ← pendiente de completar
  },
  {
    id: 2,
    titulo: 'El sector TIC en Colombia: indicadores, brechas y lo que los datos no dicen',
    tema: 'Análisis sectorial 2023–2025',
    descripcion:
      'Los principales hallazgos del análisis sectorial del período 2023–2025: metodología, fuentes, limitaciones explícitas y lo que todavía no sabemos sobre el ecosistema digital colombiano.',
    categoria: 'TIC',
    fecha: 'Próximamente',
    destacado: true,
    youtubeUrl: '',      // ← pendiente de completar
    pdfUrl: '',          // ← pendiente de completar
    articuloUrl: '',     // ← pendiente de completar
  },
  {
    id: 3,
    titulo: 'Por qué Colombia necesita una política de datos pública, urgente y valiente',
    tema: 'Gobernanza de datos y Estado digital',
    descripcion:
      'El argumento que no alcanzó en 800 palabras de columna: qué implica gobernar con datos en un Estado que todavía teme la transparencia, y cuál sería el primer paso concreto.',
    categoria: 'Política pública',
    fecha: 'Próximamente',
    destacado: true,
    youtubeUrl: '',      // ← pendiente de completar
    pdfUrl: '',          // ← pendiente de completar
    articuloUrl: '',     // ← pendiente de completar
  },
];
