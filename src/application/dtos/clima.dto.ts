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
  huboHelada?: boolean;
  huboGranizo?: boolean;
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
  precipitacionMm?: number;
  humedadRelativaPct?: number | null;
  vientoKmH?: number | null;
  huboHelada?: boolean;
  huboGranizo?: boolean;
  fuenteDato?: FuenteDatoClima;
  observaciones?: string | null;
  usuarioCargaId?: string | null;
  fechaReferenciaHoy?: Date;
}

export interface ImportarMedicionesCsvInputDto {
  fincaId: string;
  contenidoCsv: string;
  fuenteDatoPorDefecto?: FuenteDatoClima;
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
