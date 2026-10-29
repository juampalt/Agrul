import { RegistrarAplicacionInsumos, validarAplicacionInsumos } from '../../core/domain/entities/aplicacion-insumos.js';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { AplicacionesInsumosRepositoryPort, FiltrosAplicacionesInsumos } from '../../core/ports/aplicaciones-insumos-repository.port.js';

export class RegistrarAplicacionInsumosUseCase {
  constructor(private readonly repo: AplicacionesInsumosRepositoryPort) {}
  execute(datos: RegistrarAplicacionInsumos, actor: ActorInventario) {
    validarAplicacionInsumos(datos); return this.repo.registrar(datos, actor);
  }
}
export class ConsultarAplicacionesInsumosUseCase {
  constructor(private readonly repo: AplicacionesInsumosRepositoryPort) {}
  listar(filtros: FiltrosAplicacionesInsumos, actor: ActorInventario) { return this.repo.listar(filtros, actor); }
  async obtener(id: string, actor: ActorInventario) {
    const resultado = await this.repo.obtener(id, actor);
    if (!resultado) throw new EntidadNoEncontradaError('Aplicación', id);
    return resultado;
  }
}
