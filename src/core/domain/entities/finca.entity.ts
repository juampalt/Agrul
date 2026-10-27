import { GeoJSONGeometry, GeoJSONValidator } from '../value-objects/geojson.vo.js';
import { DomainError } from '../errors/domain.error.js';

export class NombreFincaInvalidoError extends DomainError {
  public readonly code = 'INVALID_FINCA_NAME';

  constructor(mensaje: string = 'El nombre de la finca es obligatorio.') {
    super(mensaje);
  }
}

export class SuperficieInvalidaError extends DomainError {
  public readonly code = 'INVALID_SURFACE_AREA';

  constructor(mensaje: string) {
    super(`Superficie inválida: ${mensaje}`);
  }
}

export interface UbicacionFinca {
  localidad: string;
  departamento: string;
  provincia: string;
}

export interface FincaProps {
  id: string;
  nombre: string;
  ubicacion: UbicacionFinca;
  superficieTotalHa: number;
  responsableId?: string | null;
  renspa?: string | null;
  geometria?: GeoJSONGeometry | null;
  propietario?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearFincaParams {
  id: string;
  nombre: string;
  localidad: string;
  departamento: string;
  provincia: string;
  superficieTotalHa: number;
  responsableId?: string | null;
  renspa?: string | null;
  geometria?: unknown;
  propietario?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
}

export interface ModificarFincaParams {
  nombre: string;
  localidad: string;
  departamento: string;
  provincia: string;
  superficieTotalHa: number;
  propietario?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
}

export class Finca {
  private constructor(private props: FincaProps) {}

  public static crear(params: CrearFincaParams): Finca {
    if (!params.nombre || params.nombre.trim().length === 0) {
      throw new NombreFincaInvalidoError('El nombre de la finca es obligatorio.');
    }

    if (params.superficieTotalHa <= 0) {
      throw new SuperficieInvalidaError('La superficie total de la finca debe ser un valor positivo mayor a 0 ha.');
    }

    let geomValidada: GeoJSONGeometry | null = null;
    if (params.geometria) {
      geomValidada = GeoJSONValidator.validar(params.geometria);
    }

    const ahora = new Date().toISOString();

    return new Finca({
      id: params.id,
      nombre: params.nombre.trim(),
      ubicacion: {
        localidad: params.localidad.trim(),
        departamento: params.departamento.trim(),
        provincia: params.provincia.trim(),
      },
      superficieTotalHa: Number(params.superficieTotalHa),
      responsableId: params.responsableId ?? null,
      renspa: params.renspa ? params.renspa.trim().toUpperCase() : null,
      geometria: geomValidada,
      propietario: params.propietario?.trim() || null,
      telefono: params.telefono?.trim() || null,
      observaciones: params.observaciones?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: FincaProps): Finca {
    return new Finca({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get nombre(): string {
    return this.props.nombre;
  }

  public get ubicacion(): UbicacionFinca {
    return { ...this.props.ubicacion };
  }

  public get superficieTotalHa(): number {
    return this.props.superficieTotalHa;
  }

  public get responsableId(): string | null | undefined {
    return this.props.responsableId;
  }

  public get renspa(): string | null | undefined {
    return this.props.renspa;
  }

  public get geometria(): GeoJSONGeometry | null | undefined {
    return this.props.geometria;
  }

  public modificar(params: ModificarFincaParams): void {
    if (!params.nombre?.trim()) throw new NombreFincaInvalidoError();
    if (params.superficieTotalHa <= 0) throw new SuperficieInvalidaError('Debe ser mayor a 0 ha.');
    this.props.nombre = params.nombre.trim();
    this.props.ubicacion = {
      localidad: params.localidad.trim(),
      departamento: params.departamento.trim(),
      provincia: params.provincia.trim(),
    };
    this.props.superficieTotalHa = Number(params.superficieTotalHa);
    this.props.propietario = params.propietario?.trim() || null;
    this.props.telefono = params.telefono?.trim() || null;
    this.props.observaciones = params.observaciones?.trim() || null;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public get creadoEn(): string {
    return this.props.creadoEn;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn;
  }

  public toJSON() {
    return {
      id: this.props.id,
      nombre: this.props.nombre,
      ubicacion: this.props.ubicacion,
      superficieTotalHa: this.props.superficieTotalHa,
      responsableId: this.props.responsableId,
      renspa: this.props.renspa,
      geometria: this.props.geometria,
      propietario: this.props.propietario,
      telefono: this.props.telefono,
      observaciones: this.props.observaciones,
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
