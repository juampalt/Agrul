import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { ContextoMonitoreo, Monitoreo } from '../../../core/domain/entities/monitoreo.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { FiltrosMonitoreos, MonitoreosRepositoryPort } from '../../../core/ports/monitoreos-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { monitoreosTable as monitoreos } from '../schema/monitoreos.js';
import { ciclosProductivosTable as ciclos } from '../schema/ciclos-productivos.js';
import { plantacionesTable as plantaciones } from '../schema/plantaciones.js';
import { usuariosTable } from '../schema/tables.js';

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
    if (f.desde) condiciones.push(gte(monitoreos.fechaInspeccion, f.desde));
    if (f.hasta) condiciones.push(lte(monitoreos.fechaInspeccion, f.hasta));
    return (await this.db.select().from(monitoreos).where(and(...condiciones))
      .orderBy(desc(monitoreos.fechaInspeccion), desc(monitoreos.id)).limit(f.limit).offset(f.offset)).map(m => this.mapear(m));
  }

  private mapear(fila: typeof monitoreos.$inferSelect) {
    const { creadoEn: _creadoEn, ...props } = fila;
    return Monitoreo.reconstituir(props);
  }
}
