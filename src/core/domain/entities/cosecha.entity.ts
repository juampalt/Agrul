import {
  CosechaInvalidaError,
  DesgloseCosechaInvalidoError,
  FechaFuturaInvalidaError,
} from '../errors/domain.error.js';
import { CodigoTrazabilidadCosecha } from '../value-objects/codigo-trazabilidad-cosecha.vo.js';

export type EstadoCosecha = 'ACTIVA' | 'ANULADA';

export interface RecipienteCosechaProps {
  tipo: string; // ej. BIN, CAJON, BANDEJA
  cantidad: number;
}

export interface CambioHistorialCosecha {
  campo: string;
  valorAnterior: any;
  valorNuevo: any;
}

export interface HistorialModificacionCosecha {
  fechaModificacion: string;
  usuarioId: string;
  motivo: string;
  cambios: CambioHistorialCosecha[];
}

export interface ModificarCosechaParams {
  cantidadCosechadaKg?: number;
  cantidadComercializableKg?: number;
  cantidadDescarteKg?: number;
  motivoDescarte?: string | null;
  observacionesCalidad?: string | null;
  responsableId?: string | null;
  cuadrillaId?: string | null;
  recipientes?: RecipienteCosechaProps[] | null;
  superficieCosechadaHa?: number | null;
}

export interface CosechaProps {
  id: string;
  codigoTrazabilidad: CodigoTrazabilidadCosecha;
  loteId: string;
  cicloId: string;
  fecha: string;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  motivoDescarte?: string | null;
  observacionesCalidad?: string | null;
  responsableId?: string | null;
  cuadrillaId?: string | null;
  recipientes?: RecipienteCosechaProps[] | null;
  superficieCosechadaHa?: number | null;
  estado: EstadoCosecha;
  motivoAnulacion?: string | null;
  usuarioAnulacionId?: string | null;
  anuladoEn?: string | null;
  historialModificaciones?: HistorialModificacionCosecha[] | null;
  claveIdempotencia?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearCosechaParams {
  id: string;
  codigoTrazabilidad: CodigoTrazabilidadCosecha | string;
  loteId: string;
  cicloId: string;
  fecha: string;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  motivoDescarte?: string | null;
  observacionesCalidad?: string | null;
  responsableId?: string | null;
  cuadrillaId?: string | null;
  recipientes?: RecipienteCosechaProps[] | null;
  superficieCosechadaHa?: number | null;
  estado?: EstadoCosecha;
  claveIdempotencia?: string | null;
  /** Permite inyectar fecha de referencia para pruebas deterministas (RN-04) */
  fechaReferenciaHoy?: Date;
}

export interface CosechaJSON {
  id: string;
  codigoTrazabilidad: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  motivoDescarte: string | null;
  observacionesCalidad: string | null;
  responsableId: string | null;
  cuadrillaId: string | null;
  recipientes: RecipienteCosechaProps[] | null;
  superficieCosechadaHa: number | null;
  estado: EstadoCosecha;
  motivoAnulacion: string | null;
  usuarioAnulacionId: string | null;
  anuladoEn: string | null;
  historialModificaciones: HistorialModificacionCosecha[];
  claveIdempotencia?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Entidad de dominio Cosecha (Módulo 5 / Épica 11).
 * Implementa RF-M5-01 a RF-M5-06, RF-M5-12
 * y valida las invariantes RN-05, RN-06, RN-07, RN-08 y RN-09.
 */
export class Cosecha {
  private constructor(private readonly props: CosechaProps) {}

  public static crear(params: CrearCosechaParams): Cosecha {
    // 1. Validaciones de presencia
    if (!params.id || params.id.trim().length === 0) {
      throw new CosechaInvalidaError('El id de la cosecha es obligatorio.');
    }
    if (!params.loteId || params.loteId.trim().length === 0) {
      throw new CosechaInvalidaError('El loteId es obligatorio para registrar una cosecha.');
    }
    if (!params.cicloId || params.cicloId.trim().length === 0) {
      throw new CosechaInvalidaError('El cicloId es obligatorio para registrar una cosecha.');
    }
    if (!params.fecha || params.fecha.trim().length === 0) {
      throw new CosechaInvalidaError('La fecha de cosecha es obligatoria.');
    }

    // 2. Validación de fecha no futura (RN-04)
    const fechaHoy = params.fechaReferenciaHoy ?? new Date();
    const fechaHoyStr = fechaHoy.toISOString().slice(0, 10);
    const fechaCosechaStr = params.fecha.trim().slice(0, 10);
    if (fechaCosechaStr > fechaHoyStr) {
      throw new FechaFuturaInvalidaError(params.fecha);
    }

    // 3. Validaciones de cantidades no negativas
    if (params.cantidadCosechadaKg <= 0) {
      throw new CosechaInvalidaError('La cantidad total cosechada debe ser mayor a cero.');
    }
    if (params.cantidadComercializableKg < 0) {
      throw new CosechaInvalidaError('La cantidad comercializable no puede ser negativa.');
    }
    if (params.cantidadDescarteKg < 0) {
      throw new CosechaInvalidaError('La cantidad de descarte no puede ser negativa.');
    }

    // 4. Invariante RN-09: Desglose estricto cosechado = comercializable + descarte
    const sumaDesglose = Number((params.cantidadComercializableKg + params.cantidadDescarteKg).toFixed(4));
    const totalCosechado = Number(params.cantidadCosechadaKg.toFixed(4));
    if (Math.abs(totalCosechado - sumaDesglose) > 0.0001) {
      throw new DesgloseCosechaInvalidoError(
        params.cantidadCosechadaKg,
        params.cantidadComercializableKg,
        params.cantidadDescarteKg
      );
    }

    // 5. Invariante RF-M5-02: Justificación de descarte obligatoria si descarte > 0
    if (params.cantidadDescarteKg > 0) {
      if (!params.motivoDescarte || params.motivoDescarte.trim().length === 0) {
        throw new CosechaInvalidaError(
          'Debe especificarse el motivo del descarte cuando la cantidad de descarte es mayor a cero (RF-M5-02).'
        );
      }
    }

    // 6. Superficie cosechada
    if (params.superficieCosechadaHa !== undefined && params.superficieCosechadaHa !== null) {
      if (params.superficieCosechadaHa <= 0) {
        throw new CosechaInvalidaError('La superficie cosechada en hectáreas debe ser un valor positivo mayor a cero.');
      }
    }

    // 7. Código de trazabilidad único (RN-07 / RN-08)
    const codigoTrazabilidad = typeof params.codigoTrazabilidad === 'string'
      ? CodigoTrazabilidadCosecha.crear(params.codigoTrazabilidad)
      : params.codigoTrazabilidad;

    const ahora = new Date().toISOString();

    return new Cosecha({
      id: params.id,
      codigoTrazabilidad,
      loteId: params.loteId,
      cicloId: params.cicloId,
      fecha: fechaCosechaStr,
      cantidadCosechadaKg: params.cantidadCosechadaKg,
      cantidadComercializableKg: params.cantidadComercializableKg,
      cantidadDescarteKg: params.cantidadDescarteKg,
      motivoDescarte: params.motivoDescarte?.trim() ?? null,
      observacionesCalidad: params.observacionesCalidad?.trim() ?? null,
      responsableId: params.responsableId?.trim() ?? null,
      cuadrillaId: params.cuadrillaId?.trim() ?? null,
      recipientes: params.recipientes ?? null,
      superficieCosechadaHa: params.superficieCosechadaHa ?? null,
      estado: params.estado ?? 'ACTIVA',
      motivoAnulacion: null,
      usuarioAnulacionId: null,
      anuladoEn: null,
      historialModificaciones: [],
      claveIdempotencia: params.claveIdempotencia ? params.claveIdempotencia.trim() : null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(json: CosechaJSON): Cosecha {
    return new Cosecha({
      id: json.id,
      codigoTrazabilidad: CodigoTrazabilidadCosecha.crear(json.codigoTrazabilidad),
      loteId: json.loteId,
      cicloId: json.cicloId,
      fecha: json.fecha,
      cantidadCosechadaKg: json.cantidadCosechadaKg,
      cantidadComercializableKg: json.cantidadComercializableKg,
      cantidadDescarteKg: json.cantidadDescarteKg,
      motivoDescarte: json.motivoDescarte,
      observacionesCalidad: json.observacionesCalidad,
      responsableId: json.responsableId,
      cuadrillaId: json.cuadrillaId,
      recipientes: json.recipientes,
      superficieCosechadaHa: json.superficieCosechadaHa,
      estado: json.estado ?? 'ACTIVA',
      motivoAnulacion: json.motivoAnulacion ?? null,
      usuarioAnulacionId: json.usuarioAnulacionId ?? null,
      anuladoEn: json.anuladoEn ?? null,
      historialModificaciones: json.historialModificaciones ?? [],
      claveIdempotencia: json.claveIdempotencia ?? null,
      creadoEn: json.creadoEn,
      actualizadoEn: json.actualizadoEn,
    });
  }

  // Getters
  public get id(): string { return this.props.id; }
  public get codigoTrazabilidad(): CodigoTrazabilidadCosecha { return this.props.codigoTrazabilidad; }
  public get loteId(): string { return this.props.loteId; }
  public get cicloId(): string { return this.props.cicloId; }
  public get fecha(): string { return this.props.fecha; }
  public get cantidadCosechadaKg(): number { return this.props.cantidadCosechadaKg; }
  public get cantidadComercializableKg(): number { return this.props.cantidadComercializableKg; }
  public get cantidadDescarteKg(): number { return this.props.cantidadDescarteKg; }
  public get motivoDescarte(): string | null { return this.props.motivoDescarte ?? null; }
  public get observacionesCalidad(): string | null { return this.props.observacionesCalidad ?? null; }
  public get responsableId(): string | null { return this.props.responsableId ?? null; }
  public get cuadrillaId(): string | null { return this.props.cuadrillaId ?? null; }
  public get recipientes(): RecipienteCosechaProps[] | null { return this.props.recipientes ?? null; }
  public get superficieCosechadaHa(): number | null { return this.props.superficieCosechadaHa ?? null; }
  public get estado(): EstadoCosecha { return this.props.estado; }
  public get claveIdempotencia(): string | null { return this.props.claveIdempotencia ?? null; }
  public get motivoAnulacion(): string | null { return this.props.motivoAnulacion ?? null; }
  public get usuarioAnulacionId(): string | null { return this.props.usuarioAnulacionId ?? null; }
  public get anuladoEn(): string | null { return this.props.anuladoEn ?? null; }
  public get historialModificaciones(): HistorialModificacionCosecha[] {
    return this.props.historialModificaciones ? [...this.props.historialModificaciones] : [];
  }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public estaActiva(): boolean { return this.props.estado === 'ACTIVA'; }
  public estaAnulada(): boolean { return this.props.estado === 'ANULADA'; }

  /** Porcentaje de descarte respecto a la cantidad cosechada */
  public get porcentajeDescarte(): number {
    if (this.props.cantidadCosechadaKg === 0) return 0;
    return Number(((this.props.cantidadDescarteKg / this.props.cantidadCosechadaKg) * 100).toFixed(2));
  }

  /** Porcentaje comercializable respecto a la cantidad cosechada */
  public get porcentajeComercializable(): number {
    if (this.props.cantidadCosechadaKg === 0) return 0;
    return Number(((this.props.cantidadComercializableKg / this.props.cantidadCosechadaKg) * 100).toFixed(2));
  }

  /**
   * Anulación lógica auditada (RF-M5-12 / RN-05 / RN-06).
   * No borra físicamente el registro (prohibido DELETE).
   */
  public anular(usuarioId: string, motivo: string, fechaAnulacion?: string): void {
    if (this.props.estado === 'ANULADA') {
      throw new CosechaInvalidaError('La cosecha ya se encuentra anulada.');
    }
    if (!motivo || motivo.trim().length === 0) {
      throw new CosechaInvalidaError('El motivo de anulación es obligatorio (RN-05).');
    }
    if (!usuarioId || usuarioId.trim().length === 0) {
      throw new CosechaInvalidaError('El identificador del usuario que anula es obligatorio.');
    }

    const ahora = fechaAnulacion ?? new Date().toISOString();
    this.props.estado = 'ANULADA';
    this.props.motivoAnulacion = motivo.trim();
    this.props.usuarioAnulacionId = usuarioId.trim();
    this.props.anuladoEn = ahora;
    this.props.actualizadoEn = ahora;
  }

  /**
   * Modificación auditada (RF-M5-12 / RN-05 / RN-06).
   * Registra el historial de campos alterados con motivo y usuario.
   */
  public modificar(usuarioId: string, motivo: string, cambios: ModificarCosechaParams): void {
    if (this.props.estado === 'ANULADA') {
      throw new CosechaInvalidaError('No es posible modificar una cosecha que se encuentra anulada.');
    }
    if (!motivo || motivo.trim().length === 0) {
      throw new CosechaInvalidaError('El motivo de modificación es obligatorio para auditar el cambio (RN-05).');
    }
    if (!usuarioId || usuarioId.trim().length === 0) {
      throw new CosechaInvalidaError('El identificador del usuario que modifica es obligatorio.');
    }

    const nuevaCosechada = cambios.cantidadCosechadaKg !== undefined ? cambios.cantidadCosechadaKg : this.props.cantidadCosechadaKg;
    const nuevaComercializable = cambios.cantidadComercializableKg !== undefined ? cambios.cantidadComercializableKg : this.props.cantidadComercializableKg;
    const nuevoDescarte = cambios.cantidadDescarteKg !== undefined ? cambios.cantidadDescarteKg : this.props.cantidadDescarteKg;
    const nuevoMotivoDescarte = cambios.motivoDescarte !== undefined ? cambios.motivoDescarte : this.props.motivoDescarte;

    if (nuevaCosechada <= 0) {
      throw new CosechaInvalidaError('La cantidad total cosechada debe ser mayor a cero.');
    }
    if (nuevaComercializable < 0) {
      throw new CosechaInvalidaError('La cantidad comercializable no puede ser negativa.');
    }
    if (nuevoDescarte < 0) {
      throw new CosechaInvalidaError('La cantidad de descarte no puede ser negativa.');
    }

    // Invariante RN-09
    const sumaDesglose = Number((nuevaComercializable + nuevoDescarte).toFixed(4));
    const totalCosechado = Number(nuevaCosechada.toFixed(4));
    if (Math.abs(totalCosechado - sumaDesglose) > 0.0001) {
      throw new DesgloseCosechaInvalidoError(nuevaCosechada, nuevaComercializable, nuevoDescarte);
    }

    // Invariante RF-M5-02
    if (nuevoDescarte > 0 && (!nuevoMotivoDescarte || nuevoMotivoDescarte.trim().length === 0)) {
      throw new CosechaInvalidaError(
        'Debe especificarse el motivo del descarte cuando la cantidad de descarte es mayor a cero (RF-M5-02).'
      );
    }

    if (cambios.superficieCosechadaHa !== undefined && cambios.superficieCosechadaHa !== null && cambios.superficieCosechadaHa <= 0) {
      throw new CosechaInvalidaError('La superficie cosechada en hectáreas debe ser un valor positivo mayor a cero.');
    }

    // Registrar cambios en el historial
    const listaCambios: CambioHistorialCosecha[] = [];

    if (cambios.cantidadCosechadaKg !== undefined && cambios.cantidadCosechadaKg !== this.props.cantidadCosechadaKg) {
      listaCambios.push({ campo: 'cantidadCosechadaKg', valorAnterior: this.props.cantidadCosechadaKg, valorNuevo: cambios.cantidadCosechadaKg });
      this.props.cantidadCosechadaKg = cambios.cantidadCosechadaKg;
    }
    if (cambios.cantidadComercializableKg !== undefined && cambios.cantidadComercializableKg !== this.props.cantidadComercializableKg) {
      listaCambios.push({ campo: 'cantidadComercializableKg', valorAnterior: this.props.cantidadComercializableKg, valorNuevo: cambios.cantidadComercializableKg });
      this.props.cantidadComercializableKg = cambios.cantidadComercializableKg;
    }
    if (cambios.cantidadDescarteKg !== undefined && cambios.cantidadDescarteKg !== this.props.cantidadDescarteKg) {
      listaCambios.push({ campo: 'cantidadDescarteKg', valorAnterior: this.props.cantidadDescarteKg, valorNuevo: cambios.cantidadDescarteKg });
      this.props.cantidadDescarteKg = cambios.cantidadDescarteKg;
    }
    if (cambios.motivoDescarte !== undefined && cambios.motivoDescarte !== this.props.motivoDescarte) {
      listaCambios.push({ campo: 'motivoDescarte', valorAnterior: this.props.motivoDescarte, valorNuevo: cambios.motivoDescarte });
      this.props.motivoDescarte = cambios.motivoDescarte?.trim() ?? null;
    }
    if (cambios.observacionesCalidad !== undefined && cambios.observacionesCalidad !== this.props.observacionesCalidad) {
      listaCambios.push({ campo: 'observacionesCalidad', valorAnterior: this.props.observacionesCalidad, valorNuevo: cambios.observacionesCalidad });
      this.props.observacionesCalidad = cambios.observacionesCalidad?.trim() ?? null;
    }
    if (cambios.responsableId !== undefined && cambios.responsableId !== this.props.responsableId) {
      listaCambios.push({ campo: 'responsableId', valorAnterior: this.props.responsableId, valorNuevo: cambios.responsableId });
      this.props.responsableId = cambios.responsableId?.trim() ?? null;
    }
    if (cambios.cuadrillaId !== undefined && cambios.cuadrillaId !== this.props.cuadrillaId) {
      listaCambios.push({ campo: 'cuadrillaId', valorAnterior: this.props.cuadrillaId, valorNuevo: cambios.cuadrillaId });
      this.props.cuadrillaId = cambios.cuadrillaId?.trim() ?? null;
    }
    if (cambios.recipientes !== undefined && JSON.stringify(cambios.recipientes) !== JSON.stringify(this.props.recipientes)) {
      listaCambios.push({ campo: 'recipientes', valorAnterior: this.props.recipientes, valorNuevo: cambios.recipientes });
      this.props.recipientes = cambios.recipientes ?? null;
    }
    if (cambios.superficieCosechadaHa !== undefined && cambios.superficieCosechadaHa !== this.props.superficieCosechadaHa) {
      listaCambios.push({ campo: 'superficieCosechadaHa', valorAnterior: this.props.superficieCosechadaHa, valorNuevo: cambios.superficieCosechadaHa });
      this.props.superficieCosechadaHa = cambios.superficieCosechadaHa ?? null;
    }

    if (listaCambios.length > 0) {
      const ahora = new Date().toISOString();
      if (!this.props.historialModificaciones) {
        this.props.historialModificaciones = [];
      }
      this.props.historialModificaciones.push({
        fechaModificacion: ahora,
        usuarioId: usuarioId.trim(),
        motivo: motivo.trim(),
        cambios: listaCambios,
      });
      this.props.actualizadoEn = ahora;
    }
  }

  public toJSON(): CosechaJSON {
    return {
      id: this.props.id,
      codigoTrazabilidad: this.props.codigoTrazabilidad.value,
      loteId: this.props.loteId,
      cicloId: this.props.cicloId,
      fecha: this.props.fecha,
      cantidadCosechadaKg: this.props.cantidadCosechadaKg,
      cantidadComercializableKg: this.props.cantidadComercializableKg,
      cantidadDescarteKg: this.props.cantidadDescarteKg,
      motivoDescarte: this.props.motivoDescarte ?? null,
      observacionesCalidad: this.props.observacionesCalidad ?? null,
      responsableId: this.props.responsableId ?? null,
      cuadrillaId: this.props.cuadrillaId ?? null,
      recipientes: this.props.recipientes ?? null,
      superficieCosechadaHa: this.props.superficieCosechadaHa ?? null,
      estado: this.props.estado,
      motivoAnulacion: this.props.motivoAnulacion ?? null,
      usuarioAnulacionId: this.props.usuarioAnulacionId ?? null,
      anuladoEn: this.props.anuladoEn ?? null,
      historialModificaciones: this.props.historialModificaciones ? [...this.props.historialModificaciones] : [],
      claveIdempotencia: this.props.claveIdempotencia ?? null,
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
