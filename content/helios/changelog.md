# HELIOS — Changelog

---

## v0.4 — 2026-07-11

### Arquitectura de contenido
- Knowledge Pack TIC externalizado a `content/tic/` (5 archivos JSON): `metadata.json`, `contexto.json`, `hipotesis.json`, `pestel.json`, `chips.json`
- `Helios.tsx` eliminó todo el contenido hardcoded — ahora consume exclusivamente los archivos JSON del Knowledge Pack
- Tipos TypeScript (`Hipotesis`, `PestelItem`) definidos explícitamente para garantizar seguridad de tipos en la importación JSON
- `metadata.json` introduce el esquema de identidad del caso (`id`, `titulo`, `tema`, `herramienta`, `estado`) como infraestructura para el Router (Sprint 0.5)
- Experiencia del usuario sin cambios: flujo de 4 pantallas, animaciones, chips y accesibilidad idénticos

---

## v0.3 — 2026-07-11

### Caso real: Índice de Brecha Digital Colombia
- Contexto: reemplaza deserción escolar por párrafo sobre brecha digital (~120 palabras)
- Hipótesis: 3 nuevas hipótesis sobre brecha digital con campo `nextStep` por hipótesis
  - "La infraestructura dejó de ser el cuello de botella principal" — Alta
  - "Las soluciones uniformes no funcionan en territorios tan diversos" — Alta
  - "Los indicadores actuales miden cobertura, no transformación" — Media
- PESTEL: 6 dimensiones adaptadas (Ministerio TIC, costo de datos, habilidades digitales, calidad de conexión, geografía colombiana, espectro radioeléctrico)
- Chips "Otros usuarios han explorado": 7 temas metodológicos de brecha digital
- Chips "Por ejemplo": 4 ejemplos de brecha digital, el primero formulado como pregunta
- Pantalla 4: "Problema inicial" → "Problema analizado"; "Lo aprendido" → "Próximo paso recomendado" (dinámico según hipótesis elegida)

---

## v0.2 — 2026-07-10

### Pantalla 1 (Entrada)
- Nuevo subtítulo: "HELIOS no comienza proponiendo soluciones. Comienza ayudándote a comprender mejor el problema."
- Placeholder actualizado: "Describe el fenómeno que observas..."
- Chips de ejemplo rápido: Deserción escolar rural, Baja ejecución presupuestal, Conectividad significativa, Violencia intrafamiliar
- Nueva sección "Otros usuarios han explorado" con siete chips clicables
- Foco automático en el textarea al cargar la pantalla

### Pantalla 2 (Hipótesis)
- Nuevo título: "Antes de proponer soluciones, comprendamos el problema."
- Tarjetas de hipótesis ahora incluyen badge de nivel de confianza (Alta / Media / Exploratoria)
- Texto de respaldo: "Basada en evidencia y literatura internacional."
- Tarjetas son botones semánticos con soporte completo de teclado

### Pantalla 3 (PESTEL)
- Texto introductorio nuevo: "No todos los problemas públicos deben analizarse de la misma manera..."
- Dimensiones renombradas al español: Política, Economía, Sociedad, Tecnología, Ambiente, Marco Legal

### Pantalla 4 (Descubrimiento) — nueva
- Reemplaza el cierre provisional de v0.1
- Muestra journey visual: Problema → Hipótesis → Herramienta → Lo aprendido
- Texto de cierre: "En pocos minutos pasaste de describir un fenómeno a construir una hipótesis de trabajo..."
- Tres botones: Analizar otro problema / Explorar otra hipótesis / Conocer HELIOS
- Cita de cierre: "Las respuestas cambian. Las buenas preguntas permanecen."

### Navbar
- Enlace HELIOS muestra badge naranja "Beta" (desktop + mobile)

### Accesibilidad
- Gestión de foco programática en cada transición de pantalla
- Focus ring visible en todos los elementos interactivos
- Roles ARIA correctos en listas de hipótesis

---

## v0.1 — 2026-07-09

- Prototipo inicial: tres pantallas (entrada, hipótesis, PESTEL)
- Contenido estático hardcoded para "deserción escolar"
- Transiciones AnimatePresence entre pantallas
- Ruta `/helios` registrada en Juan Cobo Lab
