import { ActorInventario, IngresoInsumos, MovimientoManual, validarMovimientoInventario } from '../../core/domain/entities/inventario-insumos.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { FiltrosInventario, InventarioInsumosRepositoryPort } from '../../core/ports/inventario-insumos-repository.port.js';

export class RegistrarIngresoInsumosUseCase {
  constructor(private readonly repo: InventarioInsumosRepositoryPort) {}
  execute(datos: IngresoInsumos, actor: ActorInventario) {
    validarMovimientoInventario(datos); return this.repo.ingresar(datos, actor);
  }
}
export class RegistrarMovimientoInventarioUseCase {
  constructor(private readonly repo: InventarioInsumosRepositoryPort) {}
  execute(datos: MovimientoManual, actor: ActorInventario) {
    validarMovimientoInventario(datos); return this.repo.mover(datos, actor);
  }
}
export class ConsultarInventarioUseCase {
  constructor(private readonly repo: InventarioInsumosRepositoryPort) {}
  partidas(filtros: FiltrosInventario, actor: ActorInventario) { return this.repo.partidas(filtros, actor); }
  movimientos(filtros: FiltrosInventario, actor: ActorInventario) { return this.repo.movimientos(filtros, actor); }
  existencias(filtros: FiltrosInventario, actor: ActorInventario) { return this.repo.existencias(filtros, actor); }
  alertas(filtros: FiltrosInventario, actor: ActorInventario) { return this.repo.existencias(filtros, actor, true); }
  async partida(id: string, actor: ActorInventario) {
    const resultado = await this.repo.partida(id, actor);
    if (!resultado) throw new EntidadNoEncontradaError('Partida', id);
    return resultado;
  }
  async movimiento(id: string, actor: ActorInventario) {
    const resultado = await this.repo.movimiento(id, actor);
    if (!resultado) throw new EntidadNoEncontradaError('Movimiento', id);
    return resultado;
  }
}
