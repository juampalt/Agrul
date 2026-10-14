import { DomainError } from '../errors/domain.error.js';

export class NombrePersonalInvalidoError extends DomainError {
  public readonly code = 'INVALID_WORKER_NAME';

  constructor(mensaje: string = 'El nombre del trabajador o cuadrilla es obligatorio.') {
    super(mensaje);
  }
}

export type TipoPersonal = 'INDIVIDUAL' | 'CUADRILLA';

export interface PersonalCuadrillaProps {
  id: string;
  nombre: string;
  tipo: TipoPersonal;
  dniOIdentificacion?: string | null;
  usuarioId?: string | null;
  telefono?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPersonalCuadrillaParams {
  id: string;
  nombre: string;
  tipo?: TipoPersonal;
  dniOIdentificacion?: string | null;
  usuarioId?: string | null;
  telefono?: string | null;
  activo?: boolean;
}

export class PersonalCuadrilla {
  private constructor(private props: PersonalCuadrillaProps) {}

  public static crear(params: CrearPersonalCuadrillaParams): PersonalCuadrilla {
    if (!params.nombre || params.nombre.trim().length === 0) {
      throw new NombrePersonalInvalidoError('El nombre del trabajador o cuadrilla es obligatorio.');
    }

    const ahora = new Date().toISOString();

    return new PersonalCuadrilla({
      id: params.id,
      nombre: params.nombre.trim(),
      tipo: params.tipo ?? 'INDIVIDUAL',
      dniOIdentificacion: params.dniOIdentificacion?.trim() ?? null,
      usuarioId: params.usuarioId?.trim() ?? null,
      telefono: params.telefono?.trim() ?? null,
      activo: params.activo ?? true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: PersonalCuadrillaProps): PersonalCuadrilla {
    return new PersonalCuadrilla({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get nombre(): string {
    return this.props.nombre;
  }

  public get tipo(): TipoPersonal {
    return this.props.tipo;
  }

  public get dniOIdentificacion(): string | null | undefined {
    return this.props.dniOIdentificacion;
  }

  public get usuarioId(): string | null | undefined {
    return this.props.usuarioId;
  }

  public get telefono(): string | null | undefined {
    return this.props.telefono;
  }

  public get activo(): boolean {
    return this.props.activo;
  }

  public get creadoEn(): string {
    return this.props.creadoEn;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn;
  }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public activar(): void {
    this.props.activo = true;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public asociarUsuario(usuarioId: string): void {
    this.props.usuarioId = usuarioId.trim();
    this.props.actualizadoEn = new Date().toISOString();
  }

  public desasociarUsuario(): void {
    this.props.usuarioId = null;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): PersonalCuadrillaProps {
    return { ...this.props };
  }
}
