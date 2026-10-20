import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { DespachosRepositoryPort } from '../../core/ports/despachos-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { DestinatariosRepositoryPort } from '../../core/ports/destinatarios-repository.port.js';
import { GenealogiaRepositoryPort } from '../../core/ports/genealogia-repository.port.js';
import { DespachoDestino } from '../../core/domain/entities/despacho-destino.entity.js';
import { DomainError, EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import {
  ConsultaInversaInsumoInputDto,
  ConsultaInversaInsumoOutputDto,
  InsumoRecallDetalleDto,
  AplicacionRecallDetalleDto,
  LoteRecallDetalleDto,
  CosechaRecallDetalleDto,
  DespachoRecallDetalleDto,
  DestinatarioNotificacionRecallDto,
  MetricasRecallDto,
} from '../dtos/consulta-inversa-insumo.dto.js';

export interface ConsultaInversaInsumoDeps {
  insumosRepo: InsumosCatalogoRepository;
  aplicacionesRepo: AplicacionesRepositoryPort;
  lotesRepo: LotesRepositoryPort;
  cosechasRepo: CosechasRepositoryPort;
  despachosRepo: DespachosRepositoryPort;
  fincasRepo?: FincasRepositoryPort;
  destinatariosRepo?: DestinatariosRepositoryPort;
  genealogiaRepo?: GenealogiaRepositoryPort;
}

export class ConsultaInversaInsumoError extends DomainError {
  public readonly code = 'INVALID_INVERSE_QUERY';
  constructor(mensaje: string) {
    super(mensaje);
  }
}

/**
 * Caso de Uso: Consulta Inversa de Trazabilidad para Retiro Preventivo de Insumos (Recall - RF-M6-12).
 * Dado un insumo, número de lote de fábrica o lote de insumo contaminado/objetado,
 * reconstruye toda la cadena descendente:
 *   Insumo -> Aplicaciones de Campo -> Lotes y Ciclos Afectados -> Cosechas Derivadas -> Despachos -> Clientes/Destinatarios.
 */
export class ConsultaInversaInsumoUseCase {
  constructor(private readonly deps: ConsultaInversaInsumoDeps) {}

  public async execute(input: ConsultaInversaInsumoInputDto): Promise<ConsultaInversaInsumoOutputDto> {
    const insumoId = input.insumoId?.trim() || undefined;
    const loteInsumoId = input.loteInsumoId?.trim() || undefined;
    const numeroLote = input.numeroLote?.trim() || undefined;

    if (!insumoId && !loteInsumoId && !numeroLote) {
      throw new ConsultaInversaInsumoError(
        'Debe proporcionar al menos un criterio de búsqueda: insumoId, loteInsumoId o numeroLote (RF-M6-12).'
      );
    }

    // 1. Obtener todas las aplicaciones que coincidan con los filtros
    const todasAplicaciones = await this.deps.aplicacionesRepo.listar();

    const aplicacionesCoincidentes = todasAplicaciones.filter(app => {
      return app.lineas.some(linea => {
        let coincide = true;
        if (insumoId && linea.insumoId !== insumoId) {
          coincide = false;
        }
        if (loteInsumoId && (linea as any).loteInsumoId !== loteInsumoId) {
          coincide = false;
        }
        if (numeroLote && (linea as any).numeroLote !== numeroLote) {
          coincide = false;
        }
        return coincide;
      });
    });

    // 2. Resolver datos del Insumo Objeto del Recall
    let targetInsumoId = insumoId;
    if (!targetInsumoId && aplicacionesCoincidentes.length > 0) {
      const matchLine = aplicacionesCoincidentes[0].lineas.find(l => {
        if (loteInsumoId && (l as any).loteInsumoId === loteInsumoId) return true;
        if (numeroLote && (l as any).numeroLote === numeroLote) return true;
        return false;
      });
      if (matchLine) {
        targetInsumoId = matchLine.insumoId;
      }
    }

    let insumoInfo: InsumoRecallDetalleDto;
    if (targetInsumoId) {
      const insumo = await this.deps.insumosRepo.buscarPorId(targetInsumoId);
      if (!insumo && insumoId) {
        throw new EntidadNoEncontradaError('InsumoCatalogo', insumoId);
      }
      if (insumo) {
        insumoInfo = {
          id: insumo.id,
          nombreComercial: insumo.nombreComercial,
          categoria: insumo.categoria,
          unidadMedidaId: insumo.unidadMedidaId,
          presentacion: insumo.presentacion,
          principioActivo: insumo.fichaFitosanitaria?.principioActivo ?? null,
          periodoCarenciaDias: insumo.fichaFitosanitaria?.periodoCarenciaDias ?? null,
          periodoReingresoHoras: insumo.fichaFitosanitaria?.periodoReingresoHoras ?? null,
          nroRegistroSenasa: insumo.fichaFitosanitaria?.nroRegistroSenasa ?? null,
          toxicologia: insumo.fichaFitosanitaria?.toxicologia ?? null,
          numeroLoteConsultado: numeroLote ?? null,
          loteInsumoIdConsultado: loteInsumoId ?? null,
        };
      } else {
        insumoInfo = {
          id: targetInsumoId,
          nombreComercial: 'Insumo no catalogado',
          categoria: 'FITOSANITARIO',
          unidadMedidaId: 'U',
          presentacion: 'No especificada',
          numeroLoteConsultado: numeroLote ?? null,
          loteInsumoIdConsultado: loteInsumoId ?? null,
        };
      }
    } else {
      insumoInfo = {
        id: 'DESCONOCIDO',
        nombreComercial: `Lote de Insumo ${numeroLote || loteInsumoId}`,
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'U',
        presentacion: 'No especificada',
        numeroLoteConsultado: numeroLote ?? null,
        loteInsumoIdConsultado: loteInsumoId ?? null,
      };
    }

    // 3. Procesar Aplicaciones Comprometidas
    const aplicacionesDto: AplicacionRecallDetalleDto[] = [];
    const directLotesMap = new Map<string, { fechaPrimerAplicacion: string; cicloId: string }>();

    for (const app of aplicacionesCoincidentes) {
      const lote = await this.deps.lotesRepo.buscarPorId(app.loteId);
      const matchingLine = app.lineas.find(l => {
        if (targetInsumoId && l.insumoId === targetInsumoId) return true;
        if (numeroLote && (l as any).numeroLote === numeroLote) return true;
        if (loteInsumoId && (l as any).loteInsumoId === loteInsumoId) return true;
        return false;
      }) ?? app.lineas[0];

      aplicacionesDto.push({
        aplicacionId: app.id,
        fecha: app.fecha,
        loteId: app.loteId,
        codigoLote: lote?.codigoLote?.value ?? app.loteId,
        cicloId: app.cicloId,
        metodo: app.metodo,
        motivo: app.motivo,
        equipoAplicacion: app.equipoAplicacion,
        responsableId: app.responsableId ?? null,
        cantidadAplicada: matchingLine.cantidadTotal,
        unidadMedidaId: matchingLine.unidadMedidaId,
        dosisPorSuperficie: matchingLine.dosisPorSuperficie ?? null,
        dosisPorPlanta: matchingLine.dosisPorPlanta ?? null,
        concentracion: matchingLine.concentracion ?? null,
        numeroLoteInsumo: (matchingLine as any).numeroLote ?? numeroLote ?? null,
        loteInsumoId: (matchingLine as any).loteInsumoId ?? loteInsumoId ?? null,
      });

      const actual = directLotesMap.get(app.loteId);
      if (!actual || app.fecha < actual.fechaPrimerAplicacion) {
        directLotesMap.set(app.loteId, { fechaPrimerAplicacion: app.fecha, cicloId: app.cicloId });
      }
    }

    // 4. Procesar Lotes Comprometidos (Directos y Descendientes por Grafo Linaje N:M)
    const lotesComprometidosMap = new Map<string, {
      esDescendiente: boolean;
      padreCodigo?: string | null;
      fechaReferencia: string;
      cicloId: string;
    }>();

    for (const [loteId, info] of directLotesMap.entries()) {
      lotesComprometidosMap.set(loteId, {
        esDescendiente: false,
        padreCodigo: null,
        fechaReferencia: info.fechaPrimerAplicacion,
        cicloId: info.cicloId,
      });

      // Expandir aguas abajo si hay repositorio de genealogía
      if (this.deps.genealogiaRepo) {
        try {
          const descendientes = await this.deps.genealogiaRepo.obtenerGrafoDescendientes(loteId);
          for (const rel of descendientes) {
            if (!lotesComprometidosMap.has(rel.loteHijoId)) {
              const lotePadre = await this.deps.lotesRepo.buscarPorId(rel.lotePadreId);
              lotesComprometidosMap.set(rel.loteHijoId, {
                esDescendiente: true,
                padreCodigo: lotePadre?.codigoLote?.value ?? rel.lotePadreId,
                fechaReferencia: info.fechaPrimerAplicacion,
                cicloId: info.cicloId,
              });
            }
          }
        } catch {
          // Continuar si la consulta de genealogía no devuelve relaciones
        }
      }
    }

    const lotesDto: LoteRecallDetalleDto[] = [];
    for (const [loteId, meta] of lotesComprometidosMap.entries()) {
      const lote = await this.deps.lotesRepo.buscarPorId(loteId);
      if (!lote) continue;

      let fincaNombre: string | null = null;
      let fincaLocalidad: string | null = null;
      let fincaProvincia: string | null = null;

      if (lote.fincaId && this.deps.fincasRepo) {
        const finca = await this.deps.fincasRepo.buscarPorId(lote.fincaId);
        if (finca) {
          fincaNombre = finca.nombre;
          fincaLocalidad = finca.ubicacion?.localidad ?? null;
          fincaProvincia = finca.ubicacion?.provincia ?? null;
        }
      }

      lotesDto.push({
        loteId: lote.id,
        codigoLote: lote.codigoLote.value,
        producto: lote.producto,
        variedad: lote.variedad ?? null,
        estadoActual: lote.estadoActual,
        fincaId: lote.fincaId ?? null,
        fincaNombre,
        fincaLocalidad,
        fincaProvincia,
        superficieHa: lote.superficieHa ?? null,
        cantidadActual: lote.cantidadActual,
        unidadMedida: lote.unidadMedida,
        esDescendienteLinaje: meta.esDescendiente,
        lotePadreOrigenCodigo: meta.padreCodigo ?? null,
      });
    }

    // 5. Procesar Cosechas Derivadas Comprometidas
    const cosechasDto: CosechaRecallDetalleDto[] = [];
    const cosechasComprometidasSet = new Set<string>();

    for (const [loteId, meta] of lotesComprometidosMap.entries()) {
      const lote = await this.deps.lotesRepo.buscarPorId(loteId);
      const cosechasDelLote = await this.deps.cosechasRepo.listar({ loteId });

      for (const cos of cosechasDelLote) {
        // La fruta está comprometida si se cosechó el mismo día o con posterioridad a la aplicación
        const fechaCosStr = cos.fecha.split('T')[0];
        const fechaAppStr = meta.fechaReferencia.split('T')[0];

        // Si es lote descendiente o la cosecha fue posterior a la aplicación:
        if (meta.esDescendiente || fechaCosStr >= fechaAppStr) {
          const diffMs = new Date(fechaCosStr).getTime() - new Date(fechaAppStr).getTime();
          const diasDesdeAplicacion = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

          const carenciaDias = insumoInfo.periodoCarenciaDias ?? 0;
          const alertaCarencia = carenciaDias > 0 && diasDesdeAplicacion < carenciaDias;

          cosechasComprometidasSet.add(cos.id);

          let despachosSum = 0;
          try {
            despachosSum = await this.deps.despachosRepo.sumarCantidadPorCosecha(cos.id);
          } catch {
            despachosSum = 0;
          }

          cosechasDto.push({
            cosechaId: cos.id,
            codigoTrazabilidad: cos.codigoTrazabilidad.value,
            loteId: cos.loteId,
            codigoLote: lote?.codigoLote?.value ?? cos.loteId,
            cicloId: cos.cicloId,
            fechaCosecha: cos.fecha,
            cantidadCosechadaTotalKg: cos.cantidadCosechadaKg,
            cantidadComercializableKg: cos.cantidadComercializableKg,
            cantidadDescarteKg: cos.cantidadDescarteKg,
            saldoDisponibleKg: Math.max(0, cos.cantidadComercializableKg - despachosSum),
            estado: cos.estado,
            diasDesdeAplicacion,
            alertaViolacionCarencia: alertaCarencia,
          });
        }
      }
    }

    // 6. Procesar Despachos y Destinatarios/Clientes Comprometidos
    const despachosDto: DespachoRecallDetalleDto[] = [];
    const destinatariosMap = new Map<string, {
      destinatarioId: string;
      nombre: string;
      tipo: string;
      cuit?: string | null;
      contacto?: string | null;
      telefono?: string | null;
      email?: string | null;
      localidad?: string | null;
      provincia?: string | null;
      totalKg: number;
      cantidadEnvios: number;
      remitos: Set<string>;
    }>();

    for (const cosechaDto of cosechasDto) {
      let despachosDeCosecha: DespachoDestino[] = [];
      try {
        despachosDeCosecha = await this.deps.despachosRepo.listarPorCosecha(cosechaDto.cosechaId);
      } catch {
        despachosDeCosecha = [];
      }

      for (const desp of despachosDeCosecha) {
        let destNombre = desp.destinatarioId;
        let destTipo = desp.tipoDestino;
        let destCuit: string | null = null;
        let destContacto: string | null = null;
        let destTelefono: string | null = null;
        let destEmail: string | null = null;
        let destLocalidad: string | null = null;
        let destProvincia: string | null = null;

        if (this.deps.destinatariosRepo) {
          const dest = await this.deps.destinatariosRepo.buscarPorId(desp.destinatarioId);
          if (dest) {
            destNombre = dest.nombre;
            destTipo = dest.tipo;
            destCuit = dest.cuit;
            destContacto = dest.contacto;
            destTelefono = dest.telefono;
            destEmail = dest.email;
            destLocalidad = dest.localidad;
            destProvincia = dest.provincia;
          }
        }

        despachosDto.push({
          despachoId: desp.id,
          cosechaId: desp.cosechaId,
          codigoTrazabilidad: cosechaDto.codigoTrazabilidad,
          nroGuiaRemito: desp.nroGuiaRemito,
          fecha: desp.fecha,
          destinatarioId: desp.destinatarioId,
          destinatarioNombre: destNombre,
          tipoDestino: desp.tipoDestino,
          cantidadEnviadaKg: desp.cantidadEnviadaKg,
          chofer: desp.chofer,
          patenteCamion: desp.patenteCamion,
        });

        const entry = destinatariosMap.get(desp.destinatarioId);
        if (!entry) {
          destinatariosMap.set(desp.destinatarioId, {
            destinatarioId: desp.destinatarioId,
            nombre: destNombre,
            tipo: destTipo,
            cuit: destCuit,
            contacto: destContacto,
            telefono: destTelefono,
            email: destEmail,
            localidad: destLocalidad,
            provincia: destProvincia,
            totalKg: desp.cantidadEnviadaKg,
            cantidadEnvios: 1,
            remitos: new Set([desp.nroGuiaRemito]),
          });
        } else {
          entry.totalKg += desp.cantidadEnviadaKg;
          entry.cantidadEnvios += 1;
          entry.remitos.add(desp.nroGuiaRemito);
        }
      }
    }

    const destinatariosDto: DestinatarioNotificacionRecallDto[] = Array.from(destinatariosMap.values()).map(d => ({
      destinatarioId: d.destinatarioId,
      nombre: d.nombre,
      tipo: d.tipo,
      cuit: d.cuit ?? null,
      contacto: d.contacto ?? null,
      telefono: d.telefono ?? null,
      email: d.email ?? null,
      localidad: d.localidad ?? null,
      provincia: d.provincia ?? null,
      totalKilosRecibidos: Math.round(d.totalKg * 100) / 100,
      cantidadEnvios: d.cantidadEnvios,
      remitosAfectados: Array.from(d.remitos),
    }));

    // 7. Calcular Métricas de Riesgo y Protocolo
    const totalKilosCosechados = cosechasDto.reduce((acc, c) => acc + c.cantidadComercializableKg, 0);
    const totalKilosEnMercado = despachosDto.reduce((acc, d) => acc + d.cantidadEnviadaKg, 0);
    const totalKilosEnStock = Math.max(0, totalKilosCosechados - totalKilosEnMercado);

    let nivelRiesgo: 'CRITICO' | 'ALTO' | 'MODERADO' = 'MODERADO';
    const hayViolacionCarencia = cosechasDto.some(c => c.alertaViolacionCarencia);

    if (totalKilosEnMercado > 0 && (hayViolacionCarencia || insumoInfo.toxicologia?.toUpperCase().includes('ROJA') || insumoInfo.toxicologia?.toUpperCase().includes('IB'))) {
      nivelRiesgo = 'CRITICO';
    } else if (totalKilosEnMercado > 0 || hayViolacionCarencia || cosechasDto.length > 2) {
      nivelRiesgo = 'ALTO';
    }

    const metricas: MetricasRecallDto = {
      totalAplicacionesAfectadas: aplicacionesDto.length,
      totalLotesComprometidos: lotesDto.length,
      totalCosechasComprometidas: cosechasDto.length,
      totalKilosCosechadosAfectados: Math.round(totalKilosCosechados * 100) / 100,
      totalKilosEnMercadoDespachados: Math.round(totalKilosEnMercado * 100) / 100,
      totalKilosEnStockPendientes: Math.round(totalKilosEnStock * 100) / 100,
      totalDestinatariosParaNotificar: destinatariosDto.length,
      nivelRiesgoSanitario: nivelRiesgo,
    };

    const protocoloRetiroSugerido: string[] = [
      '1. Bloqueo inmediato de stock en finca y cámaras frigoríficas para los lotes agrícolas y cosechas afectadas.',
      '2. Emisión y despacho de Notificación de Retiro Sanitario a los destinatarios que recibieron despachos en tránsito o entregados.',
      '3. Poner en cuarentena preventiva todo lote derivado por clasificación, fraccionamiento o mezcla en empaque.',
      '4. Notificación formal y remisión del expediente de trazabilidad inversa a la autoridad fitosanitaria (SENASA / DPA).',
      '5. Retención de contramuestras testigo del insumo y del fruto cosechado para peritaje de residuos en laboratorio homologado.',
      '6. Registro inmutable del incidente de retiro en la bitácora de trazabilidad conforme a la regla RN-06.',
    ];

    return {
      criterioBusqueda: {
        insumoId: insumoId ?? null,
        loteInsumoId: loteInsumoId ?? null,
        numeroLote: numeroLote ?? null,
      },
      fechaConsultaUtc: new Date().toISOString(),
      insumo: insumoInfo,
      metricas,
      aplicaciones: aplicacionesDto,
      lotes: lotesDto,
      cosechas: cosechasDto,
      despachos: despachosDto,
      destinatariosParaNotificar: destinatariosDto,
      protocoloRetiroSugerido,
    };
  }
}
