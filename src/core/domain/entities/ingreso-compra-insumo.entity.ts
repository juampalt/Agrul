import { IngresoCompraInvalidoError } from '../errors/domain.error.js';

export interface IngresoCompraInsumoProps {
  id: string;
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
  creadoEn?: string;
  actualizadoEn?: string;
}

export class IngresoCompraInsumo {
  private constructor(private readonly props: IngresoCompraInsumoProps) {}

  public static crear(
    props: Omit<IngresoCompraInsumoProps, 'creadoEn' | 'actualizadoEn'> & {
      creadoEn?: string;
      actualizadoEn?: string;
    }
  ): IngresoCompraInsumo {

    if (!props.id || props.id.trim() === '') {
      throw new IngresoCompraInvalidoError('El identificador id del ingreso es obligatorio.');
    }
    if (!props.insumoId || props.insumoId.trim() === '') {
      throw new IngresoCompraInvalidoError('El identificador del insumo (insumoId) es obligatorio.');
    }
    if (!props.proveedorId || props.proveedorId.trim() === '') {
      throw new IngresoCompraInvalidoError('El identificador del proveedor (proveedorId) es obligatorio (RF-M9-03).');
    }
    if (!props.depositoId || props.depositoId.trim() === '') {
      throw new IngresoCompraInvalidoError('El identificador del depósito de almacenamiento es obligatorio.');
    }
    if (typeof props.cantidad !== 'number' || isNaN(props.cantidad) || props.cantidad <= 0) {
      throw new IngresoCompraInvalidoError('La cantidad ingresada debe ser un número positivo mayor a 0.');
    }
    if (!props.unidadMedida || props.unidadMedida.trim() === '') {
      throw new IngresoCompraInvalidoError('La unidad de medida es obligatoria.');
    }
    if (!props.loteFabricacion || props.loteFabricacion.trim() === '') {
      throw new IngresoCompraInvalidoError('El lote de fabricación comercial del insumo es obligatorio (RF-M9-03).');
    }
    if (!props.fechaVencimiento || props.fechaVencimiento.trim() === '') {
      throw new IngresoCompraInvalidoError('La fecha de vencimiento es obligatoria para el ingreso por compra (RF-M9-03).');
    }
    if (!props.nroFacturaRemito || props.nroFacturaRemito.trim() === '') {
      throw new IngresoCompraInvalidoError('El número de factura o remito de compra es obligatorio (RF-M9-03).');
    }

    const ahora = new Date().toISOString();

    return new IngresoCompraInsumo({
      ...props,
      unidadMedida: props.unidadMedida.trim().toUpperCase(),
      loteFabricacion: props.loteFabricacion.trim(),
      fechaVencimiento: props.fechaVencimiento.trim(),
      nroFacturaRemito: props.nroFacturaRemito.trim(),
      fechaIngreso: props.fechaIngreso ?? ahora.slice(0, 10),
      precioUnitarioCompra: props.precioUnitarioCompra ?? null,
      comprobanteAdjuntoUrl: props.comprobanteAdjuntoUrl?.trim() ?? null,
      observaciones: props.observaciones?.trim() ?? null,
      usuarioCargaId: props.usuarioCargaId ?? null,
      creadoEn: props.creadoEn ?? ahora,
      actualizadoEn: props.actualizadoEn ?? ahora,
    });
  }

  public static reconstituir(props: IngresoCompraInsumoProps): IngresoCompraInsumo {
    return new IngresoCompraInsumo(props);
  }

  public get id(): string { return this.props.id; }
  public get insumoId(): string { return this.props.insumoId; }
  public get proveedorId(): string { return this.props.proveedorId; }
  public get depositoId(): string { return this.props.depositoId; }
  public get cantidad(): number { return this.props.cantidad; }
  public get unidadMedida(): string { return this.props.unidadMedida; }
  public get loteFabricacion(): string { return this.props.loteFabricacion; }
  public get fechaVencimiento(): string { return this.props.fechaVencimiento; }
  public get nroFacturaRemito(): string { return this.props.nroFacturaRemito; }
  public get fechaIngreso(): string { return this.props.fechaIngreso ?? ''; }
  public get precioUnitarioCompra(): number | null { return this.props.precioUnitarioCompra ?? null; }

  public get comprobanteAdjuntoUrl(): string | null { return this.props.comprobanteAdjuntoUrl ?? null; }
  public get observaciones(): string | null { return this.props.observaciones ?? null; }
  public get usuarioCargaId(): string | null { return this.props.usuarioCargaId ?? null; }
  public get creadoEn(): string { return this.props.creadoEn!; }
  public get actualizadoEn(): string { return this.props.actualizadoEn!; }

  public esVencido(fechaReferencia: string = new Date().toISOString().slice(0, 10)): boolean {
    return this.props.fechaVencimiento < fechaReferencia;
  }

  public toJSON(): IngresoCompraInsumoProps {
    return {
      ...this.props,
    };
  }
}
