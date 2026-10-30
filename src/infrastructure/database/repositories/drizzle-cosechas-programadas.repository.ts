import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  ConflictoProgramacionCosechaError, DatosProgramacionCosecha, JornadaCosecha,
  ProgramacionCosechaInvalidaError, validarProgramacionCosecha,
} from '../../../core/domain/entities/cosecha-programada.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { CosechasProgramadasRepositoryPort, FiltrosJornadasCosecha } from '../../../core/ports/cosechas-programadas-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { alcanceFincasPorCiclo } from '../alcance-fincas-agricolas.js';
import { cosechasProgramadasTable as jornadas, historialJornadasCosechaTable as historial } from '../schema/cosechas-programadas.js';

function reconstruir(fila: typeof jornadas.$inferSelect): JornadaCosecha {
  return { ...fila, cantidadEstimadaKg: Number(fila.cantidadEstimadaKg) };
}
export class DrizzleCosechasProgramadasRepository implements CosechasProgramadasRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async programar(id: string, datos: DatosProgramacionCosecha, actorId: string): Promise<JornadaCosecha> {
    const validos = validarProgramacionCosecha(datos);
    return this.conErrores(() => this.db.transaction(async tx => {
      const [creada] = await tx.insert(jornadas).values({
        ...validos, id, cantidadEstimadaKg: validos.cantidadEstimadaKg.toFixed(2), actualizadoPor: actorId,
      }).onConflictDoNothing({ target: jornadas.id }).returning();
      if (creada) return reconstruir(creada);
      // La clave identifica la solicitud original, incluso si luego fue
      // reprogramada. No genera otra jornada ni otro evento de auditoría.
      const [original] = await tx.select().from(historial).where(and(eq(historial.jornadaId, id), eq(historial.operacion, 'PROGRAMACION')));
      const previo = original?.nuevo;
      if (!previo || original.actorId !== actorId || previo.ciclo_id !== validos.cicloId ||
          previo.fecha_prevista !== validos.fechaPrevista || previo.responsable_id !== validos.responsableId ||
          previo.sector !== validos.sector || Number(previo.cantidad_estimada_kg) !== validos.cantidadEstimadaKg) {
        throw new ConflictoProgramacionCosechaError();
      }
      const [actual] = await tx.select().from(jornadas).where(eq(jornadas.id, id));
      return reconstruir(actual);
    }));
  }
  async buscarPorId(id: string) {
    const [fila] = await this.db.select().from(jornadas).where(eq(jornadas.id, id));
    return fila ? reconstruir(fila) : null;
  }
  async listar(filtros: FiltrosJornadasCosecha) {
    const condiciones = [alcanceFincasPorCiclo(this.db, jornadas.cicloId, filtros.fincaIds)];
    if (filtros.cicloId) condiciones.push(eq(jornadas.cicloId, filtros.cicloId));
    if (filtros.responsableId) condiciones.push(eq(jornadas.responsableId, filtros.responsableId));
    if (filtros.estado) condiciones.push(eq(jornadas.estado, filtros.estado));
    if (filtros.desde) condiciones.push(gte(jornadas.fechaPrevista, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(jornadas.fechaPrevista, filtros.hasta));
    const filas = await this.db.select().from(jornadas).where(and(...condiciones))
      .orderBy(asc(jornadas.fechaPrevista), asc(jornadas.id)).limit(filtros.limit).offset(filtros.offset);
    return filas.map(reconstruir);
  }
  async actualizar(jornada: JornadaCosecha, version: number, actorId: string) {
    if (jornada.estado !== 'PENDIENTE' && jornada.estado !== 'CANCELADA') {
      throw new ProgramacionCosechaInvalidaError('La ejecución requiere registrar una cosecha real.');
    }
    validarProgramacionCosecha(jornada);
    return this.conErrores(async () => {
      const cambios = jornada.estado === 'CANCELADA'
        ? { estado: jornada.estado, motivoCancelacion: jornada.motivoCancelacion, actualizadoPor: actorId }
        : { fechaPrevista: jornada.fechaPrevista, responsableId: jornada.responsableId, actualizadoPor: actorId };
      // La versión viaja con la intención del cliente. También detecta dos
      // reprogramaciones concurrentes cuyo estado seguiría siendo PENDIENTE.
      const [fila] = await this.db.update(jornadas).set(cambios)
        .where(and(eq(jornadas.id, jornada.id), eq(jornadas.estado, 'PENDIENTE'), eq(jornadas.version, version))).returning();
      if (!fila) throw new ConflictoProgramacionCosechaError();
      return reconstruir(fila);
    });
  }
  historial(id: string, limit: number, offset: number) {
    // now() refleja el inicio de la transacción y puede preceder a una versión
    // anterior. La revisión asignada bajo bloqueo conserva el orden causal.
    return this.db.select().from(historial).where(eq(historial.jornadaId, id))
      .orderBy(sql`(${historial.nuevo}->>'version')::integer`, asc(historial.id)).limit(limit).offset(offset);
  }
  private async conErrores<T>(accion: () => Promise<T>): Promise<T> {
    try { return await accion(); } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (error.code === '23503') throw new EntidadNoEncontradaError('Referencia de jornada', 'ciclo o usuario');
        if (error.code === '23514') throw new ProgramacionCosechaInvalidaError('Ciclo finalizado, usuario inactivo o transición de jornada inválida.');
        if (error.code === '40001' || error.code === '40P01') throw new ConflictoProgramacionCosechaError();
      }
      throw error;
    }
  }
}
