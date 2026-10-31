import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import { ContextoMonitoreo, Monitoreo } from '../../../core/domain/entities/monitoreo.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { actividadesRealizadasTable as realizadas } from '../schema/actividades-realizadas.js';
import { aplicacionesInsumoTable as aplicaciones } from '../schema/insumos.js';
import { tiposActividadTable as tipos } from '../schema/tipos-actividad.js';
import { FiltrosMonitoreos, MonitoreosRepositoryPort, VinculadosMonitoreo } from '../../../core/ports/monitoreos-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { monitoreosTable as monitoreos } from '../schema/monitoreos.js';
import { ciclosProductivosTable as ciclos } from '../schema/ciclos-productivos.js';
import { plantacionesTable as plantaciones } from '../schema/plantaciones.js';
import { usuariosTable } from '../schema/tables.js';
import { alcanceFincasPorLote } from '../alcance-fincas-agricolas.js';

export class DrizzleMonitoreosRepository implements MonitoreosRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async registrar(cicloId: string, responsableId: string, crear: (contexto: ContextoMonitoreo) => Monitoreo) {
    return this.db.transaction(async tx => {
      const [referencia] = await tx.select({ ciclo: ciclos, loteId: plantaciones.loteId })
        .from(ciclos).innerJoin(plantaciones, eq(ciclos.plantacionId, plantaciones.id)).where(eq(ciclos.id, cicloId)).for('share');
      if (!referencia) throw new EntidadNoEncontradaError('CicloProductivo', cicloId);
      const [responsable] = await tx.select({ estado: usuariosTable.estado }).from(usuariosTable)
        .where(eq(usuariosTable.id, responsableId)).for('share');
      if (!responsable) throw new EntidadNoEncontradaError('Usuario', responsableId);
      const c = referencia.ciclo;
      const monitoreo = crear({ ciclo: { id: c.id, loteId: referencia.loteId, estado: c.estado,
        fechaInicio: c.fechaInicioEfectiva ?? c.fechaInicioPrevista, fechaFin: c.fechaFinEfectiva ?? c.fechaFinPrevista },
      responsableActivo: responsable.estado === 'ACTIVO' });
      await tx.insert(monitoreos).values(monitoreo.toJSON());
      return monitoreo;
    });
  }

  async vinculados(id: string): Promise<VinculadosMonitoreo> {
    const labores = await this.db.select({ id: realizadas.id, fechaEjecucion: realizadas.fechaEjecucion, tipoActividadId: realizadas.tipoActividadId,
      tipoActividad: tipos.nombre, responsableId: realizadas.responsableId, superficie: realizadas.superficieTrabajadaHa })
      .from(realizadas).innerJoin(tipos, eq(realizadas.tipoActividadId, tipos.id))
      .where(eq(realizadas.monitoreoId, id)).orderBy(asc(realizadas.fechaEjecucion), asc(realizadas.id));
    const ids = labores.map(l => l.id);
    const apps = ids.length ? await this.db.select({ id: aplicaciones.id, actividadRealizadaId: aplicaciones.actividadRealizadaId,
      superficie: aplicaciones.superficieTratada, metodoAplicacion: aplicaciones.metodoAplicacion, motivoAplicacion: aplicaciones.motivoAplicacion })
      .from(aplicaciones).where(inArray(aplicaciones.actividadRealizadaId, ids)).orderBy(asc(aplicaciones.id)) : [];
    return {
      actividadesRealizadas: labores.map(({ superficie, ...l }) => ({ ...l, superficieTrabajadaHa: superficie === null ? null : Number(superficie) })),
      aplicacionesInsumos: apps.map(({ superficie, ...a }) => ({ ...a, superficieTratada: Number(superficie) })),
    };
  }

  async buscarPorId(id: string) {
    const [fila] = await this.db.select().from(monitoreos).where(eq(monitoreos.id, id));
    return fila ? this.mapear(fila) : null;
  }

  async listar(f: FiltrosMonitoreos) {
    const condiciones = [];
    if (f.cicloId) condiciones.push(eq(monitoreos.cicloId, f.cicloId));
    if (f.loteId) condiciones.push(eq(monitoreos.loteId, f.loteId));
    if (f.responsableId) condiciones.push(eq(monitoreos.responsableId, f.responsableId));
    if (f.etapaFenologica) condiciones.push(eq(monitoreos.etapaFenologica, f.etapaFenologica));
    if (f.estadoGeneralCultivo) condiciones.push(eq(monitoreos.estadoGeneralCultivo, f.estadoGeneralCultivo));
    if (f.tipoObservacion) condiciones.push(eq(monitoreos.tipoObservacion, f.tipoObservacion));
    if (f.conProblema !== undefined) condiciones.push(f.conProblema ? isNotNull(monitoreos.problemaDetectado) : isNull(monitoreos.problemaDetectado));
    if (f.desde) condiciones.push(gte(monitoreos.fechaInspeccion, f.desde));
    if (f.hasta) condiciones.push(lte(monitoreos.fechaInspeccion, f.hasta));
    return (await this.db.select().from(monitoreos).where(and(...condiciones, alcanceFincasPorLote(this.db, monitoreos.loteId, f.fincaIds)))
      .orderBy(desc(monitoreos.fechaInspeccion), desc(monitoreos.id)).limit(f.limit).offset(f.offset)).map(m => this.mapear(m));
  }

  private mapear(fila: typeof monitoreos.$inferSelect) {
    const { creadoEn: _creadoEn, ...props } = fila;
    return Monitoreo.reconstituir(props);
  }
}
