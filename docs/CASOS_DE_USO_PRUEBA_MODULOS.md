# 🧪 Agrul — Casos de Uso de Prueba (Sistema Consolidado de 5 Módulos)

> **Versión:** 2.0.0  
> **Propósito:** Guía formal y ejecutable de **Casos de Uso de Prueba** (flujos correctos y flujos alternativos/negativos) para validar de punta a punta los **5 módulos consolidados** de Agrul (`Finca`, `Producción`, `Insumos y Stock`, `Estadísticas e Indicadores`, `Auditoría`), su control de acceso por rol (RBAC), las transacciones ACID en PostgreSQL y la interfaz web.

---

## 📑 Índice de Casos de Uso

| Código | Módulo / Área | Escenario Principal | Actor |
| :--- | :--- | :--- | :--- |
| **CU-TEST-01** | **RBAC y Autenticación** | Acceso diferenciado por rol y bloqueo de rutas no autorizadas | `admin`, `encargado`, `sistema` |
| **CU-TEST-02** | **Módulo 1 — Finca** | Vista resumen, edición bajo demanda y distribución de hectáreas | `admin` |
| **CU-TEST-03** | **Módulo 2 — Producción (Ciclo)** | Alta de producción, catálogo inline y finalización con liberación de ha | `admin` |
| **CU-TEST-04** | **Módulo 2 — Fumigación y Stock** | Aplicación de insumo con descuento atómico FEFO en inventario | `admin` / `encargado` |
| **CU-TEST-05** | **Módulo 2 — Cosecha y Carencia** | Registro de cosecha y bloqueo estricto por período de carencia vigente | `admin` / `encargado` |
| **CU-TEST-06** | **Módulo 2 — Labores, Clima, Corrección y QR** | Labor `Plantación` por unidad, evento climático, edición compensatoria y QR | `admin` / `encargado` |
| **CU-TEST-07** | **Módulo 3 — Insumos y Stock** | Alta simplificada (6 campos), buscador incremental, filtros e ingreso rápido | `admin` |
| **CU-TEST-08** | **Módulo 4 — Estadísticas e Indicadores** | KPIs en tiempo real, gráficos Chart.js, monitor de alertas y filtro por Producción | `admin` |
| **CU-TEST-09** | **Módulo 5 — Auditoría** | Bitácora global inmutable y gestión de usuarios/roles | `admin` / `sistema` |

---

## ⚙️ Credenciales y Entorno de Prueba

| Rol | Email / Usuario | Contraseña | Módulos Visibles en Barra Lateral |
| :--- | :--- | :--- | :--- |
| **Administrador Agrícola** (`ADMINISTRADOR`) | `admin@agrul.local` | `admin123` | Finca, Producción, Insumos, Estadísticas, Auditoría |
| **Encargado de Campo** (`ENCARGADO_CAMPO`) | `encargado@agrul.local` | `campo123` | **Solo Producción** (entra directo a Producciones Activas) |
| **Administrador Sistema** (`ADMIN_SISTEMA`) | `sistema@agrul.local` | `admin123` | Auditoría (gestión de usuarios/roles y bitácora) |

> **URL Local:** `http://localhost:3001` · **Zona Horaria Oficial:** `America/Argentina/Tucuman` (`UTC-3`)

---

## CU-TEST-01: Autenticación y Control de Acceso (RBAC)

* **Objetivo:** Verificar la separación estricta de vistas y endpoints según el rol autenticado.
* **Precondiciones:** Servidor corriendo en `http://localhost:3001`.

### Flujo Correcto (Happy Path)
1. **Como `admin@agrul.local`:** Iniciar sesión → verificar en la barra lateral izquierda (hover para expandir) los **5 módulos**: *Finca*, *Producción*, *Insumos*, *Estadísticas*, *Auditoría*.
2. **Cerrar sesión** e iniciar con **`encargado@agrul.local` (`campo123`)**:
   - Verificar que aterriza directamente en **Producción** (lista de producciones activas).
   - Verificar que la barra lateral muestra **únicamente** *Producción* (y el botón de salir).
   - Verificar que no aparecen los botones **"+ Nueva Producción"** ni **"Finalizar Producción"**.

### Flujos Alternativos / Casos Negativos
1. **Contraseña incorrecta:** Ingresar clave errónea → el sistema muestra toast legible (fondo rojo claro, texto oscuro) con `"Email o contraseña incorrectos"` (HTTP `401`).
2. **Bloqueo de endpoints para `encargado`:** Desde consola o cliente HTTP con el token de `encargado`, intentar `GET /api/v1/finca-resumen`, `POST /api/v1/producciones`, `GET /api/v1/insumos/resumen-unificado`, `GET /api/v1/dashboard/resumen` o `GET /api/v1/auditoria` → el backend rechaza todas con HTTP `403`.
3. **Selector mínimo permitido para `encargado`:** `GET /api/v1/insumos/selector` responde `200` únicamente con `id`, `nombre`, `unidadMedida`, `stockDisponible` para poder cargar fumigaciones en campo.

---

## CU-TEST-02: Módulo 1 — Finca (Resumen, Edición y Distribución Territorial)

* **Objetivo:** Validar el resumen de solo lectura, la edición controlada de datos de la finca y el desglose real de hectáreas por producción activa.
* **Actor:** `admin@agrul.local`.

### Flujo Correcto
1. Ingresar al módulo **Finca** desde la barra lateral.
2. Verificar en el encabezado el badge de contexto (*Nombre · Localidad, Provincia · Propietario*).
3. Confirmar que la pantalla inicia en **modo solo lectura** (tarjetas de *Hectáreas Totales*, *Asignadas* y *Disponibles*, barra de ocupación territorial y bloque de *Distribución por Producción Activa* con `%` sobre el total).
4. Hacer clic en **"Editar datos de la Finca"**, actualizar `Observaciones` o `Hectáreas Totales` (ej. de `150` a `180` ha) y guardar (`Guardar Configuración de Finca`).
5. Verificar que regresa al modo solo lectura con los valores actualizados y el remanente disponible recalculado.

### Flujos Alternativos / Casos Negativos
1. **Reducción inválida de superficie:** Si hay `150 ha` asignadas a producciones activas, intentar editar *Hectáreas Totales* a `120 ha` (por debajo de lo ocupado) → validación HTML5 / backend (`400`/`422`) impide guardar y mantiene íntegra la superficie asignada.
2. **Cancelar edición:** Hacer clic en **"Editar datos de la Finca"** y luego en **"Cancelar"** → vuelve al resumen sin enviar cambios ni perder información.

---

## CU-TEST-03: Módulo 2 — Producción (Alta, Catálogo Inline y Cierre de Ciclo)

* **Objetivo:** Probar el ciclo de vida completo de una producción (creación transaccional Lote + Plantación + Ciclo, impacto en Finca y finalización).
* **Actor:** `admin@agrul.local`.

### Flujo Correcto
1. Ir a **Producción** y hacer clic en el botón destacado **"+ Nueva Producción"** (primero en la barra superior).
2. *(Opcional)* Usar el botón **`+ Nuevo`** junto a Cultivo o Variedad para crear un ítem inline (ej. Cultivo `Limón`, Variedad `Eureka`) y verificar que queda seleccionado automáticamente.
3. Ingresar Fecha de inicio (hoy) y **Hectáreas** dentro del disponible (ej. `10`), y guardar.
4. Verificar respuesta `201`, aparición inmediata en la tabla de **Activas** con estado `ACTIVA` y actualización instantánea en **Finca** (+10 ha asignadas y nueva fila en la distribución).
5. Hacer clic en **"Finalizar Producción"** sobre esa producción de prueba, confirmar el motivo y verificar que pasa a la pestaña **Finalizadas** y libera nuevamente las `10 ha` en **Finca**.

### Flujos Alternativos / Casos Negativos
1. **Exceso de hectáreas disponibles:** Intentar crear una producción con más hectáreas que las disponibles en finca → backend responde `400`/`422` sin crear lote ni ciclo parcial.
2. **Producción finalizada en solo lectura:** Abrir una producción `FINALIZADA` → no debe mostrar el formulario de *Nuevo Registro de Actualización*, solo el historial cronológico.

---

## CU-TEST-04: Módulo 2 — Fumigación / Aplicación con Descuento Automático de Stock

* **Objetivo:** Verificar la transacción ACID que registra la aplicación fitosanitaria y descuenta automáticamente el stock FEFO en inventario.
* **Actor:** `admin` o `encargado`.

### Datos de Prueba
* **Insumo:** Cualquier insumo activo con stock > `0` (ej. `Insumo Smoke Test`, stock `5 L`).
* **Cantidad utilizada:** `2` (`step="1"` con flechas).
* **Superficie tratada:** `50` ha.
* **Días de carencia:** `0` (para poder probar cosecha en CU-TEST-05) o `7` (para probar bloqueo de carencia).

### Flujo Correcto
1. Entrar a una producción `ACTIVA` (**Abrir / Cargar Registro**).
2. Seleccionar Tipo de Registro: **Fumigación / Aplicación (descuenta stock)**.
3. Elegir el insumo, cargar cantidad `2`, superficie `50`, carencia `0` y pulsar **Guardar Registro**.
4. Verificar toast de éxito (`Fumigación registrada y 2 L descontados del stock.`), aparición del evento en la línea de tiempo y reducción inmediata del stock disponible tanto en el selector como en **Insumos y Stock**.

### Flujos Alternativos / Casos Negativos
1. **Stock insuficiente:** Intentar registrar una cantidad mayor al stock disponible del insumo (ej. `999`) → el servidor responde `422 STOCK_INSUFICIENTE` con mensaje claro; el stock y el historial permanecen intactos.
2. **Cantidad cero o negativa:** Ingresar `0` → bloqueado por validación (`min="1"` / backend `400`).

---

## CU-TEST-05: Módulo 2 — Cosecha y Bloqueo Estricto por Período de Carencia

* **Objetivo:** Validar el registro de cosechas (comercializable + descarte) y el bloqueo sanitario estricto cuando existe un período de carencia vigente.
* **Actor:** `admin` o `encargado`.

### Flujo Correcto (Sin carencia vigente)
1. En una producción `ACTIVA` sin carencia vigente, seleccionar **Cosecha (verifica carencia)**.
2. Ingresar Fecha (hoy), **Kg Comercializables:** `100`, **Kg Descarte:** `10`, **Destino:** `Empaque Central` y guardar.
3. Verificar toast de éxito (`Cosecha COS-... registrada (110 kg).`), actualización del contador `Cosechado` en la cabecera de la producción, en la lista de producciones y en el KPI **Producción Acumulada** de **Estadísticas**.
4. Cargar una **segunda cosecha** el mismo día en la misma producción → debe guardarse correctamente con pasada correlativa (`#2`, `#3`, etc.) sin error de duplicado.

### Flujos Alternativos / Casos Negativos
1. **Bloqueo por carencia activa:** En la misma producción, cargar una **Fumigación** con `Días de Carencia: 7`. Luego intentar registrar una **Cosecha** con fecha de hoy → el servidor bloquea la operación (`409 CARENCIA_FITOSANITARIA_ACTIVA`) indicando la fecha exacta hasta la cual rige la carencia, y en la cabecera del formulario aparece el aviso de carencia vigente.
2. **Fecha inválida:** Intentar cosechar con fecha anterior al inicio de la producción o fecha futura → rechazo `400` descriptivo.
3. **Total 0 kg:** Intentar guardar con `0` comercializable y `0` descarte → rechazo `400`.

---

## CU-TEST-06: Módulo 2 — Labores (`Plantación`), Clima, Corrección y QR

* **Objetivo:** Validar labores dinámicas por unidad, eventos climáticos adversos, filtros de bitácora, edición compensatoria (`admin`) y trazabilidad/QR.
* **Actor:** `admin` (para corrección compensatoria) y `encargado` (para cargas operativas).

### Flujo Correcto
1. **Labor `Plantación (por unidad)`:**
   - Seleccionar Tipo de Registro **Labor / Actividad**.
   - Verificar que al elegir **Plantación (por unidad)** aparece el campo obligatorio **Cantidad de Unidades / Plantas \*** (`step="1"`). Ingresar `250`, responsable `Cuadrilla Sur`, y guardar.
   - Cambiar luego el selector a **Riego** o **Poda** y verificar que el campo de unidades se oculta automáticamente.
2. **Observación / Clima:**
   - Seleccionar **Observación / Clima**, elegir subtipo *Evento climático adverso (Helada/Granizo)*, escribir detalle `"Lluvia intensa en sector norte"`, marcar el checkbox **"Registrar también como evento climático adverso oficial"** y guardar → debe responder `201`.
3. **Filtros y navegación:**
   - Probar los botones de filtro del historial (`Todos`, `Fumigacion`, `Cosecha`, `Labor`, `Observacion`, `Edicion`).
   - Hacer clic en **"← Volver a Producciones"** y confirmar que regresa al listado principal.
4. **Corrección compensatoria (Solo `admin`):**
   - Sobre un registro de la bitácora, ejecutar la acción de corrección indicando motivo obligatorio y nuevo valor → aparece bajo el filtro `Edicion` sin borrar ni sobrescribir el evento original.
5. **Trazabilidad y QR:**
   - Abrir la pestaña superior **"Trazabilidad y QR"** → verificar la generación del código QR y la URL pública del lote.

### Flujos Alternativos / Casos Negativos
1. **Observación sin detalle:** Intentar guardar con *Detalle / Hallazgos* vacío → validación impide el envío / backend `400`.
2. **Permiso de corrección:** Ingresar como `encargado` y verificar que no dispone de acciones de edición compensatoria sobre registros históricos.

---

## CU-TEST-07: Módulo 3 — Insumos y Stock (Alta, Buscador Incremental y Filtros)

* **Objetivo:** Validar la gestión unificada del catálogo simplificado, el buscador incremental letra por letra y los ingresos de stock.
* **Actor:** `admin@agrul.local`.

### Flujo Correcto
1. Ingresar a **Insumos**.
2. Hacer clic en **"+ Nuevo Insumo"** (botón primario con estética unificada).
3. Verificar que el modal tiene fondo claro legible y **únicamente 6 campos**: `Código`, `Nombre`, `Unidad de medida` (`<select>`: `Litros (L)`, `Kilogramos (kg)`, `Gramos (g)`, `Mililitros (mL)`, `Unidades (u)`), `Marca`, `Categoría` y `Cantidad` (stock inicial).
4. Crear por ejemplo `FUNG-99` · `Azoxistrobina 25%` · `Litros (L)` · `AgroSur` · `Fitosanitario` · `20`.
5. Verificar en la tabla que aparece con stock disponible `20 L`.
6. Probar el **buscador incremental único**: tipear letra por letra `azo`, luego `agrosur`, luego `fung` → la tabla filtra en tiempo real sin recargar la página.
7. Abrir el botón **"Filtros"** y filtrar por categoría, unidad o *"Solo alertas de stock mínimo"*.
8. Usar **"+ Ingresar Stock"** para sumar `10 L` adicionales y verificar que el saldo sube a `30 L`.

### Flujos Alternativos / Casos Negativos
1. **Código duplicado:** Intentar crear otro insumo con código `FUNG-99` → backend responde `409 CODIGO_INSUMO_DUPLICADO` con toast de error legible.
2. **Búsqueda sin coincidencias:** Escribir `"ZZZZZ"` en el buscador → muestra la fila vacía *"No hay insumos que coincidan con la búsqueda."*.

---

## CU-TEST-08: Módulo 4 — Estadísticas e Indicadores (Tablero Ejecutivo)

* **Objetivo:** Validar que todos los KPIs, gráficos Chart.js, alertas de stock y filtros por Finca/Producción reflejen datos reales de PostgreSQL.
* **Actor:** `admin@agrul.local`.

### Flujo Correcto
1. Ingresar a **Estadísticas**.
2. Verificar los 4 KPIs superiores: *Lotes en Producción* (hectáreas ocupadas y activas reales), *Producción Acumulada* (kg totales, comercializables, descarte y `%`), *Alertas de Stock* y *Labores Urgentes*.
3. Hacer clic en **"Ver Insumos en Alerta →"** y verificar que la tabla muestra código y nombre del insumo, categoría, stock actual, punto de reposición y consumo acumulado alineados correctamente (sin `NaN` ni `undefined`).
4. Verificar los 3 gráficos Chart.js: *Evolución Mensual de Cosecha*, *Consumo de Insumos* y *Rendimiento por Cultivo*.
5. En la barra de filtros, abrir el desplegable **Producción** y seleccionar una producción puntual (ej. `PROD-2026-DF1C10 · Nogal (Pecana)`):
   - Verificar que todos los KPIs y gráficos se recalculan exclusivamente para esa producción.
6. Probar **Limpiar** (vuelve a mostrar todas las producciones de la finca), **Exportar CSV** (descarga archivo `.csv` con BOM UTF-8) y **Exportar PDF** (dispara vista de impresión).

### Flujos Alternativos / Casos Negativos
1. **Filtro sin resultados en rango de fechas:** Seleccionar *Desde* y *Hasta* en un año sin movimientos (ej. `2020-01-01` a `2020-01-31`) → el tablero no falla; muestra `0 kg` en producción acumulada manteniendo el resto de la estructura estable.

---

## CU-TEST-09: Módulo 5 — Auditoría (Bitácora Global y Usuarios)

* **Objetivo:** Confirmar la trazabilidad de acciones administrativas/seguridad y la administración de cuentas.
* **Actor:** `admin@agrul.local` o `sistema@agrul.local`.

### Flujo Correcto
1. Ingresar a **Auditoría**.
2. En **Bitácora Global**, verificar que figuran los registros recientes (`CREAR PRODUCCION`, `CREAR FUMIGACION`, `CREAR COSECHA`, `CREAR INSUMO`, `FINALIZAR PRODUCCION`, etc.) con usuario, fecha/hora Tucumán y detalle JSON.
3. Cambiar a la pestaña **Usuarios y Roles** y verificar el listado de usuarios (`admin`, `encargado`, `sistema`), sus perfiles y estados (`ACTIVO`).

### Flujos Alternativos / Casos Negativos
1. **Inmutabilidad de bitácora:** No existen botones de edición ni eliminación sobre los eventos de auditoría; toda corrección operativa queda trazada como evento nuevo.
