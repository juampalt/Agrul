import { StockInicialInvalidoError } from '../errors/domain.error.js';

export interface StockInicialInsumoProps {
  id: string;
  insumoId: string;
  depositoId: string;
  cantidad: number;
  unidadMedida: string;
  loteFabricacion?: string | null;
  fechaVencimiento?: string | null;
  motivo: string;
  usuarioCargaId: string;
  fecha: string;
  creadoEn?: string;
}

export class StockInicialInsumo {
  private constructor(private readonly props: StockInicialInsumoProps) {}

  public static crear(
    props: Omit<StockInicialInsumoProps, 'creadoEn'> & { creadoEn?: string }
  ): StockInicialInsumo {
    if (!props.id || props.id.trim() === '') {
      throw new StockInicialInvalidoError('El identificador id del movimiento inicial es obligatorio.');
    }
    if (!props.insumoId || props.insumoId.trim() === '') {
      throw new StockInicialInvalidoError('El identificador del insumo (insumoId) es obligatorio.');
    }
    if (!props.depositoId || props.depositoId.trim() === '') {
      throw new StockInicialInvalidoError('El identificador del depósito de almacenamiento es obligatorio.');
    }
    if (typeof props.cantidad !== 'number' || isNaN(props.cantidad) || props.cantidad <= 0) {
      throw new StockInicialInvalidoError('La cantidad inicial debe ser un número positivo mayor a 0 (RF-M9-05).');
    }
    if (!props.unidadMedida || props.unidadMedida.trim() === '') {
      throw new StockInicialInvalidoError('La unidad de medida es obligatoria.');
    }
    if (!props.usuarioCargaId || props.usuarioCargaId.trim() === '') {
      throw new StockInicialInvalidoError('El usuario que registra el saldo inicial auditado es obligatorio (RF-M9-05).');
    }

    const ahora = new Date().toISOString();

    return new StockInicialInsumo({
      ...props,
      unidadMedida: props.unidadMedida.trim().toUpperCase(),
      loteFabricacion: props.loteFabricacion?.trim() ?? 'STOCK-INICIAL',
      fechaVencimiento: props.fechaVencimiento?.trim() ?? null,
      motivo: props.motivo?.trim() || 'Carga de saldo inicial de implantación del sistema',
      fecha: props.fecha ?? ahora.slice(0, 10),
      creadoEn: props.creadoEn ?? ahora,
    });
  }

  public static reconstituir(props: StockInicialInsumoProps): StockInicialInsumo {
    return new StockInicialInsumo(props);
  }

  public get id(): string { return this.props.id; }
  public get insumoId(): string { return this.props.insumoId; }
  public get depositoId(): string { return this.props.depositoId; }
  public get cantidad(): number { return this.props.cantidad; }
  public get unidadMedida(): string { return this.props.unidadMedida; }
  public get loteFabricacion(): string { return this.props.loteFabricacion ?? 'STOCK-INICIAL'; }
  public get fechaVencimiento(): string | null { return this.props.fechaVencimiento ?? null; }
  public get motivo(): string { return this.props.motivo; }
  public get usuarioCargaId(): string { return this.props.usuarioCargaId; }
  public get fecha(): string { return this.props.fecha; }
  public get creadoEn(): string { return this.props.creadoEn!; }

  public toJSON(): StockInicialInsumoProps {
    return {
      ...this.props,
    };
  }
}
