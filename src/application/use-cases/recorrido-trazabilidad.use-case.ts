import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { DespachosRepositoryPort } from '../../core/ports/despachos-repository.port.js';
import { DestinatariosRepositoryPort } from '../../core/ports/destinatarios-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { ClasificacionesRepositoryPort } from '../../core/ports/clasificaciones-repository.port.js';
import {
  PoscosechaAlmacenamientoRepositoryPort,
  AlmacenamientoProduccionRepositoryPort,
} from '../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { DestinosRepositoryPort } from '../../core/ports/destinos-repository.port.js';
import { MonitoreosRepositoryPort } from '../../core/ports/monitoreos-repository.port.js';
import { PlantacionesRepositoryPort } from '../../core/ports/plantaciones-repository.port.js';
import { CosechasRegistroRepositoryPort } from '../../core/ports/cosechas-registro-repository.port.js';
import { ActorCosechas } from '../../core/domain/entities/cosecha-registrada.js';
import { CodigoTrazabilidadCosecha } from '../../core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import {
  RecorridoTrazabilidadOutputDto,
  HitoTimelineBaseDto,
  LagunaInformacionDto,
  ResumenMeteorologicoDto,
  BalanceMasaCosechaDto,
  DetallePoscosechaTrazabilidadDto,
} from '../dtos/recorrido-trazabilidad.dto.js';

export interface ObtenerRecorridoTrazabilidadParams {
  identificador: string; // ID o código de cosecha, lote, ciclo, partida, clasificación o destino
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
  cosechasRegistroRepo?: CosechasRegistroRepositoryPort;
  clasificacionesRepo?: ClasificacionesRepositoryPort;
  poscosechaRepo?: PoscosechaAlmacenamientoRepositoryPort;
  almacenamientoRepo?: AlmacenamientoProduccionRepositoryPort;
  destinosRepo?: DestinosRepositoryPort;
  monitoreosRepo?: MonitoreosRepositoryPort;
  plantacionesRepo?: PlantacionesRepositoryPort;
}

export class ObtenerRecorridoTrazabilidadUseCase {
  constructor(private readonly deps: ObtenerRecorridoTrazabilidadDependencies) {}

  public async execute(params: ObtenerRecorridoTrazabilidadParams): Promise<RecorridoTrazabilidadOutputDto> {
    const { identificador } = params;
    if (!identificador || identificador.trim() === '') {
      throw new EntidadNoEncontradaError('Cosecha', identificador);
    }

    const idLimpio = identificador.trim();
    const actorInterno: ActorCosechas = { usuarioId: 'sistema-trazabilidad' };

    // 1. Localización bidireccional de la cosecha (RN-25: Trace-back desde cualquier punto de la cadena)
    let cosecha: any = await this.deps.cosechasRepo.buscarPorId(idLimpio);
    if (!cosecha) {
      cosecha = await this.deps.cosechasRepo.buscarPorCodigo(idLimpio);
    }

    // 1.1 Si no se encontró por ID/código directo, verificar en cosechasRegistroRepo (AGRUL-056)
    if (!cosecha && this.deps.cosechasRegistroRepo) {
      try {
        const cr = await this.deps.cosechasRegistroRepo.buscarPorId(idLimpio, actorInterno);
        if (cr) {
          cosecha = {
            id: cr.id,
            codigoTrazabilidad: CodigoTrazabilidadCosecha.crear(cr.codigoTrazabilidad),
            cicloId: cr.cicloId,
            loteId: cr.loteId,
            fecha: cr.fechaEfectiva ?? cr.fecha,
            cantidadCosechadaKg: cr.cantidadCosechadaKg,
            cantidadComercializableKg: cr.cantidadComercializableKg ?? cr.cantidadCosechadaKg,
            cantidadDescarteKg: cr.cantidadDescarteKg ?? 0,
            responsableId: cr.responsableId,
            cuadrillaId: null,
            motivoDescarte: null,
            observacionesCalidad: cr.observaciones,
            recipientes: [],
            superficieCosechadaHa: null,
            estado: cr.estado,
            toJSON: () => ({ historialModificaciones: [] }),
          };
        }
      } catch {
        // Continuar con resolución alternativa
      }
    }

    // 1.2 Resolución desde Destinos de Producción (Trace-back desde el cliente/despacho)
    if (!cosecha && this.deps.destinosRepo) {
      try {
        const destino = await this.deps.destinosRepo.obtenerDestino(idLimpio, actorInterno);
        if (destino && this.deps.poscosechaRepo) {
          const partida = await this.deps.poscosechaRepo.obtenerPartida(destino.partidaProduccionId, actorInterno);
          if (partida?.clasificacionId && this.deps.clasificacionesRepo) {
            const clasif = await this.deps.clasificacionesRepo.obtenerClasificacion(partida.clasificacionId, actorInterno);
            if (clasif?.cosechaId) {
              cosecha = await this.deps.cosechasRepo.buscarPorId(clasif.cosechaId) ??
                await this.deps.cosechasRepo.buscarPorCodigo(clasif.cosechaId);
            }
          }
        }
      } catch {
        // Continuar
      }
    }

    // 1.3 Resolución desde Partida de Producción
    if (!cosecha && this.deps.poscosechaRepo) {
      try {
        const partida = await this.deps.poscosechaRepo.obtenerPartida(idLimpio, actorInterno);
        if (partida?.clasificacionId && this.deps.clasificacionesRepo) {
          const clasif = await this.deps.clasificacionesRepo.obtenerClasificacion(partida.clasificacionId, actorInterno);
          if (clasif?.cosechaId) {
            cosecha = await this.deps.cosechasRepo.buscarPorId(clasif.cosechaId) ??
              await this.deps.cosechasRepo.buscarPorCodigo(clasif.cosechaId);
          }
        }
      } catch {
        // Continuar
      }
    }

    // 1.4 Resolución desde Clasificación de Cosecha
    if (!cosecha && this.deps.clasificacionesRepo) {
      try {
        const clasif = await this.deps.clasificacionesRepo.obtenerClasificacion(idLimpio, actorInterno);
        if (clasif?.cosechaId) {
          cosecha = await this.deps.cosechasRepo.buscarPorId(clasif.cosechaId) ??
            await this.deps.cosechasRepo.buscarPorCodigo(clasif.cosechaId);
        }
      } catch {
        // Continuar
      }
    }

    // 1.5 Resolución desde Lote (loteId o codigoLote)
    if (!cosecha) {
      let loteEncontrado = await this.deps.lotesRepo.buscarPorId(idLimpio);
      if (!loteEncontrado) {
        loteEncontrado = await this.deps.lotesRepo.buscarPorCodigo(idLimpio);
      }
      if (loteEncontrado) {
        const cosechasDelLote = await this.deps.cosechasRepo.listar({ loteId: loteEncontrado.id });
        if (cosechasDelLote.length > 0) {
          cosecha = cosechasDelLote.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        }
      }
    }

    // 1.6 Resolución desde Ciclo Productivo (cicloId o codigoCiclo)
    if (!cosecha && this.deps.ciclosRepo) {
      try {
        let cicloEncontrado = await this.deps.ciclosRepo.buscarPorId(idLimpio);
        if (!cicloEncontrado && typeof (this.deps.ciclosRepo as any).buscarPorCodigo === 'function') {
          cicloEncontrado = await (this.deps.ciclosRepo as any).buscarPorCodigo(idLimpio);
        }
        if (cicloEncontrado) {
          const cosechasDelCiclo = await this.deps.cosechasRepo.listar({ cicloId: cicloEncontrado.id });
          if (cosechasDelCiclo.length > 0) {
            cosecha = cosechasDelCiclo.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
          }
        }
      } catch {
        // Continuar
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

    // 3. Obtener Ciclo Productivo y Plantación
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

    // Origen de plantines / plantación
    let origenPlantinesData = {
      codigoPartida: null as string | null,
      proveedor: null as string | null,
      variedad: cicloProps.variedad,
      cantidadPlantines: null as number | null,
    };

    if (this.deps.plantacionesRepo && ciclo && (ciclo as any).plantacionId) {
      try {
        const plantacion = await this.deps.plantacionesRepo.buscarPorId((ciclo as any).plantacionId);
        if (plantacion) {
          const pProps = plantacion.toJSON();
          origenPlantinesData = {
            codigoPartida: pProps.id,
            proveedor: pProps.procedencia ?? null,
            variedad: cicloProps.variedad,
            cantidadPlantines: pProps.cantidadInicialPlantas ?? null,
          };
        }
      } catch {
        // Continuar
      }
    }

    // 4. Labores culturales
    const actividades = this.deps.actividadesRepo
      ? await this.deps.actividadesRepo.listar({ loteId: cosecha.loteId, cicloId: cosecha.cicloId })
      : [];

    // 5. Aplicaciones de campo
    const aplicaciones = this.deps.aplicacionesRepo
      ? await this.deps.aplicacionesRepo.listar({ loteId: cosecha.loteId, cicloId: cosecha.cicloId })
      : [];

    // 6. Despachos asociados
    const despachos = this.deps.despachosRepo
      ? await this.deps.despachosRepo.listarPorCosecha(cosecha.id)
      : [];

    // 7. Monitoreos fitosanitarios (RF-M3-11)
    let monitoreos: any[] = [];
    if (this.deps.monitoreosRepo) {
      try {
        monitoreos = await this.deps.monitoreosRepo.listar(
          { cicloId: cosecha.cicloId, limit: 100, offset: 0 }
        );
      } catch {
        monitoreos = [];
      }
    }

    // 8. Poscosecha: Clasificaciones, Acondicionamientos, Almacenamiento y Destinos (CU47–CU54)
    let clasificacionesList: any[] = [];
    let acondicionamientosList: any[] = [];
    let almacenamientoList: any[] = [];
    let destinosList: any[] = [];

    if (this.deps.clasificacionesRepo) {
      try {
        clasificacionesList = await this.deps.clasificacionesRepo.listarClasificaciones(
          { cosechaId: cosecha.id, limit: 100, offset: 0 },
          actorInterno
        );
      } catch {
        clasificacionesList = [];
      }
    }

    if (this.deps.poscosechaRepo && clasificacionesList.length > 0) {
      try {
        for (const cl of clasificacionesList) {
          if (cl.partidas && Array.isArray(cl.partidas)) {
            for (const part of cl.partidas) {
              const acons = await this.deps.poscosechaRepo.listarAcondicionamientos(
                { partidaProduccionId: part.id, limit: 100, offset: 0 },
                actorInterno
              );
              acondicionamientosList.push(...acons);
            }
          }
        }
      } catch {
        // Continuar
      }
    }

    if (this.deps.almacenamientoRepo && clasificacionesList.length > 0) {
      try {
        for (const cl of clasificacionesList) {
          if (cl.partidas && Array.isArray(cl.partidas)) {
            for (const part of cl.partidas) {
              const movs = await this.deps.almacenamientoRepo.listarMovimientos(
                { partidaProduccionId: part.id, limit: 100, offset: 0 },
                actorInterno
              );
              almacenamientoList.push(...movs);
            }
          }
        }
      } catch {
        // Continuar
      }
    }

    if (this.deps.destinosRepo && clasificacionesList.length > 0) {
      try {
        for (const cl of clasificacionesList) {
          if (cl.partidas && Array.isArray(cl.partidas)) {
            for (const part of cl.partidas) {
              const dests = await this.deps.destinosRepo.listarDestinos(
                { partidaProduccionId: part.id, limit: 100, offset: 0 },
                actorInterno
              );
              destinosList.push(...dests);
            }
          }
        }
      } catch {
        // Continuar
      }
    }

    // 9. Auditoría de Lagunas (RF-M6-06)
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

    // Hitos: Monitoreos de Campo
    for (const mon of monitoreos) {
      timeline.push({
        id: `mon-${mon.id}`,
        tipo: 'MONITOREO',
        fecha: mon.fechaInspeccion,
        titulo: `Monitoreo de Campo: ${mon.problemaDetectado ?? mon.tipoObservacion}`,
        descripcion: `Inspección en sector ${mon.sectorObservado}. Hallazgos: ${mon.descripcionHallazgos}${mon.accionRecomendada ? ' | Acción recomendada: ' + mon.accionRecomendada : ''}`,
        responsable: mon.responsableId,
        tieneLagunas: false,
        lagunasHito: [],
        detalles: {
          sectorObservado: mon.sectorObservado,
          etapaFenologica: mon.etapaFenologica,
          estadoGeneralCultivo: mon.estadoGeneralCultivo,
          tipoObservacion: mon.tipoObservacion,
          problemaDetectado: mon.problemaDetectado,
          descripcionHallazgos: mon.descripcionHallazgos,
          accionRecomendada: mon.accionRecomendada,
        },
      });
    }

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

    // Hitos: Clasificaciones Poscosecha (CU47 / CU48 / RN-20)
    for (const cl of clasificacionesList) {
      timeline.push({
        id: `clasif-${cl.id}`,
        tipo: 'CLASIFICACION',
        fecha: cl.fechaClasificacion,
        titulo: `Clasificación Poscosecha (${cl.cantidadRecibidaKg} kg)`,
        descripcion: `Fresco: ${cl.kgFresco} kg | Industria: ${cl.kgIndustria} kg | Descarte: ${cl.kgDescarte} kg`,
        responsable: cl.responsableId,
        tieneLagunas: false,
        lagunasHito: [],
        detalles: {
          clasificacionId: cl.id,
          cantidadRecibidaKg: cl.cantidadRecibidaKg,
          kgFresco: cl.kgFresco,
          kgIndustria: cl.kgIndustria,
          kgDescarte: cl.kgDescarte,
          motivosDescarte: cl.motivosDescarte,
        },
      });
    }

    // Hitos: Acondicionamientos (CU49 / CU50 / RN-21)
    for (const ac of acondicionamientosList) {
      timeline.push({
        id: `acon-${ac.id}`,
        tipo: 'ACONDICIONAMIENTO',
        fecha: ac.fechaAcondicionamiento,
        titulo: `Acondicionamiento: ${ac.tipoAcondicionamiento} (${ac.cantidadKg} kg)`,
        descripcion: `${ac.cantidadEnvases} envases (${ac.tipoEnvase}) acondicionados para partida ${ac.partidaProduccionId.slice(0, 8)}.`,
        responsable: ac.responsableId,
        tieneLagunas: false,
        lagunasHito: [],
        detalles: ac,
      });
    }

    // Hitos: Movimientos en Cámaras Frigoríficas (CU51 / CU52 / RN-23)
    for (const mov of almacenamientoList) {
      timeline.push({
        id: `cam-${mov.id}`,
        tipo: 'ALMACENAMIENTO',
        fecha: mov.fechaMovimiento,
        titulo: `Cámara Frigorífica: ${mov.tipoMovimiento} (${mov.cantidadKg} kg)`,
        descripcion: `${mov.tipoMovimiento} de ${mov.cantidadKg} kg en sector de cámara ${mov.camaraSectorId.slice(0, 8)}.`,
        responsable: mov.responsableId,
        tieneLagunas: false,
        lagunasHito: [],
        detalles: mov,
      });
    }

    // Hitos: Despachos y Destinos Comerciales (CU53 / CU54 / RN-24 / RN-25)
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

    // Destinos Poscosecha directos (CU53 / CU54)
    for (const dest of destinosList) {
      totalDespachadoKg += dest.cantidadDestinadaKg;
      timeline.push({
        id: `dest-${dest.id}`,
        tipo: 'DESTINO',
        fecha: dest.fechaDestino,
        titulo: `Destino Comercial: ${dest.tipoDestino} (${dest.cantidadDestinadaKg} kg)`,
        descripcion: `Asignación de ${dest.cantidadDestinadaKg} kg con destino específico '${dest.destinoEspecifico}'.`,
        responsable: dest.responsableId,
        tieneLagunas: false,
        lagunasHito: [],
        detalles: dest,
      });
    }

    // Ordenar timeline cronológicamente de forma ascendente
    timeline.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Balance de masa final
    let comercializableKg = cosecha.cantidadComercializableKg;
    let descarteKg = cosecha.cantidadDescarteKg;
    let acondicionadoKg = 0;
    let almacenadoCamaraKg = 0;

    if (clasificacionesList.length > 0) {
      const sumFresco = clasificacionesList.reduce((s, c) => s + (Number(c.kgFresco) || 0), 0);
      const sumIndustria = clasificacionesList.reduce((s, c) => s + (Number(c.kgIndustria) || 0), 0);
      const sumDescarte = clasificacionesList.reduce((s, c) => s + (Number(c.kgDescarte) || 0), 0);
      comercializableKg = sumFresco + sumIndustria;
      descarteKg = sumDescarte;
    }

    if (acondicionamientosList.length > 0) {
      acondicionadoKg = acondicionamientosList.reduce((s, a) => s + (Number(a.cantidadKg) || 0), 0);
    }

    if (almacenamientoList.length > 0) {
      almacenadoCamaraKg = almacenamientoList.reduce(
        (s, m) => s + (m.tipoMovimiento === 'INGRESO' ? Number(m.cantidadKg) : -Number(m.cantidadKg)),
        0
      );
      if (almacenadoCamaraKg < 0) almacenadoCamaraKg = 0;
    }

    const saldoRemanenteKg = Math.max(0, comercializableKg - totalDespachadoKg);
    const balanceMasa: BalanceMasaCosechaDto = {
      totalCosechadoKg: cosecha.cantidadCosechadaKg,
      comercializableKg,
      descarteKg,
      acondicionadoKg: acondicionadoKg > 0 ? acondicionadoKg : undefined,
      almacenadoCamaraKg: almacenadoCamaraKg > 0 ? almacenadoCamaraKg : undefined,
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

    const partidasProduccionList: any[] = [];
    for (const cl of clasificacionesList) {
      if (cl.partidas && Array.isArray(cl.partidas)) {
        partidasProduccionList.push(...cl.partidas);
      }
    }

    const poscosechaDto: DetallePoscosechaTrazabilidadDto | undefined =
      clasificacionesList.length > 0 || acondicionamientosList.length > 0 || almacenamientoList.length > 0 || destinosList.length > 0
        ? {
            clasificaciones: clasificacionesList,
            partidasProduccion: partidasProduccionList,
            acondicionamientos: acondicionamientosList,
            movimientosAlmacenamiento: almacenamientoList,
            destinos: destinosList,
          }
        : undefined;

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
      origenPlantines: origenPlantinesData,
      poscosecha: poscosechaDto,
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
