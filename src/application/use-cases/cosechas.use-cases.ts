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
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { VerificarCarenciaLoteUseCase } from './verificar-carencia.use-case.js';
import {
  AnularCosechaInputDto,
  CosechaOutputDto,
  ListarCosechasFiltrosDto,
  ModificarCosechaInputDto,
  RegistrarCosechaInputDto,
  RegistrarCosechaRapidaInputDto,
} from '../dtos/cosechas.dto.js';
import { ResultadoVerificacionCarenciaDto } from '../dtos/aplicaciones.dto.js';

export class RegistrarCosechaUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly eventosRepo?: EventosRepositoryPort,
    private readonly aplicacionesRepo?: AplicacionesRepositoryPort,
    private readonly insumosRepo?: InsumosCatalogoRepository,
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

    // 5. Verificación de Carencia Fitosanitaria (RF-M5-11 / RN-14) - No bloqueante
    let alertaCarencia: ResultadoVerificacionCarenciaDto | null = null;
    if (this.aplicacionesRepo && this.insumosRepo) {
      const verificador = new VerificarCarenciaLoteUseCase(
        this.aplicacionesRepo,
        this.insumosRepo,
        this.lotesRepo
      );
      const resultadoCarencia = await verificador.execute(
        { loteId: input.loteId, fecha: input.fecha },
        fechaReferenciaHoy
      );
      if (resultadoCarencia.totalAlertasCarencia > 0) {
        alertaCarencia = resultadoCarencia;
      }
    }

    // 6. Generar código de trazabilidad único algorítmico (RN-07 / RN-08 / RF-M5-03)
    const countPrevias = await this.cosechasRepo.contarPorLoteYFecha(lote.id, input.fecha);
    const secuencia = countPrevias + 1;
    const codigoTrazabilidad = CodigoTrazabilidadCosecha.generar(
      lote.codigoLote.value,
      input.fecha,
      secuencia
    );

    // 7. Instanciar entidad Cosecha (valida invariantes RN-09, RF-M5-02, RN-04)
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

    // 8. Persistir la cosecha
    await this.cosechasRepo.guardar(cosecha);

    // 9. Actualizar agregado Lote y registrar Evento de Trazabilidad inmutable (RN-07 / RF-M5-04)
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
          alertaCarencia: alertaCarencia ? {
            totalAlertasCarencia: alertaCarencia.totalAlertasCarencia,
            advertencias: alertaCarencia.advertencias,
          } : null,
        },
      });

      await this.eventosRepo.guardarConTransaccion(evento, lote);
    } else {
      await this.lotesRepo.guardar(lote);
    }

    return this.mapToDto(cosecha, lote.codigoLote.value, ciclo.codigoCiclo, alertaCarencia);
  }

  private mapToDto(
    cosecha: Cosecha,
    codigoLote?: string,
    codigoCiclo?: string,
    alertaCarencia?: ResultadoVerificacionCarenciaDto | null
  ): CosechaOutputDto {
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
      estado: raw.estado,
      motivoAnulacion: raw.motivoAnulacion,
      usuarioAnulacionId: raw.usuarioAnulacionId,
      anuladoEn: raw.anuladoEn,
      historialModificaciones: raw.historialModificaciones,
      alertaCarencia: alertaCarencia ?? null,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}

export class AnularCosechaUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly eventosRepo?: EventosRepositoryPort,
  ) {}

  public async execute(
    input: AnularCosechaInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<CosechaOutputDto> {
    const cosecha = await this.cosechasRepo.buscarPorId(input.cosechaId);
    if (!cosecha) {
      throw new EntidadNoEncontradaError('Cosecha', input.cosechaId);
    }

    const lote = await this.lotesRepo.buscarPorId(cosecha.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', cosecha.loteId);
    }

    const ciclo = await this.ciclosRepo.buscarPorId(cosecha.cicloId);

    // 1. Anulación lógica en entidad Cosecha (RN-05, RN-06)
    const fechaAnulacionIso = (fechaReferenciaHoy ?? new Date()).toISOString();
    cosecha.anular(input.usuarioId, input.motivo, fechaAnulacionIso);

    // 2. Persistir cosecha actualizada
    await this.cosechasRepo.guardar(cosecha);

    // 3. Compensación en balance de masa del Lote (RF-M5-12 / RN-06)
    if (cosecha.cantidadComercializableKg > 0) {
      lote.descontarCantidad(cosecha.cantidadComercializableKg);
    }

    // 4. Registro de evento inmutable compensatorio de anulación
    if (this.eventosRepo) {
      const eventoCompensacion = TraceEvent.crear({
        id: crypto.randomUUID(),
        loteId: lote.id,
        actorId: input.usuarioId,
        ubicacionId: lote.fincaId || crypto.randomUUID(),
        tipoEvento: TipoEventoEnum.COMPENSACION_ANULACION,
        timestampCapturaLocal: fechaAnulacionIso,
        eventoReferenciadoId: cosecha.id,
        payloadEspecifico: {
          cosechaId: cosecha.id,
          codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
          usuarioId: input.usuarioId,
          motivo: input.motivo,
          cantidadDescontadaKg: cosecha.cantidadComercializableKg,
        },
      });

      await this.eventosRepo.guardarConTransaccion(eventoCompensacion, lote);
    } else {
      await this.lotesRepo.guardar(lote);
    }

    const raw = cosecha.toJSON();
    return {
      id: raw.id,
      codigoTrazabilidad: raw.codigoTrazabilidad,
      loteId: raw.loteId,
      codigoLote: lote.codigoLote.value,
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
      estado: raw.estado,
      motivoAnulacion: raw.motivoAnulacion,
      usuarioAnulacionId: raw.usuarioAnulacionId,
      anuladoEn: raw.anuladoEn,
      historialModificaciones: raw.historialModificaciones,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}

export class ModificarCosechaUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly eventosRepo?: EventosRepositoryPort,
  ) {}

  public async execute(
    input: ModificarCosechaInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<CosechaOutputDto> {
    const cosecha = await this.cosechasRepo.buscarPorId(input.cosechaId);
    if (!cosecha) {
      throw new EntidadNoEncontradaError('Cosecha', input.cosechaId);
    }

    const lote = await this.lotesRepo.buscarPorId(cosecha.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', cosecha.loteId);
    }

    const ciclo = await this.ciclosRepo.buscarPorId(cosecha.cicloId);
    const comercializableAnterior = cosecha.cantidadComercializableKg;

    // 1. Modificación auditada en entidad (RN-05, RN-06)
    cosecha.modificar(input.usuarioId, input.motivo, input);

    // 2. Persistir cambios
    await this.cosechasRepo.guardar(cosecha);

    // 3. Ajuste de balance de masa del Lote
    const deltaComercializable = Number((cosecha.cantidadComercializableKg - comercializableAnterior).toFixed(4));
    if (deltaComercializable > 0) {
      lote.incrementarCantidad(deltaComercializable);
    } else if (deltaComercializable < 0) {
      lote.descontarCantidad(Math.abs(deltaComercializable));
    }

    // 4. Registro de evento inmutable compensatorio de ajuste
    const fechaAjusteIso = (fechaReferenciaHoy ?? new Date()).toISOString();
    if (this.eventosRepo && deltaComercializable !== 0) {
      const eventoAjuste = TraceEvent.crear({
        id: crypto.randomUUID(),
        loteId: lote.id,
        actorId: input.usuarioId,
        ubicacionId: lote.fincaId || crypto.randomUUID(),
        tipoEvento: TipoEventoEnum.COMPENSACION_AJUSTE,
        timestampCapturaLocal: fechaAjusteIso,
        eventoReferenciadoId: cosecha.id,
        payloadEspecifico: {
          cosechaId: cosecha.id,
          codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
          usuarioId: input.usuarioId,
          motivo: input.motivo,
          deltaComercializableKg: deltaComercializable,
          comercializableAnteriorKg: comercializableAnterior,
          comercializableNuevoKg: cosecha.cantidadComercializableKg,
        },
      });

      await this.eventosRepo.guardarConTransaccion(eventoAjuste, lote);
    } else {
      await this.lotesRepo.guardar(lote);
    }

    const raw = cosecha.toJSON();
    return {
      id: raw.id,
      codigoTrazabilidad: raw.codigoTrazabilidad,
      loteId: raw.loteId,
      codigoLote: lote.codigoLote.value,
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
      estado: raw.estado,
      motivoAnulacion: raw.motivoAnulacion,
      usuarioAnulacionId: raw.usuarioAnulacionId,
      anuladoEn: raw.anuladoEn,
      historialModificaciones: raw.historialModificaciones,
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
        estado: raw.estado,
        motivoAnulacion: raw.motivoAnulacion,
        usuarioAnulacionId: raw.usuarioAnulacionId,
        anuladoEn: raw.anuladoEn,
        historialModificaciones: raw.historialModificaciones,
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
      estado: raw.estado,
      motivoAnulacion: raw.motivoAnulacion,
      usuarioAnulacionId: raw.usuarioAnulacionId,
      anuladoEn: raw.anuladoEn,
      historialModificaciones: raw.historialModificaciones,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}

/**
 * Caso de Uso: RegistrarCosechaRapidaUseCase (AGRUL-031 / RF-M5-13 / RN-01 / RNF-01 / RNF-15)
 * Carga ultrarrápida de cosecha en campo para smartphone con guantes y bajo el sol:
 * Requiere únicamente 4 campos (Lote, Total, Comercializable y Fecha opcional/autocompletada).
 * Autocompleta ciclo activo, deduce descarte (RN-09) y emite advertencia de carencia (RN-14).
 */
export class RegistrarCosechaRapidaUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly eventosRepo?: EventosRepositoryPort,
    private readonly aplicacionesRepo?: AplicacionesRepositoryPort,
    private readonly insumosRepo?: InsumosCatalogoRepository,
  ) {}

  public async execute(
    input: RegistrarCosechaRapidaInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<CosechaOutputDto> {
    // 1. Resolver Lote por ID o por Código de Lote (flexibilidad para operarios de campo / lectores QR)
    let lote = await this.lotesRepo.buscarPorId(input.loteId);
    if (!lote) {
      lote = await this.lotesRepo.buscarPorCodigo(input.loteId);
    }
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', input.loteId);
    }

    // 2. Autocompletar Fecha actual si se omite (RN-01 / RF-M5-13)
    const fecha = input.fecha && input.fecha.trim().length > 0
      ? input.fecha.trim()
      : (fechaReferenciaHoy || new Date()).toISOString().split('T')[0];

    // 3. Autocompletar Ciclo Productivo activo si se omite (RF-M5-13)
    let cicloId = input.cicloId;
    if (!cicloId) {
      const cicloActivo = await this.ciclosRepo.buscarCicloAbiertoPorLote(lote.id);
      if (!cicloActivo) {
        throw new CicloNoAbiertoError(
          `El lote '${lote.codigoLote.value}' no posee ningún ciclo productivo ABIERTO. Inicie un ciclo antes de registrar cosechas (RN-03 / RF-M5-13).`
        );
      }
      cicloId = cicloActivo.id;
    }

    // 4. Calcular cantidad de descarte automáticamente si se omite (RN-09)
    let cantidadDescarteKg = input.cantidadDescarteKg;
    if (cantidadDescarteKg === undefined || cantidadDescarteKg === null) {
      cantidadDescarteKg = Math.max(
        0,
        Number((input.cantidadCosechadaKg - input.cantidadComercializableKg).toFixed(4))
      );
    }

    let motivoDescarte = input.motivoDescarte;
    if (cantidadDescarteKg > 0 && (!motivoDescarte || motivoDescarte.trim().length === 0)) {
      motivoDescarte = 'DESCARTE_CAMPO';
    }

    // 5. Delegar en el caso de uso central RegistrarCosechaUseCase
    const registrarCosecha = new RegistrarCosechaUseCase(
      this.cosechasRepo,
      this.lotesRepo,
      this.ciclosRepo,
      this.eventosRepo,
      this.aplicacionesRepo,
      this.insumosRepo,
    );

    return registrarCosecha.execute(
      {
        loteId: lote.id,
        cicloId,
        fecha,
        cantidadCosechadaKg: input.cantidadCosechadaKg,
        cantidadComercializableKg: input.cantidadComercializableKg,
        cantidadDescarteKg,
        motivoDescarte: motivoDescarte ?? null,
        observacionesCalidad: input.observacionesCalidad ?? null,
        responsableId: input.responsableId ?? null,
        cuadrillaId: input.cuadrillaId ?? null,
        recipientes: input.recipientes ?? null,
        superficieCosechadaHa: input.superficieCosechadaHa ?? null,
      },
      fechaReferenciaHoy,
    );
  }
}

