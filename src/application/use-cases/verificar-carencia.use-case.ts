import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import {
  ServicioVerificacionCarencia,
  AplicacionAEvaluar,
} from '../../core/domain/services/verificacion-carencia.service.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import {
  VerificarCarenciaLoteInputDto,
  ResultadoVerificacionCarenciaDto,
} from '../dtos/aplicaciones.dto.js';

/**
 * Caso de Uso: Verificar Carencia, Reingreso y Recomendaciones Técnicas en un Lote.
 * Modela RF-M4-08, RF-M4-09, RF-M5-11 y RN-14.
 */
export class VerificarCarenciaLoteUseCase {
  constructor(
    private readonly aplicacionesRepo: AplicacionesRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
    private readonly lotesRepo: LotesRepositoryPort,
  ) {}

  public async execute(
    input: VerificarCarenciaLoteInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<ResultadoVerificacionCarenciaDto> {
    // 1. Validar existencia del Lote
    const lote = await this.lotesRepo.buscarPorId(input.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', input.loteId);
    }

    // 2. Determinar fecha de evaluación (fecha de cosecha o labor objetivo, o hoy por defecto)
    const fechaEvaluacion = input.fecha
      ? input.fecha.includes('T') ? input.fecha.split('T')[0] : input.fecha
      : (fechaReferenciaHoy ?? new Date()).toISOString().split('T')[0];

    // 3. Obtener todas las aplicaciones históricas asociadas a este lote
    const aplicaciones = await this.aplicacionesRepo.listar({ loteId: input.loteId });

    if (aplicaciones.length === 0) {
      return {
        loteId: input.loteId,
        fechaEvaluacion,
        aptoParaCosecha: true,
        aptoParaReingreso: true,
        fechaSeguraCosecha: null,
        totalAplicacionesEvaluadas: 0,
        totalAlertasCarencia: 0,
        alertasCarencia: [],
        alertasReingreso: [],
        advertencias: [],
      };
    }

    // 4. Pre-cargar el catálogo de insumos para enriquecer con ficha fitosanitaria
    const todosInsumos = await this.insumosRepo.listar();
    const insumosMap = new Map(
      todosInsumos.map(i => [
        i.id,
        {
          id: i.id,
          nombreComercial: i.nombreComercial,
          categoria: i.categoria,
          fichaFitosanitaria: i.fichaFitosanitaria ? { ...i.fichaFitosanitaria } : null,
        },
      ])
    );

    // 5. Mapear aplicaciones para el servicio de dominio
    const aplicacionesAEvaluar: AplicacionAEvaluar[] = aplicaciones.map(apl => {
      const raw = apl.toJSON();
      return {
        id: raw.id,
        actividadId: raw.actividadId,
        loteId: raw.loteId,
        cicloId: raw.cicloId,
        fecha: raw.fecha,
        recomendacionTecnica: raw.recomendacionTecnica ?? null,
        lineas: raw.lineas.map(linea => ({
          insumoId: linea.insumoId,
          insumo: insumosMap.get(linea.insumoId) ?? null,
          cantidadTotal: linea.cantidadTotal,
          unidadMedidaId: linea.unidadMedidaId,
        })),
      };
    });

    // 6. Invocar al Servicio de Dominio puro de Verificación de Carencia (RN-14 / RF-M4-09)
    const resultado = ServicioVerificacionCarencia.evaluarLote({
      loteId: input.loteId,
      aplicaciones: aplicacionesAEvaluar,
      fechaEvaluacion,
    });

    return {
      loteId: resultado.loteId,
      fechaEvaluacion: resultado.fechaEvaluacion,
      aptoParaCosecha: resultado.aptoParaCosecha,
      aptoParaReingreso: resultado.aptoParaReingreso,
      fechaSeguraCosecha: resultado.fechaSeguraCosecha,
      totalAplicacionesEvaluadas: resultado.totalAplicacionesEvaluadas,
      totalAlertasCarencia: resultado.totalAlertasCarencia,
      alertasCarencia: resultado.alertasCarencia.map(a => ({ ...a })),
      alertasReingreso: resultado.alertasReingreso.map(a => ({ ...a })),
      advertencias: [...resultado.advertencias],
    };
  }
}
