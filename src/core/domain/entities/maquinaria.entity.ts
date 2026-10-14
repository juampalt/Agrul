import { DomainError } from '../errors/domain.error.js';

export class IdentificacionMaquinariaInvalidaError extends DomainError {
  public readonly code = 'INVALID_MACHINERY_IDENTIFICATION';

  constructor(mensaje: string = 'La identificación o nombre de la maquinaria es obligatoria.') {
    super(mensaje);
  }
}

export type CondicionMaquinaria = 'PROPIO' | 'ALQUILADO' | 'SERVICIO_CONTRATADO';

export type TipoMaquinaria =
  | 'TRACTOR'
  | 'PULVERIZADORA'
  | 'ATOMIZADORA'
  | 'COSECHADORA'
  | 'DESMALEZADORA'
  | 'MOTOCULTIVADOR'
  | 'HERRAMIENTA_MANUAL'
  | 'VEHICULO_CARGA'
  | 'OTRO';

export interface MaquinariaProps {
  id: string;
  identificacion: string;
  tipo: TipoMaquinaria;
  condicion: CondicionMaquinaria;
  marcaModelo?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearMaquinariaParams {
  id: string;
  identificacion: string;
  tipo?: TipoMaquinaria;
  condicion?: CondicionMaquinaria;
  marcaModelo?: string | null;
  activo?: boolean;
}

export class Maquinaria {
  private constructor(private props: MaquinariaProps) {}

  public static crear(params: CrearMaquinariaParams): Maquinaria {
    if (!params.identificacion || params.identificacion.trim().length === 0) {
      throw new IdentificacionMaquinariaInvalidaError('La identificación o nombre de la maquinaria es obligatoria.');
    }

    const ahora = new Date().toISOString();

    return new Maquinaria({
      id: params.id,
      identificacion: params.identificacion.trim(),
      tipo: params.tipo ?? 'TRACTOR',
      condicion: params.condicion ?? 'PROPIO',
      marcaModelo: params.marcaModelo?.trim() ?? null,
      activo: params.activo ?? true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: MaquinariaProps): Maquinaria {
    return new Maquinaria({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get identificacion(): string {
    return this.props.identificacion;
  }

  public get tipo(): TipoMaquinaria {
    return this.props.tipo;
  }

  public get condicion(): CondicionMaquinaria {
    return this.props.condicion;
  }

  public get marcaModelo(): string | null | undefined {
    return this.props.marcaModelo;
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

  public toJSON(): MaquinariaProps {
    return { ...this.props };
  }
}
