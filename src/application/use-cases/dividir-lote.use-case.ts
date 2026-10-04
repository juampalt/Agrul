import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import { GenealogiaRepositoryPort } from '../../core/ports/genealogia-repository.port.js';
import { Lote } from '../../core/domain/entities/lote.entity.js';
import { LoteGenealogia } from '../../core/domain/entities/lote-genealogia.entity.js';
import { TraceEvent } from '../../core/domain/entities/trace-event.entity.js';
import { CodigoLote } from '../../core/domain/value-objects/codigo-lote.vo.js';
import { TipoEventoEnum } from '../../core/domain/value-objects/tipo-evento.vo.js';
import {
  CantidadInsuficienteError,
  EntidadNoEncontradaError,
} from '../../core/domain/errors/domain.error.js';
import { CodigoLoteDuplicadoError } from './crear-lote.use-case.js';
import { DividirLoteInputDTO, DividirLoteResponseDTO } from '../dtos/split-lote.dto.js';

export class DividirLoteUseCase {
  constructor(
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly eventosRepo: EventosRepositoryPort,
    private readonly genealogiaRepo: GenealogiaRepositoryPort
  ) {}

  async execute(dto: DividirLoteInputDTO): Promise<DividirLoteResponseDTO> {
    // 1. Validar existencia del lote padre
    const lotePadre = await this.lotesRepo.buscarPorId(dto.loteId);
    if (!lotePadre) {
      throw new EntidadNoEncontradaError('Lote', dto.loteId);
    }

    // 2. Verificar invariante de balance de masa: sum(cantidades_hijos) <= cantidad_padre
    const sumaCantidadesHijos = dto.hijos.reduce((sum, h) => sum + h.cantidad, 0);
    if (sumaCantidadesHijos > lotePadre.cantidadActual) {
      throw new CantidadInsuficienteError(
        lotePadre.codigoLote.value,
        lotePadre.cantidadActual,
        sumaCantidadesHijos
      );
    }

    // 3. Descontar cantidad al padre y hacer avanzar su estado
    lotePadre.descontarCantidad(sumaCantidadesHijos);
    lotePadre.aplicarEvento(TipoEventoEnum.DIVISION_SPLIT);

    // 4. Instanciar los lotes hijos y las aristas de genealogía
    const lotesHijos: Lote[] = [];
    const aristasGenealogia: LoteGenealogia[] = [];

    for (let i = 0; i < dto.hijos.length; i++) {
      const hijoDto = dto.hijos[i];

      let codigoHijo: CodigoLote;
      if (hijoDto.codigoLote) {
        codigoHijo = CodigoLote.crear(hijoDto.codigoLote);
        const yaExiste = await this.lotesRepo.existeCodigo(codigoHijo.value);
        if (yaExiste) {
          throw new CodigoLoteDuplicadoError(codigoHijo.value);
        }
      } else {
        const partes = lotePadre.codigoLote.value.split('-');
        const prefijo = partes[0] || 'LOT';
        const anio = partes[1] || String(new Date().getFullYear());
        const secPadre = partes[2] || '00001';
        const letra = String.fromCharCode(65 + (i % 26));

        let candidate = `${prefijo}-${anio}-${secPadre}${letra}`;
        if (candidate.length > 20 || (secPadre.length + 1) > 8) {
          const rand = Math.floor(10000 + Math.random() * 90000);
          candidate = `${prefijo}-${anio}-${rand}`;
        }

        const yaExiste = await this.lotesRepo.existeCodigo(candidate);
        if (yaExiste) {
          const rand = Math.floor(10000 + Math.random() * 90000);
          candidate = `${prefijo}-${anio}-${rand}`;
        }

        codigoHijo = CodigoLote.crear(candidate);
      }

      const nuevoHijo = Lote.crear({
        id: crypto.randomUUID(),
        codigoLote: codigoHijo,
        producto: hijoDto.producto ?? lotePadre.producto,
        variedad: hijoDto.variedad !== undefined ? hijoDto.variedad : lotePadre.variedad,
        cantidadInicial: hijoDto.cantidad,
        unidadMedida: hijoDto.unidadMedida ?? lotePadre.unidadMedida,
      });

      const arista = LoteGenealogia.crear({
        id: crypto.randomUUID(),
        lotePadreId: lotePadre.id,
        loteHijoId: nuevoHijo.id,
        cantidadAportada: hijoDto.cantidad,
        unidadMedida: nuevoHijo.unidadMedida,
        motivoRelacion: 'SPLIT',
      });

      lotesHijos.push(nuevoHijo);
      aristasGenealogia.push(arista);
    }

    // 5. Registrar el evento DIVISION_SPLIT en el log de auditoría
    const eventoSplit = TraceEvent.crear({
      id: crypto.randomUUID(),
      loteId: lotePadre.id,
      actorId: dto.actorId,
      ubicacionId: dto.ubicacionId,
      tipoEvento: TipoEventoEnum.DIVISION_SPLIT,
      timestampCapturaLocal: dto.timestampCapturaLocal ?? new Date().toISOString(),
      payloadEspecifico: {
        motivo: dto.motivo ?? 'División de Lote (Split 1:N)',
        hijos: lotesHijos.map(h => ({
          id: h.id,
          codigoLote: h.codigoLote.value,
          cantidad: h.cantidadActual,
          unidadMedida: h.unidadMedida,
        })),
        cantidadDescontadaPadre: sumaCantidadesHijos,
        cantidadRestantePadre: lotePadre.cantidadActual,
      },
    });

    // 6. Persistencia atómica de hijos, padre, aristas genealógicas y evento
    for (const hijo of lotesHijos) {
      await this.lotesRepo.guardar(hijo);
    }
    await this.genealogiaRepo.guardarRelaciones(aristasGenealogia);
    await this.eventosRepo.guardarConTransaccion(eventoSplit, lotePadre);

    return {
      lotePadre: {
        id: lotePadre.id,
        codigoLote: lotePadre.codigoLote.value,
        producto: lotePadre.producto,
        variedad: lotePadre.variedad,
        estadoActual: lotePadre.estadoActual,
        cantidadActual: lotePadre.cantidadActual,
        unidadMedida: lotePadre.unidadMedida,
        creadoEn: lotePadre.creadoEn,
        actualizadoEn: lotePadre.actualizadoEn,
      },
      lotesHijos: lotesHijos.map(h => ({
        id: h.id,
        codigoLote: h.codigoLote.value,
        producto: h.producto,
        variedad: h.variedad,
        estadoActual: h.estadoActual,
        cantidadActual: h.cantidadActual,
        unidadMedida: h.unidadMedida,
        creadoEn: h.creadoEn,
        actualizadoEn: h.actualizadoEn,
      })),
      aristasGenealogia: aristasGenealogia.map(a => ({
        id: a.id,
        lotePadreId: a.lotePadreId,
        loteHijoId: a.loteHijoId,
        cantidadAportada: a.cantidadAportada,
        unidadMedida: a.unidadMedida,
        motivoRelacion: a.motivoRelacion,
        fechaUtc: a.fechaUtc,
      })),
      eventoSplit: {
        id: eventoSplit.id,
        loteId: eventoSplit.loteId,
        actorId: eventoSplit.actorId,
        ubicacionId: eventoSplit.ubicacionId,
        tipoEvento: eventoSplit.tipoEvento,
        timestampCapturaLocal: eventoSplit.timestampCapturaLocal,
        timestampServidor: eventoSplit.timestampServidor,
        payloadEspecifico: eventoSplit.payloadEspecifico as Record<string, unknown>,
        eventoReferenciadoId: eventoSplit.eventoReferenciadoId,
        estadoSincronizacion: eventoSplit.estadoSincronizacion,
      },
    };
  }
}
