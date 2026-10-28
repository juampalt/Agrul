import { and, asc, eq } from 'drizzle-orm';
import { DatosVariedad, Variedad, VariedadDuplicadaError } from '../../../core/domain/entities/variedad.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { FiltrosVariedades, VariedadesRepositoryPort } from '../../../core/ports/variedades-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { variedadesTable } from '../schema/variedades.js';

export class DrizzleVariedadesRepository implements VariedadesRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(variedad: Variedad): Promise<void> {
    const datos = variedad.toJSON();
    try {
      await this.conUnicidad(datos.nombre, () => this.db.insert(variedadesTable).values(datos));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23503'
        && 'constraint' in error && error.constraint === 'variedades_cultivo_id_cultivos_id_fk') {
        throw new EntidadNoEncontradaError('Cultivo', datos.cultivoId);
      }
      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Variedad | null> {
    const [fila] = await this.db.select().from(variedadesTable).where(eq(variedadesTable.id, id));
    return fila ? Variedad.reconstituir(fila) : null;
  }

  async listar(filtros: FiltrosVariedades): Promise<Variedad[]> {
    const condiciones = [];
    if (filtros.cultivoId) condiciones.push(eq(variedadesTable.cultivoId, filtros.cultivoId));
    if (filtros.estado) condiciones.push(eq(variedadesTable.estado, filtros.estado));
    const filas = await this.db.select().from(variedadesTable).where(and(...condiciones))
      .orderBy(asc(variedadesTable.nombre), asc(variedadesTable.id)).limit(filtros.limit).offset(filtros.offset);
    return filas.map(Variedad.reconstituir);
  }

  async modificar(id: string, datos: DatosVariedad): Promise<Variedad | null> {
    const [fila] = await this.conUnicidad(datos.nombre, () => this.db.update(variedadesTable)
      .set({ nombre: datos.nombre, descripcion: datos.descripcion })
      .where(eq(variedadesTable.id, id)).returning());
    return fila ? Variedad.reconstituir(fila) : null;
  }

  async desactivar(id: string): Promise<Variedad | null> {
    const [fila] = await this.db.update(variedadesTable).set({ estado: 'INACTIVO' })
      .where(eq(variedadesTable.id, id)).returning();
    return fila ? Variedad.reconstituir(fila) : null;
  }

  private async conUnicidad<T>(nombre: string, operacion: () => PromiseLike<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && error.constraint === 'variedades_cultivo_nombre_unique') {
        throw new VariedadDuplicadaError(nombre);
      }
      throw error;
    }
  }
}
