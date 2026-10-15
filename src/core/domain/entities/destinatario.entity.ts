import { DestinatarioInvalidoError } from '../errors/domain.error.js';

export type TipoDestinatario =
  | 'MERCADO_FRESCO'
  | 'INDUSTRIA'
  | 'EXPORTACION'
  | 'VENTA_DIRECTA'
  | 'EMPAQUE'
  | 'OTRO';

export interface DestinatarioProps {
  id: string;
  nombre: string;
  tipo: TipoDestinatario;
  cuit?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export class Destinatario {
  private constructor(private readonly props: DestinatarioProps) {}

  public static crear(props: Omit<DestinatarioProps, 'creadoEn' | 'actualizadoEn'> & { creadoEn?: string; actualizadoEn?: string }): Destinatario {
    if (!props.id || props.id.trim() === '') {
      throw new DestinatarioInvalidoError('El identificador id del destinatario es obligatorio.');
    }
    if (!props.nombre || props.nombre.trim() === '') {
      throw new DestinatarioInvalidoError('El nombre o razón social del destinatario es obligatorio.');
    }
    if (!props.tipo) {
      throw new DestinatarioInvalidoError('El tipo de destinatario es obligatorio.');
    }

    const ahora = new Date().toISOString();

    return new Destinatario({
      ...props,
      nombre: props.nombre.trim(),
      cuit: props.cuit?.trim() ?? null,
      direccion: props.direccion?.trim() ?? null,
      localidad: props.localidad?.trim() ?? null,
      provincia: props.provincia?.trim() ?? null,
      contacto: props.contacto?.trim() ?? null,
      telefono: props.telefono?.trim() ?? null,
      email: props.email?.trim() ?? null,
      activo: props.activo ?? true,
      creadoEn: props.creadoEn ?? ahora,
      actualizadoEn: props.actualizadoEn ?? ahora,
    });
  }

  public static reconstituir(props: DestinatarioProps): Destinatario {
    return new Destinatario(props);
  }

  public get id(): string { return this.props.id; }
  public get nombre(): string { return this.props.nombre; }
  public get tipo(): TipoDestinatario { return this.props.tipo; }
  public get cuit(): string | null { return this.props.cuit ?? null; }
  public get direccion(): string | null { return this.props.direccion ?? null; }
  public get localidad(): string | null { return this.props.localidad ?? null; }
  public get provincia(): string | null { return this.props.provincia ?? null; }
  public get contacto(): string | null { return this.props.contacto ?? null; }
  public get telefono(): string | null { return this.props.telefono ?? null; }
  public get email(): string | null { return this.props.email ?? null; }
  public get activo(): boolean { return this.props.activo ?? true; }
  public get creadoEn(): string { return this.props.creadoEn!; }
  public get actualizadoEn(): string { return this.props.actualizadoEn!; }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public activar(): void {
    this.props.activo = true;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): DestinatarioProps {
    return {
      ...this.props,
    };
  }
}
