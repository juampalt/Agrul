import { eq, sql, SQL } from 'drizzle-orm';
import { cosechasTable as h } from './schema/tables.js';

import { FiltrosOrigenProductivo } from '../../core/ports/filtros-origen-productivo.js';

/**
 * Criterios por origen productivo (lote, ciclo, cultivo, variedad) sobre consultas que ya unen `cosechas`.
 * Cultivo y variedad se resuelven mediante la plantación del ciclo de cada cosecha.
 */
export function condicionesOrigen(f: FiltrosOrigenProductivo): (SQL | undefined)[] {
  return [
    f.loteId ? eq(h.loteId, f.loteId) : undefined,
    f.cicloId ? eq(h.cicloId, f.cicloId) : undefined,
    f.cultivoId || f.variedadId
      ? sql`${h.cicloId} IN (SELECT c.id FROM ciclos_productivos c JOIN plantaciones pl ON pl.id = c.plantacion_id WHERE true
          ${f.cultivoId ? sql`AND pl.cultivo_id = ${f.cultivoId}` : sql``}
          ${f.variedadId ? sql`AND pl.variedad_id = ${f.variedadId}` : sql``})`
      : undefined,
  ];
}
