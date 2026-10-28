import { DomainError } from '../errors/domain.error.js';

export type TipoCicloVida = 'ANUAL' | 'PERENNE';
export type EstadoCultivo = 'ACTIVO' | 'INACTIVO';

export interface DatosCultivo {
  nombre: string;
  tipoCicloVida: TipoCicloVida;
  descripcion: string | null;
}

export interface CultivoProps extends DatosCultivo {
  id: string;
  estado: EstadoCultivo;
}

export class CultivoInvalidoError extends DomainError {
  readonly code = 'CULTIVO_INVALIDO';
}

export class CultivoDuplicadoError extends DomainError {
  readonly code = 'CULTIVO_DUPLICADO';
  constructor(nombre: string) { super(`Ya existe un cultivo con el nombre '${nombre}'.`); }
}

export class Cultivo {
  private constructor(private readonly props: CultivoProps) {}

  static crear(datos: DatosCultivo & { id: string }): Cultivo {
    return Cultivo.reconstituir({ ...datos, estado: 'ACTIVO' });
  }

  static reconstituir(props: CultivoProps): Cultivo {
    const nombre = props.nombre.trim();
    if (!nombre || nombre.length > 40) {
      throw new CultivoInvalidoError('El nombre del cultivo debe tener entre 1 y 40 caracteres.');
    }
    if (!['ANUAL', 'PERENNE'].includes(props.tipoCicloVida)) {
      throw new CultivoInvalidoError('El tipo de ciclo de vida debe ser ANUAL o PERENNE.');
    }
    if (!['ACTIVO', 'INACTIVO'].includes(props.estado)) {
      throw new CultivoInvalidoError('Estado de cultivo inválido.');
    }
    return new Cultivo({ ...props, nombre });
  }

  get id(): string { return this.props.id; }
  toJSON(): CultivoProps { return { ...this.props }; }
}
