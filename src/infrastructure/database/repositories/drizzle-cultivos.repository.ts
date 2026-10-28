import { eq, asc } from 'drizzle-orm';
import { Cultivo, CultivoDuplicadoError, DatosCultivo } from '../../../core/domain/entities/cultivo.entity.js';
import { CultivosRepositoryPort, FiltrosCultivos } from '../../../core/ports/cultivos-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { cultivosTable } from '../schema/cultivos.js';

export class DrizzleCultivosRepository implements CultivosRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(cultivo: Cultivo): Promise<void> {
    await this.conUnicidad(cultivo.toJSON().nombre, () => this.db.insert(cultivosTable).values(cultivo.toJSON()));
  }

  async buscarPorId(id: string): Promise<Cultivo | null> {
    const [fila] = await this.db.select().from(cultivosTable).where(eq(cultivosTable.id, id));
    return fila ? Cultivo.reconstituir(fila) : null;
  }

  async listar(filtros: FiltrosCultivos): Promise<Cultivo[]> {
    const filas = await this.db.select().from(cultivosTable)
      .where(filtros.estado ? eq(cultivosTable.estado, filtros.estado) : undefined)
      .orderBy(asc(cultivosTable.nombre), asc(cultivosTable.id)).limit(filtros.limit).offset(filtros.offset);
    return filas.map(Cultivo.reconstituir);
  }

  async modificar(id: string, datos: DatosCultivo): Promise<Cultivo | null> {
    const [fila] = await this.conUnicidad(datos.nombre, () => this.db.update(cultivosTable)
      .set({ nombre: datos.nombre, tipoCicloVida: datos.tipoCicloVida, descripcion: datos.descripcion })
      .where(eq(cultivosTable.id, id)).returning());
    return fila ? Cultivo.reconstituir(fila) : null;
  }

  async desactivar(id: string): Promise<Cultivo | null> {
    const [fila] = await this.db.update(cultivosTable).set({ estado: 'INACTIVO' })
      .where(eq(cultivosTable.id, id)).returning();
    return fila ? Cultivo.reconstituir(fila) : null;
  }

  private async conUnicidad<T>(nombre: string, operacion: () => PromiseLike<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && error.constraint === 'cultivos_nombre_unique') {
        throw new CultivoDuplicadoError(nombre);
      }
      throw error;
    }
  }
}
