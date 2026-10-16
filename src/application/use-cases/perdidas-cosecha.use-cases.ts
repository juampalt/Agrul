import { PerdidaCosecha } from '../../core/domain/entities/perdida-cosecha.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CosechaInvalidaError,
} from '../../core/domain/errors/domain.error.js';
import { PerdidasCosechaRepositoryPort } from '../../core/ports/perdidas-cosecha-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import {
  ListarPerdidasCosechaFiltrosDto,
  PerdidaCosechaOutputDto,
  RegistrarPerdidaCosechaInputDto,
} from '../dtos/perdidas-cosecha.dto.js';

export class RegistrarPerdidaCosechaUseCase {
  constructor(
    private readonly perdidasRepo: PerdidasCosechaRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo?: CiclosRepositoryPort,
    private readonly cosechasRepo?: CosechasRepositoryPort,
  ) {}

  public async execute(
    input: RegistrarPerdidaCosechaInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<PerdidaCosechaOutputDto> {
    // 1. Validar Lote
    const lote = await this.lotesRepo.buscarPorId(input.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', input.loteId);
    }

    // 2. Validar Ciclo si viene presente
    let codigoCiclo: string | undefined;
    if (input.cicloId && this.ciclosRepo) {
      const ciclo = await this.ciclosRepo.buscarPorId(input.cicloId);
      if (!ciclo) {
        throw new EntidadNoEncontradaError('CicloProductivo', input.cicloId);
      }
      if (ciclo.loteId !== lote.id) {
        throw new InconsistenciaLoteCicloError(
          `El ciclo productivo '${ciclo.codigoCiclo}' no corresponde al lote '${lote.codigoLote.value}' (RN-01).`
        );
      }
      codigoCiclo = ciclo.codigoCiclo;
    }

    // 3. Validar Cosecha si viene asociada
    let codigoTrazabilidadCosecha: string | undefined;
    if (input.cosechaId && this.cosechasRepo) {
      const cosecha = await this.cosechasRepo.buscarPorId(input.cosechaId);
      if (!cosecha) {
        throw new EntidadNoEncontradaError('Cosecha', input.cosechaId);
      }
      if (cosecha.loteId !== lote.id) {
        throw new CosechaInvalidaError(
          `La cosecha '${cosecha.codigoTrazabilidad.value}' no corresponde al lote '${lote.codigoLote.value}'.`
        );
      }
      codigoTrazabilidadCosecha = cosecha.codigoTrazabilidad.value;
    }

    // 4. Instanciar y validar entidad de dominio
    const perdida = PerdidaCosecha.crear({
      id: crypto.randomUUID(),
      cosechaId: input.cosechaId ?? null,
      loteId: input.loteId,
      cicloId: input.cicloId ?? null,
      fecha: input.fecha,
      tipo: input.tipo,
      cantidadEstimadaKg: input.cantidadEstimadaKg,
      superficieAfectadaHa: input.superficieAfectadaHa ?? null,
      descripcion: input.descripcion,
      responsableRegistroId: input.responsableRegistroId ?? null,
      fechaReferenciaHoy,
    });

    // 5. Persistir
    await this.perdidasRepo.guardar(perdida);

    return {
      id: perdida.id,
      cosechaId: perdida.cosechaId,
      codigoTrazabilidadCosecha,
      loteId: perdida.loteId,
      codigoLote: lote.codigoLote.value,
      cicloId: perdida.cicloId,
      codigoCiclo,
      fecha: perdida.fecha,
      tipo: perdida.tipo,
      cantidadEstimadaKg: perdida.cantidadEstimadaKg,
      superficieAfectadaHa: perdida.superficieAfectadaHa,
      descripcion: perdida.descripcion,
      responsableRegistroId: perdida.responsableRegistroId,
      creadoEn: perdida.creadoEn,
      actualizadoEn: perdida.actualizadoEn,
    };
  }
}

export class ListarPerdidasCosechaUseCase {
  constructor(
    private readonly perdidasRepo: PerdidasCosechaRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo?: CiclosRepositoryPort,
    private readonly cosechasRepo?: CosechasRepositoryPort,
  ) {}

  public async execute(filtros?: ListarPerdidasCosechaFiltrosDto): Promise<PerdidaCosechaOutputDto[]> {
    const perdidas = await this.perdidasRepo.listar(filtros);

    const lotesMap = new Map<string, string>();
    const ciclosMap = new Map<string, string>();
    const cosechasMap = new Map<string, string>();

    const results: PerdidaCosechaOutputDto[] = [];
    for (const p of perdidas) {
      if (!lotesMap.has(p.loteId)) {
        const l = await this.lotesRepo.buscarPorId(p.loteId);
        if (l) lotesMap.set(p.loteId, l.codigoLote.value);
      }
      if (p.cicloId && !ciclosMap.has(p.cicloId) && this.ciclosRepo) {
        const c = await this.ciclosRepo.buscarPorId(p.cicloId);
        if (c) ciclosMap.set(p.cicloId, c.codigoCiclo);
      }
      if (p.cosechaId && !cosechasMap.has(p.cosechaId) && this.cosechasRepo) {
        const cos = await this.cosechasRepo.buscarPorId(p.cosechaId);
        if (cos) cosechasMap.set(p.cosechaId, cos.codigoTrazabilidad.value);
      }

      results.push({
        id: p.id,
        cosechaId: p.cosechaId,
        codigoTrazabilidadCosecha: p.cosechaId ? cosechasMap.get(p.cosechaId) : undefined,
        loteId: p.loteId,
        codigoLote: lotesMap.get(p.loteId),
        cicloId: p.cicloId,
        codigoCiclo: p.cicloId ? ciclosMap.get(p.cicloId) : undefined,
        fecha: p.fecha,
        tipo: p.tipo,
        cantidadEstimadaKg: p.cantidadEstimadaKg,
        superficieAfectadaHa: p.superficieAfectadaHa,
        descripcion: p.descripcion,
        responsableRegistroId: p.responsableRegistroId,
        creadoEn: p.creadoEn,
        actualizadoEn: p.actualizadoEn,
      });
    }

    return results;
  }
}

export class ObtenerPerdidaCosechaPorIdUseCase {
  constructor(
    private readonly perdidasRepo: PerdidasCosechaRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo?: CiclosRepositoryPort,
    private readonly cosechasRepo?: CosechasRepositoryPort,
  ) {}

  public async execute(id: string): Promise<PerdidaCosechaOutputDto> {
    const perdida = await this.perdidasRepo.buscarPorId(id);
    if (!perdida) {
      throw new EntidadNoEncontradaError('PerdidaCosecha', id);
    }

    const lote = await this.lotesRepo.buscarPorId(perdida.loteId);
    let codigoCiclo: string | undefined;
    if (perdida.cicloId && this.ciclosRepo) {
      const ciclo = await this.ciclosRepo.buscarPorId(perdida.cicloId);
      codigoCiclo = ciclo?.codigoCiclo;
    }
    let codigoTrazabilidadCosecha: string | undefined;
    if (perdida.cosechaId && this.cosechasRepo) {
      const cosecha = await this.cosechasRepo.buscarPorId(perdida.cosechaId);
      codigoTrazabilidadCosecha = cosecha?.codigoTrazabilidad.value;
    }

    return {
      id: perdida.id,
      cosechaId: perdida.cosechaId,
      codigoTrazabilidadCosecha,
      loteId: perdida.loteId,
      codigoLote: lote?.codigoLote.value,
      cicloId: perdida.cicloId,
      codigoCiclo,
      fecha: perdida.fecha,
      tipo: perdida.tipo,
      cantidadEstimadaKg: perdida.cantidadEstimadaKg,
      superficieAfectadaHa: perdida.superficieAfectadaHa,
      descripcion: perdida.descripcion,
      responsableRegistroId: perdida.responsableRegistroId,
      creadoEn: perdida.creadoEn,
      actualizadoEn: perdida.actualizadoEn,
    };
  }
}
