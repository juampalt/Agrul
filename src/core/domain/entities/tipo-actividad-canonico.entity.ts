import { DomainError } from '../errors/domain.error.js';

export const CATEGORIAS_TIPO_ACTIVIDAD = [
  'PREPARACION_SUELO',
  'PLANTACION',
  'RIEGO',
  'FERTILIZACION',
  'MANTENIMIENTO',
  'CONTROL_SANITARIO',
  'OTRO',
] as const;

export type CategoriaTipoActividad = typeof CATEGORIAS_TIPO_ACTIVIDAD[number];
export type EstadoTipoActividad = 'ACTIVA' | 'INACTIVA';

export interface DatosTipoActividad {
  nombre: string;
  categoria: CategoriaTipoActividad;
  descripcion: string | null;
  cultivoIds?: string[];
}

export interface TipoActividadProps extends DatosTipoActividad {
  id: string;
  estado: EstadoTipoActividad;
  cultivoIds: string[];
}

export class TipoActividadInvalidoError extends DomainError {
  readonly code = 'TIPO_ACTIVIDAD_INVALIDO';
}

export class TipoActividadDuplicadoError extends DomainError {
  readonly code = 'TIPO_ACTIVIDAD_DUPLICADO';
  constructor(nombre: string) {
    super(`Ya existe un tipo de actividad con el nombre '${nombre}'.`);
  }
}

export class TipoActividad {
  private constructor(private readonly props: TipoActividadProps) {}

  static crear(datos: DatosTipoActividad & { id: string }): TipoActividad {
    return TipoActividad.reconstituir({
      ...datos,
      cultivoIds: datos.cultivoIds ?? [],
      estado: 'ACTIVA',
    });
  }

  static reconstituir(props: TipoActividadProps): TipoActividad {
    const nombre = props.nombre.trim().replace(/\s+/g, ' ');
    if (!nombre || nombre.length > 40) {
      throw new TipoActividadInvalidoError('El nombre del tipo de actividad debe tener entre 1 y 40 caracteres.');
    }
    if (!CATEGORIAS_TIPO_ACTIVIDAD.includes(props.categoria)) {
      throw new TipoActividadInvalidoError(`Categoría de actividad inválida: '${props.categoria}'.`);
    }
    if (!['ACTIVA', 'INACTIVA'].includes(props.estado)) {
      throw new TipoActividadInvalidoError(`Estado de tipo de actividad inválido: '${props.estado}'.`);
    }
    return new TipoActividad({
      ...props,
      nombre,
      cultivoIds: props.cultivoIds ? [...props.cultivoIds] : [],
    });
  }

  get id(): string {
    return this.props.id;
  }

  get nombre(): string {
    return this.props.nombre;
  }

  get categoria(): CategoriaTipoActividad {
    return this.props.categoria;
  }

  get descripcion(): string | null {
    return this.props.descripcion;
  }

  get estado(): EstadoTipoActividad {
    return this.props.estado;
  }

  get cultivoIds(): string[] {
    return [...this.props.cultivoIds];
  }

  toJSON(): TipoActividadProps {
    return {
      ...this.props,
      cultivoIds: [...this.props.cultivoIds],
    };
  }
}
