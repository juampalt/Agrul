import { CorregirAplicacionInsumos, validarCorreccionAplicacion } from '../../core/domain/entities/correccion-aplicacion-insumos.js';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { CorreccionesAplicacionesRepositoryPort } from '../../core/ports/correcciones-aplicaciones-repository.port.js';

export class CorregirAplicacionInsumosUseCase {
  constructor(private readonly repo: CorreccionesAplicacionesRepositoryPort) {}
  execute(id: string, datos: CorregirAplicacionInsumos, actor: ActorInventario) {
    validarCorreccionAplicacion(datos); return this.repo.corregir(id, datos, actor);
  }
}
export class ConsultarCorreccionesAplicacionesUseCase {
  constructor(private readonly repo: CorreccionesAplicacionesRepositoryPort) {}
  execute(id: string, actor: ActorInventario) { return this.repo.listar(id, actor); }
}
