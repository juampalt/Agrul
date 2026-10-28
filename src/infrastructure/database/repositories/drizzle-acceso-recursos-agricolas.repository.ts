import { eq } from 'drizzle-orm';
import { AccesoRecursosAgricolasPort, RecursoAgricola } from '../../../core/ports/acceso-recursos-agricolas.port.js';
import { AgrulDatabase } from '../connection.js';
import { ciclosProductivosTable as ciclos, lotesTable as lotes, plantacionesTable as plantaciones } from '../schema/tables.js';
import { actividadesProgramadasTable as programadas } from '../schema/actividades-programadas.js';
import { actividadesRealizadasTable as realizadas } from '../schema/actividades-realizadas.js';
import { monitoreosTable as monitoreos } from '../schema/monitoreos.js';

export class DrizzleAccesoRecursosAgricolasRepository implements AccesoRecursosAgricolasPort {
  constructor(private readonly db: AgrulDatabase) {}

  async buscarFinca(tipo: RecursoAgricola, id: string) {
    // LEFT JOIN permite negar por defecto un recurso sin finca; no reconstruye
    // entidades históricas ni depende de campos agregados por la migración 0015.
    if (tipo === 'lote') {
      return (await this.db.select({ fincaId: lotes.fincaId }).from(lotes).where(eq(lotes.id, id)))[0] ?? null;
    }
    if (tipo === 'ciclo') {
      return (await this.db.select({ fincaId: lotes.fincaId }).from(ciclos)
        .leftJoin(plantaciones, eq(ciclos.plantacionId, plantaciones.id)).leftJoin(lotes, eq(plantaciones.loteId, lotes.id))
        .where(eq(ciclos.id, id)))[0] ?? null;
    }
    if (tipo === 'programada') {
      return (await this.db.select({ fincaId: lotes.fincaId }).from(programadas)
        .leftJoin(ciclos, eq(programadas.cicloId, ciclos.id)).leftJoin(plantaciones, eq(ciclos.plantacionId, plantaciones.id))
        .leftJoin(lotes, eq(plantaciones.loteId, lotes.id)).where(eq(programadas.id, id)))[0] ?? null;
    }
    const tabla = tipo === 'realizada' ? realizadas : monitoreos;
    return (await this.db.select({ fincaId: lotes.fincaId }).from(tabla)
      .leftJoin(lotes, eq(tabla.loteId, lotes.id)).where(eq(tabla.id, id)))[0] ?? null;
  }
}
