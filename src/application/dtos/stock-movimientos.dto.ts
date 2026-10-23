import { TipoMovimientoStock } from '../../core/domain/entities/stock-movimiento.entity.js';

export interface RegistrarMovimientoStockDTO {
  insumoId: string;
  depositoId: string;
  loteFabricacion?: string | null;
  tipoMovimiento: TipoMovimientoStock;
  cantidad: number;
  unidadMedida: string;
  fecha?: string;
  usuarioId: string;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  claveIdempotencia: string;
  motivoJustificacion?: string | null;
  esEnvaseAbierto?: boolean;
  fechaVencimiento?: string | null;
}


export interface RevertirMovimientoStockDTO {
  movimientoId: string;
  usuarioId: string;
  motivo: string;
  claveIdempotencia: string;
}

export interface AjustarMovimientoAplicacionDTO {
  movimientoAnteriorId: string;
  nuevaCantidad: number;
  usuarioId: string;
  claveIdempotencia: string;
  motivoJustificacion?: string | null;
}

export interface ListarMovimientosStockFiltrosDTO {
  insumoId?: string;
  depositoId?: string;
  tipoMovimiento?: TipoMovimientoStock;
  referenciaTipo?: string;
  referenciaId?: string;
  loteFabricacion?: string;
  desde?: string;
  hasta?: string;
}

export interface StockMovimientoResponseDTO {
  id: string;
  insumoId: string;
  depositoId: string;
  loteFabricacion: string | null;
  tipoMovimiento: TipoMovimientoStock;
  cantidad: number;
  unidadMedida: string;
  fecha: string;
  usuarioId: string;
  referenciaTipo: string | null;
  referenciaId: string | null;
  claveIdempotencia: string;
  esSaldoNegativo: boolean;
  motivoJustificacion: string | null;
  movimientoRevertidoId: string | null;
  esEnvaseAbierto: boolean;
  creadoEn: string;
}

export interface SaldoInsumoResponseDTO {
  insumoId: string;
  depositoId?: string;
  saldo: number;
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
  unidadMedida: string;
  envasesAbiertos: number;
  totalIngresos: number;
  totalEgresos: number;
  esSaldoNegativo: boolean;
  stockMinimoConfigurable?: number | null;
  enAlertaReposicion: boolean;
}
