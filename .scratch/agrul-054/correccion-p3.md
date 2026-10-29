# AGRUL-054 — P3: compatibilidad RN-09 (refs #48)

## Cambios

- rn09-pendientes-postgres.test.ts acepta exclusivamente la URL sin contraseña
  del rol agrul_test_user en 127.0.0.1:5432/agrul_test_agrul_054, antes de crear
  el pool. Verifica PostgreSQL 18 y ausencia de privilegios administrativos
  antes de migraciones o escrituras.
- Las cancelaciones nuevas del fixture llevan motivo. Tres casos negativos
  verifican SQLSTATE 23514 para null, cadena vacía y espacios.
- La limpieza de actividades se limita a los dos ciclos propios de RN-09.
- El helper compartido deriva los códigos únicos del UUID completo en base64url
  (27 caracteres con prefijo), respetando varchar(30) y evitando colisiones
  entre las siete suites consumidoras.
- Se registra la regla preventiva de aislamiento de fixtures en testing-quality.

## Validaciones ejecutadas

La primera corrida detectó colisión del código RN09-0 entre ciclos distintos.
El primer ajuste usó UUID textual y excedió varchar(30); fue corregido antes
de la validación final. Las corridas fallidas no se consideran aprobadas.

Corrida final: **99 pruebas aprobadas en ocho archivos, sin omisiones**:

- RN-09 PostgreSQL: 15.
- Históricos anteriores a 0015: 9, incluyendo lectura de cancelaciones sin
  motivo, sin inventar datos ni alterar los CHECK vigentes.
- Actividades programadas: 25.
- Concurrencia: 6.
- Autorización por finca: 8.
- Labores realizadas: 20.
- Monitoreos: 13.
- Guard de cierre unitario: 3.

Las 96 pruebas PostgreSQL usan bootstrap real y exclusivamente la base
descartable autorizada. Se ejecutaron secuencialmente para evitar interferencias
con las pruebas que simulan errores renombrando tablas/columnas temporalmente.
Lint y build aprobados tras el último cambio de código.

## Límites y cierre del bloque

Sin cambios productivos ni nuevas migraciones; los fixtures aplicaron el journal
existente solo en la base descartable. No se leyó pgpass ni se incluyeron secretos.
Se preservan los cambios locales ajenos al bloque. No se ejecutó la suite global
ni se declara aprobada. Sin merge ni cierre de la issue #48.

Los cinco hallazgos enumerados (S1, P1, P2, S2 y P3) tienen correcciones por
bloque; una revisión final integral queda para autorización posterior.
Detención para revisión manual del cupo al terminar este bloque.
