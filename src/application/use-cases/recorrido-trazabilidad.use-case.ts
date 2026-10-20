import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { DespachosRepositoryPort } from '../../core/ports/despachos-repository.port.js';
import { DestinatariosRepositoryPort } from '../../core/ports/destinatarios-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import {
  RecorridoTrazabilidadOutputDto,
  HitoTimelineBaseDto,
  LagunaInformacionDto,
  ResumenMeteorologicoDto,
  BalanceMasaCosechaDto,
} from '../dtos/recorrido-trazabilidad.dto.js';

export interface ObtenerRecorridoTrazabilidadParams {
  identificador: string; // ID o código de trazabilidad de cosecha, o ID/código de lote
}

export interface ObtenerRecorridoTrazabilidadDependencies {
  cosechasRepo: CosechasRepositoryPort;
  lotesRepo: LotesRepositoryPort;
  ciclosRepo?: CiclosRepositoryPort;
  actividadesRepo?: ActividadesRepositoryPort;
  aplicacionesRepo?: AplicacionesRepositoryPort;
  despachosRepo?: DespachosRepositoryPort;
  destinatariosRepo?: DestinatariosRepositoryPort;
  fincasRepo?: FincasRepositoryPort;
  insumosRepo?: InsumosCatalogoRepository;
}

export class ObtenerRecorridoTrazabilidadUseCase {
  constructor(private readonly deps: ObtenerRecorridoTrazabilidadDependencies) {}

  public async execute(params: ObtenerRecorridoTrazabilidadParams): Promise<RecorridoTrazabilidadOutputDto> {
    const { identificador } = params;
    if (!identificador || identificador.trim() === '') {
      throw new EntidadNoEncontradaError('Cosecha', identificador);
    }

    const idLimpio = identificador.trim();

    // 1. Localizar la cosecha (por ID, código de trazabilidad o por lote)
    let cosecha = await this.deps.cosechasRepo.buscarPorId(idLimpio);
    if (!cosecha) {
      cosecha = await this.deps.cosechasRepo.buscarPorCodigo(idLimpio);
    }

    // Si aún no se encontró, probar si el identificador corresponde a un lote
    if (!cosecha) {
      let loteEncontrado = await this.deps.lotesRepo.buscarPorId(idLimpio);
      if (!loteEncontrado) {
        loteEncontrado = await this.deps.lotesRepo.buscarPorCodigo(idLimpio);
      }
      if (loteEncontrado) {
        const cosechasDelLote = await this.deps.cosechasRepo.listar({ loteId: loteEncontrado.id });
        if (cosechasDelLote.length > 0) {
          // Tomar la cosecha más reciente del lote
          cosecha = cosechasDelLote.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        }
      }
    }

    if (!cosecha) {
      throw new EntidadNoEncontradaError('Cosecha', idLimpio);
    }

    // 2. Obtener Lote y Finca
    const lote = await this.deps.lotesRepo.buscarPorId(cosecha.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', cosecha.loteId);
    }

    let fincaNombre: string | null = null;
    let fincaLocalidad: string | null = null;
    let fincaProvincia: string | null = null;
    if (lote.fincaId && this.deps.fincasRepo) {
      const finca = await this.deps.fincasRepo.buscarPorId(lote.fincaId);
      if (finca) {
        fincaNombre = finca.nombre;
        fincaLocalidad = finca.ubicacion.localidad;
        fincaProvincia = finca.ubicacion.provincia;
      }
    }

    // 3. Obtener Ciclo Productivo
    let ciclo = this.deps.ciclosRepo ? await this.deps.ciclosRepo.buscarPorId(cosecha.cicloId) : null;
    const cicloProps = ciclo
      ? {
          id: ciclo.id,
          codigoCiclo: ciclo.codigoCiclo,
          cultivo: ciclo.cultivo,
          variedad: ciclo.variedad ?? lote.variedad ?? null,
          superficieCultivadaHa: ciclo.superficieCultivadaHa,
          fechaInicio: ciclo.fechaInicio,
          fechaFin: ciclo.fechaFin ?? null,
          estado: ciclo.estado,
        }
      : {
          id: cosecha.cicloId,
          codigoCiclo: 'CICLO-DESC',
          cultivo: lote.producto,
          variedad: lote.variedad ?? null,
          superficieCultivadaHa: lote.superficieHa ?? 0,
          fechaInicio: cosecha.fecha,
          fechaFin: null,
          estado: 'ABIERTO',
        };

    // 4. Labores culturales
    const actividades = this.deps.actividadesRepo
      ? await this.deps.actividadesRepo.listar({ loteId: cosecha.loteId, cicloId: cosecha.cicloId })
      : [];

    // 5. Aplicaciones de campo
    const aplicaciones = this.deps.aplicacionesRepo
      ? await this.deps.aplicacionesRepo.listar({ loteId: cosecha.loteId, cicloId: cosecha.cicloId })
      : [];

    // 6. Despachos asociados a esta cosecha
    const despachos = this.deps.despachosRepo
      ? await this.deps.despachosRepo.listarPorCosecha(cosecha.id)
      : [];

    // 7. Auditoría de Lagunas (RF-M6-06)
    const todasLasLagunas: LagunaInformacionDto[] = [];

    // Lagunas en origen / plantines
    if (!cicloProps.variedad && !lote.variedad) {
      todasLasLagunas.push({
        hitoOEntidad: 'ORIGEN_CULTIVO',
        campo: 'variedad',
        mensaje: 'No se declaró la variedad botánica específica para este ciclo de producción.',
        severidad: 'BAJA',
      });
    }

    // Lagunas en Cosecha
    const lagunasCosecha: LagunaInformacionDto[] = [];
    if (!cosecha.responsableId && !cosecha.cuadrillaId) {
      const lag: LagunaInformacionDto = {
        hitoOEntidad: 'COSECHA',
        campo: 'responsableId/cuadrillaId',
        mensaje: 'La cosecha no posee registrado al operario responsable ni a la cuadrilla de recolección.',
        severidad: 'ALTA',
      };
      lagunasCosecha.push(lag);
      todasLasLagunas.push(lag);
    }
    if (cosecha.cantidadDescarteKg > 0 && !cosecha.motivoDescarte) {
      const lag: LagunaInformacionDto = {
        hitoOEntidad: 'COSECHA',
        campo: 'motivoDescarte',
        mensaje: `Se registraron ${cosecha.cantidadDescarteKg} kg de descarte sin consignar motivo de descarte.`,
        severidad: 'MEDIA',
      };
      lagunasCosecha.push(lag);
      todasLasLagunas.push(lag);
    }

    // Construcción de Timeline cronológico
    const timeline: HitoTimelineBaseDto[] = [];

    // Hito 0: Inicio de Ciclo
    const lagunasCiclo: LagunaInformacionDto[] = [];
    if (!ciclo) {
      const lag: LagunaInformacionDto = {
        hitoOEntidad: 'CICLO_PRODUCTIVO',
        campo: 'cicloId',
        mensaje: 'No se localizó el registro maestro del ciclo productivo asociado a la cosecha.',
        severidad: 'ALTA',
      };
      lagunasCiclo.push(lag);
      todasLasLagunas.push(lag);
    }

    timeline.push({
      id: `ciclo-${cicloProps.id}`,
      tipo: 'INICIO_CICLO',
      fecha: cicloProps.fechaInicio,
      titulo: `Apertura de Ciclo: ${cicloProps.cultivo} (${cicloProps.codigoCiclo})`,
      descripcion: `Inicio de campaña agrícola para ${cicloProps.cultivo}${cicloProps.variedad ? ' var. ' + cicloProps.variedad : ''} en superficie de ${cicloProps.superficieCultivadaHa} ha.`,
      responsable: null,
      tieneLagunas: lagunasCiclo.length > 0,
      lagunasHito: lagunasCiclo,
      detalles: {
        codigoCiclo: cicloProps.codigoCiclo,
        cultivo: cicloProps.cultivo,
        variedad: cicloProps.variedad,
        superficieCultivadaHa: cicloProps.superficieCultivadaHa,
        estado: cicloProps.estado,
      },
    });

    // Hitos: Labores Culturales
    for (const act of actividades) {
      const lagunasAct: LagunaInformacionDto[] = [];
      if (!act.trabajadorResponsableId && !act.usuarioCargaId) {
        const lag: LagunaInformacionDto = {
          hitoOEntidad: `LABOR_${act.codigoActividad}`,
          campo: 'trabajadorResponsableId',
          mensaje: `La labor '${act.codigoActividad}' no tiene trabajador responsable asignado.`,
          severidad: 'MEDIA',
        };
        lagunasAct.push(lag);
        todasLasLagunas.push(lag);
      }
      if (!act.superficieTrabajadaHa || act.superficieTrabajadaHa <= 0) {
        const lag: LagunaInformacionDto = {
          hitoOEntidad: `LABOR_${act.codigoActividad}`,
          campo: 'superficieTrabajadaHa',
          mensaje: `La labor '${act.codigoActividad}' no tiene superficie trabajada declarada.`,
          severidad: 'BAJA',
        };
        lagunasAct.push(lag);
        todasLasLagunas.push(lag);
      }

      timeline.push({
        id: act.id,
        tipo: 'LABOR_CULTURAL',
        fecha: act.fechaHecho,
        titulo: `Labor Cultural: ${act.codigoActividad}`,
        descripcion: `Actividad agrícola ejecutada en ${act.superficieTrabajadaHa} ha.${act.observaciones ? ' Obs: ' + act.observaciones : ''}`,
        responsable: act.trabajadorResponsableId ?? act.usuarioCargaId,
        tieneLagunas: lagunasAct.length > 0,
        lagunasHito: lagunasAct,
        detalles: {
          codigoActividad: act.codigoActividad,
          tipoActividadId: act.tipoActividadId,
          superficieTrabajadaHa: act.superficieTrabajadaHa,
          estado: act.estado,
          maquinarias: act.maquinarias,
          manoDeObra: act.manoDeObra,
        },
      });
    }

    // Hitos: Aplicaciones Fitosanitarias
    const temperaturas: number[] = [];
    const vientos: number[] = [];
    let lluviaAcumulada = 0;
    const observacionesClima: string[] = [];

    for (const app of aplicaciones) {
      const lagunasApp: LagunaInformacionDto[] = [];

      if (!app.responsableId) {
        const lag: LagunaInformacionDto = {
          hitoOEntidad: `APLICACION_${app.id.slice(0, 8)}`,
          campo: 'responsableId',
          mensaje: `La aplicación realizada el ${app.fecha} no registra aplicador responsable.`,
          severidad: 'ALTA',
        };
        lagunasApp.push(lag);
        todasLasLagunas.push(lag);
      }

      if (!app.condicionesClima) {
        const lag: LagunaInformacionDto = {
          hitoOEntidad: `APLICACION_${app.id.slice(0, 8)}`,
          campo: 'condicionesClima',
          mensaje: `La aplicación del ${app.fecha} no tiene registradas condiciones meteorológicas de aplicación.`,
          severidad: 'MEDIA',
        };
        lagunasApp.push(lag);
        todasLasLagunas.push(lag);
      } else {
        if (typeof app.condicionesClima.tempC === 'number') temperaturas.push(app.condicionesClima.tempC);
        if (typeof app.condicionesClima.vientoKmH === 'number') vientos.push(app.condicionesClima.vientoKmH);
        if (typeof app.condicionesClima.lluviaMm === 'number') lluviaAcumulada += app.condicionesClima.lluviaMm;
        if (app.condicionesClima.observaciones) observacionesClima.push(app.condicionesClima.observaciones);
      }

      // Detalle enriquecido de líneas de insumos
      const lineasDetalle = [];
      for (const lin of app.lineas) {
        let insumoInfo: any = null;
        if (this.deps.insumosRepo) {
          const insumo = await this.deps.insumosRepo.buscarPorId(lin.insumoId);
          if (insumo) {
            insumoInfo = {
              nombreComercial: insumo.nombreComercial,
              categoria: insumo.categoria,
              principioActivo: insumo.fichaFitosanitaria?.principioActivo ?? null,
              periodoCarenciaDias: insumo.fichaFitosanitaria?.periodoCarenciaDias ?? null,
              periodoReingresoHoras: insumo.fichaFitosanitaria?.periodoReingresoHoras ?? null,
              nroRegistroSenasa: insumo.fichaFitosanitaria?.nroRegistroSenasa ?? null,
            };
          }
        }

        lineasDetalle.push({
          insumoId: lin.insumoId,
          nombreComercial: insumoInfo?.nombreComercial ?? 'Insumo no catalogado',
          cantidadTotal: lin.cantidadTotal,
          unidadMedidaId: lin.unidadMedidaId,
          dosisPorSuperficie: lin.dosisPorSuperficie ?? null,
          dosisPorPlanta: lin.dosisPorPlanta ?? null,
          concentracion: lin.concentracion ?? null,
          principioActivo: insumoInfo?.principioActivo ?? null,
          periodoCarenciaDias: insumoInfo?.periodoCarenciaDias ?? null,
          periodoReingresoHoras: insumoInfo?.periodoReingresoHoras ?? null,
          nroRegistroSenasa: insumoInfo?.nroRegistroSenasa ?? null,
        });
      }

      timeline.push({
        id: app.id,
        tipo: 'APLICACION',
        fecha: app.fecha,
        titulo: `Aplicación de Insumos (${app.metodo})`,
        descripcion: `Aplicación ${app.metodo} con equipo '${app.equipoAplicacion}'. Motivo: ${app.motivo}.`,
        responsable: app.responsableId,
        tieneLagunas: lagunasApp.length > 0,
        lagunasHito: lagunasApp,
        detalles: {
          metodo: app.metodo,
          motivo: app.motivo,
          equipoAplicacion: app.equipoAplicacion,
          condicionesClima: app.condicionesClima ?? null,
          lineas: lineasDetalle,
          recomendacionTecnica: app.recomendacionTecnica ?? null,
        },
      });
    }

    // Hito: Cosecha
    timeline.push({
      id: cosecha.id,
      tipo: 'COSECHA',
      fecha: cosecha.fecha,
      titulo: `Cosecha de Lote (${cosecha.codigoTrazabilidad.value})`,
      descripcion: `Recolección de ${cosecha.cantidadCosechadaKg} kg (${cosecha.cantidadComercializableKg} kg comercializables, ${cosecha.cantidadDescarteKg} kg descarte).`,
      responsable: cosecha.responsableId,
      tieneLagunas: lagunasCosecha.length > 0,
      lagunasHito: lagunasCosecha,
      detalles: {
        codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
        cantidadCosechadaKg: cosecha.cantidadCosechadaKg,
        cantidadComercializableKg: cosecha.cantidadComercializableKg,
        cantidadDescarteKg: cosecha.cantidadDescarteKg,
        motivoDescarte: cosecha.motivoDescarte,
        observacionesCalidad: cosecha.observacionesCalidad,
        recipientes: cosecha.recipientes,
        superficieCosechadaHa: cosecha.superficieCosechadaHa,
        estado: cosecha.estado,
      },
    });

    // Hitos: Despachos a Destino
    let totalDespachadoKg = 0;
    for (const desp of despachos) {
      totalDespachadoKg += desp.cantidadEnviadaKg;
      const lagunasDesp: LagunaInformacionDto[] = [];

      if (!desp.nroGuiaRemito || !desp.renspaFinca || !desp.productor) {
        const lag: LagunaInformacionDto = {
          hitoOEntidad: `DESPACHO_${desp.id.slice(0, 8)}`,
          campo: 'bpa_docs',
          mensaje: 'El despacho carece de algún dato obligatorio de cumplimiento BPA (Guía/Remito, RENSPA o Productor).',
          severidad: 'ALTA',
        };
        lagunasDesp.push(lag);
        todasLasLagunas.push(lag);
      }

      let destinatarioNombre = 'Destinatario no especificado';
      if (this.deps.destinatariosRepo) {
        const dest = await this.deps.destinatariosRepo.buscarPorId(desp.destinatarioId);
        if (dest) {
          destinatarioNombre = dest.nombre;
        }
      }

      timeline.push({
        id: desp.id,
        tipo: 'DESPACHO',
        fecha: desp.fecha,
        titulo: `Despacho a ${desp.tipoDestino} (${desp.cantidadEnviadaKg} kg)`,
        descripcion: `Envío comercial con Remito N° ${desp.nroGuiaRemito} hacia ${destinatarioNombre}.`,
        responsable: desp.productor,
        tieneLagunas: lagunasDesp.length > 0,
        lagunasHito: lagunasDesp,
        detalles: {
          destinatarioId: desp.destinatarioId,
          destinatarioNombre,
          tipoDestino: desp.tipoDestino,
          cantidadEnviadaKg: desp.cantidadEnviadaKg,
          nroGuiaRemito: desp.nroGuiaRemito,
          renspaFinca: desp.renspaFinca,
          productor: desp.productor,
          chofer: desp.chofer ?? null,
          patenteCamion: desp.patenteCamion ?? null,
          temperaturaTransporteC: desp.temperaturaTransporteC ?? null,
        },
      });
    }

    // Ordenar timeline cronológicamente de forma ascendente
    timeline.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Balance de masa final
    const saldoRemanenteKg = Math.max(0, cosecha.cantidadComercializableKg - totalDespachadoKg);
    const balanceMasa: BalanceMasaCosechaDto = {
      totalCosechadoKg: cosecha.cantidadCosechadaKg,
      comercializableKg: cosecha.cantidadComercializableKg,
      descarteKg: cosecha.cantidadDescarteKg,
      despachadoKg: totalDespachadoKg,
      saldoRemanenteKg,
    };

    // Resumen meteorológico (RF-M6-07)
    const tempPromedio = temperaturas.length > 0
      ? Number((temperaturas.reduce((acc, t) => acc + t, 0) / temperaturas.length).toFixed(1))
      : null;
    const vientoPromedio = vientos.length > 0
      ? Number((vientos.reduce((acc, v) => acc + v, 0) / vientos.length).toFixed(1))
      : null;

    const resumenMeteorologico: ResumenMeteorologicoDto = {
      temperaturaPromedioC: tempPromedio,
      lluviaAcumuladaMm: lluviaAcumulada > 0 ? Number(lluviaAcumulada.toFixed(1)) : null,
      vientoPromedioKmH: vientoPromedio,
      registrosClimaticosContados: temperaturas.length + vientos.length + (lluviaAcumulada > 0 ? 1 : 0),
      observacionesClimaticas: observacionesClima,
    };

    return {
      identificadorConsultado: idLimpio,
      fechaConsulta: new Date().toISOString(),
      cosecha: {
        id: cosecha.id,
        codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
        fecha: cosecha.fecha,
        estado: cosecha.estado,
        cantidadCosechadaKg: cosecha.cantidadCosechadaKg,
        cantidadComercializableKg: cosecha.cantidadComercializableKg,
        cantidadDescarteKg: cosecha.cantidadDescarteKg,
        motivoAnulacion: cosecha.motivoAnulacion ?? null,
        usuarioAnulacionId: cosecha.usuarioAnulacionId ?? null,
        anuladoEn: cosecha.anuladoEn ?? null,
        historialModificaciones: cosecha.toJSON().historialModificaciones,
      },
      lote: {
        id: lote.id,
        codigoLote: lote.codigoLote.value,
        producto: lote.producto,
        variedad: lote.variedad ?? null,
        fincaId: lote.fincaId ?? null,
        fincaNombre,
        fincaLocalidad,
        fincaProvincia,
        superficieHa: lote.superficieHa ?? null,
      },
      ciclo: cicloProps,
      origenPlantines: {
        codigoPartida: null,
        proveedor: null,
        variedad: cicloProps.variedad,
        cantidadPlantines: null,
      },
      balanceMasa,
      resumenMeteorologico,
      auditoriaCalidad: {
        tieneLagunas: todasLasLagunas.length > 0,
        totalLagunas: todasLasLagunas.length,
        lagunas: todasLasLagunas,
      },
      timeline,
    };
  }
}
