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

export interface HitoTimelineBaseDto {
  id: string;
  tipo: 'INICIO_CICLO' | 'LABOR_CULTURAL' | 'APLICACION' | 'COSECHA' | 'DESPACHO';
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
  despachadoKg: number;
  saldoRemanenteKg: number;
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
  };
  lote: {
    id: string;
    codigoLote: string;
    producto: string;
    variedad: string | null;
    fincaId: string | null;
    fincaNombre?: string | null;
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
  balanceMasa: BalanceMasaCosechaDto;
  resumenMeteorologico: ResumenMeteorologicoDto;
  auditoriaCalidad: AuditoriaCalidadTrazabilidadDto;
  timeline: HitoTimelineBaseDto[];
}
