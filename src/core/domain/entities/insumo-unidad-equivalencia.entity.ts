import { InsumoEquivalenciaInvalidaError } from '../errors/domain.error.js';

export interface InsumoUnidadEquivalenciaProps {
  id: string;
  insumoId: string;
  unidadCompra: string;
  unidadConsumo: string;
  factorMultiplicador: number;
  densidadKgL?: number | null;
  creadoEn?: string;
  actualizadoEn?: string;
}

export class InsumoUnidadEquivalencia {
  private constructor(private readonly props: InsumoUnidadEquivalenciaProps) {}

  public static crear(
    props: Omit<InsumoUnidadEquivalenciaProps, 'creadoEn' | 'actualizadoEn'> & {
      creadoEn?: string;
      actualizadoEn?: string;
    }
  ): InsumoUnidadEquivalencia {
    if (!props.id || props.id.trim() === '') {
      throw new InsumoEquivalenciaInvalidaError('El identificador id de la equivalencia es obligatorio.');
    }
    if (!props.insumoId || props.insumoId.trim() === '') {
      throw new InsumoEquivalenciaInvalidaError('El identificador del insumo (insumoId) es obligatorio.');
    }
    if (!props.unidadCompra || props.unidadCompra.trim() === '') {
      throw new InsumoEquivalenciaInvalidaError('La unidad de compra es obligatoria (RF-M9-01).');
    }
    if (!props.unidadConsumo || props.unidadConsumo.trim() === '') {
      throw new InsumoEquivalenciaInvalidaError('La unidad de consumo es obligatoria (RF-M9-01).');
    }
    if (typeof props.factorMultiplicador !== 'number' || isNaN(props.factorMultiplicador) || props.factorMultiplicador <= 0) {
      throw new InsumoEquivalenciaInvalidaError('El factor multiplicador debe ser un valor numérico estrictamente mayor a 0.');
    }

    let densidadNormalizada: number | null = null;
    if (props.densidadKgL !== undefined && props.densidadKgL !== null) {
      if (typeof props.densidadKgL !== 'number' || isNaN(props.densidadKgL) || props.densidadKgL <= 0) {
        throw new InsumoEquivalenciaInvalidaError('La densidad (kg/L) debe ser un valor numérico estrictamente mayor a 0 (RN-12).');
      }
      densidadNormalizada = props.densidadKgL;
    }

    const ahora = new Date().toISOString();

    return new InsumoUnidadEquivalencia({
      id: props.id.trim(),
      insumoId: props.insumoId.trim(),
      unidadCompra: props.unidadCompra.trim().toUpperCase(),
      unidadConsumo: props.unidadConsumo.trim().toUpperCase(),
      factorMultiplicador: props.factorMultiplicador,
      densidadKgL: densidadNormalizada,
      creadoEn: props.creadoEn ?? ahora,
      actualizadoEn: props.actualizadoEn ?? ahora,
    });
  }

  public static reconstituir(props: InsumoUnidadEquivalenciaProps): InsumoUnidadEquivalencia {
    return new InsumoUnidadEquivalencia(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get insumoId(): string {
    return this.props.insumoId;
  }

  public get unidadCompra(): string {
    return this.props.unidadCompra;
  }

  public get unidadConsumo(): string {
    return this.props.unidadConsumo;
  }

  public get factorMultiplicador(): number {
    return this.props.factorMultiplicador;
  }

  public get densidadKgL(): number | null {
    return this.props.densidadKgL ?? null;
  }

  public get creadoEn(): string {
    return this.props.creadoEn!;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn!;
  }

  public toJSON(): InsumoUnidadEquivalenciaProps {
    return {
      ...this.props,
    };
  }
}
