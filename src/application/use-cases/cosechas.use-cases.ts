import { Cosecha } from '../../core/domain/entities/cosecha.entity.js';
import {
  CicloNoAbiertoError,
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
} from '../../core/domain/errors/domain.error.js';
import { CodigoTrazabilidadCosecha } from '../../core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import { TipoEventoEnum } from '../../core/domain/value-objects/tipo-evento.vo.js';
import { TraceEvent } from '../../core/domain/entities/trace-event.entity.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import {
  CosechaOutputDto,
  ListarCosechasFiltrosDto,
  RegistrarCosechaInputDto,
} from '../dtos/cosechas.dto.js';

export class RegistrarCosechaUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly eventosRepo?: EventosRepositoryPort,
  ) {}

  public async execute(
    input: RegistrarCosechaInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<CosechaOutputDto> {
    // 1. Validar existencia del Lote
    const lote = await this.lotesRepo.buscarPorId(input.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', input.loteId);
    }

    // 2. Validar existencia del Ciclo Productivo
    const ciclo = await this.ciclosRepo.buscarPorId(input.cicloId);
    if (!ciclo) {
      throw new EntidadNoEncontradaError('CicloProductivo', input.cicloId);
    }

    // 3. Regla RN-01: El ciclo debe corresponder al lote
    if (ciclo.loteId !== lote.id) {
      throw new InconsistenciaLoteCicloError(
        `El ciclo productivo '${ciclo.codigoCiclo}' no corresponde al lote '${lote.codigoLote.value}' (RN-01).`
      );
    }

    // 4. Regla RN-03: El ciclo productivo debe estar ABIERTO
    if (!ciclo.estaAbierto()) {
      throw new CicloNoAbiertoError(
        `El ciclo '${ciclo.codigoCiclo}' se encuentra en estado '${ciclo.estado}'. Solo se pueden registrar cosechas en ciclos ABIERTOS (RN-03).`
      );
    }

    // 5. Generar código de trazabilidad único algorítmico (RN-07 / RN-08 / RF-M5-03)
    const countPrevias = await this.cosechasRepo.contarPorLoteYFecha(lote.id, input.fecha);
    const secuencia = countPrevias + 1;
    const codigoTrazabilidad = CodigoTrazabilidadCosecha.generar(
      lote.codigoLote.value,
      input.fecha,
      secuencia
    );

    // 6. Instanciar entidad Cosecha (valida invariantes RN-09, RF-M5-02, RN-04)
    const cosecha = Cosecha.crear({
      id: crypto.randomUUID(),
      codigoTrazabilidad,
      loteId: input.loteId,
      cicloId: input.cicloId,
      fecha: input.fecha,
      cantidadCosechadaKg: input.cantidadCosechadaKg,
      cantidadComercializableKg: input.cantidadComercializableKg,
      cantidadDescarteKg: input.cantidadDescarteKg,
      motivoDescarte: input.motivoDescarte ?? null,
      observacionesCalidad: input.observacionesCalidad ?? null,
      responsableId: input.responsableId ?? null,
      cuadrillaId: input.cuadrillaId ?? null,
      recipientes: input.recipientes ?? null,
      superficieCosechadaHa: input.superficieCosechadaHa ?? null,
      fechaReferenciaHoy,
    });

    // 7. Persistir la cosecha
    await this.cosechasRepo.guardar(cosecha);

    // 8. Actualizar agregado Lote y registrar Evento de Trazabilidad inmutable (RN-07 / RF-M5-04)
    if (cosecha.cantidadComercializableKg > 0) {
      lote.incrementarCantidad(cosecha.cantidadComercializableKg);
    }
    lote.aplicarEvento(TipoEventoEnum.COSECHA);

    if (this.eventosRepo) {
      const evento = TraceEvent.crear({
        id: crypto.randomUUID(),
        loteId: lote.id,
        actorId: input.responsableId || input.cuadrillaId || crypto.randomUUID(),
        ubicacionId: lote.fincaId || crypto.randomUUID(),
        tipoEvento: TipoEventoEnum.COSECHA,
        timestampCapturaLocal: `${cosecha.fecha}T08:00:00.000Z`,
        payloadEspecifico: {
          cosechaId: cosecha.id,
          codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
          cicloId: ciclo.id,
          codigoCiclo: ciclo.codigoCiclo,
          cantidadCosechadaKg: cosecha.cantidadCosechadaKg,
          cantidadComercializableKg: cosecha.cantidadComercializableKg,
          cantidadDescarteKg: cosecha.cantidadDescarteKg,
          motivoDescarte: cosecha.motivoDescarte,
        },
      });

      await this.eventosRepo.guardarConTransaccion(evento, lote);
    } else {
      await this.lotesRepo.guardar(lote);
    }

    return this.mapToDto(cosecha, lote.codigoLote.value, ciclo.codigoCiclo);
  }

  private mapToDto(cosecha: Cosecha, codigoLote?: string, codigoCiclo?: string): CosechaOutputDto {
    const raw = cosecha.toJSON();
    return {
      id: raw.id,
      codigoTrazabilidad: raw.codigoTrazabilidad,
      loteId: raw.loteId,
      codigoLote,
      cicloId: raw.cicloId,
      codigoCiclo,
      fecha: raw.fecha,
      cantidadCosechadaKg: raw.cantidadCosechadaKg,
      cantidadComercializableKg: raw.cantidadComercializableKg,
      cantidadDescarteKg: raw.cantidadDescarteKg,
      porcentajeComercializable: cosecha.porcentajeComercializable,
      porcentajeDescarte: cosecha.porcentajeDescarte,
      motivoDescarte: raw.motivoDescarte,
      observacionesCalidad: raw.observacionesCalidad,
      responsableId: raw.responsableId,
      cuadrillaId: raw.cuadrillaId,
      recipientes: raw.recipientes,
      superficieCosechadaHa: raw.superficieCosechadaHa,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}

export class ListarCosechasUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
  ) {}

  public async execute(filtros?: ListarCosechasFiltrosDto): Promise<CosechaOutputDto[]> {
    const cosechas = await this.cosechasRepo.listar(filtros);

    const lotesMap = new Map<string, string>();
    const ciclosMap = new Map<string, string>();

    const results: CosechaOutputDto[] = [];
    for (const cosecha of cosechas) {
      if (!lotesMap.has(cosecha.loteId)) {
        const l = await this.lotesRepo.buscarPorId(cosecha.loteId);
        if (l) lotesMap.set(cosecha.loteId, l.codigoLote.value);
      }
      if (!ciclosMap.has(cosecha.cicloId)) {
        const c = await this.ciclosRepo.buscarPorId(cosecha.cicloId);
        if (c) ciclosMap.set(cosecha.cicloId, c.codigoCiclo);
      }

      const raw = cosecha.toJSON();
      results.push({
        id: raw.id,
        codigoTrazabilidad: raw.codigoTrazabilidad,
        loteId: raw.loteId,
        codigoLote: lotesMap.get(raw.loteId),
        cicloId: raw.cicloId,
        codigoCiclo: ciclosMap.get(raw.cicloId),
        fecha: raw.fecha,
        cantidadCosechadaKg: raw.cantidadCosechadaKg,
        cantidadComercializableKg: raw.cantidadComercializableKg,
        cantidadDescarteKg: raw.cantidadDescarteKg,
        porcentajeComercializable: cosecha.porcentajeComercializable,
        porcentajeDescarte: cosecha.porcentajeDescarte,
        motivoDescarte: raw.motivoDescarte,
        observacionesCalidad: raw.observacionesCalidad,
        responsableId: raw.responsableId,
        cuadrillaId: raw.cuadrillaId,
        recipientes: raw.recipientes,
        superficieCosechadaHa: raw.superficieCosechadaHa,
        creadoEn: raw.creadoEn,
        actualizadoEn: raw.actualizadoEn,
      });
    }

    return results;
  }
}

export class ObtenerCosechaPorIdUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
  ) {}

  public async execute(id: string): Promise<CosechaOutputDto> {
    const cosecha = await this.cosechasRepo.buscarPorId(id);
    if (!cosecha) {
      throw new EntidadNoEncontradaError('Cosecha', id);
    }

    const lote = await this.lotesRepo.buscarPorId(cosecha.loteId);
    const ciclo = await this.ciclosRepo.buscarPorId(cosecha.cicloId);
    const raw = cosecha.toJSON();

    return {
      id: raw.id,
      codigoTrazabilidad: raw.codigoTrazabilidad,
      loteId: raw.loteId,
      codigoLote: lote?.codigoLote.value,
      cicloId: raw.cicloId,
      codigoCiclo: ciclo?.codigoCiclo,
      fecha: raw.fecha,
      cantidadCosechadaKg: raw.cantidadCosechadaKg,
      cantidadComercializableKg: raw.cantidadComercializableKg,
      cantidadDescarteKg: raw.cantidadDescarteKg,
      porcentajeComercializable: cosecha.porcentajeComercializable,
      porcentajeDescarte: cosecha.porcentajeDescarte,
      motivoDescarte: raw.motivoDescarte,
      observacionesCalidad: raw.observacionesCalidad,
      responsableId: raw.responsableId,
      cuadrillaId: raw.cuadrillaId,
      recipientes: raw.recipientes,
      superficieCosechadaHa: raw.superficieCosechadaHa,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}
