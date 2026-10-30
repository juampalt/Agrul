# AGRUL-055 / Issue #49 — Etapa 1: catálogo CU34–CU37

Fecha: 2026-10-29. Base verificada por `git ls-remote`: `origin/main`
`bb6af6ddf36fd59f2f9405d94973052f1dc338f7` (AGRUL-054 integrado mediante PR #57).
Rama: `feat/agrul-055-insumos-inventario-fifo`.

## Verificación inicial y alcance

Se consultaron las issues #49 y #48 mediante API de GitHub y los PR abiertos.
#48 está cerrada; no había PR abiertos. Su informe local acredita 1232 pruebas
aprobadas, pero no se presenta ese resultado anterior como una ejecución nueva.
Se leyeron SPEC.md, TICKETS.md y las cinco skills del router JIT. El usuario
validó el plan y autorizó por separado crear únicamente agrul_test_agrul_055.
Se conservaron la caché Vitest y los tres archivos locales previos de AGRUL-054.

La issue #49 define el catálogo CU34–CU37, las aplicaciones CU38/CU39, su corrección
CU40 y el inventario CU63–CU66. Define consumo por vencimiento más próximo entre
partidas no vencidas. No se implementa ese algoritmo en este bloque ni se inventan
desempates para vencimientos iguales o nulos.

## Implementación

- Catálogo canónico: código único de hasta 15 caracteres, nombre, categoría,
  tipo de producto, unidad, fabricante/marca, nivel mínimo NUMERIC(10,2) y estado.
- Alta, consulta paginada con filtros, detalle, modificación y desactivación
  mediante /api/v1/insumos, /:id y /:id/desactivar. Envelope y validación estrictos.
- DrizzleInsumosRepository inyectado en crearServidorProduccion. Unicidad real
  PostgreSQL y conflictos HTTP 409, incluyendo códigos de insumos inactivos.
- RN-15 protegida por trigger SQL y bloqueo de fila compartido entre cambios de
  unidad e inserciones de aplicaciones. Pruebas con dos conexiones en ambos
  órdenes y rollback. Un cambio rechazado no altera otros campos del catálogo.
- RN-26: desactivación lógica, sin borrar partidas ni aplicaciones. Modificar
  otros campos no reactiva un registro desactivado. Referencias ON DELETE RESTRICT.
- El catálogo maestro es global según SPEC.md y carece de datos de inventario
  por finca. Administrador modifica; administrador y encargado consultan.
  Se revalidan usuarios y sesiones persistidos, no solo claims firmados.
- Se mantienen los componentes del contrato anterior para sus consumidores de
  buildApp y pruebas. El bootstrap productivo registra el contrato canónico en
  /insumos; no registra allí el controlador anterior. Los adaptadores antiguos
  de aplicaciones/inventario siguen pendientes de su integración canónica.

### Migración incremental 0018_insumos_catalogo

Agrega insumos y las estructuras de referencia partidas_insumo,
aplicaciones_insumo y aplicaciones_insumo_items para comprobar RN-15 con FK
reales. Incluye índices, restricciones de cantidades, vínculo obligatorio con
una actividad realizada y FK compuesta partida/insumo. Cabeceras e items de
aplicaciones son append-only. No agrega endpoints de aplicaciones o stock.
Las tablas y datos históricos anteriores no se eliminan ni se modifican.
No se considera implementado inventario por tener sus tablas de referencia.

## Pruebas ejecutadas

- `npm.cmd run lint`: aprobado; comprobación de tipos después de cada componente.
- `npm.cmd run build`: aprobado antes de ejecutar el entrypoint compilado.
- Cadena completa de 19 migraciones sobre base vacía: aprobada.
- Pruebas nuevas: **54 aprobadas**, sin fallos ni omisiones: dominio (22), catálogo
  PostgreSQL (27), concurrencia/rollback PostgreSQL (4) y servidor compilado (1).
- Regresión global: **944 aprobadas, 342 omitidas, 0 fallidas**, en 119 archivos
  (101 aprobados, 18 omitidos); 93,02 segundos. El total incluye las 54 nuevas.
- Las 342 omitidas corresponden a suites PostgreSQL anteriores, ligadas a otras
  bases por sus fixtures. No se habilitaron esas bases ni se declararon aprobadas.
- El servidor HTTP compilado autentica mediante login real, registra y consulta
  insumos y permite comprobar su fila persistida. También verifica 401 sin sesión.
- Persistencia después de reiniciar bootstrap, duplicados simultáneos, límites
  numéricos sin redondeo, SQL directo, estado de usuario vigente y preservación
  del historial de una labor AGRUL-054 incluidos.

Comandos de validación (sin credenciales privadas):

```powershell
npm.cmd run lint
npm.cmd run build
# Quitar del proceso las variables de conexión anteriores antes de ejecutar.
$env:INSUMOS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-055-validacion-vitest.json
```

La base exclusiva usa PostgreSQL 18.4 en 127.0.0.1:5432. El rol agrul_test_user
no tiene superusuario, CREATEDB, CREATEROLE, replicación ni BYPASSRLS.
Solo la creación autorizada de la base requirió la conexión administrativa
local existente, sin proporcionar contraseñas. Migraciones, fixtures y servidor
se ejecutaron como agrul_test_user. No se leyeron archivos privados ni se
incluyeron credenciales reales. No se accedió a gimnasio_db ni PostgreSQL 17.
Los fixtures clonaron únicamente DDL a esquemas temporales propios, conservando
triggers y FK reales y sin fallback a public. Al terminar: cero usuarios e
insumos públicos, cero esquemas temporales remanentes. El JSON de Vitest queda
local y fuera del commit.

## Matriz de cumplimiento parcial de la issue

| CU | Requisito | Implementación | Prueba | Resultado |
| --- | --- | --- | --- | --- |
| CU34 | Alta de insumo y código único | insumos.use-cases.ts / drizzle-insumos.repository.ts | insumos-postgres.test.ts; insumos-servidor-real.test.ts | CUMPLE |
| CU35 | Listado filtrado, paginado y detalle | insumos.routes.ts / drizzle-insumos.repository.ts | insumos-postgres.test.ts | CUMPLE |
| CU36 | Modificación y RN-15 | insumos.use-cases.ts / migración 0018 | insumos-postgres.test.ts; insumos-concurrencia-postgres.test.ts | CUMPLE |
| CU37 | Desactivación y preservación histórica | insumos.use-cases.ts / drizzle-insumos.repository.ts | insumos-postgres.test.ts | CUMPLE |
| CU38 | Aplicaciones según grupo CU38/CU39 de la issue | Pendiente | Pendiente | NO CUMPLE |
| CU39 | Aplicaciones según grupo CU38/CU39 de la issue | Pendiente | Pendiente | NO CUMPLE |
| CU40 | Corrección y regularización auditada | Pendiente | Pendiente | NO CUMPLE |
| CU63 | Inventario: pendiente del bloque CU63–CU66 | Pendiente | Pendiente | NO CUMPLE |
| CU64 | Inventario: pendiente del bloque CU63–CU66 | Pendiente | Pendiente | NO CUMPLE |
| CU65 | Inventario: pendiente del bloque CU63–CU66 | Pendiente | Pendiente | NO CUMPLE |
| CU66 | Inventario: pendiente del bloque CU63–CU66 | Pendiente | Pendiente | NO CUMPLE |

La issue agrupa CU38/CU39 y CU63–CU66 sin detallar cada flujo individual. La
descomposición fina de inventario deberá contrastarse con documentación adicional
si existe antes de asignar funcionalidades particulares a cada CU.

## Límites y siguiente bloque

No se declara #49 terminada, no se cierra ni se integra a main. Faltan inventario,
movimientos inmutables, autorización por finca de stock/aplicaciones, consumo
FEFO/FIFO, idempotencia, correcciones y regresión PostgreSQL completa de módulos
anteriores. No se crea PR final antes de completar y validar esos bloques.

No está disponible el porcentaje real del cupo de Codex. Tras commit y push de
esta etapa se detiene el trabajo; continuar requiere autorización del usuario.
