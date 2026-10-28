import { and, desc, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { ActividadRealizada, ContextoEjecucionDirecta, ContextoEjecucionProgramada, EjecucionActividadInvalidaError } from '../../../core/domain/entities/actividad-realizada.entity.js';
import { ActividadProgramada } from '../../../core/domain/entities/actividad-programada.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { ActividadesRealizadasGestionPort, FiltrosActividadesRealizadas } from '../../../core/ports/actividades-realizadas-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { actividadesProgramadasTable as programadas } from '../schema/actividades-programadas.js';
import { actividadesRealizadasTable as realizadas } from '../schema/actividades-realizadas.js';
import { ciclosProductivosTable as ciclos } from '../schema/ciclos-productivos.js';
import { plantacionesTable as plantaciones } from '../schema/plantaciones.js';
import { usuariosTable } from '../schema/tables.js';
import { tiposActividadTable } from '../schema/tipos-actividad.js';
import { alcanceFincasPorLote } from '../alcance-fincas-agricolas.js';

export class DrizzleActividadesRealizadasRepository implements ActividadesRealizadasGestionPort {
  constructor(private readonly db: AgrulDatabase) {}

  async registrarDesdeProgramada(id: string, responsableId: string, crear: (contexto: ContextoEjecucionProgramada) => ActividadRealizada): Promise<ActividadRealizada> {
    return this.db.transaction(async (tx) => {
      // Mismo orden que el cierre RN-09: tabla antes de ciclo, evitando inversión
      // de bloqueos. El cierre espera hasta confirmar la labor y su transición.
      await tx.execute(sql`LOCK TABLE actividades_programadas IN ROW EXCLUSIVE MODE`);
      const [programada] = await tx.select().from(programadas).where(eq(programadas.id, id)).for('update');
      if (!programada) throw new EntidadNoEncontradaError('ActividadProgramada', id);
      if (programada.estado !== 'PENDIENTE') throw new EjecucionActividadInvalidaError('La actividad ya no está PENDIENTE.');
      const contexto = await this.cargarContexto(tx, programada.cicloId, responsableId);
      const actividad = crear({
        programada: ActividadProgramada.reconstituir({ ...programada,
          tipoActividadId: programada.tipoActividadId ?? '', fechaProgramada: programada.fechaProgramada ?? '',
          responsableId: programada.responsableId ?? '',
          superficiePrevista: programada.superficiePrevista === null ? null : Number(programada.superficiePrevista),
        }).toJSON(),
        ...contexto,
      });
      await this.insertar(tx, actividad);
      const actualizadas = await tx.update(programadas).set({ estado: 'EJECUTADA', actualizadoEn: new Date().toISOString() })
        .where(and(eq(programadas.id, id), eq(programadas.estado, 'PENDIENTE'))).returning({ id: programadas.id });
      if (actualizadas.length !== 1) throw new EjecucionActividadInvalidaError('La programación cambió durante la ejecución.');
      return actividad;
    });
  }

  async registrarDirecta(cicloId: string, tipoId: string, responsableId: string, crear: (contexto: ContextoEjecucionDirecta) => ActividadRealizada) {
    return this.db.transaction(async (tx) => {
      const contexto = await this.cargarContexto(tx, cicloId, responsableId);
      const [tipo] = await tx.select({ estado: tiposActividadTable.estado }).from(tiposActividadTable)
        .where(eq(tiposActividadTable.id, tipoId)).for('share');
      if (!tipo) throw new EntidadNoEncontradaError('TipoActividad', tipoId);
      const actividad = crear({ ...contexto, tipoActivo: tipo.estado === 'ACTIVA' });
      await this.insertar(tx, actividad);
      return actividad;
    });
  }

  async buscarPorId(id: string) {
    const [fila] = await this.db.select().from(realizadas).where(eq(realizadas.id, id));
    return fila ? this.mapear(fila) : null;
  }

  async listar(filtros: FiltrosActividadesRealizadas) {
    const condiciones = [];
    if (filtros.cicloId) condiciones.push(eq(realizadas.cicloId, filtros.cicloId));
    if (filtros.loteId) condiciones.push(eq(realizadas.loteId, filtros.loteId));
    if (filtros.tipoActividadId) condiciones.push(eq(realizadas.tipoActividadId, filtros.tipoActividadId));
    if (filtros.responsableId) condiciones.push(eq(realizadas.responsableId, filtros.responsableId));
    if (filtros.origen) condiciones.push(filtros.origen === 'NO_PROGRAMADA' ? isNull(realizadas.actividadProgramadaId) : isNotNull(realizadas.actividadProgramadaId));
    if (filtros.desde) condiciones.push(gte(realizadas.fechaEjecucion, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(realizadas.fechaEjecucion, filtros.hasta));
    return (await this.db.select().from(realizadas).where(and(...condiciones, alcanceFincasPorLote(this.db, realizadas.loteId, filtros.fincaIds)))
      .orderBy(desc(realizadas.fechaEjecucion), desc(realizadas.id)).limit(filtros.limit).offset(filtros.offset)).map(f => this.mapear(f));
  }

  private mapear(fila: typeof realizadas.$inferSelect) {
    const { creadoEn: _creadoEn, ...props } = fila;
    return ActividadRealizada.reconstituir({ ...props, superficieTrabajadaHa: Number(fila.superficieTrabajadaHa),
      duracionHoras: fila.duracionHoras === null ? null : Number(fila.duracionHoras) });
  }

  private async insertar(tx: AgrulTransaction, actividad: ActividadRealizada) {
    const dto = actividad.toJSON();
    await tx.insert(realizadas).values({ ...dto, superficieTrabajadaHa: dto.superficieTrabajadaHa.toFixed(2),
      duracionHoras: dto.duracionHoras === null ? null : dto.duracionHoras.toFixed(2) });
  }

  private async cargarContexto(tx: AgrulTransaction, cicloId: string, responsableId: string): Promise<Omit<ContextoEjecucionProgramada, 'programada'>> {
    const [referencia] = await tx.select({ ciclo: ciclos, loteId: plantaciones.loteId })
      .from(ciclos).innerJoin(plantaciones, eq(ciclos.plantacionId, plantaciones.id)).where(eq(ciclos.id, cicloId)).for('share');
    if (!referencia) throw new EntidadNoEncontradaError('CicloProductivo', cicloId);
    const [responsable] = await tx.select({ estado: usuariosTable.estado }).from(usuariosTable)
      .where(eq(usuariosTable.id, responsableId)).for('share');
    if (!responsable) throw new EntidadNoEncontradaError('Usuario', responsableId);
    const ciclo = referencia.ciclo;
    return { ciclo: { id: ciclo.id, loteId: referencia.loteId, estado: ciclo.estado,
      fechaInicio: ciclo.fechaInicioEfectiva ?? ciclo.fechaInicioPrevista, fechaFin: ciclo.fechaFinEfectiva ?? ciclo.fechaFinPrevista },
    responsableActivo: responsable.estado === 'ACTIVO' };
  }
}
