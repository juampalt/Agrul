import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { DatosVariedad, Variedad, VariedadDuplicadaError, VariedadInvalidaError } from '../../../core/domain/entities/variedad.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { FiltrosVariedades, VariedadesRepositoryPort } from '../../../core/ports/variedades-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { variedadesTable } from '../schema/variedades.js';
import { ciclosProductivosTable, cultivosTable, plantacionesTable } from '../schema/tables.js';

export class DrizzleVariedadesRepository implements VariedadesRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(variedad: Variedad): Promise<void> {
    const datos = variedad.toJSON();
    await this.conUnicidad(datos.nombre, () => this.db.transaction(async (tx) => {
      const [cultivo] = await tx.select({ estado: cultivosTable.estado }).from(cultivosTable)
        .where(eq(cultivosTable.id, datos.cultivoId)).for('share');
      if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', datos.cultivoId);
      if (cultivo.estado !== 'ACTIVO') throw new VariedadInvalidaError('Solo pueden registrarse variedades en cultivos activos.');
      await tx.insert(variedadesTable).values(datos);
    }));
  }

  async buscarPorId(id: string): Promise<Variedad | null> {
    const [fila] = await this.db.select().from(variedadesTable).where(eq(variedadesTable.id, id));
    return fila ? Variedad.reconstituir(fila) : null;
  }

  async listar(filtros: FiltrosVariedades): Promise<Variedad[]> {
    const condiciones = [];
    if (filtros.cultivoId) condiciones.push(eq(variedadesTable.cultivoId, filtros.cultivoId));
    if (filtros.estado) condiciones.push(eq(variedadesTable.estado, filtros.estado));
    if (filtros.nombre) condiciones.push(sql`position(lower(${filtros.nombre}) in lower(${variedadesTable.nombre})) > 0`);
    const filas = await this.db.select().from(variedadesTable).where(and(...condiciones))
      .orderBy(asc(variedadesTable.nombre), asc(variedadesTable.id)).limit(filtros.limit).offset(filtros.offset);
    return filas.map(Variedad.reconstituir);
  }

  async modificar(id: string, datos: DatosVariedad): Promise<Variedad | null> {
    return this.conUnicidad(datos.nombre, () => this.db.transaction(async (tx) => {
      const [actual] = await tx.select().from(variedadesTable).where(eq(variedadesTable.id, id)).for('update');
      if (!actual) return null;
      const [cultivo] = await tx.select({ estado: cultivosTable.estado }).from(cultivosTable)
        .where(eq(cultivosTable.id, actual.cultivoId)).for('share');
      if (actual.estado !== 'ACTIVO' || cultivo?.estado !== 'ACTIVO') {
        throw new VariedadInvalidaError('Solo pueden modificarse variedades activas de cultivos activos.');
      }
      const [fila] = await tx.update(variedadesTable).set({ nombre: datos.nombre, descripcion: datos.descripcion })
        .where(eq(variedadesTable.id, id)).returning();
      return Variedad.reconstituir(fila);
    }));
  }

  async desactivar(id: string): Promise<Variedad | null> {
    return this.db.transaction(async (tx) => {
      const [actual] = await tx.select().from(variedadesTable).where(eq(variedadesTable.id, id)).for('update');
      if (!actual) return null;
      if (actual.estado !== 'ACTIVO') throw new VariedadInvalidaError('La variedad ya se encuentra inactiva.');
      const [enCurso] = await tx.select({ id: ciclosProductivosTable.id }).from(ciclosProductivosTable)
        .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
        .where(and(eq(plantacionesTable.variedadId, id), ne(ciclosProductivosTable.estado, 'FINALIZADO'))).limit(1);
      if (enCurso) throw new VariedadInvalidaError('La variedad tiene ciclos productivos sin finalizar; deben concluir antes de desactivarla.');
      const [fila] = await tx.update(variedadesTable).set({ estado: 'INACTIVO' }).where(eq(variedadesTable.id, id)).returning();
      return Variedad.reconstituir(fila);
    });
  }

  private async conUnicidad<T>(nombre: string, operacion: () => PromiseLike<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && ['variedades_cultivo_nombre_unique', 'variedades_cultivo_nombre_ci_unique'].includes(String(error.constraint))) {
        throw new VariedadDuplicadaError(nombre);
      }
      throw error;
    }
  }
}
