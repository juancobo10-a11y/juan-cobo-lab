# ADR-0012 — El informe es una proyección del Knowledge Graph

**Sprint:** S-023  
**Fecha:** 2026-07-17  
**Estado:** Aceptada  
**Autores:** HELIOS Engineering  

---

## Contexto

Después de S-022, HELIOS tiene un ciclo metodológico completo: problema → hipótesis → modelo conceptual → operacionalización → contrastación → evidencia → evaluación → conclusión → auditoría. Esta información existe en la sesión como entidades distintas pero no hay forma de convertirla en un producto reutilizable.

El usuario necesita exportar el trabajo metodológico como un informe que:
1. Sea completamente trazable hasta las entidades originales.
2. No reproduzca sesgos de interpretación automática.
3. No almacene una copia paralela del estado de la sesión.
4. Permita elegir qué incluir.

---

## Decisión

**El informe es una proyección del Knowledge Graph.**

Principios:
1. `ReportDefinition` sólo almacena configuración (qué secciones, en qué orden). No almacena contenido.
2. El contenido se genera dinámicamente en `generateReport()` desde el estado de sesión actual.
3. Cada bloque del informe (`ReportBlock`) lleva `entityType` + `entityId` apuntando a la entidad original.
4. No existe `GeneratedReport` persistente en sesión — siempre se reconstruye.
5. HELIOS no redacta, no resume, no interpreta automáticamente. Solo organiza lo que el usuario ya formuló.

---

## Alternativas consideradas

### A) Informe como documento independiente (rechazada)
El informe almacenaría texto copiado de los campos del modelo. 
**Problema:** Se crea un estado paralelo que puede divergir del modelo original. Si el usuario modifica la hipótesis después de generar el informe, el informe queda desactualizado.

### B) Vista de impresión de las pantallas existentes (rechazada)
Reutilizar los componentes de edición para imprimir.
**Problema:** Los componentes de edición tienen botones, formularios y navegación que no tienen sentido en un documento. La vista de impresión no da control sobre qué incluir.

### C) IA generativa para redactar secciones (rechazada — explícitamente por el sprint)
No introducir IA generativa. HELIOS no redacta.

### D) Proyección dinámica desde el modelo (elegida)
El informe reconstruye su contenido desde el estado de sesión cada vez.
**Ventaja:** Siempre coherente con el modelo. No hay estado paralelo. Trazabilidad garantizada. El usuario puede ajustar las secciones sin regenerar manualmente.

---

## Consecuencias

### Positivas
- Trazabilidad completa: cualquier bloque apunta a su entidad original.
- Sin duplicación de estado: la sesión es la única fuente de verdad.
- Exportación extensible: nuevos formatos (PDF, DOCX) sólo necesitan implementar `ReportExporter`.
- Independiente de IA: funciona offline, sin llamadas a API.
- Composable: el usuario selecciona qué secciones incluir y en qué orden.

### Negativas
- Sin persistencia de reportes: si el usuario cierra la sesión, debe regenerar (el modelo persiste si hay backend).
- Sin redacción automática de resúmenes ejecutivos: el usuario aporta el texto de conclusión.
- Rendimiento: `generateReport` corre en cada renderizado del componente (mitigado con `useMemo`).

---

## Restricciones

1. No introducir IA generativa (restricción de sprint).
2. No resumir automáticamente.
3. No redactar conclusiones automáticamente.
4. No modificar el flujo metodológico existente (S-011 a S-022).
5. PDF se implementará en un sprint posterior usando HTML como origen.

---

## Nota metodológica

`supports ≠ prueba`, `weakens ≠ refutación`, `confidence ≠ probabilidad`. El informe exporta lo que el investigador formuló — no conclusiones derivadas por el sistema. Esta restricción se extiende explícitamente al Report Builder: la sección "conclusiones" muestra el texto de `HypothesisEvidenceConclusion.conclusionText`, que el investigador escribió. HELIOS no lo parafrasea.
