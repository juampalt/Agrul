import { randomUUID } from 'node:crypto';
import { TipoActividad, DatosTipoActividad } from '../../core/domain/entities/tipo-actividad-canonico.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { TiposActividadRepositoryPort, FiltrosTiposActividad } from '../../core/ports/tipos-actividad-repository.port.js';
import { CultivosRepositoryPort } from '../../core/ports/cultivos-repository.port.js';

export class RegistrarTipoActividadUseCase {
  constructor(
    private readonly repo: TiposActividadRepositoryPort,
    private readonly cultivosRepo?: CultivosRepositoryPort,
  ) {}

  async execute(datos: DatosTipoActividad) {
    if (datos.cultivoIds && datos.cultivoIds.length > 0 && this.cultivosRepo) {
      for (const cultivoId of datos.cultivoIds) {
        const cultivo = await this.cultivosRepo.buscarPorId(cultivoId);
        if (!cultivo) {
          throw new EntidadNoEncontradaError('Cultivo', cultivoId);
        }
      }
    }
    const tipo = TipoActividad.crear({ ...datos, id: randomUUID() });
    await this.repo.guardar(tipo);
    return tipo.toJSON();
  }
}

export class ConsultarTiposActividadUseCase {
  constructor(private readonly repo: TiposActividadRepositoryPort) {}

  async execute(filtros: FiltrosTiposActividad) {
    return (await this.repo.listar(filtros)).map((tipo) => tipo.toJSON());
  }

  async obtenerPorId(id: string) {
    const tipo = await this.repo.buscarPorId(id);
    if (!tipo) throw new EntidadNoEncontradaError('TipoActividad', id);
    return tipo.toJSON();
  }
}

export class ModificarTipoActividadUseCase {
  constructor(
    private readonly repo: TiposActividadRepositoryPort,
    private readonly cultivosRepo?: CultivosRepositoryPort,
  ) {}

  async execute(id: string, datos: DatosTipoActividad) {
    if (datos.cultivoIds && datos.cultivoIds.length > 0 && this.cultivosRepo) {
      for (const cultivoId of datos.cultivoIds) {
        const cultivo = await this.cultivosRepo.buscarPorId(cultivoId);
        if (!cultivo) {
          throw new EntidadNoEncontradaError('Cultivo', cultivoId);
        }
      }
    }
    const validado = TipoActividad.crear({ ...datos, id }).toJSON();
    const modificado = await this.repo.modificar(id, validado);
    if (!modificado) throw new EntidadNoEncontradaError('TipoActividad', id);
    return modificado.toJSON();
  }
}

export class DesactivarTipoActividadUseCase {
  constructor(private readonly repo: TiposActividadRepositoryPort) {}

  async execute(id: string) {
    const desactivado = await this.repo.desactivar(id);
    if (!desactivado) throw new EntidadNoEncontradaError('TipoActividad', id);
    return desactivado.toJSON();
  }
}
