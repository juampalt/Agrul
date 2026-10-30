import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  TipoActividad,
  TipoActividadDuplicadoError,
  TipoActividadInvalidoError,
  DatosTipoActividad,
} from '../../../core/domain/entities/tipo-actividad-canonico.entity.js';
import {
  TiposActividadRepositoryPort,
  FiltrosTiposActividad,
} from '../../../core/ports/tipos-actividad-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { tiposActividadTable, tiposActividadCultivosTable } from '../schema/tipos-actividad.js';

export class DrizzleTiposActividadRepository implements TiposActividadRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(tipo: TipoActividad): Promise<void> {
    const raw = tipo.toJSON();
    await this.conUnicidad(raw.nombre, async () => {
      await this.db.transaction(async (tx) => {
        await tx.insert(tiposActividadTable).values({
          id: raw.id,
          nombre: raw.nombre,
          categoria: raw.categoria,
          descripcion: raw.descripcion,
          estado: raw.estado,
        });

        if (raw.cultivoIds && raw.cultivoIds.length > 0) {
          await tx.insert(tiposActividadCultivosTable).values(
            raw.cultivoIds.map((cultivoId) => ({
              tipoActividadId: raw.id,
              cultivoId,
            }))
          );
        }
      });
    });
  }

  async buscarPorId(id: string): Promise<TipoActividad | null> {
    const [fila] = await this.db.select().from(tiposActividadTable).where(eq(tiposActividadTable.id, id));
    if (!fila) return null;

    const relaciones = await this.db
      .select({ cultivoId: tiposActividadCultivosTable.cultivoId })
      .from(tiposActividadCultivosTable)
      .where(eq(tiposActividadCultivosTable.tipoActividadId, id));

    return TipoActividad.reconstituir({
      id: fila.id,
      nombre: fila.nombre,
      categoria: fila.categoria,
      descripcion: fila.descripcion,
      estado: fila.estado,
      cultivoIds: relaciones.map((r) => r.cultivoId),
    });
  }

  async listar(filtros: FiltrosTiposActividad): Promise<TipoActividad[]> {
    const condiciones = [];
    if (filtros.estado) {
      condiciones.push(eq(tiposActividadTable.estado, filtros.estado));
    }
    if (filtros.categoria) {
      condiciones.push(eq(tiposActividadTable.categoria, filtros.categoria));
    }

    if (filtros.cultivoId) {
      const vinculados = await this.db
        .select({ tipoActividadId: tiposActividadCultivosTable.tipoActividadId })
        .from(tiposActividadCultivosTable)
        .where(eq(tiposActividadCultivosTable.cultivoId, filtros.cultivoId));

      const ids = vinculados.map((v) => v.tipoActividadId);
      if (ids.length === 0) return [];
      condiciones.push(inArray(tiposActividadTable.id, ids));
    }

    const whereClause = condiciones.length > 0 ? and(...condiciones) : undefined;

    const filas = await this.db
      .select()
      .from(tiposActividadTable)
      .where(whereClause)
      .orderBy(asc(tiposActividadTable.nombre), asc(tiposActividadTable.id))
      .limit(filtros.limit)
      .offset(filtros.offset);

    if (filas.length === 0) return [];

    const ids = filas.map((f) => f.id);
    const relaciones = await this.db
      .select()
      .from(tiposActividadCultivosTable)
      .where(inArray(tiposActividadCultivosTable.tipoActividadId, ids));

    const cultivosPorTipo = new Map<string, string[]>();
    for (const r of relaciones) {
      const list = cultivosPorTipo.get(r.tipoActividadId) ?? [];
      list.push(r.cultivoId);
      cultivosPorTipo.set(r.tipoActividadId, list);
    }

    return filas.map((fila) =>
      TipoActividad.reconstituir({
        id: fila.id,
        nombre: fila.nombre,
        categoria: fila.categoria,
        descripcion: fila.descripcion,
        estado: fila.estado,
        cultivoIds: cultivosPorTipo.get(fila.id) ?? [],
      })
    );
  }

  async modificar(id: string, datos: DatosTipoActividad): Promise<TipoActividad | null> {
    return await this.conUnicidad(datos.nombre, async () => {
      return await this.db.transaction(async (tx) => {
        const [fila] = await tx
          .update(tiposActividadTable)
          .set({
            nombre: datos.nombre,
            categoria: datos.categoria,
            descripcion: datos.descripcion,
          })
          .where(and(eq(tiposActividadTable.id, id), eq(tiposActividadTable.estado, 'ACTIVA')))
          .returning();

        if (!fila) {
          const [existente] = await tx.select({ id: tiposActividadTable.id }).from(tiposActividadTable)
            .where(eq(tiposActividadTable.id, id));
          if (existente) throw new TipoActividadInvalidoError('Solo pueden modificarse tipos de actividad activos.');
          return null;
        }

        if (datos.cultivoIds !== undefined) {
          await tx
            .delete(tiposActividadCultivosTable)
            .where(eq(tiposActividadCultivosTable.tipoActividadId, id));

          if (datos.cultivoIds.length > 0) {
            await tx.insert(tiposActividadCultivosTable).values(
              datos.cultivoIds.map((cultivoId) => ({
                tipoActividadId: id,
                cultivoId,
              }))
            );
          }
        }

        const relaciones = await tx
          .select({ cultivoId: tiposActividadCultivosTable.cultivoId })
          .from(tiposActividadCultivosTable)
          .where(eq(tiposActividadCultivosTable.tipoActividadId, id));

        return TipoActividad.reconstituir({
          id: fila.id,
          nombre: fila.nombre,
          categoria: fila.categoria,
          descripcion: fila.descripcion,
          estado: fila.estado,
          cultivoIds: relaciones.map((r) => r.cultivoId),
        });
      });
    });
  }

  async desactivar(id: string): Promise<TipoActividad | null> {
    const [fila] = await this.db
      .update(tiposActividadTable)
      .set({ estado: 'INACTIVA' })
      .where(and(eq(tiposActividadTable.id, id), eq(tiposActividadTable.estado, 'ACTIVA')))
      .returning();

    if (!fila) {
      const [existente] = await this.db.select({ id: tiposActividadTable.id }).from(tiposActividadTable)
        .where(eq(tiposActividadTable.id, id));
      if (existente) throw new TipoActividadInvalidoError('El tipo de actividad ya se encuentra inactivo.');
      return null;
    }

    const relaciones = await this.db
      .select({ cultivoId: tiposActividadCultivosTable.cultivoId })
      .from(tiposActividadCultivosTable)
      .where(eq(tiposActividadCultivosTable.tipoActividadId, id));

    return TipoActividad.reconstituir({
      id: fila.id,
      nombre: fila.nombre,
      categoria: fila.categoria,
      descripcion: fila.descripcion,
      estado: fila.estado,
      cultivoIds: relaciones.map((r) => r.cultivoId),
    });
  }

  private async conUnicidad<T>(nombre: string, operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === '23505' &&
        'constraint' in error &&
        ['tipos_actividad_nombre_unique', 'tipos_actividad_nombre_ci_unique'].includes(String(error.constraint))
      ) {
        throw new TipoActividadDuplicadoError(nombre);
      }
      throw error;
    }
  }
}
