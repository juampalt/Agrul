import { CategoriaInsumo } from './insumo-catalogo.entity.js';
import {
  DepositoInvalidoError,
  DepositoIncompatibleBpaError,
} from '../errors/domain.error.js';

export type TipoPermitidoDeposito =
  | 'FITOSANITARIOS'
  | 'FERTILIZANTES'
  | 'INSUMOS_GENERALES'
  | 'ZONA_VENCIDOS';

export const TIPOS_PERMITIDOS_DEPOSITO: TipoPermitidoDeposito[] = [
  'FITOSANITARIOS',
  'FERTILIZANTES',
  'INSUMOS_GENERALES',
  'ZONA_VENCIDOS',
];

export interface DepositoAlmacenamientoProps {
  id: string;
  fincaId: string;
  nombre: string;
  tipoPermitido: TipoPermitidoDeposito;
  ubicacionFisica?: string | null;
  capacidadMaxima?: number | null;
  activo?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export class DepositoAlmacenamiento {
  private constructor(private readonly props: DepositoAlmacenamientoProps) {}

  public static crear(
    props: Omit<DepositoAlmacenamientoProps, 'creadoEn' | 'actualizadoEn'> & {
      creadoEn?: string;
      actualizadoEn?: string;
    }
  ): DepositoAlmacenamiento {
    if (!props.id || props.id.trim() === '') {
      throw new DepositoInvalidoError('El identificador id del depósito es obligatorio.');
    }
    if (!props.fincaId || props.fincaId.trim() === '') {
      throw new DepositoInvalidoError('El identificador de finca (fincaId) es obligatorio.');
    }
    if (!props.nombre || props.nombre.trim().length < 2) {
      throw new DepositoInvalidoError('El nombre del depósito debe tener al menos 2 caracteres.');
    }
    if (!TIPOS_PERMITIDOS_DEPOSITO.includes(props.tipoPermitido)) {
      throw new DepositoInvalidoError(`Tipo de depósito inválido: '${props.tipoPermitido}'.`);
    }

    const ahora = new Date().toISOString();

    return new DepositoAlmacenamiento({
      ...props,
      nombre: props.nombre.trim(),
      ubicacionFisica: props.ubicacionFisica?.trim() ?? null,
      capacidadMaxima: props.capacidadMaxima ?? null,
      activo: props.activo ?? true,
      creadoEn: props.creadoEn ?? ahora,
      actualizadoEn: props.actualizadoEn ?? ahora,
    });
  }

  public static reconstituir(props: DepositoAlmacenamientoProps): DepositoAlmacenamiento {
    return new DepositoAlmacenamiento(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get fincaId(): string {
    return this.props.fincaId;
  }

  public get nombre(): string {
    return this.props.nombre;
  }

  public get tipoPermitido(): TipoPermitidoDeposito {
    return this.props.tipoPermitido;
  }

  public get ubicacionFisica(): string | null {
    return this.props.ubicacionFisica ?? null;
  }

  public get capacidadMaxima(): number | null {
    return this.props.capacidadMaxima ?? null;
  }

  public get activo(): boolean {
    return this.props.activo ?? true;
  }

  public get creadoEn(): string {
    return this.props.creadoEn!;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn!;
  }

  /**
   * Valida la segregación física conforme a las Buenas Prácticas Agrícolas (BPA - RF-M9-19):
   * - Prohibido almacenar fitosanitarios junto con fertilizantes o productos comestibles.
   * - Insumos vencidos deben almacenarse exclusivamente en ZONA_VENCIDOS.
   */
  public esCompatibleConCategoriaInsumo(categoria: CategoriaInsumo, esVencido: boolean = false): boolean {
    if (esVencido) {
      return this.props.tipoPermitido === 'ZONA_VENCIDOS';
    }

    if (this.props.tipoPermitido === 'ZONA_VENCIDOS') {
      return esVencido;
    }

    if (categoria === 'FITOSANITARIO') {
      return this.props.tipoPermitido === 'FITOSANITARIOS';
    }

    if (categoria === 'FERTILIZANTE') {
      return (
        this.props.tipoPermitido === 'FERTILIZANTES' ||
        this.props.tipoPermitido === 'INSUMOS_GENERALES'
      );
    }

    // Semillas, enmiendas u otros insumos
    return this.props.tipoPermitido === 'INSUMOS_GENERALES';
  }

  public validarCompatibilidadBpa(categoria: CategoriaInsumo, esVencido: boolean = false): void {
    if (!this.esCompatibleConCategoriaInsumo(categoria, esVencido)) {
      if (esVencido) {
        throw new DepositoIncompatibleBpaError(
          `Violación BPA: Los insumos vencidos o en cuarentena deben almacenarse exclusivamente en depósitos de tipo 'ZONA_VENCIDOS' (RF-M9-19).`
        );
      }
      if (categoria === 'FITOSANITARIO') {
        throw new DepositoIncompatibleBpaError(
          `Violación BPA: El insumo es de categoría 'FITOSANITARIO' y no puede almacenarse en el depósito '${this.props.nombre}' de tipo '${this.props.tipoPermitido}'. Requiere un depósito exclusivo de tipo 'FITOSANITARIOS' (RF-M9-19).`
        );
      }
      if (this.props.tipoPermitido === 'FITOSANITARIOS') {
        throw new DepositoIncompatibleBpaError(
          `Violación BPA: Prohibido almacenar insumos no fitosanitarios ('${categoria}') dentro del depósito de fitosanitarios '${this.props.nombre}' (RF-M9-19).`
        );
      }
      throw new DepositoIncompatibleBpaError(
        `Violación BPA: Insumo de categoría '${categoria}' incompatible con depósito de tipo '${this.props.tipoPermitido}' (RF-M9-19).`
      );
    }
  }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public activar(): void {
    this.props.activo = true;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): DepositoAlmacenamientoProps {
    return {
      ...this.props,
    };
  }
}
