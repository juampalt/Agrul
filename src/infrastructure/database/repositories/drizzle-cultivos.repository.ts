import { and, asc, eq, ne } from 'drizzle-orm';
import { Cultivo, CultivoDuplicadoError, CultivoInvalidoError, DatosCultivo } from '../../../core/domain/entities/cultivo.entity.js';
import { CultivosRepositoryPort, FiltrosCultivos } from '../../../core/ports/cultivos-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { cultivosTable } from '../schema/cultivos.js';
import { ciclosProductivosTable, plantacionesTable } from '../schema/tables.js';

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
    return this.conUnicidad(datos.nombre, () => this.db.transaction(async (tx) => {
      const [actual] = await tx.select().from(cultivosTable).where(eq(cultivosTable.id, id)).for('update');
      if (!actual) return null;
      if (actual.estado !== 'ACTIVO') throw new CultivoInvalidoError('Solo pueden modificarse cultivos activos.');
      const [fila] = await tx.update(cultivosTable)
        .set({ nombre: datos.nombre, tipoCicloVida: datos.tipoCicloVida, descripcion: datos.descripcion })
        .where(eq(cultivosTable.id, id)).returning();
      return Cultivo.reconstituir(fila);
    }));
  }

  async desactivar(id: string): Promise<Cultivo | null> {
    return this.db.transaction(async (tx) => {
      const [actual] = await tx.select().from(cultivosTable).where(eq(cultivosTable.id, id)).for('update');
      if (!actual) return null;
      if (actual.estado !== 'ACTIVO') throw new CultivoInvalidoError('El cultivo ya se encuentra inactivo.');
      const [enCurso] = await tx.select({ id: ciclosProductivosTable.id }).from(ciclosProductivosTable)
        .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
        .where(and(eq(plantacionesTable.cultivoId, id), ne(ciclosProductivosTable.estado, 'FINALIZADO'))).limit(1);
      if (enCurso) throw new CultivoInvalidoError('El cultivo tiene ciclos productivos sin finalizar; deben concluir antes de desactivarlo.');
      const [fila] = await tx.update(cultivosTable).set({ estado: 'INACTIVO' }).where(eq(cultivosTable.id, id)).returning();
      return Cultivo.reconstituir(fila);
    });
  }

  private async conUnicidad<T>(nombre: string, operacion: () => PromiseLike<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && ['cultivos_nombre_unique', 'cultivos_nombre_ci_unique'].includes(String(error.constraint))) {
        throw new CultivoDuplicadoError(nombre);
      }
      throw error;
    }
  }
}
