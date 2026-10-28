import { randomUUID } from 'node:crypto';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { DatosPlanificacionCiclo } from '../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { CiclosProductivosRepositoryPort, ConsultarCiclosFiltros } from '../../core/ports/ciclos-productivos-repository.port.js';

export class RegistrarCicloProductivoUseCase {
  constructor(private readonly repo: CiclosProductivosRepositoryPort) {}
  async execute(datos: DatosPlanificacionCiclo) {
    return (await this.repo.registrar({ ...datos, id: randomUUID() })).toPlanificacionJSON();
  }
}
export class ConsultarCiclosProductivosUseCase {
  constructor(private readonly repo: CiclosProductivosRepositoryPort) {}
  async execute(filtros: ConsultarCiclosFiltros) {
    return (await this.repo.consultar(filtros)).map((c) => c.toPlanificacionJSON());
  }
  async obtenerPorId(id: string) {
    const ciclo = await this.repo.buscarPorId(id);
    if (!ciclo) throw new EntidadNoEncontradaError('Ciclo productivo', id);
    return ciclo.toPlanificacionJSON();
  }
}
export class IniciarCicloProductivoUseCase {
  constructor(private readonly repo: CiclosProductivosRepositoryPort) {}
  async execute(id: string, fecha: string) {
    const ciclo = await this.repo.iniciar(id, fecha);
    if (!ciclo) throw new EntidadNoEncontradaError('Ciclo productivo', id);
    return ciclo.toPlanificacionJSON();
  }
}
export class FinalizarCicloProductivoUseCase {
  constructor(private readonly repo: CiclosProductivosRepositoryPort) {}
  async execute(id: string, fecha: string) {
    const ciclo = await this.repo.finalizar(id, fecha);
    if (!ciclo) throw new EntidadNoEncontradaError('Ciclo productivo', id);
    return ciclo.toPlanificacionJSON();
  }
}
