export interface RegistrarIngresoCompraInputDTO {
  id?: string;
  insumoId: string;
  proveedorId: string;
  depositoId: string;
  cantidad: number;
  unidadMedida: string;
  loteFabricacion: string;
  fechaVencimiento: string;
  nroFacturaRemito: string;
  fechaIngreso?: string;
  precioUnitarioCompra?: number | null;
  comprobanteAdjuntoUrl?: string | null;
  observaciones?: string | null;
  usuarioCargaId?: string | null;
}

export interface IngresoCompraOutputDTO {
  id: string;
  insumoId: string;
  proveedorId: string;
  depositoId: string;
  cantidad: number;
  unidadMedida: string;
  loteFabricacion: string;
  fechaVencimiento: string;
  nroFacturaRemito: string;
  fechaIngreso: string;
  precioUnitarioCompra: number | null;
  comprobanteAdjuntoUrl: string | null;
  observaciones: string | null;
  usuarioCargaId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CargarStockInicialInputDTO {
  id?: string;
  insumoId: string;
  depositoId: string;
  cantidad: number;
  unidadMedida: string;
  loteFabricacion?: string | null;
  fechaVencimiento?: string | null;
  motivo?: string;
  usuarioCargaId: string;
  fecha?: string;
}

export interface StockInicialOutputDTO {
  id: string;
  insumoId: string;
  depositoId: string;
  cantidad: number;
  unidadMedida: string;
  loteFabricacion: string;
  fechaVencimiento: string | null;
  motivo: string;
  usuarioCargaId: string;
  fecha: string;
  creadoEn: string;
}

export interface ListarIngresosCompraQueryDTO {
  insumoId?: string;
  proveedorId?: string;
  depositoId?: string;
  loteFabricacion?: string;
}
