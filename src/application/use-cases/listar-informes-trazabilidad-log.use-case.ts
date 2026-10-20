import {
  InformesTrazabilidadRepositoryPort,
  FiltrosListarInformesLog,
} from '../../core/ports/informes-trazabilidad-repository.port.js';
import { InformeTrazabilidadLogProps } from '../../core/domain/entities/informe-trazabilidad-log.entity.js';

export class ListarInformesTrazabilidadLogUseCase {
  constructor(private readonly informesRepo: InformesTrazabilidadRepositoryPort) {}

  public async execute(filtros?: FiltrosListarInformesLog): Promise<InformeTrazabilidadLogProps[]> {
    const logs = await this.informesRepo.listar(filtros);
    return logs.map(l => l.toJSON());
  }
}
