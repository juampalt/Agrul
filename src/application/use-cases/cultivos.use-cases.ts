import { randomUUID } from 'node:crypto';
import { Cultivo, DatosCultivo } from '../../core/domain/entities/cultivo.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { CultivosRepositoryPort, FiltrosCultivos } from '../../core/ports/cultivos-repository.port.js';

export class RegistrarCultivoUseCase {
  constructor(private readonly repo: CultivosRepositoryPort) {}
  async execute(datos: DatosCultivo) {
    const cultivo = Cultivo.crear({ ...datos, id: randomUUID() });
    await this.repo.guardar(cultivo);
    return cultivo.toJSON();
  }
}

export class ConsultarCultivosUseCase {
  constructor(private readonly repo: CultivosRepositoryPort) {}
  async execute(filtros: FiltrosCultivos) {
    return (await this.repo.listar(filtros)).map((cultivo) => cultivo.toJSON());
  }
  async obtenerPorId(id: string) {
    const cultivo = await this.repo.buscarPorId(id);
    if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', id);
    return cultivo.toJSON();
  }
}

export class ModificarCultivoUseCase {
  constructor(private readonly repo: CultivosRepositoryPort) {}
  async execute(id: string, datos: DatosCultivo) {
    const validado = Cultivo.crear({ ...datos, id }).toJSON();
    const cultivo = await this.repo.modificar(id, validado);
    if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', id);
    return cultivo.toJSON();
  }
}

export class DesactivarCultivoUseCase {
  constructor(private readonly repo: CultivosRepositoryPort) {}
  async execute(id: string) {
    const cultivo = await this.repo.desactivar(id);
    if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', id);
    return cultivo.toJSON();
  }
}
