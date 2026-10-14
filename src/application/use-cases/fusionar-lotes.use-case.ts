import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import { GenealogiaRepositoryPort } from '../../core/ports/genealogia-repository.port.js';
import { Lote } from '../../core/domain/entities/lote.entity.js';
import { LoteGenealogia, RelacionGenealogicaInvalidaError } from '../../core/domain/entities/lote-genealogia.entity.js';
import { TraceEvent } from '../../core/domain/entities/trace-event.entity.js';
import { CodigoLote } from '../../core/domain/value-objects/codigo-lote.vo.js';
import { TipoEventoEnum } from '../../core/domain/value-objects/tipo-evento.vo.js';
import { EstadoLoteEnum } from '../../core/domain/value-objects/estado-lote.vo.js';
import {
  CantidadInsuficienteError,
  EntidadNoEncontradaError,
  InvalidStateTransitionError,
} from '../../core/domain/errors/domain.error.js';
import { CodigoLoteDuplicadoError } from './crear-lote.use-case.js';
import { FusionarLotesInputDTO, FusionarLotesResponseDTO } from '../dtos/merge-lote.dto.js';

export class FusionarLotesUseCase {
  constructor(
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly eventosRepo: EventosRepositoryPort,
    private readonly genealogiaRepo: GenealogiaRepositoryPort
  ) {}

  async execute(dto: FusionarLotesInputDTO): Promise<FusionarLotesResponseDTO> {
    if (!dto.padres || dto.padres.length < 2) {
      throw new RelacionGenealogicaInvalidaError('Se requieren al menos 2 lotes padres para realizar una fusión (Merge N:1).');
    }

    // 1. Validar que no haya IDs de padres duplicados en el request
    const idsPadres = dto.padres.map(p => p.loteId);
    if (new Set(idsPadres).size !== idsPadres.length) {
      throw new RelacionGenealogicaInvalidaError('No se pueden especificar lotes padres duplicados en la misma fusión.');
    }

    // 2. Validar existencia, estado y stock de todos los lotes padres participantes (Fail-Fast antes de mutar)
    const padresRecuperados: Array<{ lote: Lote; cantidadAportada: number }> = [];

    for (const aporte of dto.padres) {
      const padre = await this.lotesRepo.buscarPorId(aporte.loteId);
      if (!padre) {
        throw new EntidadNoEncontradaError('Lote', aporte.loteId);
      }

      if (padre.estadoActual === EstadoLoteEnum.CERRADO) {
        throw new InvalidStateTransitionError(padre.estadoActual, TipoEventoEnum.FUSION_ORIGEN);
      }

      if (aporte.cantidad <= 0) {
        throw new RelacionGenealogicaInvalidaError('La cantidad aportada por cada lote padre debe ser estrictamente mayor a cero.');
      }

      if (aporte.cantidad > padre.cantidadActual) {
        throw new CantidadInsuficienteError(
          padre.codigoLote.value,
          padre.cantidadActual,
          aporte.cantidad
        );
      }

      padresRecuperados.push({
        lote: padre,
        cantidadAportada: aporte.cantidad,
      });
    }

    // 3. Determinar el código del lote hijo (autogenerar o validar duplicado)
    let codigoHijo: CodigoLote;
    if (dto.nuevoLote.codigoLote) {
      codigoHijo = CodigoLote.crear(dto.nuevoLote.codigoLote);
      const yaExiste = await this.lotesRepo.existeCodigo(codigoHijo.value);
      if (yaExiste) {
        throw new CodigoLoteDuplicadoError(codigoHijo.value);
      }
    } else {
      const anio = new Date().getFullYear();
      let candidate = '';
      let existe = true;
      let intentos = 0;

      while (existe && intentos < 10) {
        const rand = Math.floor(10000 + Math.random() * 90000);
        candidate = `LOT-${anio}-${rand}`;
        existe = await this.lotesRepo.existeCodigo(candidate);
        intentos++;
      }

      codigoHijo = CodigoLote.crear(candidate);
    }

    // 4. Calcular suma de cantidades aportadas (conservación de masa N:1)
    const cantidadTotalHijo = Number(
      padresRecuperados.reduce((sum, item) => sum + item.cantidadAportada, 0).toFixed(4)
    );

    // 5. Instanciar lote hijo y avanzar a EN_PROCESO mediante FUSION_RECEPCION
    const loteHijo = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: codigoHijo,
      producto: dto.nuevoLote.producto,
      variedad: dto.nuevoLote.variedad ?? null,
      cantidadInicial: cantidadTotalHijo,
      unidadMedida: dto.nuevoLote.unidadMedida,
    });
    loteHijo.aplicarEvento(TipoEventoEnum.FUSION_RECEPCION);

    // 6. Descontar cantidad a cada padre, aplicar FUSION_ORIGEN y crear eventos y aristas
    const aristasGenealogia: LoteGenealogia[] = [];
    const eventosOrigen: TraceEvent[] = [];
    const lotesPadresActualizados: Lote[] = [];

    const nowIso = dto.timestampCapturaLocal ?? new Date().toISOString();

    for (const { lote: padre, cantidadAportada } of padresRecuperados) {
      padre.descontarCantidad(cantidadAportada);
      padre.aplicarEvento(TipoEventoEnum.FUSION_ORIGEN);
      lotesPadresActualizados.push(padre);

      const arista = LoteGenealogia.crear({
        id: crypto.randomUUID(),
        lotePadreId: padre.id,
        loteHijoId: loteHijo.id,
        cantidadAportada,
        unidadMedida: loteHijo.unidadMedida,
        motivoRelacion: 'BLEND_MERGE',
        fechaUtc: nowIso,
      });
      aristasGenealogia.push(arista);

      const eventoOrigen = TraceEvent.crear({
        id: crypto.randomUUID(),
        loteId: padre.id,
        actorId: dto.actorId,
        ubicacionId: dto.ubicacionId,
        tipoEvento: TipoEventoEnum.FUSION_ORIGEN,
        timestampCapturaLocal: nowIso,
        payloadEspecifico: {
          motivo: dto.motivo ?? 'Fusión de Lotes (Blend/Merge N:1)',
          loteDestinoId: loteHijo.id,
          codigoLoteDestino: loteHijo.codigoLote.value,
          cantidadAportada,
          cantidadRestantePadre: padre.cantidadActual,
        },
      });
      eventosOrigen.push(eventoOrigen);
    }

    // 7. Evento FUSION_RECEPCION para el lote hijo
    const eventoRecepcion = TraceEvent.crear({
      id: crypto.randomUUID(),
      loteId: loteHijo.id,
      actorId: dto.actorId,
      ubicacionId: dto.ubicacionId,
      tipoEvento: TipoEventoEnum.FUSION_RECEPCION,
      timestampCapturaLocal: nowIso,
      payloadEspecifico: {
        motivo: dto.motivo ?? 'Fusión de Lotes (Blend/Merge N:1)',
        padres: padresRecuperados.map(p => ({
          loteId: p.lote.id,
          codigoLote: p.lote.codigoLote.value,
          cantidadAportada: p.cantidadAportada,
        })),
        cantidadTotal: loteHijo.cantidadActual,
      },
    });

    // 8. Persistencia atómica de hijo, padres actualizados, aristas y eventos
    await this.lotesRepo.guardar(loteHijo);
    await this.genealogiaRepo.guardarRelaciones(aristasGenealogia);

    for (let i = 0; i < lotesPadresActualizados.length; i++) {
      await this.eventosRepo.guardarConTransaccion(eventosOrigen[i], lotesPadresActualizados[i]);
    }

    await this.eventosRepo.guardarConTransaccion(eventoRecepcion, loteHijo);

    return {
      loteHijo: {
        id: loteHijo.id,
        codigoLote: loteHijo.codigoLote.value,
        producto: loteHijo.producto,
        variedad: loteHijo.variedad,
        estadoActual: loteHijo.estadoActual,
        cantidadActual: loteHijo.cantidadActual,
        unidadMedida: loteHijo.unidadMedida,
        creadoEn: loteHijo.creadoEn,
        actualizadoEn: loteHijo.actualizadoEn,
      },
      lotesPadres: lotesPadresActualizados.map(p => ({
        id: p.id,
        codigoLote: p.codigoLote.value,
        producto: p.producto,
        variedad: p.variedad,
        estadoActual: p.estadoActual,
        cantidadActual: p.cantidadActual,
        unidadMedida: p.unidadMedida,
        creadoEn: p.creadoEn,
        actualizadoEn: p.actualizadoEn,
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
      eventosOrigen: eventosOrigen.map(e => ({
        id: e.id,
        loteId: e.loteId,
        actorId: e.actorId,
        ubicacionId: e.ubicacionId,
        tipoEvento: e.tipoEvento,
        timestampCapturaLocal: e.timestampCapturaLocal,
        timestampServidor: e.timestampServidor,
        payloadEspecifico: e.payloadEspecifico as Record<string, unknown>,
        eventoReferenciadoId: e.eventoReferenciadoId,
        estadoSincronizacion: e.estadoSincronizacion,
      })),
      eventoRecepcion: {
        id: eventoRecepcion.id,
        loteId: eventoRecepcion.loteId,
        actorId: eventoRecepcion.actorId,
        ubicacionId: eventoRecepcion.ubicacionId,
        tipoEvento: eventoRecepcion.tipoEvento,
        timestampCapturaLocal: eventoRecepcion.timestampCapturaLocal,
        timestampServidor: eventoRecepcion.timestampServidor,
        payloadEspecifico: eventoRecepcion.payloadEspecifico as Record<string, unknown>,
        eventoReferenciadoId: eventoRecepcion.eventoReferenciadoId,
        estadoSincronizacion: eventoRecepcion.estadoSincronizacion,
      },
    };
  }
}
