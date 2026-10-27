import { CodigoLote } from '../value-objects/codigo-lote.vo.js';
import { EstadoLote, EstadoLoteEnum, MaquinaEstadosLote } from '../value-objects/estado-lote.vo.js';
import { TipoEvento } from '../value-objects/tipo-evento.vo.js';
import { CantidadInsuficienteError, InvalidStateTransitionError } from '../errors/domain.error.js';
import { GeoJSONGeometry, GeoJSONValidator } from '../value-objects/geojson.vo.js';

export interface LoteProps {
  id: string;
  codigoLote: CodigoLote;
  producto: string;
  variedad?: string | null;
  estadoActual: EstadoLote;
  cantidadActual: number;
  unidadMedida: string;
  fincaId?: string | null;
  superficieHa?: number | null;
  geometria?: GeoJSONGeometry | null;
  nombreTerritorial?: string | null;
  ubicacionSector?: string | null;
  tipoSuelo?: string | null;
  sistemaRiego?: string | null;
  estadoTerritorial?: EstadoTerritorial;
  fechaRegistro?: string | null;
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
  fincaId?: string | null;
  superficieHa?: number | null;
  geometria?: unknown;
  nombreTerritorial?: string | null;
  ubicacionSector?: string | null;
  tipoSuelo?: string | null;
  sistemaRiego?: string | null;
  estadoTerritorial?: EstadoTerritorial;
  fechaRegistro?: string | null;
}

export type EstadoTerritorial = 'DISPONIBLE' | 'EN_PRODUCCION' | 'INACTIVO';

export interface ModificarLoteTerritorialParams {
  nombreTerritorial: string;
  superficieHa: number;
  ubicacionSector?: string | null;
  tipoSuelo?: string | null;
  sistemaRiego?: string | null;
  estadoTerritorial?: Exclude<EstadoTerritorial, 'INACTIVO'>;
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

    let geomValidada: GeoJSONGeometry | null = null;
    if (params.geometria) {
      geomValidada = GeoJSONValidator.validar(params.geometria);
    }

    const ahora = new Date().toISOString();

    return new Lote({
      id: params.id,
      codigoLote: codigo,
      producto: params.producto.trim(),
      variedad: params.variedad?.trim() ?? null,
      estadoActual: EstadoLoteEnum.CREADO,
      cantidadActual: params.cantidadInicial,
      unidadMedida: params.unidadMedida.trim().toUpperCase(),
      fincaId: params.fincaId ?? null,
      superficieHa: params.superficieHa !== undefined && params.superficieHa !== null ? Number(params.superficieHa) : null,
      geometria: geomValidada,
      nombreTerritorial: params.nombreTerritorial?.trim() || null,
      ubicacionSector: params.ubicacionSector?.trim() || null,
      tipoSuelo: params.tipoSuelo?.trim() || null,
      sistemaRiego: params.sistemaRiego?.trim() || null,
      estadoTerritorial: params.estadoTerritorial ?? 'DISPONIBLE',
      fechaRegistro: params.fechaRegistro ?? ahora.slice(0, 10),
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

  public modificarTerritorio(params: ModificarLoteTerritorialParams): void {
    if (!params.nombreTerritorial?.trim()) throw new Error('El nombre territorial del lote es obligatorio.');
    if (params.superficieHa <= 0) throw new Error('La superficie del lote debe ser mayor a 0 ha.');
    if (this.props.estadoTerritorial === 'INACTIVO') throw new InvalidStateTransitionError('INACTIVO', 'MODIFICAR');
    this.props.nombreTerritorial = params.nombreTerritorial.trim();
    this.props.superficieHa = Number(params.superficieHa);
    this.props.ubicacionSector = params.ubicacionSector?.trim() || null;
    this.props.tipoSuelo = params.tipoSuelo?.trim() || null;
    this.props.sistemaRiego = params.sistemaRiego?.trim() || null;
    if (params.estadoTerritorial) this.props.estadoTerritorial = params.estadoTerritorial;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public desactivarTerritorialmente(): void {
    if (this.props.estadoTerritorial !== 'DISPONIBLE') {
      throw new InvalidStateTransitionError(this.props.estadoTerritorial ?? 'DISPONIBLE', 'INACTIVO');
    }
    this.props.estadoTerritorial = 'INACTIVO';
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
  public get fincaId(): string | null | undefined { return this.props.fincaId; }
  public get superficieHa(): number | null | undefined { return this.props.superficieHa; }
  public get geometria(): GeoJSONGeometry | null | undefined { return this.props.geometria; }
  public get nombreTerritorial(): string | null { return this.props.nombreTerritorial ?? null; }
  public get ubicacionSector(): string | null { return this.props.ubicacionSector ?? null; }
  public get tipoSuelo(): string | null { return this.props.tipoSuelo ?? null; }
  public get sistemaRiego(): string | null { return this.props.sistemaRiego ?? null; }
  public get estadoTerritorial(): EstadoTerritorial { return this.props.estadoTerritorial ?? 'DISPONIBLE'; }
  public get fechaRegistro(): string { return this.props.fechaRegistro ?? this.props.creadoEn.slice(0, 10); }
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
      fincaId: this.props.fincaId,
      superficieHa: this.props.superficieHa,
      geometria: this.props.geometria,
      nombreTerritorial: this.props.nombreTerritorial,
      ubicacionSector: this.props.ubicacionSector,
      tipoSuelo: this.props.tipoSuelo,
      sistemaRiego: this.props.sistemaRiego,
      estadoTerritorial: this.props.estadoTerritorial ?? 'DISPONIBLE',
      fechaRegistro: this.props.fechaRegistro ?? this.props.creadoEn.slice(0, 10),
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
