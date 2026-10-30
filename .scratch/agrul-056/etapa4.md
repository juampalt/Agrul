# AGRUL-056 / #50 — Etapa 4: cámaras, movimientos y destinos

Fecha: 2026-10-30. Rama: `feat/agrul-056-cosechas-camaras`.
Base del bloque: 88ab7f1, tercera etapa publicada y validada.
El usuario autorizó continuar con la etapa de cámaras y destinos.

## Alcance verificado

Se consultaron las cinco skills de dominio, arquitectura, base de datos, API
y testing, SPEC.md, TICKETS.md y nuevamente la descripción/comentarios de #50
en GitHub. La issue sigue abierta y sin cambios en sus requisitos publicados.
CU50–CU52 se publican como grupo de ingresos, salidas y saldos por cámara/sector;
CU53/CU54, como grupo de destinos y descuento de disponibilidad.

La documentación define nombre, descripción y temperatura objetivo para las
cámaras, pero no define capacidad máxima ni su unidad. Esta etapa implementa
los saldos y la disponibilidad documentados; no agrega una capacidad máxima
inventada. Las cámaras se vinculan a finca para aplicar autorización y evitar
almacenar partidas de otra finca, aun si el actor es administrador global.

## Conservación de masa y semántica de saldos

Cada partida cumple exactamente:

`cantidadInicialKg = cantidadDisponibleKg + cantidadEnCamaraKg + cantidadDestinadaKg`

- cantidadDisponibleKg es el saldo fuera de cámaras, utilizable para nuevos
  ingresos, acondicionamientos o destinos.
- cantidadEnCamaraKg suma ingresos menos salidas de todas las cámaras de la
  partida. Los saldos también se consultan por pareja cámara/partida.
- cantidadDestinadaKg es el egreso acumulado definitivo a las finalidades
  MERCADO_FRESCO, INDUSTRIA u OTRO, con destinatario específico y responsable.
- cantidadFisicaKg es exterior + cámaras, equivalente a inicial − destinada.
- cantidadAcondicionadaKg sigue siendo una medida histórica del procesamiento,
  no un segundo stock. cantidadAcondicionableKg limita la siguiente operación
  al menor entre el exterior actual y los kilos aún no acondicionados.

Un INGRESO descuenta del exterior y acredita la cámara. Una SALIDA solo retira
del saldo de esa cámara y esa partida, y devuelve disponibilidad al exterior.
Un destino solo descuenta del exterior: la fruta en cámara debe salir antes.
No se obliga a acondicionar antes de almacenar, ni se impone una relación
entre categoría clasificada y finalidad comercial no definida por #50.

Las operaciones validan kilos positivos con hasta dos decimales y máximo
99999999.99. PostgreSQL opera con NUMERIC. Las consultas de saldos calculan en
SQL y convierten a número únicamente al construir el DTO.

## Bitácoras, proyección y fechas

Migraciones incrementales 0028 y 0029: camaras_sector,
movimientos_almacenamiento y destinos_produccion; FK restrictivas, índices y
triggers. La cadena completa queda en 30 migraciones.

Los movimientos y destinos son append-only, sin UPDATE, DELETE ni TRUNCATE.
El registro de cámaras conserva finca, creador y solicitud, con temperatura
desconocida nullable, distinta de cero. No se habilitan cambios de identidad o
finca que reescriban la procedencia de operaciones anteriores.

cantidadDisponibleKg es una proyección controlada de la bitácora. Su trigger
solo permite actualizarla desde una operación confirmada por trigger y exige
que coincida con inicial − ingresos + salidas − destinos. Nunca permite
cambiar identidad, clasificación, categoría ni cantidad inicial. Un UPDATE
SQL directo, incluso sin cambio de valor, sigue bloqueado.

Las fechas son reales, no futuras en el día local de Tucumán y posteriores o
iguales a la clasificación. Además se comprueban saldos acumulados por día:
una operación retroactiva no puede introducir un saldo exterior o de cámara
negativo en un día intermedio. Se admite registrar hechos anteriores cuando
la conservación de masa de toda la secuencia diaria permanece válida.

El movimiento/destino, la proyección y el evento de trazabilidad se confirman
atómicamente. Un fallo del evento revierte todo el cambio de stock. Los eventos
ALMACENAMIENTO y DESTINO_PRODUCCION conservan partida, clasificación, cosecha,
lote, finca, cantidades, responsables y captura/ingesta separadas.

## Concurrencia e idempotencia

Todas las operaciones compiten por el bloqueo FOR UPDATE de la partida.
Esto serializa ingresos, salidas, destinos y acondicionamiento sobre el mismo
stock. La cámara se valida después de la partida, manteniendo un orden común.
Los triggers aplican los mismos controles incluso con INSERT SQL directo.

La clave UUID y el snapshot de solicitud/actor hacen idempotentes el registro
de cámara, los movimientos y destinos. Repetir una solicitud equivalente no
duplica hechos ni kilos. Reutilizar la clave con otro contenido/actor recibe
409. La autorización se revalida antes de devolver un resultado anterior.

Las pruebas observan bloqueos reales entre conexiones SQL y solicitudes HTTP,
con commit y rollback. Cubren ingreso contra destino, cámaras diferentes,
dos retiros, dos destinos y reintentos simultáneos. Las operaciones que
excederían el saldo reciben 422 sin producir existencias negativas.

## Integración y contratos

Dominio puro, casos de uso explícitos, AlmacenamientoProduccionRepositoryPort
y DestinosRepositoryPort. DrizzleAlmacenamientoProduccionRepository se inyecta
en el bootstrap productivo junto a los adaptadores de las etapas anteriores.

| Método | Ruta | Propósito |
| --- | --- | --- |
| POST/GET | /api/v1/almacenamiento/camaras | Registrar/listar cámaras asignadas a finca |
| GET | /api/v1/almacenamiento/camaras/:id | Consultar cámara |
| POST/GET | /api/v1/almacenamiento/movimientos | Registrar y consultar ingresos/salidas |
| GET | /api/v1/almacenamiento/movimientos/:id | Consultar un movimiento |
| GET | /api/v1/almacenamiento/saldos | Existencias actuales por cámara y partida |
| POST/GET | /api/v1/destinos-produccion | Registrar y consultar destinos |
| GET | /api/v1/destinos-produccion/:id | Consultar un destino |

Los GET de partidas de la etapa anterior muestran la descomposición completa
del stock. Schemas estrictos, UUID normalizados, envelope habitual, cantidades
validadas antes de serializar y consultas paginadas después del filtro SQL por
finca. Los saldos son actuales; los filtros de fechas se aplican al historial.

Roles ADMINISTRADOR y ENCARGADO_CAMPO, sesiones y asignaciones persistidas
revalidadas y bloqueo por contraseña inicial pendiente. Se prueban dos fincas,
usuarios sin asignaciones, otros perfiles, anónimos, tokens falsos, sesión
revocada y revocación de finca con el mismo token, también en reintentos.
Los detalles no visibles devuelven 404 y los vínculos entre fincas se rechazan.

## Migración y datos anteriores

No se inventan movimientos, destinos ni cámaras para partidas anteriores.
La prueba de upgrade crea una cosecha, clasificación y empaque antes de 0028;
después compara todos sus campos y eventos, y verifica que la nueva proyección
conserve 10 kg físicos y los 2 kg históricos acondicionados. La nueva bitácora
queda vacía, sin modificar la clasificación ni crear producción adicional.

## Validación

Resultado definitivo: lint y build correctos; Vitest con 1248 pruebas aprobadas,
0 fallidas y 456 omitidas, en 169.40 segundos (125 archivos aprobados y 30
omitidos). Las 456 pruebas anteriores omitidas no quedan certificadas por esta
ejecución; su regresión PostgreSQL integral corresponde a la auditoría final.

Esta etapa agrega 80 pruebas aprobadas: 22 de dominio, 16 de almacenamiento,
18 de destinos, 11 de autorización, 10 de concurrencia, una de servidor real
y dos de migración. El acumulado nuevo de AGRUL-056 llega a 300 pruebas.
El reporte local es .scratch/agrul-056-etapa4-final-vitest.json y se excluye de Git.

Comando reproducible (PowerShell, con credenciales resueltas por pgpass):

```powershell
Get-ChildItem Env: | Where-Object {$_.Name -match 'DATABASE_URL$'} | ForEach-Object {
  Remove-Item -LiteralPath "Env:$($_.Name)"
}
$env:COSECHAS_TEST_DATABASE_URL='postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'
npm.cmd run lint
npm.cmd run build
npm.cmd exec -- vitest run --no-file-parallelism --silent --reporter=dot --reporter=json --outputFile=.scratch/agrul-056-etapa4-final-vitest.json
```

Tras la ejecución se comprobaron las 30 migraciones aplicadas, ausencia de
esquemas agrul056_% remanentes y cero registros en public para usuarios,
partidas, cámaras, movimientos, destinos y eventos. Los procesos de servidor
creados por las pruebas se cerraron en sus respectivos teardowns.

Las pruebas nuevas cubren dominio, contratos, extremos decimales, circuito de
existencias, salida previa a destino, saldos diarios históricos, FK de finca,
autorización, inmutabilidad, rollback y concurrencia con SQL externo. El proceso
compilado dist/src/index.js recorre login → cosecha → clasificación → empaque
→ cámara → ingreso → destino → salida mediante HTTP real y verifica el saldo
final y los eventos con consultas SQL independientes.

Toda integración de este bloque usa exclusivamente agrul_test_agrul_056 en
127.0.0.1:5432, PostgreSQL 18.4, con agrul_test_user sin privilegios
administrativos y esquemas propios sin fallback a public. No se crean bases,
roles ni privilegios administrativos adicionales.

## Matriz acumulada y pausa

| CU | Requisito publicado | Estado tras etapas 1–4 |
| --- | --- | --- |
| CU41–CU46 | Grupo de planificación, registro y pasadas | Implementado y validado en etapas anteriores |
| CU47/CU48 | Grupo de clasificación y descarte | Implementado y validado en etapa 3 |
| CU49 | Acondicionamiento | Implementado y validado en etapa 3 |
| CU50–CU52 | Ingresos, salidas y saldos por cámara/sector | Implementado y validado en etapa 4; sujeto a auditoría final |
| CU53/CU54 | Destinos desde disponibilidad exterior | Implementado y validado en etapa 4; sujeto a auditoría final |

La auditoría individual final y la regresión PostgreSQL integral de módulos
anteriores siguen pendientes. No se declara terminada #50 ni se crea el PR
final en este bloque. Se publica el commit en la rama de trabajo con refs #50,
sin modificar main ni hacer merge; se excluyen reportes JSON y archivos locales
anteriores. Sin acceso al porcentaje real de cupo, se detiene después del push
y espera autorización para la auditoría final.
