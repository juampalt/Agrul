import crypto from 'node:crypto';
import {
  ObservacionMeteorologica,
} from '../../core/domain/entities/observacion-meteorologica.entity.js';
import {
  EventoClimaticoSGTA,
  TipoEventoClimaticoSGTA,
} from '../../core/domain/entities/evento-climatico-sgta.entity.js';
import {
  MeteorologiaRepositoryPort,
} from '../../core/ports/meteorologia-repository.port.js';
import {
  EventosClimaticosRepositoryPort,
} from '../../core/ports/eventos-climaticos-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import {
  EntidadNoEncontradaError,
  ObservacionMeteorologicaDuplicadaError,
  EventoClimaticoAdversoInvalidoError,
} from '../../core/domain/errors/domain.error.js';
import {
  RegistrarObservacionMeteorologicaInputDto,
  ObservacionMeteorologicaOutputDto,
  ListarObservacionesMeteorologicasInputDto,
  RegistrarEventoClimaticoInputDto,
  EventoClimaticoSGTAOutputDto,
  ListarEventosClimaticosSGTAInputDto,
} from '../dtos/meteorologia-sgta.dto.js';

export class BaseMeteorologiaSGTAUseCase {
  protected mapObservacionToOutput(obs: ObservacionMeteorologica): ObservacionMeteorologicaOutputDto {
    return {
      id: obs.id,
      fincaId: obs.fincaId,
      fechaHoraObservacion: obs.fechaHoraObservacion,
      temperaturaC: obs.temperaturaC,
      humedadRelativa: obs.humedadRelativa,
      precipitacionesMm: obs.precipitacionesMm,
      observaciones: obs.observaciones,
      responsableId: obs.responsableId,
      creadoEn: obs.creadoEn,
      actualizadoEn: obs.actualizadoEn,
    };
  }

  protected mapEventoToOutput(evt: EventoClimaticoSGTA): EventoClimaticoSGTAOutputDto {
    return {
      id: evt.id,
      fincaId: evt.fincaId,
      tipoEvento: evt.tipoEvento,
      fecha: evt.fecha,
      descripcion: evt.descripcion,
      responsableId: evt.responsableId,
      lotesAfectados: evt.lotesAfectados.map(l => ({
        loteId: l.loteId,
        descripcionDano: l.descripcionDano,
        superficieAfectadaHa: l.superficieAfectadaHa ?? null,
        porcentajeDano: l.porcentajeDano ?? null,
      })),
      creadoEn: evt.creadoEn,
      actualizadoEn: evt.actualizadoEn,
    };
  }
}

/**
 * Caso de Uso: CU67 — Confirmar Registro Meteorológico (RN-28 / RN-30)
 * Contrato: confirmarRegistroMeteorologico
 */
export class ConfirmarRegistroMeteorologicoUseCase extends BaseMeteorologiaSGTAUseCase {
  constructor(
    private readonly meteorologiaRepo: MeteorologiaRepositoryPort,
    private readonly fincasRepo: FincasRepositoryPort
  ) {
    super();
  }

  public async execute(
    input: RegistrarObservacionMeteorologicaInputDto,
    fechaReferenciaHoy?: Date
  ): Promise<ObservacionMeteorologicaOutputDto> {
    const finca = await this.fincasRepo.buscarPorId(input.fincaId);
    if (!finca) {
      throw new EntidadNoEncontradaError('Finca', input.fincaId);
    }

    // Regla de Negocio RN-28: Prevención de duplicados en la misma finca, fecha y hora
    const existente = await this.meteorologiaRepo.obtenerPorFincaYFechaHora(
      input.fincaId,
      input.fechaHoraObservacion
    );
    if (existente) {
      throw new ObservacionMeteorologicaDuplicadaError(
        `Ya existe un registro meteorológico para la finca '${finca.nombre}' en la fecha y hora ${input.fechaHoraObservacion} (RN-28).`
      );
    }

    const observacion = ObservacionMeteorologica.crear(
      {
        id: crypto.randomUUID(),
        fincaId: input.fincaId,
        fechaHoraObservacion: input.fechaHoraObservacion,
        temperaturaC: input.temperaturaC,
        humedadRelativa: input.humedadRelativa,
        precipitacionesMm: input.precipitacionesMm,
        observaciones: input.observaciones,
        responsableId: input.responsableId,
      },
      fechaReferenciaHoy
    );

    await this.meteorologiaRepo.guardar(observacion);

    return this.mapObservacionToOutput(observacion);
  }
}

/**
 * Caso de Uso: CU68 — Consultar Historial de Mediciones / Observaciones Meteorológicas
 */
export class ConsultarObservacionesMeteorologicasUseCase extends BaseMeteorologiaSGTAUseCase {
  constructor(
    private readonly meteorologiaRepo: MeteorologiaRepositoryPort,
    private readonly fincasRepo: FincasRepositoryPort
  ) {
    super();
  }

  public async execute(
    input: ListarObservacionesMeteorologicasInputDto
  ): Promise<ObservacionMeteorologicaOutputDto[]> {
    const finca = await this.fincasRepo.buscarPorId(input.fincaId);
    if (!finca) {
      throw new EntidadNoEncontradaError('Finca', input.fincaId);
    }

    const registros = await this.meteorologiaRepo.listarPorFinca(input.fincaId, {
      fechaDesde: input.fechaDesde,
      fechaHasta: input.fechaHasta,
    });

    return registros.map(r => this.mapObservacionToOutput(r));
  }
}

/**
 * Caso de Uso: CU69 — Confirmar Registro de Evento Climático Adverso Multilote
 * Contrato: confirmarRegistroEvento
 */
export class ConfirmarRegistroEventoUseCase extends BaseMeteorologiaSGTAUseCase {
  constructor(
    private readonly eventosRepo: EventosClimaticosRepositoryPort,
    private readonly fincasRepo: FincasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort
  ) {
    super();
  }

  public async execute(
    input: RegistrarEventoClimaticoInputDto,
    fechaReferenciaHoy?: Date
  ): Promise<EventoClimaticoSGTAOutputDto> {
    const finca = await this.fincasRepo.buscarPorId(input.fincaId);
    if (!finca) {
      throw new EntidadNoEncontradaError('Finca', input.fincaId);
    }

    if (!input.lotesAfectados || input.lotesAfectados.length === 0) {
      throw new EventoClimaticoAdversoInvalidoError(
        'Debe asociar al menos un lote afectado por el siniestro climático (CU69).'
      );
    }

    // Validar existencia y pertenencia de cada lote a la finca indicada
    for (const item of input.lotesAfectados) {
      const lote = await this.lotesRepo.buscarPorId(item.loteId);
      if (!lote) {
        throw new EntidadNoEncontradaError('Lote', item.loteId);
      }
      if (lote.fincaId !== input.fincaId) {
        throw new EventoClimaticoAdversoInvalidoError(
          `El lote '${lote.codigoLote.value}' no pertenece a la finca seleccionada (fincaId: ${input.fincaId}).`
        );
      }
    }

    const evento = EventoClimaticoSGTA.crear(
      {
        id: crypto.randomUUID(),
        fincaId: input.fincaId,
        tipoEvento: input.tipoEvento,
        fecha: input.fecha,
        descripcion: input.descripcion,
        responsableId: input.responsableId,
        lotesAfectados: input.lotesAfectados,
      },
      fechaReferenciaHoy
    );

    await this.eventosRepo.guardar(evento);

    return this.mapEventoToOutput(evento);
  }
}

/**
 * Caso de Uso: CU70 — Consultar Historial de Eventos Adversos y Daños por Lote y Período
 */
export class ConsultarEventosClimaticosUseCase extends BaseMeteorologiaSGTAUseCase {
  constructor(private readonly eventosRepo: EventosClimaticosRepositoryPort) {
    super();
  }

  public async execute(
    input?: ListarEventosClimaticosSGTAInputDto
  ): Promise<EventoClimaticoSGTAOutputDto[]> {
    const eventos = await this.eventosRepo.listar(input);
    return eventos.map(e => this.mapEventoToOutput(e));
  }
}
