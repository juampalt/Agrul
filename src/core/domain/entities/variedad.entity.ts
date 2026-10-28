import { DomainError } from '../errors/domain.error.js';

export type EstadoVariedad = 'ACTIVO' | 'INACTIVO';

export interface DatosVariedad {
  nombre: string;
  descripcion: string | null;
}

export interface VariedadProps extends DatosVariedad {
  id: string;
  cultivoId: string;
  estado: EstadoVariedad;
}

export class VariedadInvalidaError extends DomainError {
  readonly code = 'VARIEDAD_INVALIDA';
}

export class VariedadDuplicadaError extends DomainError {
  readonly code = 'VARIEDAD_DUPLICADA';
  constructor(nombre: string) { super(`Ya existe una variedad con el nombre '${nombre}' para este cultivo.`); }
}

export class Variedad {
  private constructor(private readonly props: VariedadProps) {}

  static crear(datos: DatosVariedad & { id: string; cultivoId: string }): Variedad {
    return Variedad.reconstituir({ ...datos, estado: 'ACTIVO' });
  }

  static reconstituir(props: VariedadProps): Variedad {
    const nombre = props.nombre.trim();
    if (!nombre || nombre.length > 40) {
      throw new VariedadInvalidaError('El nombre de la variedad debe tener entre 1 y 40 caracteres.');
    }
    if (!props.cultivoId.trim()) {
      throw new VariedadInvalidaError('La variedad debe pertenecer a un cultivo.');
    }
    if (!['ACTIVO', 'INACTIVO'].includes(props.estado)) {
      throw new VariedadInvalidaError('Estado de variedad inválido.');
    }
    return new Variedad({ ...props, nombre });
  }

  toJSON(): VariedadProps { return { ...this.props }; }
}
