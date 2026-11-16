# 🧪 Agrul — Casos de Uso de Prueba por Módulo

> **Versión:** 1.0.0  
> **Propósito:** Proveer un **Caso de Uso de Prueba** formal, autocontenido y ejecutable para validar cada uno de los **11 módulos funcionales** del sistema Agrul (UI Web + API REST + Reglas de Negocio en PostgreSQL).  
> **Complemento:** Ver también el manual operativo paso a paso en [MANUAL_DE_PRUEBAS_USUARIO.md](./MANUAL_DE_PRUEBAS_USUARIO.md).

---

## 📑 Índice de Módulos

| Código | Módulo del Sistema | Caso de Uso de Prueba | Actor Principal |
| :--- | :--- | :--- | :--- |
| **CU-TEST-01** | Módulo 1 — Estructura Territorial (Fincas, Lotes y Suelos) | Alta, validación de superficie y subdivisión territorial | `admin` (`ADMINISTRADOR`) |
| **CU-TEST-02** | Módulo 2 — Cultivos, Variedades, Plantaciones y Ciclos | Apertura de ciclo multivariedad y control de campaña | `admin` (`ADMINISTRADOR`) |
| **CU-TEST-03** | Módulo 3 — Actividades Agrícolas y Monitoreos | Planificación, ejecución de labor y monitoreo de plagas | `encargado` (`ENCARGADO_CAMPO`) |
| **CU-TEST-04** | Módulo 4 — Insumos Fitosanitarios y Aplicaciones | Aplicación con receta y bloqueo por período de carencia | `encargado` (`ENCARGADO_CAMPO`) |
| **CU-TEST-05** | Módulo 5 — Cosechas, Pesajes, Saldo y Despachos | Registro de cosecha, cálculo de saldo y despacho BPA | `encargado` / `admin` |
| **CU-TEST-06** | Módulo 6 — Trazabilidad Integral, Linaje N:M, QR y Recall | Split 1:N, lectura de QR y trazabilidad inversa (Recall) | `admin` (`ADMINISTRADOR`) |
| **CU-TEST-07** | Módulo 7 — Indicadores y Tablero Ejecutivo (Chart.js) | Validación de KPIs en tiempo real, filtros y exportación | `admin` (`ADMINISTRADOR`) |
| **CU-TEST-08** | Módulo 8 — Usuarios, Roles (RBAC), Seguridad y Auditoría | Control de permisos, bitácora inmutable y bloqueo DELETE | `sistema` (`ADMIN_SISTEMA`) |
| **CU-TEST-09** | Módulo 9 — Almacén, Proveedores, Compras y Stock FIFO/FEFO | Ingreso por compra, descuento FEFO y alerta de stock mínimo | `admin` (`ADMINISTRADOR`) |
| **CU-TEST-10** | Módulo 10 — Meteorología y Eventos Climáticos Adversos | Registro climático en Lules/Finca y alerta de siniestro | `encargado` (`ENCARGADO_CAMPO`) |
| **CU-TEST-11** | Módulo 11 — Poscosecha, Clasificación y Cámaras de Frío | Recepción en empaque, tipificación de calibre y frío | `admin` (`ADMINISTRADOR`) |

---

## ⚙️ Credenciales de Referencia

| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| Administrador Agrícola (`ADMINISTRADOR`) | `admin` | `admin123` |
| Encargado de Campo (`ENCARGADO_CAMPO`) | `encargado` | `campo123` |
| Administrador de Sistema (`ADMIN_SISTEMA`) | `sistema` | `admin123` |

> **URL Base Local:** `http://localhost:3001` | **Zona Horaria Oficial:** `America/Argentina/Tucuman` (`UTC-3`)

---

## CU-TEST-01: Módulo 1 — Estructura Territorial (Fincas, Lotes y Suelos)

* **Objetivo:** Validar la gestión catastral de la finca, el alta de un lote productivo y el control de integridad de superficie disponible.
* **Actor:** Administrador Agrícola (`admin`).
* **Precondiciones:** Sesión iniciada en `http://localhost:3001` con usuario `admin`. Finca base registrada (ej. *Finca La Esperanza*).

### Datos de Prueba
* **Código de Lote:** `LOT-2026-M01`
* **Nombre / Cuartel:** `Cuartel Norte C3`
* **Superficie:** `12.5 ha`
* **Tipo de Suelo / Análisis:** `Franco-arcilloso (pH 6.4)`

### Flujo Principal (Paso a Paso)
1. En la barra lateral izquierda, ingresar a **Finca** (`data-nav="finca"`) y verificar los datos generales y la superficie total declarada de la finca.
2. Navegar a **Lotes de la finca** (`data-nav="lotes-territorio"`).
3. Hacer clic en **"+ Nuevo Lote"**, completar los datos de prueba (`LOT-2026-M01`, `12.5 ha`) y guardar.
4. Filtrar la tabla por código `LOT-2026-M01` y abrir su ficha imprimible.

### Flujo Alternativo / Caso Negativo
* Intentar crear un lote cuya superficie supere la superficie libre restante de la finca, o repetir el código `LOT-2026-M01`.
* **Comportamiento esperado:** El sistema rechaza la operación (HTTP `400` / `409`) informando código duplicado o exceso de superficie territorial.

### Postcondiciones Verificables
* El lote `LOT-2026-M01` figura activo en el inventario territorial con estado inicial `CREADO` y disponible para asignar plantaciones.

---

## CU-TEST-02: Módulo 2 — Cultivos, Variedades, Plantaciones y Ciclos Productivos

* **Objetivo:** Verificar el alta/consulta de cultivos y variedades, la vinculación a un lote mediante una plantación y la apertura de un ciclo productivo.
* **Actor:** Administrador Agrícola (`admin`).
* **Precondiciones:** Lote territorial activo disponible (ej. `LOT-2026-M01` o `LOT-2026-00001`).

### Datos de Prueba
* **Cultivo:** `Cereza` (o `Limón` / `Vid`)
* **Variedad:** `Lapins`
* **Campaña / Ciclo:** `2026/2027`
* **Superficie Implantada:** `12.5 ha`

### Flujo Principal (Paso a Paso)
1. Ingresar en el menú lateral a **Cultivos** (`data-nav="cultivos"`) y verificar la existencia del cultivo base; si no existe, darlo de alta.
2. Ingresar a **Variedades** (`data-nav="variedades"`) y confirmar o registrar la variedad `Lapins` asociada al cultivo.
3. Navegar a **Plantaciones** (`data-nav="plantaciones"`), seleccionar el lote destino e implantar el cultivo/variedad indicando fecha de plantación y densidad.
4. Abrir o vincular el **Ciclo Productivo** `2026/2027` en estado `ABIERTO`.

### Flujo Alternativo / Caso Negativo
* Intentar registrar una variedad duplicada bajo el mismo cultivo o intentar asignar una plantación sobre un lote inactivo/cerrado.
* **Comportamiento esperado:** Validación de unicidad (`VariedadDuplicadaError`) y rechazo de asignación en lotes no habilitados.

### Postcondiciones Verificables
* El lote queda vinculado al cultivo y variedad seleccionados y posee un ciclo productivo activo listo para recibir labores y cosechas.

---

## CU-TEST-03: Módulo 3 — Actividades Agrícolas, Labores y Monitoreos

* **Objetivo:** Validar el circuito completo de planificación de una actividad agrícola, ejecución por cuadrilla/maquinaria y registro de monitoreo fitosanitario de campo.
* **Actor:** Encargado de Campo (`encargado`).
* **Precondiciones:** Sesión iniciada como `encargado`. Lote con ciclo productivo abierto.

### Datos de Prueba
* **Actividad Programada:** `Poda de formación / Raleo`
* **Fecha Vencimiento:** Fecha actual + 3 días
* **Cuadrilla / Responsable:** `Cuadrilla Norte - Operario J. Pérez`
* **Monitoreo de Campo:** Plaga/Síntoma `Arañuela roja`, Severidad `BAJA`, Umbral `Sin intervención química`

### Flujo Principal (Paso a Paso)
1. Ingresar a **Actividades programadas** (`data-nav="actividades-programadas"`).
2. Crear una nueva actividad planificada sobre el lote objetivo con los datos de prueba.
3. Cambiar el estado de la actividad a **Ejecutada**, registrando horas de mano de obra y maquinaria utilizada.
4. En el módulo de **Monitoreo de Campo**, cargar una observación de plaga/síntoma sobre el mismo lote adjuntando severidad y observaciones técnicas.

### Flujo Alternativo / Caso Negativo
* Intentar ejecutar o modificar una labor sobre un ciclo productivo cerrado, o intentar eliminar físicamente (`DELETE`) una labor ya ejecutada.
* **Comportamiento esperado:** El sistema impide modificaciones fuera de ciclo activo y bloquea el borrado físico por política de retención BPA.

### Postcondiciones Verificables
* La actividad pasa a estado `EJECUTADA` con atribución inalterable de ejecutor vs. cargador, y el monitoreo queda asentado en el historial del lote.

---

## CU-TEST-04: Módulo 4 — Insumos Fitosanitarios, Recetas y Aplicaciones

* **Objetivo:** Comprobar el registro de una aplicación fitosanitaria con cálculo de dosis y la validación automática del **período de carencia** (regla crítica de seguridad alimentaria).
* **Actor:** Encargado de Campo (`encargado`).
* **Precondiciones:** Insumo fitosanitario registrado en catálogo con principio activo, stock disponible y días de carencia > 0 (ej. `14 días`).

### Datos de Prueba
* **Insumo:** `Fungicida Óxido Cuproso 50%`
* **Dosis:** `2.5 kg/ha` sobre `4 ha` (Consumo total: `10 kg`)
* **Período de Carencia:** `14 días`
* **Fecha de Aplicación:** Hoy

### Flujo Principal (Paso a Paso)
1. Seleccionar el lote objetivo y abrir el formulario de **Aplicación de Insumos**.
2. Seleccionar el insumo, indicar dosis, superficie tratada y aplicador habilitado.
3. Confirmar la aplicación verificando el cálculo automático de consumo total (`10 kg`).
4. Consultar el estado sanitario del lote y verificar que figura **Carencia Activa** hasta `Hoy + 14 días`.

### Flujo Alternativo / Caso Negativo (Bloqueo de Carencia)
* Inmediatamente después de registrar la aplicación, dirigirse a **Cosechas realizadas** (`data-nav="cosechas"`) e intentar registrar una cosecha sobre ese mismo lote con fecha de hoy.
* **Comportamiento esperado:** El motor de validación bloquea la operación con error de dominio (`CARENCIA_FITOSANITARIA_ACTIVA`), detallando los días restantes de carencia.

### Postcondiciones Verificables
* Se registra el evento inmutable de aplicación, se descuenta el stock en almacén y queda bloqueada la cosecha comercial hasta vencer la carencia.

---

## CU-TEST-05: Módulo 5 — Cosechas, Pesajes, Destinos, Saldo y Despachos

* **Objetivo:** Validar el registro oficial de pesaje de cosecha, el cálculo de descarte y saldo comercializable, y la emisión de un despacho comercial conforme a BPA.
* **Actor:** Encargado de Campo (`encargado`) para cosecha / Administrador (`admin`) para despacho.
* **Precondiciones:** Lote habilitado **sin carencia activa** (ej. `LOT-2026-00002` Vid Malbec).

### Datos de Prueba
* **Peso Bruto:** `10.000 kg` | **Tara:** `2.000 kg` | **Descarte:** `400 kg`
* **Saldo Comercializable Esperado:** `7.600 kg`
* **Ticket de Báscula:** `TCK-2026-091`
* **Despacho Comercial:** Cliente `Frutícola del Sur S.A.`, Cantidad `3.000 kg`

### Flujo Principal (Paso a Paso)
1. Ingresar a **Cosechas realizadas** (`data-nav="cosechas"`).
2. Registrar una nueva pasada de cosecha con los pesos bruto, tara y descarte indicados.
3. Verificar que el sistema calcula `Peso Neto = 8.000 kg` y `Saldo Comercializable = 7.600 kg`.
4. Desde el lote cosechado, emitir un **Despacho BPA** por `3.000 kg` indicando destinatario, transporte y remito.
5. Verificar que el saldo comercializable remanente del lote se actualiza a `4.600 kg`.

### Flujo Alternativo / Caso Negativo
* Intentar despachar `9.000 kg` (superior al saldo comercializable disponible de `7.600 kg`).
* **Comportamiento esperado:** El sistema rechaza el despacho evitando saldo negativo y preservando la consistencia de masa.

### Postcondiciones Verificables
* Evento `COSECHA` y evento `DESPACHO` persistidos en la bitácora inmutable; saldo comercializable exactamente conciliado.

---

## CU-TEST-06: Módulo 6 — Motor de Trazabilidad, Linaje N:M, QR y Recall

* **Objetivo:** Validar la división atómica de lotes (`Split 1:N`), la generación/lectura de código QR y la consulta inversa de trazabilidad para retiro preventivo (**Recall**).
* **Actor:** Administrador Agrícola (`admin`).
* **Precondiciones:** Lote cosechado disponible con `4.600 kg` de saldo (del `CU-TEST-05` o equivalente).

### Datos de Prueba
* **Split 1:N sobre lote padre:**
  - Hijo 1: `LOT-2026-SPLIT-A` — `3.000 kg` (Exportación)
  - Hijo 2: `LOT-2026-SPLIT-B` — `1.500 kg` (Mercado Interno)
  - Merma de proceso: `100 kg` (`3.000 + 1.500 + 100 = 4.600 kg`)

### Flujo Principal (Paso a Paso)
1. En **Trazabilidad de lotes** (`data-nav="lotes"`), ejecutar la operación **Dividir Lote (Split 1:N)** ingresando los dos lotes hijos y la merma.
2. Abrir el **Visualizador Gráfico de Linaje** sobre `LOT-2026-SPLIT-A` y verificar el grafo dirigido que lo conecta con el lote padre y sus eventos previos.
3. Generar el **Código QR** del lote hijo y verificar la vista de consulta pública de trazabilidad.
4. Ejecutar una **Consulta Inversa (Recall)** ingresando el código del lote padre o de un insumo aplicado y verificar que el sistema lista ambos lotes descendientes (`SPLIT-A` y `SPLIT-B`) y su estado actual.

### Flujo Alternativo / Caso Negativo
* Intentar un Split donde la suma de hijos (`4.800 kg`) supere la cantidad disponible del padre (`4.600 kg`).
* **Comportamiento esperado:** Rollback transaccional completo; ningún lote hijo es creado y el lote padre conserva su cantidad original.

### Postcondiciones Verificables
* Grafo de genealogía N:M íntegro sin ciclos, conservación exacta de masa y trazabilidad bidireccional (*trace-back* y *trace-forward*) operativa.

---

## CU-TEST-07: Módulo 7 — Indicadores Productivos y Tablero Ejecutivo (Chart.js)

* **Objetivo:** Verificar el cálculo de métricas productivas, rendimiento por hectárea (`kg/ha`), porcentaje de descarte y renderizado interactivo de gráficos en el Tablero Ejecutivo.
* **Actor:** Administrador Agrícola (`admin`).
* **Precondiciones:** Datos de cosecha, insumos y labores registrados previamente (ej. tras ejecutar `CU-TEST-04` y `CU-TEST-05`).

### Datos de Prueba
* **Filtro Finca:** `Todas las Fincas` (y luego finca específica)
* **Filtro Temporada:** `2025/2026` o `2026/2027`

### Flujo Principal (Paso a Paso)
1. Hacer clic en **Tablero ejecutivo** (`data-nav="tablero"` / botón `#btn-toggle-dashboard`).
2. Verificar que las 4 tarjetas KPI superiores muestran valores reales coherentes con la base de datos:
   - *Lotes en Producción*
   - *Producción Acumulada (kg comercializable vs. descarte y %)*
   - *Alertas de Stock*
   - *Labores Urgentes*
3. Comprobar que los 3 gráficos **Chart.js** renderizan datos visibles sin errores en consola:
   - *Evolución Mensual de Cosecha (kg)*
   - *Consumo de Insumos por Categoría*
   - *Rendimiento por Cultivo (kg/ha)*
4. Hacer clic en una leyenda del gráfico para filtrar una serie y presionar **Exportar CSV / PDF**.

### Flujo Alternativo / Caso Negativo
* Aplicar un rango de fechas futuro sin operaciones (`desde: 2029-01-01`, `hasta: 2029-12-31`).
* **Comportamiento esperado:** El endpoint `/api/v1/dashboard/resumen` responde `200 OK` y las tarjetas muestran `0` de forma limpia sin romper los gráficos.

### Postcondiciones Verificables
* Las métricas del tablero coinciden matemáticamente con los registros transaccionales de cosechas, lotes e insumos.

---

## CU-TEST-08: Módulo 8 — Usuarios, Roles (RBAC), Seguridad y Auditoría

* **Objetivo:** Validar el control de acceso basado en roles (RBAC), la gestión de usuarios, la bitácora centralizada de seguridad y la prohibición de borrado físico (`DELETE`).
* **Actor:** Administrador de Sistema (`sistema`).
* **Precondiciones:** Sesión iniciada con `sistema` / `admin123`.

### Datos de Prueba
* **Usuario a inspeccionar:** `encargado` (`ENCARGADO_CAMPO`)
* **Botones de barra lateral:** `#btn-usuarios-roles`, `#btn-bitacora-auditoria` (⚙️), `#btn-info-sistema` (ℹ️)

### Flujo Principal (Paso a Paso)
1. Verificar que el perfil `ADMIN_SISTEMA` visualiza las opciones de **Inicio** (`data-nav="inicio"`) y **Gestión de Usuarios y Cuadrillas** (`#btn-usuarios-roles`).
2. Abrir **Auditoría y Configuración del Sistema** (botón ⚙️ `#btn-bitacora-auditoria`) y confirmar el registro cronológico de eventos de seguridad (`LOGIN_EXITOSO`, cambios de estado, etc.).
3. Abrir el **Manual de Usuario** (botón ℹ️ `#btn-info-sistema`) y navegar por sus 6 pestañas.
4. Cerrar sesión e iniciar sesión como `encargado`; verificar que **NO** tiene acceso a administración de usuarios ni configuración territorial de finca.

### Flujo Alternativo / Caso Negativo (Política BPA de Retención)
* Ejecutar una petición HTTP `DELETE` contra cualquier endpoint productivo bajo `/api/v1/*` (ej. `DELETE /api/v1/lotes/:id`).
* **Comportamiento esperado:** El servidor responde HTTP `405 Method Not Allowed` bloqueando la eliminación física por política BPA de retención de 3 años.

### Postcondiciones Verificables
* Aislamiento estricto por rol garantizado, bitácora *append-only* inalterable y cero registros eliminables vía API.

---

## CU-TEST-09: Módulo 9 — Almacén, Proveedores, Compras y Stock FIFO/FEFO

* **Objetivo:** Validar el alta de proveedores, el ingreso de mercadería por remito/compra en un depósito BPA, la trazabilidad de lotes de insumo con vencimiento (FEFO) y las alertas de stock mínimo.
* **Actor:** Administrador Agrícola (`admin`).
* **Precondiciones:** Insumo configurado en catálogo con stock mínimo definido (ej. `20 kg`).

### Datos de Prueba
* **Proveedor:** `Agroquímicos Tucumán S.R.L.`
* **Depósito BPA:** `Depósito Central Fitosanitarios`
* **Compra / Ingreso:** `50 kg` en dos partidas:
  - Partida A: Lote proveedor `P-001`, Vencimiento `2026-12-30`, Cantidad `20 kg`
  - Partida B: Lote proveedor `P-002`, Vencimiento `2027-08-15`, Cantidad `30 kg`

### Flujo Principal (Paso a Paso)
1. Verificar/registrar el proveedor y el depósito segregado BPA.
2. Registrar el ingreso por compra de ambas partidas con sus respectivas fechas de vencimiento y unidad de medida validada.
3. Registrar una salida/aplicación de `25 kg` del insumo.
4. Consultar el libro mayor de movimientos de stock y verificar el orden de consumo **FEFO** (Primero en Vencer, Primero en Salir): debe haberse consumido primero los `20 kg` completos de `P-001` y `5 kg` de `P-002`.

### Flujo Alternativo / Caso Negativo
* Enviar dos veces la misma operación de ingreso de compra con la misma clave de idempotencia, o intentar consumir más stock del disponible (`100 kg`).
* **Comportamiento esperado:** La idempotencia evita duplicar el ingreso en el libro mayor; el exceso de consumo es rechazado atómicamente.

### Postcondiciones Verificables
* Stock remanente exacto (`25 kg` de `P-002`) y disparo automático de alerta si el remanente cae por debajo del mínimo configurado.

---

## CU-TEST-10: Módulo 10 — Meteorología y Eventos Climáticos Adversos

* **Objetivo:** Validar la carga de observaciones meteorológicas de finca y el registro de siniestros o eventos climáticos adversos que impactan sobre los lotes.
* **Actor:** Encargado de Campo (`encargado`) o Administrador (`admin`).
* **Precondiciones:** Lote activo en la finca.

### Datos de Prueba
* **Observación Meteorológica:** Fecha de hoy, Temperatura Máx `29.5 °C`, Mín `14.0 °C`, Humedad `68%`, Precipitación `12.5 mm`
* **Evento Climático Adverso:** Tipo `Granizo` / `Helada`, Severidad `MODERADA`, Lote afectado `LOT-2026-00001`, Pérdida estimada `15%`

### Flujo Principal (Paso a Paso)
1. En el menú lateral, ingresar a **Meteorología** (`data-nav="meteorologia"`).
2. Registrar la observación climática diaria con los datos de prueba (o consultar la integración climática local de Lules/Finca).
3. Ingresar a **Eventos climáticos** (`data-nav="eventos-climaticos"`).
4. Registrar un siniestro de granizo indicando fecha, lote afectado, severidad y porcentaje de daño estimado.

### Flujo Alternativo / Caso Negativo
* Intentar registrar dos observaciones meteorológicas duplicadas para la misma finca, fecha y fuente.
* **Comportamiento esperado:** El sistema rechaza el duplicado (`ObservacionMeteorologicaDuplicadaError`).

### Postcondiciones Verificables
* La serie histórica climática del lote se actualiza y el evento adverso queda trazado como contexto oficial para justificar mermas de rendimiento.

---

## CU-TEST-11: Módulo 11 — Poscosecha, Clasificación, Acondicionamiento y Cámaras de Frío

* **Objetivo:** Validar el ingreso de fruta cosechada a planta de empaque, su clasificación por calibre/calidad, el acondicionamiento en pallets y la asignación a cámara frigorífica con control térmico.
* **Actor:** Administrador Agrícola (`admin`) o Responsable de Empaque.
* **Precondiciones:** Lote cosechado disponible pendiente de acondicionamiento (ej. `8.000 kg` netos).

### Datos de Prueba
* **Recepción en Empaque:** `8.000 kg`
* **Clasificación:**
  - Calibre `Exportación J+` — `5.200 kg` (520 cajas de 10 kg)
  - Calibre `Comercial M` — `2.500 kg` (250 cajas de 10 kg)
  - Descarte de empaque — `300 kg`
* **Cámara de Frío Destino:** `Cámara Frigorífica N° 1` (`0.5 °C`)

### Flujo Principal (Paso a Paso)
1. Seleccionar el lote cosechado y registrar la **Recepción en Poscosecha**.
2. Ejecutar la **Clasificación y Acondicionamiento** distribuyendo los kilos en calibres comerciales y declarando el descarte de línea.
3. Asignar los pallets/cajas resultantes a la `Cámara Frigorífica N° 1`, registrando temperatura de ingreso (`0.5 °C`).
4. Consultar el inventario de cámaras y verificar el stock embalado listo para despacho.

### Flujo Alternativo / Caso Negativo
* Intentar clasificar una cantidad total que no concilie con el peso ingresado a empaque (ej. sumar `8.500 kg` a partir de `8.000 kg` recibidos).
* **Comportamiento esperado:** El sistema bloquea la operación por inconsistencia de balance de masa (`ConflictoPoscosechaError`).

### Postcondiciones Verificables
* Lotes acondicionados en estado `EMBALADO` dentro de cámara frigorífica con trazabilidad intacta hasta el lote de origen en campo.
