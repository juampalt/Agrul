import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { CicloProductivoInvalidoError } from '../../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { Plantacion } from '../../../core/domain/entities/plantacion.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { FiltrosPlantaciones, PlantacionesRepositoryPort } from '../../../core/ports/plantaciones-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { ciclosProductivosTable, cultivosTable, lotesTable, plantacionesTable, variedadesTable } from '../schema/tables.js';

export class DrizzlePlantacionesRepository implements PlantacionesRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(plantacion: Plantacion): Promise<void> {
    const datos = plantacion.toJSON();
    await this.db.transaction(async (tx) => {
      // El lote serializa las altas concurrentes y sus cambios de superficie territorial.
      const [lote] = await tx.select().from(lotesTable).where(eq(lotesTable.id, datos.loteId)).for('update');
      if (!lote) throw new EntidadNoEncontradaError('Lote', datos.loteId);
      const [cultivo] = await tx.select().from(cultivosTable).where(eq(cultivosTable.id, datos.cultivoId)).for('share');
      if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', datos.cultivoId);
      const [variedad] = await tx.select().from(variedadesTable).where(eq(variedadesTable.id, datos.variedadId)).for('share');
      if (!variedad) throw new EntidadNoEncontradaError('Variedad', datos.variedadId);
      const [ocupacion] = await tx.select({ total: sql<string>`coalesce(sum(${plantacionesTable.superficieHa}), 0)` })
        .from(plantacionesTable).where(and(eq(plantacionesTable.loteId, datos.loteId), eq(plantacionesTable.estado, 'ACTIVA')));
      plantacion.validarAsignacion({
        loteActivo: lote.estadoTerritorial !== 'INACTIVO' && lote.fincaId !== null,
        superficieLoteHa: Number(lote.superficieHa ?? 0), superficieOcupadaHa: Number(ocupacion?.total ?? 0),
        cultivoActivo: cultivo.estado === 'ACTIVO', variedadActiva: variedad.estado === 'ACTIVO', cultivoDeVariedadId: variedad.cultivoId,
      });
      await tx.insert(plantacionesTable).values({ ...datos, superficieHa: datos.superficieHa.toFixed(2) });
    });
  }

  async buscarPorId(id: string): Promise<Plantacion | null> {
    const [fila] = await this.db.select().from(plantacionesTable).where(eq(plantacionesTable.id, id));
    return fila ? this.mapear(fila) : null;
  }

  async listar(filtros: FiltrosPlantaciones): Promise<Plantacion[]> {
    const condiciones = [];
    if (filtros.loteId) condiciones.push(eq(plantacionesTable.loteId, filtros.loteId));
    if (filtros.cultivoId) condiciones.push(eq(plantacionesTable.cultivoId, filtros.cultivoId));
    if (filtros.variedadId) condiciones.push(eq(plantacionesTable.variedadId, filtros.variedadId));
    if (filtros.estado) condiciones.push(eq(plantacionesTable.estado, filtros.estado));
    return (await this.db.select().from(plantacionesTable).where(and(...condiciones))
      .orderBy(asc(plantacionesTable.fechaPlantacion), asc(plantacionesTable.id))
      .limit(filtros.limit).offset(filtros.offset)).map((fila) => this.mapear(fila));
  }

  async finalizar(id: string, fecha: string): Promise<Plantacion | null> {
    return this.db.transaction(async (tx) => {
      const [fila] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, id)).for('update');
      if (!fila) return null;
      const [abierto] = await tx.select({ id: ciclosProductivosTable.id }).from(ciclosProductivosTable)
        .where(and(eq(ciclosProductivosTable.plantacionId, id), ne(ciclosProductivosTable.estado, 'FINALIZADO'))).limit(1);
      if (abierto) throw new CicloProductivoInvalidoError('No se puede finalizar una plantación con ciclos sin finalizar.');
      const [historial] = await tx.select({ ultimaFecha: sql<string | null>`max(${ciclosProductivosTable.fechaFinEfectiva})` })
        .from(ciclosProductivosTable).where(eq(ciclosProductivosTable.plantacionId, id));
      if (historial?.ultimaFecha && fecha < historial.ultimaFecha) {
        throw new CicloProductivoInvalidoError('La finalización de la plantación no puede preceder al cierre de sus ciclos.');
      }
      const finalizada = this.mapear(fila).finalizar(fecha);
      await tx.update(plantacionesTable).set({ estado: 'FINALIZADA', fechaFinalizacion: fecha }).where(eq(plantacionesTable.id, id));
      return finalizada;
    });
  }

  private mapear(fila: typeof plantacionesTable.$inferSelect): Plantacion {
    return Plantacion.reconstituir({ ...fila, superficieHa: Number(fila.superficieHa) });
  }
}
