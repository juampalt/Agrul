import { DespachoInvalidoError, FechaFuturaInvalidaError } from '../errors/domain.error.js';

export type TipoDestino =
  | 'MERCADO_FRESCO'
  | 'INDUSTRIA'
  | 'EXPORTACION'
  | 'VENTA_DIRECTA'
  | 'EMPAQUE'
  | 'OTRO';

export interface DespachoDestinoProps {
  id: string;
  cosechaId: string;
  destinatarioId: string;
  tipoDestino: TipoDestino;
  cantidadEnviadaKg: number;
  fecha: string; // YYYY-MM-DD
  nroGuiaRemito: string; // RF-M5-10 (BPA)
  renspaFinca: string;   // RF-M5-10 (BPA)
  productor: string;      // RF-M5-10 (BPA)
  precinto?: string | null;
  chofer?: string | null;
  patenteCamion?: string | null;
  temperaturaTransporteC?: number | null;
  observaciones?: string | null;
  creadoEn?: string;
}

export class DespachoDestino {
  private constructor(private readonly props: DespachoDestinoProps) {}

  public static crear(props: Omit<DespachoDestinoProps, 'creadoEn'> & { creadoEn?: string }): DespachoDestino {
    if (!props.id || props.id.trim() === '') {
      throw new DespachoInvalidoError('El identificador id del despacho es obligatorio.');
    }
    if (!props.cosechaId || props.cosechaId.trim() === '') {
      throw new DespachoInvalidoError('El identificador cosechaId es obligatorio.');
    }
    if (!props.destinatarioId || props.destinatarioId.trim() === '') {
      throw new DespachoInvalidoError('El identificador destinatarioId es obligatorio.');
    }
    if (!props.tipoDestino) {
      throw new DespachoInvalidoError('El tipo de destino es obligatorio.');
    }
    if (typeof props.cantidadEnviadaKg !== 'number' || props.cantidadEnviadaKg <= 0 || isNaN(props.cantidadEnviadaKg)) {
      throw new DespachoInvalidoError('La cantidad enviada en kg debe ser un número positivo mayor a 0.');
    }

    // Validación de fecha no futura (RN-04)
    if (!props.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(props.fecha)) {
      throw new DespachoInvalidoError('La fecha del despacho debe tener formato YYYY-MM-DD.');
    }
    const hoyStr = new Date().toISOString().slice(0, 10);
    if (props.fecha > hoyStr) {
      throw new FechaFuturaInvalidaError(props.fecha);
    }

    // Validación BPA (RF-M5-10): Guía/Remito, RENSPA y Productor requeridos
    if (!props.nroGuiaRemito || props.nroGuiaRemito.trim() === '') {
      throw new DespachoInvalidoError(
        'El número de guía o remito oficial es obligatorio para cumplimiento de Buenas Prácticas Agrícolas (RF-M5-10).'
      );
    }
    if (!props.renspaFinca || props.renspaFinca.trim() === '') {
      throw new DespachoInvalidoError(
        'El código RENSPA de la finca de origen es obligatorio para cumplimiento de Buenas Prácticas Agrícolas (RF-M5-10).'
      );
    }
    if (!props.productor || props.productor.trim() === '') {
      throw new DespachoInvalidoError(
        'La razón social o nombre del productor titular es obligatorio para cumplimiento de Buenas Prácticas Agrícolas (RF-M5-10).'
      );
    }

    const creadoEn = props.creadoEn ?? new Date().toISOString();

    return new DespachoDestino({
      ...props,
      nroGuiaRemito: props.nroGuiaRemito.trim(),
      renspaFinca: props.renspaFinca.trim(),
      productor: props.productor.trim(),
      precinto: props.precinto?.trim() ?? null,
      chofer: props.chofer?.trim() ?? null,
      patenteCamion: props.patenteCamion?.trim() ?? null,
      temperaturaTransporteC: props.temperaturaTransporteC ?? null,
      observaciones: props.observaciones?.trim() ?? null,
      creadoEn,
    });
  }

  public static reconstituir(props: DespachoDestinoProps): DespachoDestino {
    return new DespachoDestino(props);
  }

  public get id(): string { return this.props.id; }
  public get cosechaId(): string { return this.props.cosechaId; }
  public get destinatarioId(): string { return this.props.destinatarioId; }
  public get tipoDestino(): TipoDestino { return this.props.tipoDestino; }
  public get cantidadEnviadaKg(): number { return this.props.cantidadEnviadaKg; }
  public get fecha(): string { return this.props.fecha; }
  public get nroGuiaRemito(): string { return this.props.nroGuiaRemito; }
  public get renspaFinca(): string { return this.props.renspaFinca; }
  public get productor(): string { return this.props.productor; }
  public get precinto(): string | null { return this.props.precinto ?? null; }
  public get chofer(): string | null { return this.props.chofer ?? null; }
  public get patenteCamion(): string | null { return this.props.patenteCamion ?? null; }
  public get temperaturaTransporteC(): number | null { return this.props.temperaturaTransporteC ?? null; }
  public get observaciones(): string | null { return this.props.observaciones ?? null; }
  public get creadoEn(): string { return this.props.creadoEn!; }

  public toJSON(): DespachoDestinoProps {
    return {
      ...this.props,
    };
  }
}
