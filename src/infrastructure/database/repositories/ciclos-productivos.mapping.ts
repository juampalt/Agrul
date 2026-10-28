import { eq } from 'drizzle-orm';
import { CicloProductivo } from '../../../core/domain/entities/ciclo-productivo.entity.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { ciclosProductivosTable, cultivosTable, plantacionesTable, variedadesTable } from '../schema/tables.js';

export function consultaCiclos(db: AgrulDatabase | AgrulTransaction) {
  return db.select({ ciclo: ciclosProductivosTable, plantacion: plantacionesTable,
    cultivo: cultivosTable.nombre, variedad: variedadesTable.nombre }).from(ciclosProductivosTable)
    .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
    .innerJoin(cultivosTable, eq(plantacionesTable.cultivoId, cultivosTable.id))
    .innerJoin(variedadesTable, eq(plantacionesTable.variedadId, variedadesTable.id));
}

export function mapearCiclo(fila: Awaited<ReturnType<typeof consultaCiclos>>[number]): CicloProductivo {
  const { ciclo: c, plantacion: p } = fila;
  return CicloProductivo.reconstituir({
    id: c.id, codigoCiclo: c.nombreCodigo, loteId: p.loteId, cultivo: fila.cultivo, variedad: fila.variedad,
    estado: c.estado, superficieCultivadaHa: Number(p.superficieHa), fechaInicio: c.fechaInicioEfectiva ?? c.fechaInicioPrevista,
    fechaFin: c.fechaFinEfectiva, plantasPlantadas: p.cantidadInicialPlantas, plantasVivas: null, plantasRepuestas: null,
    creadoEn: c.creadoEn, actualizadoEn: c.actualizadoEn,
    planificacion: { plantacionId: c.plantacionId, nombreCodigo: c.nombreCodigo, fechaInicioPrevista: c.fechaInicioPrevista,
      fechaFinPrevista: c.fechaFinPrevista, fechaInicioEfectiva: c.fechaInicioEfectiva, fechaFinEfectiva: c.fechaFinEfectiva,
      responsableSeguimientoId: c.responsableSeguimientoId, observaciones: c.observaciones },
  });
}
