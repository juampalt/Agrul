import {
  MovimientoStockInvalidoError,
  StockInsuficienteSinJustificacionError,
} from '../errors/domain.error.js';

export type TipoMovimientoStock =
  | 'SALDO_INICIAL'
  | 'INGRESO_COMPRA'
  | 'SALIDA_CONSUMO'
  | 'DEVOLUCION'
  | 'PERDIDA'
  | 'AJUSTE_FISICO'
  | 'REVERSION';

export interface StockMovimientoProps {
  id?: string;
  insumoId: string;
  depositoId: string;
  loteFabricacion?: string | null;
  fechaVencimiento?: string | null;
  tipoMovimiento: TipoMovimientoStock;
  cantidad: number;
  unidadMedida: string;
  fecha?: string;
  usuarioId: string;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  claveIdempotencia: string;
  esSaldoNegativo?: boolean;
  motivoJustificacion?: string | null;
  movimientoRevertidoId?: string | null;
  esEnvaseAbierto?: boolean;
  creadoEn?: string;
}

export class StockMovimiento {
  public readonly id: string;
  public readonly insumoId: string;
  public readonly depositoId: string;
  public readonly loteFabricacion: string | null;
  public readonly fechaVencimiento: string | null;
  public readonly tipoMovimiento: TipoMovimientoStock;
  public readonly cantidad: number;
  public readonly unidadMedida: string;
  public readonly fecha: string;
  public readonly usuarioId: string;
  public readonly referenciaTipo: string | null;
  public readonly referenciaId: string | null;
  public readonly claveIdempotencia: string;
  public readonly esSaldoNegativo: boolean;
  public readonly motivoJustificacion: string | null;
  public readonly movimientoRevertidoId: string | null;
  public readonly esEnvaseAbierto: boolean;
  public readonly creadoEn: string;

  private constructor(props: {
    id: string;
    insumoId: string;
    depositoId: string;
    loteFabricacion: string | null;
    fechaVencimiento: string | null;
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
  }) {
    this.id = props.id;
    this.insumoId = props.insumoId;
    this.depositoId = props.depositoId;
    this.loteFabricacion = props.loteFabricacion;
    this.fechaVencimiento = props.fechaVencimiento;
    this.tipoMovimiento = props.tipoMovimiento;
    this.cantidad = props.cantidad;
    this.unidadMedida = props.unidadMedida;
    this.fecha = props.fecha;
    this.usuarioId = props.usuarioId;
    this.referenciaTipo = props.referenciaTipo;
    this.referenciaId = props.referenciaId;
    this.claveIdempotencia = props.claveIdempotencia;
    this.esSaldoNegativo = props.esSaldoNegativo;
    this.motivoJustificacion = props.motivoJustificacion;
    this.movimientoRevertidoId = props.movimientoRevertidoId;
    this.esEnvaseAbierto = props.esEnvaseAbierto;
    this.creadoEn = props.creadoEn;
  }

  public static esTipoIngreso(tipo: TipoMovimientoStock): boolean {
    return tipo === 'SALDO_INICIAL' || tipo === 'INGRESO_COMPRA' || tipo === 'DEVOLUCION';
  }

  public static esTipoEgreso(tipo: TipoMovimientoStock): boolean {
    return tipo === 'SALIDA_CONSUMO' || tipo === 'PERDIDA';
  }

  public static crear(props: StockMovimientoProps): StockMovimiento {
    if (!props.insumoId || props.insumoId.trim().length === 0) {
      throw new MovimientoStockInvalidoError('El identificador del insumo es obligatorio.');
    }
    if (!props.depositoId || props.depositoId.trim().length === 0) {
      throw new MovimientoStockInvalidoError('El identificador del depósito es obligatorio.');
    }
    if (!props.claveIdempotencia || props.claveIdempotencia.trim().length === 0) {
      throw new MovimientoStockInvalidoError('La clave de idempotencia es obligatoria (RN-11 / RF-M9-06).');
    }
    if (typeof props.cantidad !== 'number' || isNaN(props.cantidad) || props.cantidad <= 0) {
      throw new MovimientoStockInvalidoError('La cantidad del movimiento debe ser un número positivo mayor a 0 (RN-10).');
    }
    if (!props.unidadMedida || props.unidadMedida.trim().length === 0) {
      throw new MovimientoStockInvalidoError('La unidad de medida es requerida.');
    }
    if (!props.usuarioId || props.usuarioId.trim().length === 0) {
      throw new MovimientoStockInvalidoError('El identificador de usuario es obligatorio para auditoría.');
    }

    // Regla RF-M9-15: Si la salida excede el stock físico (saldo negativo), requiere justificación explícita
    if (props.esSaldoNegativo && (!props.motivoJustificacion || props.motivoJustificacion.trim().length === 0)) {
      throw new StockInsuficienteSinJustificacionError(
        'El movimiento resulta en saldo negativo. Se requiere un motivo de justificación explícito (RF-M9-15).'
      );
    }

    const id = props.id || crypto.randomUUID();
    const ahora = new Date().toISOString();
    const fecha = props.fecha || ahora;
    const creadoEn = props.creadoEn || ahora;

    return new StockMovimiento({
      id,
      insumoId: props.insumoId.trim(),
      depositoId: props.depositoId.trim(),
      loteFabricacion: props.loteFabricacion?.trim() || null,
      fechaVencimiento: props.fechaVencimiento?.trim() || null,
      tipoMovimiento: props.tipoMovimiento,
      cantidad: props.cantidad,
      unidadMedida: props.unidadMedida.trim().toUpperCase(),
      fecha,
      usuarioId: props.usuarioId.trim(),
      referenciaTipo: props.referenciaTipo?.trim() || null,
      referenciaId: props.referenciaId?.trim() || null,
      claveIdempotencia: props.claveIdempotencia.trim(),
      esSaldoNegativo: Boolean(props.esSaldoNegativo),
      motivoJustificacion: props.motivoJustificacion?.trim() || null,
      movimientoRevertidoId: props.movimientoRevertidoId?.trim() || null,
      esEnvaseAbierto: Boolean(props.esEnvaseAbierto),
      creadoEn,
    });
  }

  public toJSON() {
    return {
      id: this.id,
      insumoId: this.insumoId,
      depositoId: this.depositoId,
      loteFabricacion: this.loteFabricacion,
      fechaVencimiento: this.fechaVencimiento,
      tipoMovimiento: this.tipoMovimiento,
      cantidad: this.cantidad,
      unidadMedida: this.unidadMedida,
      fecha: this.fecha,
      usuarioId: this.usuarioId,
      referenciaTipo: this.referenciaTipo,
      referenciaId: this.referenciaId,
      claveIdempotencia: this.claveIdempotencia,
      esSaldoNegativo: this.esSaldoNegativo,
      motivoJustificacion: this.motivoJustificacion,
      movimientoRevertidoId: this.movimientoRevertidoId,
      esEnvaseAbierto: this.esEnvaseAbierto,
      creadoEn: this.creadoEn,
    };
  }
}
