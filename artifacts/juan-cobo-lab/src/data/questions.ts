export interface Question {
  id: number;
  pregunta: string;
  categoria: string;
  pereque: string;
  importancia: string;
}

export const CATEGORIAS = [
  'Sentido',
  'Política pública',
  'Método',
  'Investigación',
  'Vida',
  'Liderazgo',
  'TIC',
  'Educación',
  'Productividad',
  'TIC y Paz',
] as const;

export const questions: Question[] = [
  {
    id: 1,
    pregunta:
      'Me pregunto si las estrellas se iluminan con el fin de que algún día cada uno pueda encontrar la suya.',
    categoria: 'Sentido',
    pereque: 'Buscar sentido a la vida y a lo que hacemos.',
    importancia:
      'Ayuda a otros a pensar cuál es su estrella y por qué vale la pena luchar por ella.',
  },
  {
    id: 2,
    pregunta: '¿Qué significa "hágase tu voluntad así en la tierra como en el cielo"?',
    categoria: 'Sentido',
    pereque: 'Pensar cómo traer el Reino de Dios al presente desde nuestro lugar de acción.',
    importancia: 'Invita a actuar mejor desde lo cotidiano.',
  },
  {
    id: 3,
    pregunta: '¿Por qué fallamos en el diagnóstico de los problemas de política pública?',
    categoria: 'Política pública',
    pereque: 'Es la base de mi trabajo: entender bien el problema antes de proponer soluciones.',
    importancia: 'Toda política pública debería partir de un buen diagnóstico.',
  },
  {
    id: 4,
    pregunta: '¿Cuál es el sentido de la vida?',
    categoria: 'Sentido',
    pereque: 'Encontrar sentido da mucho pereque.',
    importancia: 'Es una pregunta universal.',
  },
  {
    id: 5,
    pregunta: '¿Cómo arrancar un proyecto?',
    categoria: 'Método',
    pereque: 'Todo proyecto exige ordenar tiempo, costo y alcance.',
    importancia: 'Cualquiera que quiera construir algo necesita empezar bien.',
  },
  {
    id: 6,
    pregunta: '¿Cómo hacer una pregunta de investigación?',
    categoria: 'Investigación',
    pereque: 'Una mala pregunta daña una buena investigación.',
    importancia:
      'Estudiantes, investigadores y servidores públicos necesitan formular mejores preguntas.',
  },
  {
    id: 7,
    pregunta: 'Una hipótesis de investigación, ¿cómo se debe escribir?',
    categoria: 'Investigación',
    pereque: 'La hipótesis ordena lo que queremos contrastar.',
    importancia: 'Ayuda a investigar con mayor rigor.',
  },
  {
    id: 8,
    pregunta: '¿Cómo superar cualquier tusa?',
    categoria: 'Vida',
    pereque: 'Las tusas no son solo amorosas; también son laborales, familiares y personales.',
    importancia: 'Todos necesitamos aprender a gestionar pérdidas y conflictos.',
  },
  {
    id: 9,
    pregunta: '¿Cómo saber si soy un buen líder?',
    categoria: 'Liderazgo',
    pereque: 'Liderar exige mirarse con honestidad.',
    importancia: 'Todo equipo necesita mejores liderazgos.',
  },
  {
    id: 10,
    pregunta: '¿Somos ambiciosos en la planeación de metas o ponemos retos bajitos?',
    categoria: 'Política pública',
    pereque: 'Muchas metas se diseñan para cumplirse, no para transformar.',
    importancia: 'La planeación pública debería aspirar a cambios reales.',
  },
  {
    id: 11,
    pregunta:
      'Las metas TIC del Plan Nacional de Desarrollo: ¿cumplimiento o ilusión estadística?',
    categoria: 'TIC',
    pereque: 'Las cifras pueden mostrar cumplimiento sin demostrar impacto.',
    importancia: 'Ayuda a distinguir resultado formal de transformación real.',
  },
  {
    id: 12,
    pregunta: '¿Por qué conectar un hogar no significa necesariamente incluirlo?',
    categoria: 'TIC',
    pereque: 'La conectividad no garantiza uso significativo.',
    importancia: 'Permite pensar la inclusión digital más allá de la cobertura.',
  },
  {
    id: 13,
    pregunta: 'Formar una persona no garantiza que adquiera competencias útiles.',
    categoria: 'Educación',
    pereque: 'La asistencia a una formación no prueba aprendizaje.',
    importancia:
      'Las políticas educativas deben medir competencias, no solo beneficiarios.',
  },
  {
    id: 14,
    pregunta: 'Beneficiar una empresa no asegura mayor productividad.',
    categoria: 'Productividad',
    pereque: 'Un apoyo estatal no siempre se convierte en transformación productiva.',
    importancia: 'Importa medir resultados, no solo entregas.',
  },
  {
    id: 15,
    pregunta:
      '¿La política de conectividad del PND contribuyó realmente a la implementación del Acuerdo de Paz?',
    categoria: 'TIC y Paz',
    pereque: 'La conectividad debe evaluarse frente a sus efectos territoriales.',
    importancia: 'El país necesita saber si la política pública está cumpliendo el Acuerdo.',
  },
  {
    id: 16,
    pregunta: '¿Conectividad para la paz o paz con conectividad?',
    categoria: 'TIC y Paz',
    pereque:
      'No es lo mismo llevar tecnología a territorios que construir condiciones de paz.',
    importancia: 'Ayuda a replantear el sentido de la conectividad rural.',
  },
];
