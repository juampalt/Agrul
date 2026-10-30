import { EntidadNoEncontradaError, DomainError } from '../../core/domain/errors/domain.error.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { FincaResponseDTO, ModificarFincaDTO } from '../dtos/finca.dto.js';

export class FincaUnicaNoConfiguradaError extends EntidadNoEncontradaError {
  constructor() { super('Finca única', 'configurada'); }
}

export class SuperficieFincaInsuficienteError extends DomainError {
  readonly code = 'SUPERFICIE_FINCA_INSUFICIENTE';
  constructor(superficie: number, asignada: number) {
    super(`La superficie de la finca (${superficie} ha) no puede ser menor a la superficie vigente de sus lotes (${asignada} ha).`);
  }
}

async function obtenerFincaUnica(repo: FincasRepositoryPort) {
  const [finca] = await repo.listarTodas({ limit: 1 });
  if (!finca) throw new FincaUnicaNoConfiguradaError();
  return finca;
}

export class ConsultarFincaUseCase {
  constructor(private readonly fincasRepo: FincasRepositoryPort) {}
  async execute(): Promise<FincaResponseDTO> {
    return (await obtenerFincaUnica(this.fincasRepo)).toJSON();
  }
}

export class ModificarFincaUseCase {
  constructor(
    private readonly fincasRepo: FincasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort
  ) {}

  async execute(dto: ModificarFincaDTO, versionEsperada?: string): Promise<FincaResponseDTO> {
    const finca = await obtenerFincaUnica(this.fincasRepo);
    const superficieAsignada = this.lotesRepo.sumarSuperficieActiva
      ? await this.lotesRepo.sumarSuperficieActiva(finca.id)
      : (await this.lotesRepo.listarTodos({ fincaId: finca.id }))
          .filter((l) => l.estadoTerritorial !== 'INACTIVO')
          .reduce((total, lote) => total + (lote.superficieHa ?? 0), 0);
    if (dto.superficieTotalHa < superficieAsignada) {
      throw new SuperficieFincaInsuficienteError(dto.superficieTotalHa, superficieAsignada);
    }
    finca.modificar(dto);
    if (this.fincasRepo.actualizar) await this.fincasRepo.actualizar(finca, versionEsperada);
    else await this.fincasRepo.guardar(finca);
    return finca.toJSON();
  }
}
