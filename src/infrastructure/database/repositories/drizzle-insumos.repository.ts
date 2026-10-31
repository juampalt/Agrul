import { and, asc, eq, sql } from 'drizzle-orm';
import { CodigoInsumoDuplicadoError, CodigoInsumoInmutableError, DatosInsumo, Insumo, UnidadInsumoInmutableError } from '../../../core/domain/entities/insumo.entity.js';
import { AntecedenteInsumo, FiltrosInsumos, InsumosRepositoryPort } from '../../../core/ports/insumos-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { insumosTable } from '../schema/insumos.js';

type Fila = typeof insumosTable.$inferSelect;
function reconstruir(fila: Fila): Insumo {
  return Insumo.reconstituir({ ...fila, nivelMinimo: Number(fila.nivelMinimo) });
}
function serializar(datos: DatosInsumo) {
  const validos = Insumo.validar(datos);
  return { ...validos, nivelMinimo: validos.nivelMinimo.toFixed(2) };
}

export class DrizzleInsumosRepository implements InsumosRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async antecedentes(insumoId: string, fincaIds?: readonly string[]): Promise<AntecedenteInsumo[]> {
    const finca = fincaIds === undefined ? sql`` : fincaIds.length
      ? sql`AND l.finca_id IN (${sql.join(fincaIds.map(id => sql`${id}::uuid`), sql`, `)})` : sql`AND false`;
    const { rows } = await this.db.execute<{ aplicacion_id: string; fecha: string; lote_id: string; codigo_lote: string; cultivo_id: string;
      cultivo: string; ciclo_id: string; ciclo: string; actividad_id: string; cantidad: string; unidad: string }>(sql`
      SELECT a.id AS aplicacion_id, r.fecha_ejecucion::text AS fecha, l.id AS lote_id, l.codigo_lote, cu.id AS cultivo_id, cu.nombre AS cultivo,
        c.id AS ciclo_id, c.nombre_codigo AS ciclo, r.id AS actividad_id, sum(it.cantidad_aplicada)::text AS cantidad, i.unidad_medida AS unidad
      FROM aplicaciones_insumo_items it
      JOIN aplicaciones_insumo a ON a.id = it.aplicacion_id
      JOIN actividades_realizadas r ON r.id = a.actividad_realizada_id
      JOIN lotes l ON l.id = r.lote_id
      JOIN ciclos_productivos c ON c.id = r.ciclo_id
      JOIN plantaciones p ON p.id = c.plantacion_id
      JOIN cultivos cu ON cu.id = p.cultivo_id
      JOIN insumos i ON i.id = it.insumo_id
      WHERE it.insumo_id = ${insumoId}::uuid ${finca}
        AND NOT EXISTS (SELECT 1 FROM correcciones_aplicaciones_insumo k WHERE k.aplicacion_anterior_id = a.id)
      GROUP BY a.id, r.fecha_ejecucion, l.id, l.codigo_lote, cu.id, cu.nombre, c.id, c.nombre_codigo, r.id, i.unidad_medida
      ORDER BY r.fecha_ejecucion DESC, a.id LIMIT 100`);
    return rows.map(x => ({ aplicacionId: x.aplicacion_id, fechaAplicacion: x.fecha, loteId: x.lote_id, codigoLote: x.codigo_lote,
      cultivoId: x.cultivo_id, cultivo: x.cultivo, cicloId: x.ciclo_id, ciclo: x.ciclo, actividadRealizadaId: x.actividad_id,
      cantidadUtilizada: Number(x.cantidad), unidadMedida: x.unidad }));
  }

  async guardar(insumo: Insumo): Promise<void> {
    const datos = insumo.toJSON();
    await this.conErrores(async () => {
      await this.db.insert(insumosTable).values({ ...serializar(datos), id: datos.id, estado: datos.estado });
    });
  }
  async buscarPorId(id: string): Promise<Insumo | null> {
    const [fila] = await this.db.select().from(insumosTable).where(eq(insumosTable.id, id));
    return fila ? reconstruir(fila) : null;
  }
  async listar(filtros: FiltrosInsumos): Promise<Insumo[]> {
    const condiciones = [];
    if (filtros.estado) condiciones.push(eq(insumosTable.estado, filtros.estado));
    if (filtros.categoria) condiciones.push(eq(insumosTable.categoria, filtros.categoria));
    if (filtros.codigo) condiciones.push(eq(insumosTable.codigo, filtros.codigo));
    if (filtros.nombre) condiciones.push(sql`position(lower(${filtros.nombre}) in lower(${insumosTable.nombre})) > 0`);
    const filas = await this.db.select().from(insumosTable).where(and(...condiciones))
      .orderBy(asc(insumosTable.codigo), asc(insumosTable.id)).limit(filtros.limit).offset(filtros.offset);
    return filas.map(reconstruir);
  }
  async modificar(id: string, datos: DatosInsumo): Promise<Insumo | null> {
    // Una sola escritura: no reenvía estado ni valores leídos antes del bloqueo.
    // RN-15 se verifica en PostgreSQL bajo el mismo bloqueo que las aplicaciones.
    return this.conErrores(async () => {
      const [fila] = await this.db.update(insumosTable).set(serializar(datos))
        .where(eq(insumosTable.id, id)).returning();
      return fila ? reconstruir(fila) : null;
    });
  }
  async desactivar(id: string): Promise<Insumo | null> {
    const [fila] = await this.db.update(insumosTable).set({ estado: 'INACTIVO' })
      .where(eq(insumosTable.id, id)).returning();
    return fila ? reconstruir(fila) : null;
  }
  private async conErrores<T>(accion: () => Promise<T>): Promise<T> {
    try { return await accion(); } catch (error) {
      if (error instanceof Error && 'code' in error && 'constraint' in error) {
        if (error.code === '23505' && error.constraint === 'insumos_codigo_unique') throw new CodigoInsumoDuplicadoError();
        if (error.code === '23514' && error.constraint === 'insumos_unidad_inmutable') throw new UnidadInsumoInmutableError();
        if (error.code === '23514' && error.constraint === 'insumos_codigo_inmutable') throw new CodigoInsumoInmutableError();
      }
      throw error;
    }
  }
}
