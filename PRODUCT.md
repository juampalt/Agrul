# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Encargados de Campo y Capataces:** Operan en finca, en condiciones climáticas variables, a menudo desde teléfonos móviles o tablets con conectividad intermitente. Necesitan registrar rápidamente labores de cuadrilla, monitoreos de plagas/enfermedades, aplicaciones de fitosanitarios y cosechas diarias (pesajes en bines/cajas y escaneo QR).
- **Administradores Agrícolas y Responsables de Calidad:** Operan principalmente en estaciones de trabajo de oficina o galpón de empaque. Supervisan stock de agroquímicos/fertilizantes, controlan períodos de carencia (FEFO), planifican ciclos y labores, gestionan despachos comerciales y auditan el árbol de linaje N:M ante inspecciones sanitarias o reclamos de clientes.
- **Administradores de Sistema / Auditores:** Gestionan permisos, usuarios, asignación multi-finca y verifican la bitácora de auditoría y seguridad de eventos.

## Product Purpose
Proveer una solución integral y rigurosa de trazabilidad agroindustrial y cadena de custodia desde el lote en finca hasta el destino comercial o empaque final. El éxito se define por garantizar la inmutabilidad y transparencia absoluta de cada evento del ciclo de vida productivo, reduciendo tiempos de auditoría y mitigando riesgos sanitarios y de descarte.

## Positioning
Agrul no es un simple cuaderno de campo o ERP genérico: es un motor de trazabilidad con garantías de integridad en base de datos relacional (bitácora de eventos inmutable append-only con triggers PL/pgSQL), soporte nativo de linaje N:M (splits y merges de lotes con balance de masa), preservación temporal estricta (localización oficial Tucumán UTC-3 / RNF-12) y arquitectura de compensación para correcciones auditables sin edición destructiva.

## Operating Context
- **Entornos de uso:** Fincas a cielo abierto, cuarteles y cuadros de cultivo, galpones de acopio/empaque y oficinas de administración agropecuaria.
- **Artefactos y rituales:** Órdenes de labor diarias, remitos de insumos, bines de cosecha con etiquetas QR, partes de meteorología y siniestros (heladas/granizo), cuadernos de Buenas Prácticas Agrícolas (BPA) y certificaciones GlobalG.A.P. / SENASA.
- **Condiciones técnicas:** Terminales web de escritorio y dispositivos móviles; soporte de captura offline con timestamps duales (reloj local del dispositivo y reloj del servidor) y sincronización con revalidación.

## Capabilities and Constraints
- **Inmutabilidad y Auditoría:** Tablas de eventos append-only; prohibición de `UPDATE` y `DELETE` en la historia de trazabilidad; correcciones mediante eventos compensatorios vinculados (`ANULACION`, `CORRECCION`).
- **Linaje N:M:** Soporte completo de fraccionamiento (splits de lotes para clasificación de calidad) y mezclas (merges para tanques, silos o despachos) con reconstrucción de grafos aguas arriba (*trace-back*) y aguas abajo (*trace-forward*).
- **Control de Insumos y Carencias:** Gestión de depósitos, lotes de insumos con control de vencimiento FEFO y bloqueo/alerta estricta por período de carencia de productos fitosanitarios antes de cosechar.
- **Arquitectura de Software:** Fastify v5 (TypeScript/Node.js ESM), Zod, Drizzle ORM sobre PostgreSQL con triggers procedurales, y frontend SPA autónomo en Vanilla JS/CSS sin empaquetadores pesados.

## Brand Commitments
- **Nombre:** Agrul.
- **Identidad:** Tono técnico, confiable, sobrio y centrado en la precisión agronómica.
- **Símbolo:** Brote / plántula verde (`🌱`), representando origen vivo, crecimiento y pureza de origen.
- **Restricciones:** Evitar jerga de marketing superflua o estética artificial de "startup de IA"; priorizar claridad instrumental, contrastes altos para visibilidad a la luz solar y datos accesibles rápidamente.

## Evidence on Hand
- Base de código completa en [`src/`](file:///c:/AGRUL/src) con lógica de dominio, casos de uso de trazabilidad, esquema Drizzle y migraciones de inmutabilidad en [`drizzle/`](file:///c:/AGRUL/drizzle).
- Suite automatizada de más de 1000 tests unitarios y de integración en [`tests/`](file:///c:/AGRUL/tests).
- Interfaz web operativa y funcional en [`public/`](file:///c:/AGRUL/public) con visualizador interactivo de grafo de linaje, escáner QR y tableros multi-finca.
- Base de datos relacional PostgreSQL con semillas de demostración en [`scripts/seed-database.ts`](file:///c:/AGRUL/scripts/seed-database.ts).

## Product Principles
1. **La Verdad Histórica es Intocable:** Lo que ocurrió en el campo queda registrado permanentemente; los errores se compensan abiertamente, nunca se reescriben.
2. **Claridad Inmediata en el Punto de Acción:** La interfaz debe permitir a un encargado registrar o consultar un lote en segundos sin distracciones ni formularios laberínticos.
3. **Trazabilidad Bidireccional sin Fisuras:** Todo producto terminado debe poder rastrearse hasta su lote de siembra original en menos de 1 minuto, y cualquier lote contaminado debe poder aislar a todos sus derivados de inmediato.
4. **Resiliencia Operativa:** La conectividad inestable del campo no debe frenar la recolección de datos; los eventos capturados offline mantienen su validez y se reconcilian ordenadamente.

## Accessibility & Inclusion
- Contraste visual adecuado para pantallas operadas bajo luz solar directa o en galpones con iluminación variable.
- Áreas de toque generosas para dispositivos táctiles en formularios de campo (botones grandes, campos de entrada claros).
- Mensajes de validación y error explícitos en español rioplatense claro (ej. "Ingresá el lote", "La cantidad supera el disponible").
