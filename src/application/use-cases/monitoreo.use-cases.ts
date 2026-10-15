import { ObservacionMonitoreo } from '../../core/domain/entities/observacion-monitoreo.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CicloNoAbiertoError,
} from '../../core/domain/errors/domain.error.js';
import { ObservacionesMonitoreoRepositoryPort } from '../../core/ports/observaciones-monitoreo-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import {
  RegistrarObservacionMonitoreoInputDto,
  ObservacionMonitoreoOutputDto,
  ListarObservacionesMonitoreoFiltrosDto,
} from '../dtos/monitoreo.dto.js';

export class RegistrarObservacionMonitoreoUseCase {
  constructor(
    private readonly observacionesRepo: ObservacionesMonitoreoRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
  ) {}

  public async execute(input: RegistrarObservacionMonitoreoInputDto): Promise<ObservacionMonitoreoOutputDto> {
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

    // 3. Regla RN-01: El ciclo debe pertenecer al lote
    if (ciclo.loteId !== lote.id) {
      throw new InconsistenciaLoteCicloError(
        `El ciclo productivo '${ciclo.codigoCiclo}' no corresponde al lote '${lote.codigoLote.value}' (RN-01).`
      );
    }

    // 4. Regla RN-03: Solo se registran observaciones en ciclos ABIERTOS
    if (!ciclo.estaAbierto()) {
      throw new CicloNoAbiertoError(
        `El ciclo '${ciclo.codigoCiclo}' se encuentra en estado '${ciclo.estado}'. Solo se pueden registrar observaciones en ciclos ABIERTOS (RN-03).`
      );
    }

    // 5. Instanciar entidad de dominio
    const observacion = ObservacionMonitoreo.crear({
      id: crypto.randomUUID(),
      loteId: input.loteId,
      cicloId: input.cicloId,
      fecha: input.fecha,
      sintomas: input.sintomas,
      plagas: input.plagas ?? null,
      estadoCultivo: input.estadoCultivo ?? 'GENERAL',
      fotosUrls: input.fotosUrls ?? [],
      usuarioId: input.usuarioId,
    });

    // 6. Persistir
    await this.observacionesRepo.guardar(observacion);

    return this.mapToDto(observacion);
  }

  private mapToDto(obs: ObservacionMonitoreo): ObservacionMonitoreoOutputDto {
    const raw = obs.toJSON();
    return {
      id: raw.id,
      loteId: raw.loteId,
      cicloId: raw.cicloId,
      fecha: raw.fecha,
      sintomas: raw.sintomas,
      plagas: raw.plagas ?? null,
      estadoCultivo: raw.estadoCultivo,
      fotosUrls: raw.fotosUrls,
      usuarioId: raw.usuarioId,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}

export class ListarObservacionesMonitoreoUseCase {
  constructor(private readonly observacionesRepo: ObservacionesMonitoreoRepositoryPort) {}

  public async execute(filtros?: ListarObservacionesMonitoreoFiltrosDto): Promise<ObservacionMonitoreoOutputDto[]> {
    const list = await this.observacionesRepo.listar(filtros);
    return list.map(obs => {
      const raw = obs.toJSON();
      return {
        id: raw.id,
        loteId: raw.loteId,
        cicloId: raw.cicloId,
        fecha: raw.fecha,
        sintomas: raw.sintomas,
        plagas: raw.plagas ?? null,
        estadoCultivo: raw.estadoCultivo,
        fotosUrls: raw.fotosUrls,
        usuarioId: raw.usuarioId,
        creadoEn: raw.creadoEn,
        actualizadoEn: raw.actualizadoEn,
      };
    });
  }
}

export class ObtenerObservacionMonitoreoPorIdUseCase {
  constructor(private readonly observacionesRepo: ObservacionesMonitoreoRepositoryPort) {}

  public async execute(id: string): Promise<ObservacionMonitoreoOutputDto> {
    const obs = await this.observacionesRepo.buscarPorId(id);
    if (!obs) {
      throw new EntidadNoEncontradaError('ObservacionMonitoreo', id);
    }
    const raw = obs.toJSON();
    return {
      id: raw.id,
      loteId: raw.loteId,
      cicloId: raw.cicloId,
      fecha: raw.fecha,
      sintomas: raw.sintomas,
      plagas: raw.plagas ?? null,
      estadoCultivo: raw.estadoCultivo,
      fotosUrls: raw.fotosUrls,
      usuarioId: raw.usuarioId,
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}
