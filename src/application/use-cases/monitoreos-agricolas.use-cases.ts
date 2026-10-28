import { randomUUID } from 'node:crypto';
import { DatosMonitoreo, Monitoreo } from '../../core/domain/entities/monitoreo.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { FiltrosMonitoreos, MonitoreosRepositoryPort } from '../../core/ports/monitoreos-repository.port.js';

export class RegistrarMonitoreoUseCase {
  constructor(private readonly repo: MonitoreosRepositoryPort) {}
  async execute(datos: DatosMonitoreo) {
    return (await this.repo.registrar(datos.cicloId, datos.responsableId,
      contexto => Monitoreo.registrar(randomUUID(), datos, contexto))).toJSON();
  }
}

export class ConsultarMonitoreosUseCase {
  constructor(private readonly repo: MonitoreosRepositoryPort) {}
  async execute(filtros: FiltrosMonitoreos) { return (await this.repo.listar(filtros)).map(m => m.toJSON()); }
  async obtenerPorId(id: string) {
    const monitoreo = await this.repo.buscarPorId(id);
    if (!monitoreo) throw new EntidadNoEncontradaError('Monitoreo', id);
    return monitoreo.toJSON();
  }
}
