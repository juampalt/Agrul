import crypto from 'node:crypto';
import { InsumoUnidadEquivalencia } from '../../core/domain/entities/insumo-unidad-equivalencia.entity.js';
import { ConversorUnidadesService } from '../../core/domain/services/conversor-unidades.service.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { InsumoEquivalenciasRepositoryPort } from '../../core/ports/insumo-equivalencias-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import {
  RegistrarInsumoEquivalenciaInputDTO,
  InsumoEquivalenciaOutputDTO,
  ConvertirUnidadInsumoInputDTO,
  ResultadoConversionOutputDTO,
} from '../dtos/insumo-equivalencias.dto.js';

function toOutputDTO(eq: InsumoUnidadEquivalencia): InsumoEquivalenciaOutputDTO {
  return {
    id: eq.id,
    insumoId: eq.insumoId,
    unidadCompra: eq.unidadCompra,
    unidadConsumo: eq.unidadConsumo,
    factorMultiplicador: eq.factorMultiplicador,
    densidadKgL: eq.densidadKgL,
    creadoEn: eq.creadoEn,
    actualizadoEn: eq.actualizadoEn,
  };
}

export class RegistrarInsumoEquivalenciaUseCase {
  constructor(
    private readonly equivalenciasRepo: InsumoEquivalenciasRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository
  ) {}

  async execute(input: RegistrarInsumoEquivalenciaInputDTO): Promise<InsumoEquivalenciaOutputDTO> {
    const insumo = await this.insumosRepo.buscarPorId(input.insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', input.insumoId);
    }

    const equivalencia = InsumoUnidadEquivalencia.crear({
      id: input.id ?? crypto.randomUUID(),
      insumoId: input.insumoId,
      unidadCompra: input.unidadCompra,
      unidadConsumo: input.unidadConsumo,
      factorMultiplicador: input.factorMultiplicador,
      densidadKgL: input.densidadKgL,
    });

    await this.equivalenciasRepo.guardar(equivalencia);

    return toOutputDTO(equivalencia);
  }
}

export class ListarEquivalenciasPorInsumoUseCase {
  constructor(
    private readonly equivalenciasRepo: InsumoEquivalenciasRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository
  ) {}

  async execute(insumoId: string): Promise<InsumoEquivalenciaOutputDTO[]> {
    const insumo = await this.insumosRepo.buscarPorId(insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', insumoId);
    }

    const equivalencias = await this.equivalenciasRepo.listarPorInsumo(insumoId);
    return equivalencias.map(toOutputDTO);
  }
}

export class ConvertirUnidadInsumoUseCase {
  constructor(
    private readonly equivalenciasRepo: InsumoEquivalenciasRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository
  ) {}

  async execute(input: ConvertirUnidadInsumoInputDTO): Promise<ResultadoConversionOutputDTO> {
    const insumo = await this.insumosRepo.buscarPorId(input.insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', input.insumoId);
    }

    const equivalencias = await this.equivalenciasRepo.listarPorInsumo(input.insumoId);

    const conversion = ConversorUnidadesService.convertir({
      insumoId: input.insumoId,
      cantidad: input.cantidad,
      unidadOrigen: input.unidadOrigen,
      unidadDestino: input.unidadDestino,
      equivalencias,
    });

    return {
      cantidadOriginal: conversion.cantidadOriginal,
      unidadOrigen: conversion.unidadOrigen,
      cantidadConvertida: conversion.cantidadConvertida,
      unidadDestino: conversion.unidadDestino,
      factorAplicado: conversion.factorAplicado,
      densidadUtilizada: conversion.densidadUtilizada,
    };
  }
}
