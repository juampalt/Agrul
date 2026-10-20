import crypto from 'node:crypto';
import { DepositoAlmacenamiento } from '../../core/domain/entities/deposito-almacenamiento.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { DepositosRepositoryPort } from '../../core/ports/depositos-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import {
  CrearDepositoInputDTO,
  DepositoOutputDTO,
  ListarDepositosQueryDTO,
} from '../dtos/depositos.dto.js';

function toOutputDTO(d: DepositoAlmacenamiento): DepositoOutputDTO {
  return {
    id: d.id,
    fincaId: d.fincaId,
    nombre: d.nombre,
    tipoPermitido: d.tipoPermitido,
    ubicacionFisica: d.ubicacionFisica,
    capacidadMaxima: d.capacidadMaxima,
    activo: d.activo,
    creadoEn: d.creadoEn,
    actualizadoEn: d.actualizadoEn,
  };
}

export class CrearDepositoUseCase {
  constructor(
    private readonly depositosRepo: DepositosRepositoryPort,
    private readonly fincasRepo?: FincasRepositoryPort
  ) {}

  async execute(input: CrearDepositoInputDTO): Promise<DepositoOutputDTO> {
    if (this.fincasRepo) {
      const finca = await this.fincasRepo.buscarPorId(input.fincaId);
      if (!finca) {
        throw new EntidadNoEncontradaError('Finca', input.fincaId);
      }
    }

    const deposito = DepositoAlmacenamiento.crear({
      id: input.id ?? crypto.randomUUID(),
      fincaId: input.fincaId,
      nombre: input.nombre,
      tipoPermitido: input.tipoPermitido,
      ubicacionFisica: input.ubicacionFisica,
      capacidadMaxima: input.capacidadMaxima,
    });

    await this.depositosRepo.guardar(deposito);

    return toOutputDTO(deposito);
  }
}

export class ListarDepositosUseCase {
  constructor(private readonly depositosRepo: DepositosRepositoryPort) {}

  async execute(filtros?: ListarDepositosQueryDTO): Promise<DepositoOutputDTO[]> {
    const depositos = await this.depositosRepo.listar(filtros);
    return depositos.map(toOutputDTO);
  }
}

export class ObtenerDepositoPorIdUseCase {
  constructor(private readonly depositosRepo: DepositosRepositoryPort) {}

  async execute(id: string): Promise<DepositoOutputDTO> {
    const deposito = await this.depositosRepo.buscarPorId(id);
    if (!deposito) {
      throw new EntidadNoEncontradaError('Depósito', id);
    }
    return toOutputDTO(deposito);
  }
}
