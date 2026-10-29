import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { eq, sql } from 'drizzle-orm';
import { ActorInventario, IngresoInsumos, InventarioInvalidoError, MovimientoManual, OperacionInventarioDuplicadaError, validarMovimientoInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { AccesoDenegadoFincaError, EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { InventarioInsumosRepositoryPort } from '../../../core/ports/inventario-insumos-repository.port.js';
import { AgrulTransaction } from '../connection.js';
import { ConsultasInventario, camposMovimiento } from '../inventario-consultas.js';
import { insumosTable as i, partidasInsumoTable as p } from '../schema/insumos.js';
import { movimientosInventarioTable as m } from '../schema/movimientos-inventario.js';
import { fincasTable as f } from '../schema/tables.js';

export class DrizzleInventarioInsumosRepository extends ConsultasInventario implements InventarioInsumosRepositoryPort {
  async ingresar(datos: IngresoInsumos, actor: ActorInventario) {
    validarMovimientoInventario(datos);
    this.autorizar(datos.fincaId, actor);
    return this.transaccion(async tx => {
      const solicitud = { ...datos, responsableId: actor.usuarioId };
      const repetido = await this.repetido(tx, datos.operacionId, solicitud);
      if (repetido) return repetido;
      const [finca] = await tx.select({ id: f.id }).from(f).where(eq(f.id, datos.fincaId));
      if (!finca) throw new EntidadNoEncontradaError('Finca', datos.fincaId);
      const [insumo] = await tx.select().from(i).where(eq(i.id, datos.insumoId)).for('update');
      if (!insumo) throw new EntidadNoEncontradaError('Insumo', datos.insumoId);
      if (insumo.estado !== 'ACTIVO' || insumo.unidadMedida !== datos.unidadMedida) throw new InventarioInvalidoError('Insumo inactivo o unidad incompatible.');
      const partidaId = randomUUID();
      await tx.insert(p).values({ id: partidaId, insumoId: datos.insumoId, fincaId: datos.fincaId,
        fechaIngreso: datos.fechaIngreso, cantidadInicial: datos.cantidad.toFixed(2), cantidadDisponible: '0',
        proveedor: datos.proveedor, fechaVencimiento: datos.fechaVencimiento, unidadMedida: datos.unidadMedida });
      const [movimiento] = await tx.insert(m).values({ id: datos.operacionId, partidaId,
        fincaId: datos.fincaId, insumoId: datos.insumoId, cantidad: datos.cantidad.toFixed(2), unidadMedida: datos.unidadMedida,
        tipoMovimiento: datos.tipoMovimiento, fechaMovimiento: datos.fechaIngreso, motivo: datos.motivo,
        responsableId: actor.usuarioId, solicitud }).returning(camposMovimiento);
      return movimiento;
    });
  }
  async mover(datos: MovimientoManual, actor: ActorInventario) {
    validarMovimientoInventario(datos);
    return this.transaccion(async tx => {
      const [partida] = await tx.select().from(p).where(eq(p.id, datos.partidaId));
      if (!partida) throw new EntidadNoEncontradaError('Partida', datos.partidaId);
      if (partida.fincaId === null) throw new InventarioInvalidoError('La partida histórica carece de finca; requiere regularización explícita.');
      this.autorizar(partida.fincaId, actor);
      const solicitud = { ...datos, responsableId: actor.usuarioId };
      const repetido = await this.repetido(tx, datos.operacionId, solicitud);
      if (repetido) return repetido;
      const [movimiento] = await tx.insert(m).values({ id: datos.operacionId, partidaId: partida.id,
        fincaId: partida.fincaId, insumoId: partida.insumoId, cantidad: datos.cantidad.toFixed(2), unidadMedida: datos.unidadMedida,
        tipoMovimiento: datos.tipoMovimiento, fechaMovimiento: datos.fechaMovimiento, motivo: datos.motivo,
        responsableId: actor.usuarioId, solicitud }).returning(camposMovimiento);
      return movimiento;
    });
  }
  private autorizar(fincaId: string, actor: ActorInventario) {
    if (actor.fincaIds !== undefined && !actor.fincaIds.includes(fincaId)) throw new AccesoDenegadoFincaError(fincaId);
  }
  private async repetido(tx: AgrulTransaction, id: string, solicitud: Record<string, unknown>) {
    // La clave serializa reintentos idénticos incluso antes de crear la partida.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'inventario:' + id},0))`);
    const [existente] = await tx.select().from(m).where(eq(m.id, id));
    if (!existente) return null;
    if (!isDeepStrictEqual(existente.solicitud, solicitud)) throw new OperacionInventarioDuplicadaError();
    const { solicitud: _privada, ...salida } = existente;
    return salida;
  }
  private async transaccion<T>(accion: (tx: AgrulTransaction) => Promise<T>): Promise<T> {
    try { return await this.db.transaction(accion); } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (['23514', '22003', '23503'].includes(String(error.code))) {
          throw new InventarioInvalidoError('Movimiento rechazado: stock insuficiente, cantidad fuera de rango o referencias incompatibles.');
        }
      }
      throw error;
    }
  }
}
