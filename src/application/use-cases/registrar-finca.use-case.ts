import { randomUUID } from 'node:crypto';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { Finca } from '../../core/domain/entities/finca.entity.js';
import { RegistrarFincaDTO, FincaResponseDTO } from '../dtos/finca.dto.js';
import { DomainError } from '../../core/domain/errors/domain.error.js';

export class FincaDuplicadaError extends DomainError {
  public readonly code = 'FINCA_NAME_ALREADY_EXISTS';

  constructor(nombre: string) {
    super(`Ya existe una finca registrada con el nombre '${nombre}'.`);
  }
}

export class RegistrarFincaUseCase {
  constructor(private readonly fincasRepo: FincasRepositoryPort) {}

  async execute(dto: RegistrarFincaDTO): Promise<FincaResponseDTO> {
    const yaExiste = await this.fincasRepo.existeNombre(dto.nombre);
    if (yaExiste) {
      throw new FincaDuplicadaError(dto.nombre);
    }

    const finca = Finca.crear({
      id: dto.id ?? randomUUID(),
      nombre: dto.nombre,
      localidad: dto.localidad,
      departamento: dto.departamento,
      provincia: dto.provincia,
      superficieTotalHa: dto.superficieTotalHa,
      responsableId: dto.responsableId,
      renspa: dto.renspa,
      geometria: dto.geometria,
      propietario: dto.propietario,
      telefono: dto.telefono,
      observaciones: dto.observaciones,
    });

    await this.fincasRepo.guardar(finca);

    return finca.toJSON();
  }
}
