import { AplicacionAgricola } from '../../core/domain/entities/aplicacion-agricola.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CicloNoAbiertoError,
} from '../../core/domain/errors/domain.error.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import {
  RegistrarAplicacionInputDto,
  AplicacionOutputDto,
  ListarAplicacionesFiltrosDto,
  AplicacionLineaOutputDto,
} from '../dtos/aplicaciones.dto.js';

export class RegistrarAplicacionUseCase {
  constructor(
    private readonly aplicacionesRepo: AplicacionesRepositoryPort,
    private readonly actividadesRepo: ActividadesRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly ciclosRepo: CiclosRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
  ) {}

  public async execute(
    input: RegistrarAplicacionInputDto,
    fechaReferenciaHoy?: Date,
  ): Promise<AplicacionOutputDto> {
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

    // 4. Regla RN-03 / RF-M4-03 / RF-M4-05: El ciclo debe estar en estado ABIERTO
    if (!ciclo.estaAbierto()) {
      throw new CicloNoAbiertoError(
        `El ciclo '${ciclo.codigoCiclo}' se encuentra en estado '${ciclo.estado}'. Solo se pueden registrar aplicaciones en ciclos ABIERTOS (RF-M4-05 / RN-03).`
      );
    }

    // 5. Validar existencia de la Actividad Agrícola
    const actividad = await this.actividadesRepo.buscarPorId(input.actividadId);
    if (!actividad) {
      throw new EntidadNoEncontradaError('ActividadAgricola', input.actividadId);
    }

    // 6. Regla RN-01: La actividad debe corresponder al mismo lote y ciclo
    if (actividad.loteId !== lote.id || actividad.cicloId !== ciclo.id) {
      throw new InconsistenciaLoteCicloError(
        `La actividad '${actividad.codigoActividad}' no corresponde al lote '${lote.id}' o al ciclo '${ciclo.id}' (RF-M4-03 / RN-01).`
      );
    }

    // 7. Validar existencia de cada insumo en el Catálogo Maestro (RF-M4-01 / RF-M4-06)
    const insumosMap = new Map<string, { nombreComercial: string; categoria: string }>();
    for (const linea of input.lineas) {
      const insumo = await this.insumosRepo.buscarPorId(linea.insumoId);
      if (!insumo) {
        throw new EntidadNoEncontradaError('InsumoCatalogo', linea.insumoId);
      }
      insumosMap.set(insumo.id, {
        nombreComercial: insumo.nombreComercial,
        categoria: insumo.categoria,
      });
    }

    // 8. Instanciar Entidad de Dominio (aplica validaciones de dosis RF-M4-04, clima RF-M4-12, equipo RF-M4-11 y RN-04)
    const aplicacion = AplicacionAgricola.crear({
      id: crypto.randomUUID(),
      actividadId: input.actividadId,
      loteId: input.loteId,
      cicloId: input.cicloId,
      fecha: input.fecha,
      responsableId: input.responsableId ?? null,
      metodo: input.metodo,
      motivo: input.motivo,
      equipoAplicacion: input.equipoAplicacion,
      condicionesClima: input.condicionesClima ?? null,
      lineas: input.lineas.map(l => ({
        id: crypto.randomUUID(),
        insumoId: l.insumoId,
        cantidadTotal: l.cantidadTotal,
        unidadMedidaId: l.unidadMedidaId,
        dosisPorSuperficie: l.dosisPorSuperficie ?? null,
        dosisPorPlanta: l.dosisPorPlanta ?? null,
        concentracion: l.concentracion ?? null,
      })),
      recomendacionTecnica: input.recomendacionTecnica ?? null,
      fechaReferenciaHoy,
    });

    // 9. Persistir la aplicación (transaccionalidad ACID conforme a RN-10)
    await this.aplicacionesRepo.guardar(aplicacion);

    return this.mapToDto(aplicacion, insumosMap);
  }

  private mapToDto(
    aplicacion: AplicacionAgricola,
    insumosMap: Map<string, { nombreComercial: string; categoria: string }>,
  ): AplicacionOutputDto {
    const raw = aplicacion.toJSON();

    const lineasDto: AplicacionLineaOutputDto[] = raw.lineas.map(l => {
      const info = insumosMap.get(l.insumoId);
      return {
        id: l.id,
        insumoId: l.insumoId,
        nombreComercial: info?.nombreComercial,
        categoriaInsumo: info?.categoria,
        cantidadTotal: l.cantidadTotal,
        unidadMedidaId: l.unidadMedidaId,
        dosisPorSuperficie: l.dosisPorSuperficie ?? null,
        dosisPorPlanta: l.dosisPorPlanta ?? null,
        concentracion: l.concentracion ?? null,
      };
    });

    return {
      id: raw.id,
      actividadId: raw.actividadId,
      loteId: raw.loteId,
      cicloId: raw.cicloId,
      fecha: raw.fecha,
      responsableId: raw.responsableId ?? null,
      metodo: raw.metodo,
      motivo: raw.motivo,
      equipoAplicacion: raw.equipoAplicacion,
      condicionesClima: raw.condicionesClima ?? null,
      lineas: lineasDto,
      recomendacionTecnica: raw.recomendacionTecnica ?? null,
      esMezcla: aplicacion.esMezcla(),
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}

export class ListarAplicacionesUseCase {
  constructor(
    private readonly aplicacionesRepo: AplicacionesRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
  ) {}

  public async execute(filtros?: ListarAplicacionesFiltrosDto): Promise<AplicacionOutputDto[]> {
    const aplicaciones = await this.aplicacionesRepo.listar(filtros);

    // Pre-cargar nombres de insumos para enriquecer respuesta
    const todosInsumos = await this.insumosRepo.listar();
    const insumosMap = new Map(
      todosInsumos.map(i => [i.id, { nombreComercial: i.nombreComercial, categoria: i.categoria }])
    );

    return aplicaciones.map(aplicacion => {
      const raw = aplicacion.toJSON();
      const lineasDto: AplicacionLineaOutputDto[] = raw.lineas.map(l => {
        const info = insumosMap.get(l.insumoId);
        return {
          id: l.id,
          insumoId: l.insumoId,
          nombreComercial: info?.nombreComercial,
          categoriaInsumo: info?.categoria,
          cantidadTotal: l.cantidadTotal,
          unidadMedidaId: l.unidadMedidaId,
          dosisPorSuperficie: l.dosisPorSuperficie ?? null,
          dosisPorPlanta: l.dosisPorPlanta ?? null,
          concentracion: l.concentracion ?? null,
        };
      });

      return {
        id: raw.id,
        actividadId: raw.actividadId,
        loteId: raw.loteId,
        cicloId: raw.cicloId,
        fecha: raw.fecha,
        responsableId: raw.responsableId ?? null,
        metodo: raw.metodo,
        motivo: raw.motivo,
        equipoAplicacion: raw.equipoAplicacion,
        condicionesClima: raw.condicionesClima ?? null,
        lineas: lineasDto,
        recomendacionTecnica: raw.recomendacionTecnica ?? null,
        esMezcla: aplicacion.esMezcla(),
        creadoEn: raw.creadoEn,
        actualizadoEn: raw.actualizadoEn,
      };
    });
  }
}

export class ObtenerAplicacionPorIdUseCase {
  constructor(
    private readonly aplicacionesRepo: AplicacionesRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
  ) {}

  public async execute(id: string): Promise<AplicacionOutputDto> {
    const aplicacion = await this.aplicacionesRepo.buscarPorId(id);
    if (!aplicacion) {
      throw new EntidadNoEncontradaError('AplicacionAgricola', id);
    }

    const todosInsumos = await this.insumosRepo.listar();
    const insumosMap = new Map(
      todosInsumos.map(i => [i.id, { nombreComercial: i.nombreComercial, categoria: i.categoria }])
    );

    const raw = aplicacion.toJSON();
    const lineasDto: AplicacionLineaOutputDto[] = raw.lineas.map(l => {
      const info = insumosMap.get(l.insumoId);
      return {
        id: l.id,
        insumoId: l.insumoId,
        nombreComercial: info?.nombreComercial,
        categoriaInsumo: info?.categoria,
        cantidadTotal: l.cantidadTotal,
        unidadMedidaId: l.unidadMedidaId,
        dosisPorSuperficie: l.dosisPorSuperficie ?? null,
        dosisPorPlanta: l.dosisPorPlanta ?? null,
        concentracion: l.concentracion ?? null,
      };
    });

    return {
      id: raw.id,
      actividadId: raw.actividadId,
      loteId: raw.loteId,
      cicloId: raw.cicloId,
      fecha: raw.fecha,
      responsableId: raw.responsableId ?? null,
      metodo: raw.metodo,
      motivo: raw.motivo,
      equipoAplicacion: raw.equipoAplicacion,
      condicionesClima: raw.condicionesClima ?? null,
      lineas: lineasDto,
      recomendacionTecnica: raw.recomendacionTecnica ?? null,
      esMezcla: aplicacion.esMezcla(),
      creadoEn: raw.creadoEn,
      actualizadoEn: raw.actualizadoEn,
    };
  }
}
