export interface ConsultaInversaInsumoInputDto {
  insumoId?: string;
  loteInsumoId?: string;
  numeroLote?: string;
}

export interface InsumoRecallDetalleDto {
  id: string;
  nombreComercial: string;
  categoria: string;
  unidadMedidaId: string;
  presentacion: string;
  principioActivo?: string | null;
  periodoCarenciaDias?: number | null;
  periodoReingresoHoras?: number | null;
  nroRegistroSenasa?: string | null;
  toxicologia?: string | null;
  numeroLoteConsultado?: string | null;
  loteInsumoIdConsultado?: string | null;
}

export interface AplicacionRecallDetalleDto {
  aplicacionId: string;
  fecha: string;
  loteId: string;
  codigoLote: string;
  cicloId: string;
  metodo: string;
  motivo: string;
  equipoAplicacion: string;
  responsableId?: string | null;
  cantidadAplicada: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null;
  dosisPorPlanta?: number | null;
  concentracion?: string | null;
  numeroLoteInsumo?: string | null;
  loteInsumoId?: string | null;
}

export interface LoteRecallDetalleDto {
  loteId: string;
  codigoLote: string;
  producto: string;
  variedad?: string | null;
  estadoActual: string;
  fincaId?: string | null;
  fincaNombre?: string | null;
  fincaLocalidad?: string | null;
  fincaProvincia?: string | null;
  superficieHa?: number | null;
  cantidadActual: number;
  unidadMedida: string;
  esDescendienteLinaje: boolean;
  lotePadreOrigenCodigo?: string | null;
}

export interface CosechaRecallDetalleDto {
  cosechaId: string;
  codigoTrazabilidad: string;
  loteId: string;
  codigoLote: string;
  cicloId: string;
  fechaCosecha: string;
  cantidadCosechadaTotalKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  saldoDisponibleKg: number;
  estado: string;
  diasDesdeAplicacion: number;
  alertaViolacionCarencia: boolean;
}

export interface DespachoRecallDetalleDto {
  despachoId: string;
  cosechaId: string;
  codigoTrazabilidad: string;
  nroGuiaRemito: string;
  fecha: string;
  destinatarioId: string;
  destinatarioNombre: string;
  tipoDestino: string;
  cantidadEnviadaKg: number;
  chofer?: string | null;
  patenteCamion?: string | null;
}

export interface DestinatarioNotificacionRecallDto {
  destinatarioId: string;
  nombre: string;
  tipo: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  totalKilosRecibidos: number;
  cantidadEnvios: number;
  remitosAfectados: string[];
}

export interface MetricasRecallDto {
  totalAplicacionesAfectadas: number;
  totalLotesComprometidos: number;
  totalCosechasComprometidas: number;
  totalKilosCosechadosAfectados: number;
  totalKilosEnMercadoDespachados: number;
  totalKilosEnStockPendientes: number;
  totalDestinatariosParaNotificar: number;
  nivelRiesgoSanitario: 'CRITICO' | 'ALTO' | 'MODERADO';
}

export interface ConsultaInversaInsumoOutputDto {
  criterioBusqueda: {
    insumoId?: string | null;
    loteInsumoId?: string | null;
    numeroLote?: string | null;
  };
  fechaConsultaUtc: string;
  insumo: InsumoRecallDetalleDto;
  metricas: MetricasRecallDto;
  aplicaciones: AplicacionRecallDetalleDto[];
  lotes: LoteRecallDetalleDto[];
  cosechas: CosechaRecallDetalleDto[];
  despachos: DespachoRecallDetalleDto[];
  destinatariosParaNotificar: DestinatarioNotificacionRecallDto[];
  protocoloRetiroSugerido: string[];
}
