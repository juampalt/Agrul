import { ProveedorInvalidoError } from '../errors/domain.error.js';

export interface ProveedorProps {
  id: string;
  razonSocial: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export class Proveedor {
  private constructor(private readonly props: ProveedorProps) {}

  public static crear(
    props: Omit<ProveedorProps, 'creadoEn' | 'actualizadoEn'> & {
      creadoEn?: string;
      actualizadoEn?: string;
    }
  ): Proveedor {
    if (!props.id || props.id.trim() === '') {
      throw new ProveedorInvalidoError('El identificador id del proveedor es obligatorio.');
    }
    if (!props.razonSocial || props.razonSocial.trim().length < 2) {
      throw new ProveedorInvalidoError('La razón social del proveedor debe tener al menos 2 caracteres.');
    }

    const emailTrimmed = props.email?.trim() ?? null;
    if (emailTrimmed && !emailTrimmed.includes('@')) {
      throw new ProveedorInvalidoError(`El formato del correo electrónico '${emailTrimmed}' es inválido.`);
    }

    const cuitTrimmed = props.cuit?.trim() ?? null;
    const ahora = new Date().toISOString();

    return new Proveedor({
      ...props,
      razonSocial: props.razonSocial.trim(),
      cuit: cuitTrimmed,
      contacto: props.contacto?.trim() ?? null,
      telefono: props.telefono?.trim() ?? null,
      email: emailTrimmed,
      direccion: props.direccion?.trim() ?? null,
      activo: props.activo ?? true,
      creadoEn: props.creadoEn ?? ahora,
      actualizadoEn: props.actualizadoEn ?? ahora,
    });
  }

  public static reconstituir(props: ProveedorProps): Proveedor {
    return new Proveedor(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get razonSocial(): string {
    return this.props.razonSocial;
  }

  public get cuit(): string | null {
    return this.props.cuit ?? null;
  }

  public get contacto(): string | null {
    return this.props.contacto ?? null;
  }

  public get telefono(): string | null {
    return this.props.telefono ?? null;
  }

  public get email(): string | null {
    return this.props.email ?? null;
  }

  public get direccion(): string | null {
    return this.props.direccion ?? null;
  }

  public get activo(): boolean {
    return this.props.activo ?? true;
  }

  public get creadoEn(): string {
    return this.props.creadoEn!;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn!;
  }

  public actualizarDatos(datos: {
    razonSocial?: string;
    cuit?: string | null;
    contacto?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
  }): void {
    if (datos.razonSocial !== undefined) {
      if (!datos.razonSocial || datos.razonSocial.trim().length < 2) {
        throw new ProveedorInvalidoError('La razón social del proveedor debe tener al menos 2 caracteres.');
      }
      this.props.razonSocial = datos.razonSocial.trim();
    }

    if (datos.email !== undefined) {
      const emailTrimmed = datos.email?.trim() ?? null;
      if (emailTrimmed && !emailTrimmed.includes('@')) {
        throw new ProveedorInvalidoError(`El formato del correo electrónico '${emailTrimmed}' es inválido.`);
      }
      this.props.email = emailTrimmed;
    }

    if (datos.cuit !== undefined) {
      this.props.cuit = datos.cuit?.trim() ?? null;
    }
    if (datos.contacto !== undefined) {
      this.props.contacto = datos.contacto?.trim() ?? null;
    }
    if (datos.telefono !== undefined) {
      this.props.telefono = datos.telefono?.trim() ?? null;
    }
    if (datos.direccion !== undefined) {
      this.props.direccion = datos.direccion?.trim() ?? null;
    }

    this.props.actualizadoEn = new Date().toISOString();
  }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public activar(): void {
    this.props.activo = true;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): ProveedorProps {
    return {
      ...this.props,
    };
  }
}
