import { FincasRepositoryPort, ListarFincasFiltros } from '../../core/ports/fincas-repository.port.js';
import { FincaResponseDTO } from '../dtos/finca.dto.js';

export class ListarFincasUseCase {
  constructor(private readonly fincasRepo: FincasRepositoryPort) {}

  async execute(filtros?: ListarFincasFiltros): Promise<FincaResponseDTO[]> {
    const fincas = await this.fincasRepo.listarTodas(filtros);
    return fincas.map((f) => f.toJSON());
  }
}
