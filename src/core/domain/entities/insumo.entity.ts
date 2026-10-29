import { DomainError } from '../errors/domain.error.js';

export const CATEGORIAS_INSUMO_CANONICO = ['FERTILIZANTE', 'FITOSANITARIO', 'ENMIENDA', 'OTRO'] as const;
export type CategoriaInsumoCanonico = typeof CATEGORIAS_INSUMO_CANONICO[number];
export interface DatosInsumo {
  codigo: string;
  nombre: string;
  categoria: CategoriaInsumoCanonico;
  unidadMedida: string;
  tipoProducto: string | null;
  fabricanteMarca: string | null;
  nivelMinimo: number;
}
export interface InsumoProps extends DatosInsumo {
  id: string;
  estado: 'ACTIVO' | 'INACTIVO';
}
export class InsumoInvalidoError extends DomainError { readonly code = 'INSUMO_INVALIDO'; }
export class CodigoInsumoDuplicadoError extends DomainError {
  readonly code = 'CODIGO_INSUMO_DUPLICADO';
  constructor() { super('El código de insumo ya está registrado, incluso si está inactivo.'); }
}
export class UnidadInsumoInmutableError extends DomainError {
  readonly code = 'UNIDAD_INSUMO_INMUTABLE';
  constructor() { super('No se puede cambiar la unidad de un insumo con aplicaciones registradas (RN-15).'); }
}

export function validarNivelMinimo(valor: number): void {
  const [mantisa, exponente = '0'] = String(valor).split('e');
  const decimales = (mantisa.split('.')[1]?.length ?? 0) - Number(exponente);
  if (!Number.isFinite(valor) || valor < 0 || valor > 99999999.99 ||
    decimales > 2) {
    throw new InsumoInvalidoError('El nivel mínimo debe ser no negativo y representable como NUMERIC(10,2).');
  }
}

/** Catálogo canónico CU34–CU37; reconstruir históricos no aplica reglas de alta. */
export class Insumo {
  private constructor(private readonly props: InsumoProps) {}

  static crear(id: string, datos: DatosInsumo): Insumo {
    return new Insumo({ id, ...Insumo.validar(datos), estado: 'ACTIVO' });
  }

  static validar(datos: DatosInsumo): DatosInsumo {
    const texto = (valor: string, max: number, campo: string) => {
      if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) {
        throw new InsumoInvalidoError(`${campo} es obligatorio y admite hasta ${max} caracteres.`);
      }
      return valor.trim();
    };
    if (!CATEGORIAS_INSUMO_CANONICO.includes(datos.categoria)) throw new InsumoInvalidoError('Categoría inválida.');
    validarNivelMinimo(datos.nivelMinimo);
    return {
      ...datos,
      codigo: texto(datos.codigo, 15, 'Código'), nombre: texto(datos.nombre, 200, 'Nombre'),
      unidadMedida: texto(datos.unidadMedida, 30, 'Unidad de medida'),
      tipoProducto: datos.tipoProducto === null ? null : texto(datos.tipoProducto, 150, 'Tipo de producto'),
      fabricanteMarca: datos.fabricanteMarca === null ? null : texto(datos.fabricanteMarca, 150, 'Fabricante/marca'),
    };
  }

  static reconstituir(props: InsumoProps): Insumo { return new Insumo({ ...props }); }
  toJSON(): InsumoProps { return { ...this.props }; }
}
