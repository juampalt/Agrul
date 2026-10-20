export interface UsuarioFincaProps {
  id: string;
  usuarioId: string;
  fincaId: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearUsuarioFincaParams {
  id: string;
  usuarioId: string;
  fincaId: string;
  activo?: boolean;
}

export class UsuarioFinca {
  private constructor(private props: UsuarioFincaProps) {}

  public static crear(params: CrearUsuarioFincaParams): UsuarioFinca {
    const ahora = new Date().toISOString();
    return new UsuarioFinca({
      id: params.id,
      usuarioId: params.usuarioId,
      fincaId: params.fincaId,
      activo: params.activo ?? true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: UsuarioFincaProps): UsuarioFinca {
    return new UsuarioFinca({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get usuarioId(): string {
    return this.props.usuarioId;
  }

  public get fincaId(): string {
    return this.props.fincaId;
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

  public activar(): void {
    this.props.activo = true;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON() {
    return {
      id: this.props.id,
      usuarioId: this.props.usuarioId,
      fincaId: this.props.fincaId,
      activo: this.props.activo,
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
