import crypto from 'node:crypto';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { InsumoCatalogo } from '../../core/domain/entities/insumo-catalogo.entity.js';
import { EntidadNoEncontradaError, DomainError } from '../../core/domain/errors/domain.error.js';
import {
  RegistrarInsumoInputDto,
  InsumoOutputDto,
  ListarInsumosFiltrosDto,
} from '../dtos/insumos.dto.js';

export class InsumoDuplicadoError extends DomainError {
  public readonly code = 'INPUT_ALREADY_EXISTS';

  constructor(nombreComercial: string) {
    super(`Ya existe un insumo registrado con el nombre comercial '${nombreComercial}'.`);
  }
}

function toOutputDto(insumo: InsumoCatalogo): InsumoOutputDto {
  const json = insumo.toJSON();
  return {
    id: json.id,
    nombreComercial: json.nombreComercial,
    categoria: json.categoria,
    unidadMedidaId: json.unidadMedidaId,
    presentacion: json.presentacion,
    activo: json.activo,
    stockMinimoConfigurable: json.stockMinimoConfigurable ?? null,
    fichaFitosanitaria: json.fichaFitosanitaria ? { ...json.fichaFitosanitaria } : null,
    creadoEn: json.creadoEn,
    actualizadoEn: json.actualizadoEn,
  };
}

export class RegistrarInsumoCatalogoUseCase {
  constructor(private readonly insumosRepo: InsumosCatalogoRepository) {}

  public async execute(input: RegistrarInsumoInputDto): Promise<InsumoOutputDto> {
    const existe = await this.insumosRepo.existePorNombreComercial(input.nombreComercial);
    if (existe) {
      throw new InsumoDuplicadoError(input.nombreComercial);
    }

    const insumo = InsumoCatalogo.crear({
      id: crypto.randomUUID(),
      nombreComercial: input.nombreComercial,
      categoria: input.categoria,
      unidadMedidaId: input.unidadMedidaId,
      presentacion: input.presentacion,
      activo: input.activo,
      stockMinimoConfigurable: input.stockMinimoConfigurable,
      fichaFitosanitaria: input.fichaFitosanitaria,
    });

    await this.insumosRepo.guardar(insumo);

    return toOutputDto(insumo);
  }
}

export class ListarInsumosCatalogoUseCase {
  constructor(private readonly insumosRepo: InsumosCatalogoRepository) {}

  public async execute(filtros?: ListarInsumosFiltrosDto): Promise<InsumoOutputDto[]> {
    const insumos = await this.insumosRepo.listar({
      categoria: filtros?.categoria,
      activo: filtros?.activo,
    });

    return insumos.map(toOutputDto);
  }
}

export class ObtenerInsumoPorIdUseCase {
  constructor(private readonly insumosRepo: InsumosCatalogoRepository) {}

  public async execute(id: string): Promise<InsumoOutputDto> {
    const insumo = await this.insumosRepo.buscarPorId(id);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', id);
    }

    return toOutputDto(insumo);
  }
}

export class ConfigurarStockMinimoInsumoUseCase {
  constructor(private readonly insumosRepo: InsumosCatalogoRepository) {}

  public async execute(insumoId: string, stockMinimo: number | null): Promise<InsumoOutputDto> {
    const insumo = await this.insumosRepo.buscarPorId(insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', insumoId);
    }

    insumo.actualizarStockMinimo(stockMinimo);
    await this.insumosRepo.guardar(insumo);

    return toOutputDto(insumo);
  }
}
