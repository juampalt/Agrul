# AGRUL-054 — Corrección S2 (refs #48)

## Alcance

La superficie prevista opcional admite null/omisión o un número finito entre
0,01 y 999.999,99 ha, con hasta dos decimales. Dominio, contrato HTTP y
adaptador Drizzle comparten la validación antes de serializar NUMERIC(8,2).
Los valores fuera de rango o con precisión excesiva se rechazan sin redondear;
el contrato devuelve HTTP 400 antes de intentar insertar.

La reconstrucción histórica conserva sus reglas anteriores. No se agregaron
migraciones ni se cambiaron restricciones, permisos o transiciones.

## Validación ejecutada

- Pruebas específicas sin PostgreSQL: 36 aprobadas en dos archivos.
- Regresión relacionada completa seleccionada: 275 aprobadas en 22 archivos,
  sin omisiones; incluye 81 pruebas PostgreSQL en seis archivos.
- Incluye límites, precisión excesiva, desbordamiento, valores no finitos,
  cadenas, superficie desconocida, rechazo previo al SQL y persistencia/listado/
  detalle desde el bootstrap real. Conserva regresiones S1, P1, P2 y RN-09.
- PostgreSQL 18 exclusivamente en 127.0.0.1:5432, base descartable
  agrul_test_agrul_054 y rol agrul_test_user sin privilegios administrativos.
  Autenticación local sin leer ni imprimir credenciales. Los fixtures ejecutaron
  el journal existente únicamente sobre la base descartable autorizada.
- Lint y build aprobados.

## Archivos

- Entidad actividad-programada, esquema HTTP y repositorio Drizzle.
- Nuevo test unitario superficie-prevista; ampliación de tests del repositorio
  y de integración actividades-programadas-postgres.
- Regla preventiva NUMERIC en la skill database-events y este informe.

## Pendientes

P3: adaptar rn09-pendientes-postgres.test.ts a las restricciones y conexión
descartable vigentes; ese archivo no se ejecutó en este bloque. No se afirma
que la suite global esté aprobada. No se avanzó con P3.

Se preservan los cambios locales ajenos al bloque. Sin merge ni cierre de #48.
Detención al finalizar este bloque para revisión manual del cupo.
