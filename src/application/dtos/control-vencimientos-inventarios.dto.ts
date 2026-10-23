export type EstadoVencimientoLote = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';

export type TipoPerdidaStock =
  | 'ROBO'
  | 'DERRAME'
  | 'ROTURA'
  | 'VENCIMIENTO'
  | 'DETERIORO'
  | 'OTRO';

export interface SugerirLotesFefoInputDTO {
  insumoId: string;
  depositoId?: string;
  cantidadRequerida?: number;
  fechaReferencia?: string;
}

export interface LoteFefoOutputDTO {
  loteFabricacion: string;
  depositoId: string;
  cantidadDisponible: number;
  unidadMedida: string;
  fechaVencimiento: string | null;
  diasHastaVencimiento: number | null;
  esVencido: boolean;
  estadoVencimiento: EstadoVencimientoLote;
  precioUnitarioCompra?: number | null;
}

export interface CoberturaLoteSugeridaDTO {
  loteFabricacion: string;
  depositoId: string;
  cantidadASacar: number;
  fechaVencimiento: string | null;
}

export interface SugerirLotesFefoOutputDTO {
  insumoId: string;
  insumoNombre: string;
  unidadMedida: string;
  loteSugerido: LoteFefoOutputDTO | null;
  lotesDisponibles: LoteFefoOutputDTO[];
  lotesVencidosBloqueados: LoteFefoOutputDTO[];
  totalStockDisponible: number;
  totalStockVencido: number;
  coberturaSugerida?: CoberturaLoteSugeridaDTO[];
  cubiertoTotalmente?: boolean;
  cantidadFaltante?: number;
}

export interface ValidarLoteInsumoInputDTO {
  insumoId: string;
  loteFabricacion: string;
  fechaReferencia?: string;
}

export interface ValidarLoteInsumoOutputDTO {
  insumoId: string;
  loteFabricacion: string;
  fechaVencimiento: string | null;
  esVencido: boolean;
  diasHastaVencimiento: number | null;
  estadoVencimiento: EstadoVencimientoLote;
  saldoDisponible: number;
  aptoParaAplicacion: boolean;
}

export interface RegistrarInventarioFisicoInputDTO {
  insumoId: string;
  depositoId: string;
  loteFabricacion?: string | null;
  cantidadFisica: number;
  unidadMedida: string;
  motivo: string;
  usuarioId: string;
  claveIdempotencia: string;
  fecha?: string;
}

export interface InventarioFisicoOutputDTO {
  id: string;
  insumoId: string;
  depositoId: string;
  loteFabricacion: string | null;
  cantidadSistema: number;
  cantidadFisica: number;
  diferencia: number;
  tipoAjuste: 'SOBRANTE' | 'FALTANTE' | 'SIN_DIFERENCIA';
  unidadMedida: string;
  motivo: string;
  usuarioId: string;
  movimientoStockId: string | null;
  claveIdempotencia: string;
  fecha: string;
  creadoEn: string;
}

export interface ListarInventariosFisicosQueryDTO {
  insumoId?: string;
  depositoId?: string;
  loteFabricacion?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}

export interface RegistrarPerdidaStockInputDTO {
  insumoId: string;
  depositoId: string;
  loteFabricacion?: string | null;
  cantidad: number;
  unidadMedida: string;
  tipoPerdida: TipoPerdidaStock;
  motivo: string;
  usuarioId: string;
  claveIdempotencia: string;
  fecha?: string;
}

export interface PerdidaStockOutputDTO {
  id: string;
  insumoId: string;
  depositoId: string;
  loteFabricacion: string | null;
  cantidad: number;
  unidadMedida: string;
  tipoPerdida: TipoPerdidaStock;
  motivo: string;
  usuarioId: string;
  claveIdempotencia: string;
  movimientoId: string;
  fecha: string;
  creadoEn: string;
}

export interface ReporteExistenciasValorizadasQueryDTO {
  depositoId?: string;
  categoria?: string;
  insumoId?: string;
}

export interface LoteExistenciaValorizadaDTO {
  loteFabricacion: string;
  depositoId: string;
  saldo: number;
  unidadMedida: string;
  fechaVencimiento: string | null;
  estadoVencimiento: EstadoVencimientoLote;
  precioUnitarioCompra: number;
  valorTotalLote: number;
}

export interface InsumoValorizadoItemDTO {
  insumoId: string;
  nombreComercial: string;
  categoria: string;
  unidadMedida: string;
  saldoStock: number;
  precioPromedioPonderado: number;
  valorTotal: number;
  lotes: LoteExistenciaValorizadaDTO[];
}

export interface ReporteExistenciasValorizadasOutputDTO {
  fechaEmision: string;
  moneda: string;
  totalExistenciasValorizadas: number;
  totalInsumos: number;
  totalCantidadStock: number;
  items: InsumoValorizadoItemDTO[];
}
