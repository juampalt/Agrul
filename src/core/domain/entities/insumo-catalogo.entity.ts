import { DomainError } from '../errors/domain.error.js';

export type CategoriaInsumo = 'SEMILLA_PLANTIN' | 'FERTILIZANTE' | 'FITOSANITARIO' | 'ENMIENDA' | 'OTRO';

export const CATEGORIAS_INSUMO: CategoriaInsumo[] = [
  'SEMILLA_PLANTIN',
  'FERTILIZANTE',
  'FITOSANITARIO',
  'ENMIENDA',
  'OTRO',
];

export class FichaFitosanitariaInvalidaError extends DomainError {
  public readonly code = 'INVALID_PHYTOSANITARY_SHEET';

  constructor(mensaje: string = 'La ficha fitosanitaria técnica es obligatoria para insumos de categoría FITOSANITARIO (RN-14).') {
    super(mensaje);
  }
}

export class InsumoCatalogoInvalidoError extends DomainError {
  public readonly code = 'INVALID_INPUT_CATALOG';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export interface FichaFitosanitariaProps {
  insumoId?: string;
  principioActivo: string;
  periodoCarenciaDias: number;
  periodoReingresoHoras: number;
  nroRegistroSenasa: string;
  toxicologia?: string | null;
}

export interface InsumoCatalogoProps {
  id: string;
  nombreComercial: string;
  categoria: CategoriaInsumo;
  unidadMedidaId: string;
  presentacion: string;
  activo: boolean;
  fichaFitosanitaria?: FichaFitosanitariaProps | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearInsumoCatalogoParams {
  id: string;
  nombreComercial: string;
  categoria: CategoriaInsumo;
  unidadMedidaId: string;
  presentacion: string;
  activo?: boolean;
  fichaFitosanitaria?: Omit<FichaFitosanitariaProps, 'insumoId'> | null;
}

/**
 * Entidad de dominio que representa un ítem del Catálogo Maestro de Insumos.
 * Soporta categorización estricta y ficha fitosanitaria obligatoria conforme a RF-M4-01, RF-M4-02 y RN-14.
 */
export class InsumoCatalogo {
  private constructor(private props: InsumoCatalogoProps) {}

  public static crear(params: CrearInsumoCatalogoParams): InsumoCatalogo {
    if (!params.id || params.id.trim().length === 0) {
      throw new InsumoCatalogoInvalidoError('El identificador del insumo es obligatorio.');
    }
    if (!params.nombreComercial || params.nombreComercial.trim().length < 2) {
      throw new InsumoCatalogoInvalidoError('El nombre comercial del insumo debe contener al menos 2 caracteres.');
    }
    if (!CATEGORIAS_INSUMO.includes(params.categoria)) {
      throw new InsumoCatalogoInvalidoError(`Categoría de insumo inválida: '${params.categoria}'.`);
    }
    if (!params.unidadMedidaId || params.unidadMedidaId.trim().length === 0) {
      throw new InsumoCatalogoInvalidoError('La unidad de medida base es obligatoria (RF-M4-01).');
    }
    if (!params.presentacion || params.presentacion.trim().length === 0) {
      throw new InsumoCatalogoInvalidoError('La presentación comercial es obligatoria (RF-M4-01).');
    }

    let fichaNormalizada: FichaFitosanitariaProps | null = null;

    // Regla RN-14: Para insumos fitosanitarios, los parámetros de carencia, reingreso y SENASA
    // deben cargarse tal como figuran en el rótulo comercial, sin valores por defecto inventados por el sistema.
    if (params.categoria === 'FITOSANITARIO') {
      if (!params.fichaFitosanitaria) {
        throw new FichaFitosanitariaInvalidaError(
          'Los insumos fitosanitarios requieren obligatoriamente su ficha técnica de rótulo (RF-M4-02 / RN-14).'
        );
      }

      const { principioActivo, periodoCarenciaDias, periodoReingresoHoras, nroRegistroSenasa, toxicologia } =
        params.fichaFitosanitaria;

      if (!principioActivo || principioActivo.trim().length < 2) {
        throw new FichaFitosanitariaInvalidaError('El principio activo es obligatorio para insumos fitosanitarios.');
      }

      if (
        typeof periodoCarenciaDias !== 'number' ||
        !Number.isInteger(periodoCarenciaDias) ||
        periodoCarenciaDias < 0
      ) {
        throw new FichaFitosanitariaInvalidaError(
          'El período de carencia en días debe ser un número entero mayor o igual a 0 según rótulo (RN-14).'
        );
      }

      if (
        typeof periodoReingresoHoras !== 'number' ||
        !Number.isInteger(periodoReingresoHoras) ||
        periodoReingresoHoras < 0
      ) {
        throw new FichaFitosanitariaInvalidaError(
          'El período de reingreso en horas debe ser un número entero mayor o igual a 0 según rótulo (RN-14).'
        );
      }

      if (!nroRegistroSenasa || nroRegistroSenasa.trim().length === 0) {
        throw new FichaFitosanitariaInvalidaError(
          'El número de registro SENASA es obligatorio para productos fitosanitarios.'
        );
      }

      fichaNormalizada = {
        insumoId: params.id,
        principioActivo: principioActivo.trim(),
        periodoCarenciaDias,
        periodoReingresoHoras,
        nroRegistroSenasa: nroRegistroSenasa.trim(),
        toxicologia: toxicologia ? toxicologia.trim() : null,
      };
    }

    const ahora = new Date().toISOString();

    return new InsumoCatalogo({
      id: params.id,
      nombreComercial: params.nombreComercial.trim(),
      categoria: params.categoria,
      unidadMedidaId: params.unidadMedidaId.trim(),
      presentacion: params.presentacion.trim(),
      activo: params.activo ?? true,
      fichaFitosanitaria: fichaNormalizada,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: InsumoCatalogoProps): InsumoCatalogo {
    return new InsumoCatalogo({
      ...props,
      fichaFitosanitaria: props.fichaFitosanitaria ? { ...props.fichaFitosanitaria } : null,
    });
  }

  public get id(): string { return this.props.id; }
  public get nombreComercial(): string { return this.props.nombreComercial; }
  public get categoria(): CategoriaInsumo { return this.props.categoria; }
  public get unidadMedidaId(): string { return this.props.unidadMedidaId; }
  public get presentacion(): string { return this.props.presentacion; }
  public get activo(): boolean { return this.props.activo; }
  public get fichaFitosanitaria(): FichaFitosanitariaProps | null | undefined {
    return this.props.fichaFitosanitaria ? { ...this.props.fichaFitosanitaria } : null;
  }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): InsumoCatalogoProps {
    return {
      ...this.props,
      fichaFitosanitaria: this.props.fichaFitosanitaria ? { ...this.props.fichaFitosanitaria } : null,
    };
  }
}
