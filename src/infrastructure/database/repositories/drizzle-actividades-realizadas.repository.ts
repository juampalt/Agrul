import { and, eq, sql } from 'drizzle-orm';
import { ActividadRealizada, ContextoEjecucionProgramada, EjecucionActividadInvalidaError } from '../../../core/domain/entities/actividad-realizada.entity.js';
import { ActividadProgramada } from '../../../core/domain/entities/actividad-programada.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { ActividadesRealizadasRepositoryPort } from '../../../core/ports/actividades-realizadas-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { actividadesProgramadasTable as programadas } from '../schema/actividades-programadas.js';
import { actividadesRealizadasTable as realizadas } from '../schema/actividades-realizadas.js';
import { ciclosProductivosTable as ciclos } from '../schema/ciclos-productivos.js';
import { plantacionesTable as plantaciones } from '../schema/plantaciones.js';
import { usuariosTable } from '../schema/tables.js';

export class DrizzleActividadesRealizadasRepository implements ActividadesRealizadasRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async registrarDesdeProgramada(id: string, responsableId: string, crear: (contexto: ContextoEjecucionProgramada) => ActividadRealizada): Promise<ActividadRealizada> {
    return this.db.transaction(async (tx) => {
      // Mismo orden que el cierre RN-09: tabla antes de ciclo, evitando inversión
      // de bloqueos. El cierre espera hasta confirmar la labor y su transición.
      await tx.execute(sql`LOCK TABLE actividades_programadas IN ROW EXCLUSIVE MODE`);
      const [programada] = await tx.select().from(programadas).where(eq(programadas.id, id)).for('update');
      if (!programada) throw new EntidadNoEncontradaError('ActividadProgramada', id);
      if (programada.estado !== 'PENDIENTE') throw new EjecucionActividadInvalidaError('La actividad ya no está PENDIENTE.');
      const [referencia] = await tx.select({ ciclo: ciclos, loteId: plantaciones.loteId })
        .from(ciclos).innerJoin(plantaciones, eq(ciclos.plantacionId, plantaciones.id))
        .where(eq(ciclos.id, programada.cicloId)).for('share');
      if (!referencia) throw new EntidadNoEncontradaError('CicloProductivo', programada.cicloId);
      const [responsable] = await tx.select({ estado: usuariosTable.estado }).from(usuariosTable)
        .where(eq(usuariosTable.id, responsableId)).for('share');
      if (!responsable) throw new EntidadNoEncontradaError('Usuario', responsableId);
      const ciclo = referencia.ciclo;
      const actividad = crear({
        programada: ActividadProgramada.reconstituir({ ...programada,
          tipoActividadId: programada.tipoActividadId ?? '', fechaProgramada: programada.fechaProgramada ?? '',
          responsableId: programada.responsableId ?? '',
          superficiePrevista: programada.superficiePrevista === null ? null : Number(programada.superficiePrevista),
        }).toJSON(),
        ciclo: { id: ciclo.id, loteId: referencia.loteId, estado: ciclo.estado,
          fechaInicio: ciclo.fechaInicioEfectiva ?? ciclo.fechaInicioPrevista,
          fechaFin: ciclo.fechaFinEfectiva ?? ciclo.fechaFinPrevista },
        responsableActivo: responsable.estado === 'ACTIVO',
      });
      const dto = actividad.toJSON();
      await tx.insert(realizadas).values({ ...dto, superficieTrabajadaHa: dto.superficieTrabajadaHa.toFixed(2),
        duracionHoras: dto.duracionHoras === null ? null : dto.duracionHoras.toFixed(2) });
      const actualizadas = await tx.update(programadas).set({ estado: 'EJECUTADA', actualizadoEn: new Date().toISOString() })
        .where(and(eq(programadas.id, id), eq(programadas.estado, 'PENDIENTE'))).returning({ id: programadas.id });
      if (actualizadas.length !== 1) throw new EjecucionActividadInvalidaError('La programación cambió durante la ejecución.');
      return actividad;
    });
  }
}
