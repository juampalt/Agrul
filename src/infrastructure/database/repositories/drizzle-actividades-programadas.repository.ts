import { and, asc, eq, getTableColumns, gte, lte, sql } from 'drizzle-orm';
import { ActividadProgramada, validarSuperficiePrevista } from '../../../core/domain/entities/actividad-programada.entity.js';
import { ConflictoActividadProgramadaError, EstadoActividadInvalidoError } from '../../../core/domain/entities/actividad-programada.entity.js';
import {
  ActividadesProgramadasRepositoryPort,
  FiltrosActividadesProgramadas,
} from '../../../core/ports/actividades-programadas-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { actividadesProgramadasTable } from '../schema/actividades-programadas.js';
import { alcanceFincasPorCiclo } from '../alcance-fincas-agricolas.js';

// xmin cambia con cada versión de fila confirmada, incluso en escrituras SQL
// ajenas al repositorio. Solo se usa como token efímero dentro de una solicitud.
const columnas = { ...getTableColumns(actividadesProgramadasTable),
  versionPersistida: sql<string>`${actividadesProgramadasTable}.xmin::text` };

export class DrizzleActividadesProgramadasRepository implements ActividadesProgramadasRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(actividad: ActividadProgramada): Promise<void> {
    const raw = actividad.toJSON();
    validarSuperficiePrevista(raw.superficiePrevista);
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
    const [fila] = await this.db.select(columnas).from(actividadesProgramadasTable).where(eq(actividadesProgramadasTable.id, id));
    if (!fila) return null;
    return ActividadProgramada.reconstituir({
      id: fila.id,
      cicloId: fila.cicloId,
      tipoActividadId: fila.tipoActividadId,
      fechaProgramada: fila.fechaProgramada,
      responsableId: fila.responsableId,
      superficiePrevista: fila.superficiePrevista ? Number(fila.superficiePrevista) : null,
      descripcion: fila.descripcion,
      estado: fila.estado,
      motivoCancelacion: fila.motivoCancelacion,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    }, fila.versionPersistida);
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

    const whereClause = and(...condiciones, alcanceFincasPorCiclo(this.db, actividadesProgramadasTable.cicloId, filtros.fincaIds));

    const filas = await this.db
      .select(columnas)
      .from(actividadesProgramadasTable)
      .where(whereClause)
      .orderBy(asc(actividadesProgramadasTable.fechaProgramada), asc(actividadesProgramadasTable.id))
      .limit(filtros.limit)
      .offset(filtros.offset);

    return filas.map((fila) =>
      ActividadProgramada.reconstituir({
        id: fila.id,
        cicloId: fila.cicloId,
        tipoActividadId: fila.tipoActividadId,
        fechaProgramada: fila.fechaProgramada,
        responsableId: fila.responsableId,
        superficiePrevista: fila.superficiePrevista ? Number(fila.superficiePrevista) : null,
        descripcion: fila.descripcion,
        estado: fila.estado,
        motivoCancelacion: fila.motivoCancelacion,
        creadoEn: fila.creadoEn,
        actualizadoEn: fila.actualizadoEn,
      }, fila.versionPersistida)
    );
  }

  async actualizar(actividad: ActividadProgramada): Promise<void> {
    const raw = actividad.toJSON();
    if (raw.estado !== 'PENDIENTE' && raw.estado !== 'CANCELADA') {
      throw new EstadoActividadInvalidoError('La ejecución requiere registrar una labor realizada de forma transaccional.');
    }
    if (!actividad.versionPersistida) throw new ConflictoActividadProgramadaError();
    const cambios = raw.estado === 'CANCELADA'
      ? { estado: raw.estado, motivoCancelacion: raw.motivoCancelacion, actualizadoEn: raw.actualizadoEn }
      : { fechaProgramada: raw.fechaProgramada, responsableId: raw.responsableId, actualizadoEn: raw.actualizadoEn };
    // Compare-and-swap: estado y versión deben seguir siendo los leídos. No se
    // reintenta automáticamente una decisión tomada sobre una lectura obsoleta.
    const filas = await this.db
      .update(actividadesProgramadasTable)
      .set(cambios)
      .where(and(
        eq(actividadesProgramadasTable.id, raw.id),
        eq(actividadesProgramadasTable.estado, 'PENDIENTE'),
        eq(columnas.versionPersistida, actividad.versionPersistida),
      ))
      .returning({ id: actividadesProgramadasTable.id });
    if (filas.length === 0) {
      throw new ConflictoActividadProgramadaError();
    }
  }
}
