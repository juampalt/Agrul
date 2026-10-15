import {
  CosechaInvalidaError,
  DesgloseCosechaInvalidoError,
  FechaFuturaInvalidaError,
} from '../errors/domain.error.js';
import { CodigoTrazabilidadCosecha } from '../value-objects/codigo-trazabilidad-cosecha.vo.js';

export interface RecipienteCosechaProps {
  tipo: string; // ej. BIN, CAJON, BANDEJA
  cantidad: number;
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
  creadoEn: string;
  actualizadoEn: string;
}

/**
 * Entidad de dominio Cosecha (Módulo 5 / Épica 11).
 * Implementa RF-M5-01, RF-M5-02, RF-M5-03, RF-M5-04, RF-M5-05, RF-M5-06
 * y valida las invariantes RN-07, RN-08 y RN-09.
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
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

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
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
