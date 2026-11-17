# Glosario de Dominio — Agrul

> Vocabulario canónico de negocio para la operación agroindustrial y cadena de custodia de Agrul.

---

### Finca
Unidad territorial primaria de explotación agrícola. Posee una superficie total declarada (en hectáreas), ubicación geográfica (localidad, provincia) y propietario. La suma de hectáreas asignadas a sus **Producciones Activas** nunca puede superar su superficie total.

### Producción (Producción Activa / Finalizada)
Unidad operativa unificada que representa un cultivo y variedad implantados sobre una fracción de hectáreas de la finca durante un ciclo productivo determinado.
- **Activa:** Ciclo en curso que ocupa hectáreas de la finca y acepta registros de actualización diarios.
- **Finalizada:** Ciclo cerrado que libera sus hectáreas nuevamente como superficie disponible de la finca.

### Registro de Actualización
Hecho operativo asentado cronológicamente dentro de la bitácora de una **Producción**. Se clasifica en cuatro tipos operativos más un tipo de corrección:
- **Fumigación / Aplicación:** Uso de un insumo fitosanitario o nutricional sobre una superficie tratada, con descuento automático del stock disponible.
- **Cosecha:** Recolección de kilogramos diferenciados en volumen comercializable y descarte, con destino comercial opcional.
- **Labor / Actividad:** Tarea de campo ejecutada (riego, poda, preparación, fertilización manual) con responsable o cuadrilla.
- **Observación / Clima:** Monitoreo sanitario, nota de campo o evento climático adverso.
- **Edición (Evento Compensatorio):** Corrección auditada de un registro previo que conserva el valor original e incorpora motivo obligatorio.

### Período de Carencia
Plazo obligatorio en días entre la aplicación de un producto fitosanitario y la habilitación comercial para cosechar. Mientras una producción tenga un período de carencia vigente, toda tentativa de registrar una cosecha es bloqueada.

### Insumo y Stock
Producto agroquímico, fertilizante o material registrado en catálogo con unidad de medida y umbral de stock mínimo. Su disponibilidad real resulta de los ingresos por compra/recepción y los egresos automáticos descontados desde las fumigaciones de **Producción** en orden FEFO (Primero en Vencer, Primero en Salir).

### Trazabilidad / Linaje N:M
Cadena de custodia bidireccional e inmutable que vincula cada lote o producción con sus insumos aplicados, labores, cosechas, fraccionamientos (*splits*), mezclas (*merges*), códigos QR y consultas inversas de retiro preventivo (*Recall*).

### Bitácora de Auditoría
Registro histórico *append-only* e inalterable de todas las acciones, accesos, altas, finalizaciones y eventos compensatorios del sistema, con atribución exacta del usuario responsable y marca temporal oficial (`America/Argentina/Tucuman`, `UTC-3`).
