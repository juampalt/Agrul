import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { GenealogiaRepositoryPort } from '../../core/ports/genealogia-repository.port.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { ArbolLinajeResponseDTO, NodoLinajeDTO } from '../dtos/linaje.dto.js';

export class ObtenerLinajeUseCase {
  constructor(
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly genealogiaRepo: GenealogiaRepositoryPort
  ) {}

  async execute(loteId: string): Promise<ArbolLinajeResponseDTO> {
    const lote = await this.lotesRepo.buscarPorId(loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', loteId);
    }

    // 1. Obtener aristas genealógicas del grafo
    const aristasAncestros = await this.genealogiaRepo.obtenerGrafoAncestros(loteId);
    const aristasDescendientes = await this.genealogiaRepo.obtenerGrafoDescendientes(loteId);

    // 2. Mapear y enriquecer ancestros (LotePadre)
    const ancestros: NodoLinajeDTO[] = [];
    for (const arista of aristasAncestros) {
      const lotePadre = await this.lotesRepo.buscarPorId(arista.lotePadreId);
      if (lotePadre) {
        ancestros.push({
          loteId: lotePadre.id,
          codigoLote: lotePadre.codigoLote.value,
          producto: lotePadre.producto,
          estadoActual: lotePadre.estadoActual,
          cantidadAportada: arista.cantidadAportada,
          unidadMedida: arista.unidadMedida,
          motivoRelacion: arista.motivoRelacion,
          fechaRelacionUtc: arista.fechaUtc,
        });
      }
    }

    // 3. Mapear y enriquecer descendientes (LoteHijo)
    const descendientes: NodoLinajeDTO[] = [];
    for (const arista of aristasDescendientes) {
      const loteHijo = await this.lotesRepo.buscarPorId(arista.loteHijoId);
      if (loteHijo) {
        descendientes.push({
          loteId: loteHijo.id,
          codigoLote: loteHijo.codigoLote.value,
          producto: loteHijo.producto,
          estadoActual: loteHijo.estadoActual,
          cantidadAportada: arista.cantidadAportada,
          unidadMedida: arista.unidadMedida,
          motivoRelacion: arista.motivoRelacion,
          fechaRelacionUtc: arista.fechaUtc,
        });
      }
    }

    return {
      loteObjetivo: {
        id: lote.id,
        codigoLote: lote.codigoLote.value,
        producto: lote.producto,
        estadoActual: lote.estadoActual,
        cantidadActual: lote.cantidadActual,
        unidadMedida: lote.unidadMedida,
      },
      ancestros,
      descendientes,
    };
  }
}
