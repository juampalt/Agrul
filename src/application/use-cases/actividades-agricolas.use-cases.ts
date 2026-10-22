import { ActividadAgricola } from '../../core/domain/entities/actividad-agricola.entity.js';
import { EntidadNoEncontradaError, InconsistenciaLoteCicloError, CicloNoAbiertoError } from '../../core/domain/errors/domain.error.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CatalogosActividadesRepositoryPort } from '../../core/ports/catalogos-actividades-repository.port.js';
import { ObservacionesMonitoreoRepositoryPort } from '../../core/ports/observaciones-monitoreo-repository.port.js';
import {
  RegistrarActividadEjecutadaInputDto,
  AnularActividadInputDto,
  ActividadOutputDto,
  ListarActividadesFiltrosDto,
} from '../dtos/actividades.dto.js';

export class RegistrarActividadEjecutadaUseCase {
  constructor(
    private readonly actividadesRepo: ActividadesRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly catalogosRepo: CatalogosActividadesRepositoryPort,
    private readonly observacionesRepo?: ObservacionesMonitoreoRepositoryPort,
  ) {}

  public async execute(input: RegistrarActividadEjecutadaInputDto): Promise<ActividadOutputDto> {
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

    // 4. Regla RN-03: El ciclo debe encontrarse en estado ABIERTO
    if (!ciclo.estaAbierto()) {
      throw new CicloNoAbiertoError(
        `El ciclo '${ciclo.codigoCiclo}' se encuentra en estado '${ciclo.estado}'. Solo se pueden registrar actividades en ciclos ABIERTOS (RN-03).`
      );
    }

    // 5. Validar Tipo de Actividad
    const tipo = await this.catalogosRepo.buscarTipoActividadPorId(input.tipoActividadId);
    if (!tipo) {
      throw new EntidadNoEncontradaError('TipoActividad', input.tipoActividadId);
    }

    // 6. Validar Trabajador Responsable si se provee
    if (input.trabajadorResponsableId) {
      const responsable = await this.catalogosRepo.buscarPersonalPorId(input.trabajadorResponsableId);
      if (!responsable) {
        throw new EntidadNoEncontradaError('PersonalCuadrilla', input.trabajadorResponsableId);
      }
    }

    // 7. Validar Maquinarias si se proveen
    if (input.maquinarias && input.maquinarias.length > 0) {
      for (const m of input.maquinarias) {
        const maq = await this.catalogosRepo.buscarMaquinariaPorId(m.maquinariaId);
        if (!maq) {
          throw new EntidadNoEncontradaError('Maquinaria', m.maquinariaId);
        }
      }
    }

    // 8. Validar Mano de Obra si se provee
    if (input.manoDeObra && input.manoDeObra.length > 0) {
      for (const mo of input.manoDeObra) {
        const pers = await this.catalogosRepo.buscarPersonalPorId(mo.personalCuadrillaId);
        if (!pers) {
          throw new EntidadNoEncontradaError('PersonalCuadrilla', mo.personalCuadrillaId);
        }
      }
    }

    // 8.5. Validar Observación de Monitoreo si se especifica (RF-M3-10)
    if (input.observacionMonitoreoId && this.observacionesRepo) {
      const obs = await this.observacionesRepo.buscarPorId(input.observacionMonitoreoId);
      if (!obs) {
        throw new EntidadNoEncontradaError('ObservacionMonitoreo', input.observacionMonitoreoId);
      }
      if (obs.loteId !== lote.id || obs.cicloId !== ciclo.id) {
        throw new InconsistenciaLoteCicloError(
          `La observación de monitoreo '${obs.id}' no corresponde al lote '${lote.id}' o ciclo '${ciclo.id}' (RF-M3-10).`
        );
      }
    }

    // 9. Requisito RF-M3-04: Superficie trabajada toma por defecto la del ciclo si no se especifica
    const superficieTrabajadaHa = input.superficieTrabajadaHa !== undefined && input.superficieTrabajadaHa !== null
      ? Number(input.superficieTrabajadaHa)
      : ciclo.superficieCultivadaHa;

    // 10. Código de actividad
    const codigoActividad = input.codigoActividad && input.codigoActividad.trim().length > 0
      ? input.codigoActividad.trim()
      : await this.actividadesRepo.siguienteCodigo();

    // 11. Instanciar entidad de dominio (aplica RN-04: fechaHecho no puede ser futura)
    const actividad = ActividadAgricola.registrar({
      id: crypto.randomUUID(),
      codigoActividad,
      tipoActividadId: input.tipoActividadId,
      loteId: input.loteId,
      cicloId: input.cicloId,
      fechaHecho: input.fechaHecho,
      hora: input.hora ?? null,
      usuarioCargaId: input.usuarioCargaId,
      trabajadorResponsableId: input.trabajadorResponsableId ?? null,
      superficieTrabajadaHa,
      observaciones: input.observaciones ?? null,
      observacionMonitoreoId: input.observacionMonitoreoId ?? null,
      estado: input.estado ?? 'REALIZADA',
      maquinarias: input.maquinarias?.map(m => ({
        id: crypto.randomUUID(),
        maquinariaId: m.maquinariaId,
        horasUso: Number(m.horasUso),
      })),
      manoDeObra: input.manoDeObra?.map(mo => ({
        id: crypto.randomUUID(),
        personalCuadrillaId: mo.personalCuadrillaId,
        cantidadPersonas: Number(mo.cantidadPersonas),
        horasTrabajadas: Number(mo.horasTrabajadas),
        jornales: Number(mo.jornales),
      })),
      insumos: input.insumos?.map(ins => ({
        id: crypto.randomUUID(),
        insumoId: ins.insumoId,
        cantidad: Number(ins.cantidad),
        unidadMedidaId: ins.unidadMedidaId,
      })),
    });

    // 12. Persistir
    await this.actividadesRepo.guardar(actividad);

    return mapActividadToDto(actividad);
  }
}

export function mapActividadToDto(act: ActividadAgricola): ActividadOutputDto {
  const raw = act.toJSON();
  return {
    id: raw.id,
    codigoActividad: raw.codigoActividad,
    tipoActividadId: raw.tipoActividadId,
    loteId: raw.loteId,
    cicloId: raw.cicloId,
    fechaHecho: raw.fechaHecho,
    hora: raw.hora ?? null,
    usuarioCargaId: raw.usuarioCargaId,
    trabajadorResponsableId: raw.trabajadorResponsableId ?? null,
    superficieTrabajadaHa: raw.superficieTrabajadaHa,
    observaciones: raw.observaciones ?? null,
    observacionMonitoreoId: raw.observacionMonitoreoId ?? null,
    estado: raw.estado,
    motivoCancelacion: raw.motivoCancelacion ?? null,
    canceladoEn: raw.canceladoEn ?? null,
    maquinarias: raw.maquinarias.map(m => ({
      id: m.id!,
      maquinariaId: m.maquinariaId,
      horasUso: m.horasUso,
    })),
    manoDeObra: raw.manoDeObra.map(mo => ({
      id: mo.id!,
      personalCuadrillaId: mo.personalCuadrillaId,
      cantidadPersonas: mo.cantidadPersonas,
      horasTrabajadas: mo.horasTrabajadas,
      jornales: mo.jornales,
    })),
    insumos: (raw.insumos ?? []).map(ins => ({
      id: ins.id!,
      insumoId: ins.insumoId,
      cantidad: ins.cantidad,
      unidadMedidaId: ins.unidadMedidaId,
    })),
    creadoEn: raw.creadoEn,
    actualizadoEn: raw.actualizadoEn,
  };
}

export class ObtenerActividadPorIdUseCase {
  constructor(private readonly actividadesRepo: ActividadesRepositoryPort) {}

  public async execute(id: string): Promise<ActividadOutputDto> {
    const actividad = await this.actividadesRepo.buscarPorId(id);
    if (!actividad) {
      throw new EntidadNoEncontradaError('ActividadAgricola', id);
    }
    return mapActividadToDto(actividad);
  }
}

export class AnularActividadUseCase {
  constructor(private readonly actividadesRepo: ActividadesRepositoryPort) {}

  public async execute(input: AnularActividadInputDto): Promise<ActividadOutputDto> {
    const actividad = await this.actividadesRepo.buscarPorId(input.id);
    if (!actividad) {
      throw new EntidadNoEncontradaError('ActividadAgricola', input.id);
    }

    // Reglas RN-05 y RN-06: Baja lógica auditada con motivo obligatorio
    actividad.anular(input.motivo);

    await this.actividadesRepo.guardar(actividad);

    return mapActividadToDto(actividad);
  }
}

export class ListarActividadesUseCase {
  constructor(private readonly actividadesRepo: ActividadesRepositoryPort) {}

  public async execute(filtros?: ListarActividadesFiltrosDto): Promise<ActividadOutputDto[]> {
    const list = await this.actividadesRepo.listar(filtros);
    return list.map(act => mapActividadToDto(act));
  }
}

