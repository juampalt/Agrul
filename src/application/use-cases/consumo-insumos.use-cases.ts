import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import {
  ConsumoInsumosCicloOutputDto,
  InsumoConsumoAcumuladoItemDto,
} from '../dtos/aplicaciones.dto.js';

interface AgregadoInsumo {
  insumoId: string;
  cantidadTotalConsumida: number;
  unidadMedidaId: string;
  aplicacionesIds: Set<string>;
}

/**
 * Caso de uso: Cálculo analítico del consumo acumulado de insumos por lote, ciclo productivo
 * e intensidad de uso expresada por hectárea tratada (AGRUL-027 / RF-M4-10 / RNF-03).
 */
export class CalcularConsumoInsumosCicloUseCase {
  constructor(
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly aplicacionesRepo: AplicacionesRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
  ) {}

  public async execute(cicloId: string): Promise<ConsumoInsumosCicloOutputDto> {
    // 1. Validar existencia del Ciclo Productivo
    const ciclo = await this.ciclosRepo.buscarPorId(cicloId);
    if (!ciclo) {
      throw new EntidadNoEncontradaError('CicloProductivo', cicloId);
    }

    // 2. Obtener todas las aplicaciones asociadas a este ciclo
    const aplicaciones = await this.aplicacionesRepo.listar({ cicloId: ciclo.id });

    // 3. Pre-cargar el catálogo de insumos para enriquecer los resultados
    const todosInsumos = await this.insumosRepo.listar();
    const insumosMap = new Map(todosInsumos.map(i => [i.id, i]));

    // 4. Agregar líneas de consumo por insumoId
    const agregadosMap = new Map<string, AgregadoInsumo>();

    for (const aplicacion of aplicaciones) {
      for (const linea of aplicacion.lineas) {
        const existente = agregadosMap.get(linea.insumoId);
        if (existente) {
          existente.cantidadTotalConsumida += linea.cantidadTotal;
          existente.aplicacionesIds.add(aplicacion.id);
        } else {
          agregadosMap.set(linea.insumoId, {
            insumoId: linea.insumoId,
            cantidadTotalConsumida: linea.cantidadTotal,
            unidadMedidaId: linea.unidadMedidaId,
            aplicacionesIds: new Set([aplicacion.id]),
          });
        }
      }
    }

    // 5. Calcular métricas por hectárea tratada conforme a RF-M4-10
    const superficieHa = ciclo.superficieCultivadaHa;
    const insumosItems: InsumoConsumoAcumuladoItemDto[] = [];

    for (const agregado of agregadosMap.values()) {
      const insumoInfo = insumosMap.get(agregado.insumoId);
      const cantidadTotalConsumida = Number(agregado.cantidadTotalConsumida.toFixed(4));
      const cantidadPorHectarea = superficieHa > 0
        ? Number((agregado.cantidadTotalConsumida / superficieHa).toFixed(4))
        : 0;

      insumosItems.push({
        insumoId: agregado.insumoId,
        nombreComercial: insumoInfo?.nombreComercial,
        categoria: insumoInfo?.categoria,
        unidadMedidaId: agregado.unidadMedidaId || insumoInfo?.unidadMedidaId || 'UNIDAD',
        cantidadTotalConsumida,
        cantidadPorHectarea,
        numeroAplicaciones: agregado.aplicacionesIds.size,
      });
    }

    // Ordenar de mayor a menor consumo acumulado
    insumosItems.sort((a, b) => b.cantidadTotalConsumida - a.cantidadTotalConsumida);

    return {
      cicloId: ciclo.id,
      codigoCiclo: ciclo.codigoCiclo,
      loteId: ciclo.loteId,
      superficieCultivadaHa: ciclo.superficieCultivadaHa,
      estadoCiclo: ciclo.estado,
      totalInsumosDistintos: insumosItems.length,
      totalAplicaciones: aplicaciones.length,
      insumos: insumosItems,
    };
  }
}
