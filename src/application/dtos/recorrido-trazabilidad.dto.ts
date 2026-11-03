export interface LagunaInformacionDto {
  hitoOEntidad: string;
  campo: string;
  mensaje: string;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface AuditoriaCalidadTrazabilidadDto {
  tieneLagunas: boolean;
  totalLagunas: number;
  lagunas: LagunaInformacionDto[];
}

export interface OrigenPlantinesDto {
  codigoPartida?: string | null;
  proveedor?: string | null;
  variedad?: string | null;
  cantidadPlantines?: number | null;
}

export interface ResumenMeteorologicoDto {
  temperaturaPromedioC?: number | null;
  lluviaAcumuladaMm?: number | null;
  vientoPromedioKmH?: number | null;
  registrosClimaticosContados: number;
  observacionesClimaticas: string[];
}

export type TipoHitoTimeline =
  | 'INICIO_CICLO'
  | 'LABOR_CULTURAL'
  | 'MONITOREO'
  | 'APLICACION'
  | 'COSECHA'
  | 'CLASIFICACION'
  | 'ACONDICIONAMIENTO'
  | 'ALMACENAMIENTO'
  | 'DESPACHO'
  | 'DESTINO';

export interface HitoTimelineBaseDto {
  id: string;
  tipo: TipoHitoTimeline;
  fecha: string;
  titulo: string;
  descripcion: string;
  responsable?: string | null;
  tieneLagunas: boolean;
  lagunasHito: LagunaInformacionDto[];
  detalles: Record<string, any>;
}

export interface BalanceMasaCosechaDto {
  totalCosechadoKg: number;
  comercializableKg: number;
  descarteKg: number;
  acondicionadoKg?: number;
  almacenadoCamaraKg?: number;
  despachadoKg: number;
  saldoRemanenteKg: number;
}

export interface DetallePoscosechaTrazabilidadDto {
  clasificaciones?: Array<{
    id: string;
    fechaClasificacion: string;
    cantidadRecibidaKg: number;
    kgFresco: number;
    kgIndustria: number;
    kgDescarte: number;
    motivosDescarte?: any;
    partidas?: Array<{
      id: string;
      categoria: 'FRESCO' | 'INDUSTRIA';
      cantidadInicialKg: number;
      cantidadDisponibleKg: number;
    }>;
  }>;
  partidasProduccion?: Array<{
    id: string;
    categoria: 'FRESCO' | 'INDUSTRIA';
    cantidadInicialKg: number;
    cantidadDisponibleKg: number;
    cantidadAcondicionadaKg?: number;
    cantidadEnCamaraKg?: number;
    cantidadDestinadaKg?: number;
  }>;
  acondicionamientos?: Array<{
    id: string;
    partidaProduccionId: string;
    fechaAcondicionamiento: string;
    tipoAcondicionamiento: string;
    tipoEnvase: string;
    cantidadKg: number;
    cantidadEnvases: number;
  }>;
  movimientosAlmacenamiento?: Array<{
    id: string;
    partidaProduccionId: string;
    camaraSectorId: string;
    tipoMovimiento: 'INGRESO' | 'SALIDA';
    cantidadKg: number;
    fechaMovimiento: string;
  }>;
  destinos?: Array<{
    id: string;
    partidaProduccionId: string;
    fechaDestino: string;
    tipoDestino: string;
    destinoEspecifico: string;
    cantidadDestinadaKg: number;
  }>;
}

export interface RecorridoTrazabilidadOutputDto {
  identificadorConsultado: string;
  fechaConsulta: string;
  cosecha: {
    id: string;
    codigoTrazabilidad: string;
    fecha: string;
    estado: string;
    cantidadCosechadaKg: number;
    cantidadComercializableKg: number;
    cantidadDescarteKg: number;
    motivoAnulacion?: string | null;
    usuarioAnulacionId?: string | null;
    anuladoEn?: string | null;
    historialModificaciones?: any[];
  };
  lote: {
    id: string;
    codigoLote: string;
    producto: string;
    variedad: string | null;
    fincaId: string | null;
    fincaNombre?: string | null;
    fincaLocalidad?: string | null;
    fincaProvincia?: string | null;
    superficieHa: number | null;
  };
  ciclo: {
    id: string;
    codigoCiclo: string;
    cultivo: string;
    variedad: string | null;
    superficieCultivadaHa: number;
    fechaInicio: string;
    fechaFin: string | null;
    estado: string;
  };
  origenPlantines: OrigenPlantinesDto | null;
  poscosecha?: DetallePoscosechaTrazabilidadDto;
  balanceMasa: BalanceMasaCosechaDto;
  resumenMeteorologico: ResumenMeteorologicoDto;
  auditoriaCalidad: AuditoriaCalidadTrazabilidadDto;
  timeline: HitoTimelineBaseDto[];
}
