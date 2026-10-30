import { and, asc, eq, getTableColumns, gte, lte, sql } from 'drizzle-orm';
import { ActividadProgramada, ActividadProgramadaInvalidaError, validarSuperficiePrevista } from '../../../core/domain/entities/actividad-programada.entity.js';
import { ConflictoActividadProgramadaError, EstadoActividadInvalidoError } from '../../../core/domain/entities/actividad-programada.entity.js';
import {
  ActividadesProgramadasRepositoryPort,
  FiltrosActividadesProgramadas,
} from '../../../core/ports/actividades-programadas-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { actividadesProgramadasTable } from '../schema/actividades-programadas.js';
import { ciclosProductivosTable, lotesTable, plantacionesTable } from '../schema/tables.js';
import { tiposActividadCultivosTable } from '../schema/tipos-actividad.js';
import { AgrulTransaction } from '../connection.js';
import { alcanceFincasPorCiclo } from '../alcance-fincas-agricolas.js';

// xmin cambia con cada versión de fila confirmada, incluso en escrituras SQL
// ajenas al repositorio. Solo se usa como token efímero dentro de una solicitud.
const columnas = { ...getTableColumns(actividadesProgramadasTable),
  versionPersistida: sql<string>`${actividadesProgramadasTable}.xmin::text` };

export class DrizzleActividadesProgramadasRepository implements ActividadesProgramadasRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  /** CU26/CU28: ciclo activo, plantación activa, lote habilitado, tipo aplicable y superficie dentro de la plantación. */
  private async validarContexto(tx: AgrulTransaction, cicloId: string, tipoActividadId: string | null, superficiePrevista: number | null) {
    const [ref] = await tx.select({ ciclo: ciclosProductivosTable.estado, plantacion: plantacionesTable.estado,
      lote: lotesTable.estadoTerritorial, cultivoId: plantacionesTable.cultivoId, superficie: plantacionesTable.superficieHa })
      .from(ciclosProductivosTable)
      .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
      .innerJoin(lotesTable, eq(plantacionesTable.loteId, lotesTable.id))
      .where(eq(ciclosProductivosTable.id, cicloId)).for('share', { of: [ciclosProductivosTable, plantacionesTable, lotesTable] });
    if (!ref) return;
    if (ref.ciclo !== 'ACTIVO' || ref.plantacion !== 'ACTIVA' || ref.lote === 'INACTIVO') {
      throw new ActividadProgramadaInvalidaError('Solo pueden programarse actividades en ciclos activos de plantaciones activas y lotes habilitados.');
    }
    if (superficiePrevista !== null && Math.round(superficiePrevista * 100) > Math.round(Number(ref.superficie) * 100)) {
      throw new ActividadProgramadaInvalidaError('La superficie prevista no puede superar la superficie de la plantación.');
    }
    if (tipoActividadId) {
      const [aplicable] = await tx.select({ cultivoId: tiposActividadCultivosTable.cultivoId }).from(tiposActividadCultivosTable)
        .where(and(eq(tiposActividadCultivosTable.tipoActividadId, tipoActividadId), eq(tiposActividadCultivosTable.cultivoId, ref.cultivoId)));
      if (!aplicable) throw new ActividadProgramadaInvalidaError('El tipo de actividad no es aplicable al cultivo del ciclo.');
    }
  }

  async guardar(actividad: ActividadProgramada): Promise<void> {
    const raw = actividad.toJSON();
    validarSuperficiePrevista(raw.superficiePrevista);
    await this.db.transaction(async (tx) => {
      await this.validarContexto(tx, raw.cicloId, raw.tipoActividadId, raw.superficiePrevista);
      await tx.insert(actividadesProgramadasTable).values({
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
    if (filtros.loteId) {
      condiciones.push(sql`${actividadesProgramadasTable.cicloId} IN (SELECT c.id FROM ciclos_productivos c JOIN plantaciones p ON p.id = c.plantacion_id WHERE p.lote_id = ${filtros.loteId})`);
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
      : { fechaProgramada: raw.fechaProgramada, responsableId: raw.responsableId,
          superficiePrevista: raw.superficiePrevista !== null ? raw.superficiePrevista.toFixed(2) : null,
          descripcion: raw.descripcion, actualizadoEn: raw.actualizadoEn };
    // Compare-and-swap: estado y versión deben seguir siendo los leídos. No se
    // reintenta automáticamente una decisión tomada sobre una lectura obsoleta.
    const filas = await this.db.transaction(async (tx) => {
      // La cancelación sigue permitida aunque el contexto cambie; reprogramar exige contexto vigente.
      if (raw.estado === 'PENDIENTE') await this.validarContexto(tx, raw.cicloId, null, raw.superficiePrevista);
      return tx
        .update(actividadesProgramadasTable)
        .set(cambios)
        .where(and(
          eq(actividadesProgramadasTable.id, raw.id),
          eq(actividadesProgramadasTable.estado, 'PENDIENTE'),
          eq(columnas.versionPersistida, actividad.versionPersistida!),
        ))
        .returning({ id: actividadesProgramadasTable.id });
    });
    if (filas.length === 0) {
      throw new ConflictoActividadProgramadaError();
    }
  }
}
