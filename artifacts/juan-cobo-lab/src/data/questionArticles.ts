import { questions } from './questions';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NivelImpacto = 'medio' | 'alto' | 'transformador';

export interface SectionPoint {
  titulo: string;
  descripcion: string;
}

export interface QuestionArticle {
  /** Same id as in questions.ts */
  id: number;
  tiempoLectura: number;        // minutes
  nivelImpacto: NivelImpacto;
  fechaActualizacion: string;   // "Julio 2025"
  porQuePereque: string;        // multi-paragraph prose
  porQueImporta: string;        // multi-paragraph prose
  loQueSabemos: SectionPoint[];
  loQueNoSabemos: SectionPoint[];
  miPosicion: string;           // multi-paragraph prose
  preguntasRelacionadas: number[]; // question ids from questions.ts
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function getQuestion(id: number) {
  return questions.find((q) => q.id === id) ?? null;
}

export function getArticle(id: number) {
  return questionArticles.find((a) => a.id === id) ?? null;
}

// ─── Articles ─────────────────────────────────────────────────────────────────
// Add one entry per pregunta cuando el análisis esté listo.
// El id debe coincidir con el id de la pregunta en questions.ts

export const questionArticles: QuestionArticle[] = [
  // ── DEMO — Plantilla de muestra ──────────────────────────────────────────
  // Esta entrada existe únicamente para previsualizar la plantilla.
  // Reemplazar con el análisis real cuando esté redactado.
  {
    id: 1,
    tiempoLectura: 8,
    nivelImpacto: 'transformador',
    fechaActualizacion: 'Enero 2025',

    porQuePereque:
      'Aquí va el argumento personal: por qué esta pregunta no me deja dormir, qué pasó —un dato, una conversación, un informe— que la instaló de forma permanente en mi cabeza.\n\nEste espacio es de primera persona. No de "se ha observado que…" sino de "yo creo que…, yo no entiendo por qué…, yo quiero saber si…". La honestidad intelectual empieza por reconocer de dónde viene la curiosidad.',

    porQueImporta:
      'Aquí va el argumento para el lector: por qué esta pregunta no es solo personal sino colectivamente relevante. Qué pierde Colombia, el sector TIC, la política pública o la sociedad si esta pregunta sigue sin responderse.\n\nNo todo lo que me da pereque tiene impacto transformador. Pero cuando lo tiene, quiero explicar por qué con evidencia, no con intuición.',

    loQueSabemos: [
      {
        titulo: 'Lo que la evidencia ya establece con claridad',
        descripcion:
          'Descripción del hallazgo empírico más sólido disponible. Fuente, alcance y limitaciones en una sola oración.',
      },
      {
        titulo: 'El consenso metodológico del campo',
        descripcion:
          'Qué enfoque predomina, por qué, y si hay razones para cuestionarlo o aceptarlo en el contexto colombiano.',
      },
      {
        titulo: 'Un dato que sorprende a quienes no conocen el sector',
        descripcion:
          'Algo contraintuitivo que cambia la forma de ver el problema. El tipo de dato que vale la pena repetir en una reunión.',
      },
    ],

    loQueNoSabemos: [
      {
        titulo: 'La pregunta que nadie ha respondido bien todavía',
        descripcion:
          'Por qué existe este vacío: falta de datos, incentivos perversos para no investigarlo, o complejidad metodológica genuina.',
      },
      {
        titulo: 'Qué tendría que pasar para que supiéramos más',
        descripcion:
          'El dato que haría diferencia, el estudio que falta, la política que permitiría un experimento natural.',
      },
    ],

    miPosicion:
      'Esta sección es distinta a todas las demás. No es lo que dice la literatura. Es lo que yo pienso hoy, con la evidencia que tengo y los sesgos que reconozco tener.\n\nMi posición es que [argumento central en una o dos oraciones directas]. Llego a esto porque [razonamiento explícito]. Cambiaría de posición si [condición falsificable].\n\nLas posiciones cambian. Esta es la mía hoy.',

    preguntasRelacionadas: [2, 5, 9],
  },
];
