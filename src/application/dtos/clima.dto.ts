import { FuenteDatoClima } from '../../core/domain/entities/medicion-climatica.entity.js';

export interface RegistrarMedicionClimaticaInputDto {
  fincaId: string;
  fecha: string; // YYYY-MM-DD
  tempMinC?: number | null;
  tempMaxC?: number | null;
  tempMediaC?: number | null;
  precipitacionMm: number;
  humedadRelativaPct?: number | null;
  vientoKmH?: number | null;
  huboHelada?: boolean | null;
  huboGranizo?: boolean | null;
  fuenteDato: FuenteDatoClima;

  observaciones?: string | null;
  usuarioCargaId?: string | null;
  fechaReferenciaHoy?: Date;
}

export interface CorregirMedicionClimaticaInputDto {
  id: string; // ID de la medición a corregir
  motivoCorreccion: string;
  tempMinC?: number | null;
  tempMaxC?: number | null;
  tempMediaC?: number | null;
  precipitacionMm?: number | null;
  humedadRelativaPct?: number | null;
  vientoKmH?: number | null;
  huboHelada?: boolean | null;
  huboGranizo?: boolean | null;
  fuenteDato?: FuenteDatoClima | null;
  observaciones?: string | null;
  usuarioCargaId?: string | null;
  fechaReferenciaHoy?: Date;
}

export interface ImportarMedicionesCsvInputDto {
  fincaId: string;
  contenidoCsv: string;
  fuenteDatoPorDefecto?: FuenteDatoClima | null;
  usuarioCargaId?: string | null;
  fechaReferenciaHoy?: Date;
}


export interface ListarMedicionesClimaticasInputDto {
  fincaId: string;
  fechaDesde?: string;
  fechaHasta?: string;
  soloVigentes?: boolean;
}

export interface MedicionClimaticaOutputDto {
  id: string;
  fincaId: string;
  fecha: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  tempMediaC: number | null;
  precipitacionMm: number;
  humedadRelativaPct: number | null;
  vientoKmH: number | null;
  huboHelada: boolean;
  huboGranizo: boolean;
  fuenteDato: FuenteDatoClima;
  observaciones: string | null;
  esCorreccion: boolean;
  medicionOriginalId: string | null;
  motivoCorreccion: string | null;
  usuarioCargaId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ErrorFilaCsvDto {
  fila: number;
  error: string;
  datos?: Record<string, string>;
}

export interface ResultadoImportacionCsvDto {
  totalFilas: number;
  filasImportadas: number;
  filasFallidas: number;
  mediciones: MedicionClimaticaOutputDto[];
  errores: ErrorFilaCsvDto[];
}

import { TipoSiniestroClimatico } from '../../core/domain/entities/evento-climatico-adverso.entity.js';

export type EstadoAptitudPulverizacion = 'OPTIMO' | 'PRECAUCION' | 'DESFAVORABLE';

export interface ContextoClimaticoLaborDto {
  fincaId: string;
  loteId?: string | null;
  fecha: string;
  medicionDelDia: MedicionClimaticaOutputDto | null;
  lluviaUltimas24hMm: number;
  lluviaUltimas48hMm: number;
  temperaturaC: number | null;
  vientoKmH: number | null;
  humedadRelativaPct: number | null;
  aptoPulverizacion: boolean;
  estadoPulverizacion: EstadoAptitudPulverizacion;
  advertencias: string[];
  sugerenciaRiego: string;
}

export interface RegistrarEventoAdversoInputDto {
  fincaId: string;
  loteId: string;
  fecha: string;
  tipoSiniestro: TipoSiniestroClimatico;
  danoEstimadoPct: number;
  superficieAfectadaHa?: number | null;
  fotosUrls?: string[];
  descripcion: string;
  usuarioId?: string | null;
  fechaReferenciaHoy?: Date;
}

export interface EventoClimaticoAdversoOutputDto {
  id: string;
  fincaId: string;
  loteId: string;
  fecha: string;
  tipoSiniestro: TipoSiniestroClimatico;
  danoEstimadoPct: number;
  superficieAfectadaHa: number | null;
  fotosUrls: string[];
  descripcion: string;
  usuarioId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarEventosAdversosInputDto {
  fincaId?: string;
  loteId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoSiniestro?: TipoSiniestroClimatico;
}

export interface ResumenClimaticoCicloDto {
  loteId: string;
  fincaId: string;
  cicloId: string | null;
  periodo: {
    desde: string;
    hasta: string;
  };
  lluviaAcumuladaMm: number;
  diasConLluvia: number;
  diasHelada: number;
  diasCalorExtremo: number;
  tempMinimaAbsoluta: number | null;
  tempMaximaAbsoluta: number | null;
  tempPromedioGeneral: number | null;
  totalSiniestros: number;
  danoAcumuladoPromedioPct: number;
  siniestros: EventoClimaticoAdversoOutputDto[];
}

export interface HitoLaborClimaDto {
  tipo: 'ACTIVIDAD' | 'APLICACION' | 'SINIESTRO' | 'COSECHA';
  id: string;
  titulo: string;
  descripcion: string;
  detalles?: Record<string, unknown>;
}

export interface DiaSerieClimaticaDto {
  fecha: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  tempMediaC: number | null;
  precipitacionMm: number;
  lluviaAcumuladaMm: number;
  humedadRelativaPct: number | null;
  vientoKmH: number | null;
  huboHelada: boolean;
  huboGranizo: boolean;
  hitos: HitoLaborClimaDto[];
}

export interface SerieHistoricaClimaticaLoteDto {
  loteId: string;
  fincaId: string;
  periodo: {
    desde: string;
    hasta: string;
  };
  resumen: {
    lluviaAcumuladaMm: number;
    diasConLluvia: number;
    diasHelada: number;
    tempMinimaAbsoluta: number | null;
    tempMaximaAbsoluta: number | null;
    tempPromedioGeneral: number | null;
    totalHitos: number;
  };
  serieDiaria: DiaSerieClimaticaDto[];
}

