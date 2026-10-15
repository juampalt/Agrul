import { TipoDestinatario } from '../../core/domain/entities/destinatario.entity.js';
import { TipoDestino } from '../../core/domain/entities/despacho-destino.entity.js';

export interface CrearDestinatarioInputDto {
  nombre: string;
  tipo: TipoDestinatario;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

export interface DestinatarioOutputDto {
  id: string;
  nombre: string;
  tipo: string;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistrarDespachoInputDto {
  cosechaId: string;
  destinatarioId: string;
  tipoDestino: TipoDestino;
  cantidadEnviadaKg: number;
  fecha: string;
  nroGuiaRemito: string;
  renspaFinca: string;
  productor: string;
  precinto?: string;
  chofer?: string;
  patenteCamion?: string;
  temperaturaTransporteC?: number;
  observaciones?: string;
}

export interface DespachoOutputDto {
  id: string;
  cosechaId: string;
  destinatarioId: string;
  destinatarioNombre?: string;
  tipoDestino: string;
  cantidadEnviadaKg: number;
  fecha: string;
  nroGuiaRemito: string;
  renspaFinca: string;
  productor: string;
  precinto: string | null;
  chofer: string | null;
  patenteCamion: string | null;
  temperaturaTransporteC: number | null;
  observaciones: string | null;
  creadoEn: string;
}

export interface SaldoCosechaOutputDto {
  cosechaId: string;
  codigoTrazabilidad: string;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  totalDespachadoKg: number;
  saldoRemanenteKg: number;
  porcentajeDespachado: number;
  despachos: DespachoOutputDto[];
}

export interface DespachoConSaldoOutputDto {
  despacho: DespachoOutputDto;
  saldo: SaldoCosechaOutputDto;
}

export interface ListarDespachosFiltrosDto {
  cosechaId?: string;
  destinatarioId?: string;
  tipoDestino?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
