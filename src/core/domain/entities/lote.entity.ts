import { CodigoLote } from '../value-objects/codigo-lote.vo.js';
import { EstadoLote, EstadoLoteEnum, MaquinaEstadosLote } from '../value-objects/estado-lote.vo.js';
import { TipoEvento } from '../value-objects/tipo-evento.vo.js';
import { CantidadInsuficienteError, InvalidStateTransitionError } from '../errors/domain.error.js';

export interface LoteProps {
  id: string;
  codigoLote: CodigoLote;
  producto: string;
  variedad?: string | null;
  estadoActual: EstadoLote;
  cantidadActual: number;
  unidadMedida: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearLoteParams {
  id: string;
  codigoLote: string | CodigoLote;
  producto: string;
  variedad?: string | null;
  cantidadInicial: number;
  unidadMedida: string;
}

/**
 * Agregado raíz que representa la unidad central de trazabilidad en Agrul.
 * Mantiene la consistencia del estado proyectado y el balance de masa.
 */
export class Lote {
  private constructor(private props: LoteProps) {}

  public static crear(params: CrearLoteParams): Lote {
    const codigo = typeof params.codigoLote === 'string'
      ? CodigoLote.crear(params.codigoLote)
      : params.codigoLote;

    const ahora = new Date().toISOString();

    return new Lote({
      id: params.id,
      codigoLote: codigo,
      producto: params.producto.trim(),
      variedad: params.variedad?.trim() ?? null,
      estadoActual: EstadoLoteEnum.CREADO,
      cantidadActual: params.cantidadInicial,
      unidadMedida: params.unidadMedida.trim().toUpperCase(),
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: LoteProps): Lote {
    return new Lote({ ...props });
  }

  /**
   * Aplica un evento de trazabilidad y avanza la máquina de estados.
   */
  public aplicarEvento(tipoEvento: TipoEvento): void {
    const nuevoEstado = MaquinaEstadosLote.calcularSiguienteEstado(this.props.estadoActual, tipoEvento);
    this.props.estadoActual = nuevoEstado;
    this.props.actualizadoEn = new Date().toISOString();
  }

  /**
   * Descuenta una cantidad por split, merma o despacho.
   */
  public descontarCantidad(cantidadADescontar: number): void {
    if (cantidadADescontar <= 0) {
      throw new Error('La cantidad a descontar debe ser estrictamente positiva.');
    }
    if (cantidadADescontar > this.props.cantidadActual) {
      throw new CantidadInsuficienteError(
        this.props.codigoLote.value,
        this.props.cantidadActual,
        cantidadADescontar
      );
    }
    this.props.cantidadActual = Number((this.props.cantidadActual - cantidadADescontar).toFixed(4));
    this.props.actualizadoEn = new Date().toISOString();
  }

  /**
   * Incrementa cantidad por recepción o mezcla de lotes.
   */
  public incrementarCantidad(cantidadAIncrementar: number): void {
    if (cantidadAIncrementar <= 0) {
      throw new Error('La cantidad a incrementar debe ser estrictamente positiva.');
    }
    this.props.cantidadActual = Number((this.props.cantidadActual + cantidadAIncrementar).toFixed(4));
    this.props.actualizadoEn = new Date().toISOString();
  }

  /**
   * Cierra definitivamente el lote impidiendo cualquier operación posterior.
   */
  public cerrarLote(): void {
    if (this.props.estadoActual === EstadoLoteEnum.CERRADO) {
      return;
    }
    this.props.estadoActual = EstadoLoteEnum.CERRADO;
    this.props.actualizadoEn = new Date().toISOString();
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get codigoLote(): CodigoLote { return this.props.codigoLote; }
  public get producto(): string { return this.props.producto; }
  public get variedad(): string | null { return this.props.variedad ?? null; }
  public get estadoActual(): EstadoLote { return this.props.estadoActual; }
  public get cantidadActual(): number { return this.props.cantidadActual; }
  public get unidadMedida(): string { return this.props.unidadMedida; }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public toJSON() {
    return {
      id: this.props.id,
      codigoLote: this.props.codigoLote.value,
      producto: this.props.producto,
      variedad: this.props.variedad,
      estadoActual: this.props.estadoActual,
      cantidadActual: this.props.cantidadActual,
      unidadMedida: this.props.unidadMedida,
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
