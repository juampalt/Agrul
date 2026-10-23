import crypto from 'node:crypto';
import { InventarioFisicoInvalidoError } from '../errors/domain.error.js';

export type TipoAjusteInventario = 'SOBRANTE' | 'FALTANTE' | 'SIN_DIFERENCIA';

export interface InventarioFisicoProps {
  id?: string;
  insumoId: string;
  depositoId: string;
  loteFabricacion?: string | null;
  cantidadSistema: number;
  cantidadFisica: number;
  diferencia?: number;
  unidadMedida: string;
  motivo: string;
  usuarioId: string;
  movimientoStockId?: string | null;
  claveIdempotencia: string;
  fecha?: string;
  creadoEn?: string;
}

export class InventarioFisico {
  public readonly id: string;
  public readonly insumoId: string;
  public readonly depositoId: string;
  public readonly loteFabricacion: string | null;
  public readonly cantidadSistema: number;
  public readonly cantidadFisica: number;
  public readonly diferencia: number;
  public readonly unidadMedida: string;
  public readonly motivo: string;
  public readonly usuarioId: string;
  public readonly movimientoStockId: string | null;
  public readonly claveIdempotencia: string;
  public readonly fecha: string;
  public readonly creadoEn: string;

  private constructor(props: {
    id: string;
    insumoId: string;
    depositoId: string;
    loteFabricacion: string | null;
    cantidadSistema: number;
    cantidadFisica: number;
    diferencia: number;
    unidadMedida: string;
    motivo: string;
    usuarioId: string;
    movimientoStockId: string | null;
    claveIdempotencia: string;
    fecha: string;
    creadoEn: string;
  }) {
    this.id = props.id;
    this.insumoId = props.insumoId;
    this.depositoId = props.depositoId;
    this.loteFabricacion = props.loteFabricacion;
    this.cantidadSistema = props.cantidadSistema;
    this.cantidadFisica = props.cantidadFisica;
    this.diferencia = props.diferencia;
    this.unidadMedida = props.unidadMedida;
    this.motivo = props.motivo;
    this.usuarioId = props.usuarioId;
    this.movimientoStockId = props.movimientoStockId;
    this.claveIdempotencia = props.claveIdempotencia;
    this.fecha = props.fecha;
    this.creadoEn = props.creadoEn;
  }

  public static crear(props: InventarioFisicoProps): InventarioFisico {
    if (!props.insumoId || props.insumoId.trim().length === 0) {
      throw new InventarioFisicoInvalidoError('El identificador del insumo es obligatorio.');
    }
    if (!props.depositoId || props.depositoId.trim().length === 0) {
      throw new InventarioFisicoInvalidoError('El identificador del depósito es obligatorio.');
    }
    if (typeof props.cantidadFisica !== 'number' || isNaN(props.cantidadFisica) || props.cantidadFisica < 0) {
      throw new InventarioFisicoInvalidoError('La cantidad física contada debe ser un número mayor o igual a 0.');
    }
    if (typeof props.cantidadSistema !== 'number' || isNaN(props.cantidadSistema)) {
      throw new InventarioFisicoInvalidoError('El saldo teórico del sistema es obligatorio.');
    }
    if (!props.unidadMedida || props.unidadMedida.trim().length === 0) {
      throw new InventarioFisicoInvalidoError('La unidad de medida es obligatoria.');
    }
    if (!props.motivo || props.motivo.trim().length === 0) {
      throw new InventarioFisicoInvalidoError('El motivo del inventario físico o justificación del ajuste es obligatorio (RF-M9-11).');
    }
    if (!props.usuarioId || props.usuarioId.trim().length === 0) {
      throw new InventarioFisicoInvalidoError('El identificador del usuario responsable es obligatorio para auditoría.');
    }
    if (!props.claveIdempotencia || props.claveIdempotencia.trim().length === 0) {
      throw new InventarioFisicoInvalidoError('La clave de idempotencia es obligatoria (RN-11 / RF-M9-06).');
    }

    const id = props.id || crypto.randomUUID();
    const ahora = new Date().toISOString();
    const fecha = props.fecha || ahora;
    const creadoEn = props.creadoEn || ahora;
    const diferencia = props.diferencia !== undefined
      ? props.diferencia
      : Number((props.cantidadFisica - props.cantidadSistema).toFixed(4));

    return new InventarioFisico({
      id,
      insumoId: props.insumoId.trim(),
      depositoId: props.depositoId.trim(),
      loteFabricacion: props.loteFabricacion?.trim() || null,
      cantidadSistema: Number(props.cantidadSistema.toFixed(4)),
      cantidadFisica: Number(props.cantidadFisica.toFixed(4)),
      diferencia,
      unidadMedida: props.unidadMedida.trim().toUpperCase(),
      motivo: props.motivo.trim(),
      usuarioId: props.usuarioId.trim(),
      movimientoStockId: props.movimientoStockId?.trim() || null,
      claveIdempotencia: props.claveIdempotencia.trim(),
      fecha,
      creadoEn,
    });
  }

  public tipoAjuste(): TipoAjusteInventario {
    if (this.diferencia > 0) return 'SOBRANTE';
    if (this.diferencia < 0) return 'FALTANTE';
    return 'SIN_DIFERENCIA';
  }

  public requirioAjuste(): boolean {
    return Math.abs(this.diferencia) > 0.0001;
  }

  public toJSON() {
    return {
      id: this.id,
      insumoId: this.insumoId,
      depositoId: this.depositoId,
      loteFabricacion: this.loteFabricacion,
      cantidadSistema: this.cantidadSistema,
      cantidadFisica: this.cantidadFisica,
      diferencia: this.diferencia,
      tipoAjuste: this.tipoAjuste(),
      unidadMedida: this.unidadMedida,
      motivo: this.motivo,
      usuarioId: this.usuarioId,
      movimientoStockId: this.movimientoStockId,
      claveIdempotencia: this.claveIdempotencia,
      fecha: this.fecha,
      creadoEn: this.creadoEn,
    };
  }
}
