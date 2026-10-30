import { and, asc, eq, sql } from 'drizzle-orm';
import { CodigoInsumoDuplicadoError, CodigoInsumoInmutableError, DatosInsumo, Insumo, UnidadInsumoInmutableError } from '../../../core/domain/entities/insumo.entity.js';
import { FiltrosInsumos, InsumosRepositoryPort } from '../../../core/ports/insumos-repository.port.js';
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
