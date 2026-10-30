import { ActorCosechas, RegistrarCosecha, validarPesajeCosecha } from '../../core/domain/entities/cosecha-registrada.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { CosechasRegistroRepositoryPort, FiltrosCosechasRegistro } from '../../core/ports/cosechas-registro-repository.port.js';

export class RegistrarPesajeCosechaUseCase {
  constructor(private readonly repo: CosechasRegistroRepositoryPort) {}
  execute(datos: RegistrarCosecha, actor: ActorCosechas) { return this.repo.registrar(validarPesajeCosecha(datos), actor); }
}
export class ConsultarCosechasRegistroUseCase {
  constructor(private readonly repo: CosechasRegistroRepositoryPort) {}
  listar(filtros: FiltrosCosechasRegistro, actor: ActorCosechas) { return this.repo.listar(filtros, actor); }
  async obtener(id: string, actor: ActorCosechas) {
    const cosecha = await this.repo.buscarPorId(id, actor);
    if (!cosecha) throw new EntidadNoEncontradaError('Cosecha', id);
    return cosecha;
  }
}
