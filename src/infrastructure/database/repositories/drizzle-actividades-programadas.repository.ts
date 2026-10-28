import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { ActividadProgramada } from '../../../core/domain/entities/actividad-programada.entity.js';
import { EstadoActividadInvalidoError } from '../../../core/domain/entities/actividad-programada.entity.js';
import {
  ActividadesProgramadasRepositoryPort,
  FiltrosActividadesProgramadas,
} from '../../../core/ports/actividades-programadas-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { actividadesProgramadasTable } from '../schema/actividades-programadas.js';

export class DrizzleActividadesProgramadasRepository implements ActividadesProgramadasRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(actividad: ActividadProgramada): Promise<void> {
    const raw = actividad.toJSON();
    await this.db.insert(actividadesProgramadasTable).values({
      id: raw.id,
      cicloId: raw.cicloId,
      tipoActividadId: raw.tipoActividadId,
      fechaProgramada: raw.fechaProgramada,
      responsableId: raw.responsableId,
      superficiePrevista: raw.superficiePrevista !== null ? raw.superficiePrevista.toFixed(2) : null,
      descripcion: raw.descripcion,
      estado: raw.estado,
      motivoCancelacion: raw.motivoCancelacion,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    });
  }

  async buscarPorId(id: string): Promise<ActividadProgramada | null> {
    const [fila] = await this.db.select().from(actividadesProgramadasTable).where(eq(actividadesProgramadasTable.id, id));
    if (!fila) return null;
    return ActividadProgramada.reconstituir({
      id: fila.id,
      cicloId: fila.cicloId,
      tipoActividadId: fila.tipoActividadId!,
      fechaProgramada: fila.fechaProgramada!,
      responsableId: fila.responsableId!,
      superficiePrevista: fila.superficiePrevista ? Number(fila.superficiePrevista) : null,
      descripcion: fila.descripcion,
      estado: fila.estado,
      motivoCancelacion: fila.motivoCancelacion,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }

  async listar(filtros: FiltrosActividadesProgramadas): Promise<ActividadProgramada[]> {
    const condiciones = [];
    if (filtros.cicloId) {
      condiciones.push(eq(actividadesProgramadasTable.cicloId, filtros.cicloId));
    }
    if (filtros.tipoActividadId) {
      condiciones.push(eq(actividadesProgramadasTable.tipoActividadId, filtros.tipoActividadId));
    }
    if (filtros.responsableId) {
      condiciones.push(eq(actividadesProgramadasTable.responsableId, filtros.responsableId));
    }
    if (filtros.estado) {
      condiciones.push(eq(actividadesProgramadasTable.estado, filtros.estado));
    }
    if (filtros.desde) {
      condiciones.push(gte(actividadesProgramadasTable.fechaProgramada, filtros.desde));
    }
    if (filtros.hasta) {
      condiciones.push(lte(actividadesProgramadasTable.fechaProgramada, filtros.hasta));
    }

    const whereClause = condiciones.length > 0 ? and(...condiciones) : undefined;

    const filas = await this.db
      .select()
      .from(actividadesProgramadasTable)
      .where(whereClause)
      .orderBy(asc(actividadesProgramadasTable.fechaProgramada), asc(actividadesProgramadasTable.id))
      .limit(filtros.limit)
      .offset(filtros.offset);

    return filas.map((fila) =>
      ActividadProgramada.reconstituir({
        id: fila.id,
        cicloId: fila.cicloId,
        tipoActividadId: fila.tipoActividadId!,
        fechaProgramada: fila.fechaProgramada!,
        responsableId: fila.responsableId!,
        superficiePrevista: fila.superficiePrevista ? Number(fila.superficiePrevista) : null,
        descripcion: fila.descripcion,
        estado: fila.estado,
        motivoCancelacion: fila.motivoCancelacion,
        creadoEn: fila.creadoEn,
        actualizadoEn: fila.actualizadoEn,
      })
    );
  }

  async actualizar(actividad: ActividadProgramada): Promise<void> {
    const raw = actividad.toJSON();
    // La condición se evalúa en el UPDATE: una lectura anterior nunca habilita
    // sobrescribir una cancelación o ejecución confirmada por otra solicitud.
    const filas = await this.db
      .update(actividadesProgramadasTable)
      .set({
        tipoActividadId: raw.tipoActividadId,
        fechaProgramada: raw.fechaProgramada,
        responsableId: raw.responsableId,
        superficiePrevista: raw.superficiePrevista !== null ? raw.superficiePrevista.toFixed(2) : null,
        descripcion: raw.descripcion,
        estado: raw.estado,
        motivoCancelacion: raw.motivoCancelacion,
        actualizadoEn: raw.actualizadoEn,
      })
      .where(and(
        eq(actividadesProgramadasTable.id, raw.id),
        eq(actividadesProgramadasTable.estado, 'PENDIENTE'),
      ))
      .returning({ id: actividadesProgramadasTable.id });
    if (filas.length === 0) {
      throw new EstadoActividadInvalidoError('La actividad ya no está pendiente o no existe. Volvé a consultar su estado.');
    }
  }
}
