import { eq, inArray, sql } from 'drizzle-orm';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AgrulDatabase } from './connection.js';
import { ciclosProductivosTable as ciclos, lotesTable as lotes, plantacionesTable as plantaciones } from './schema/tables.js';

export function alcanceFincasPorLote(db: AgrulDatabase, columna: AnyPgColumn, fincas: readonly string[] | undefined) {
  if (fincas === undefined) return undefined; // Uso global administrativo o interno.
  if (!fincas.length) return sql`false`;
  return inArray(columna, db.select({ id: lotes.id }).from(lotes).where(inArray(lotes.fincaId, [...fincas])));
}

export function alcanceFincasPorCiclo(db: AgrulDatabase, columna: AnyPgColumn, fincas: readonly string[] | undefined) {
  if (fincas === undefined) return undefined;
  if (!fincas.length) return sql`false`;
  return inArray(columna, db.select({ id: ciclos.id }).from(ciclos)
    .innerJoin(plantaciones, eq(ciclos.plantacionId, plantaciones.id)).innerJoin(lotes, eq(plantaciones.loteId, lotes.id))
    .where(inArray(lotes.fincaId, [...fincas])));
}
