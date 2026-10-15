import { DomainError } from '../errors/domain.error.js';

export class FormatoCodigoTrazabilidadInvalidoError extends DomainError {
  public readonly code = 'INVALID_TRACEABILITY_CODE_FORMAT';

  constructor(valor: string) {
    super(
      `El código de trazabilidad de cosecha '${valor}' no cumple con el formato requerido COS-L[nro]-[YYYYMMDD]-[secuencia] (RN-07 / RN-08).`
    );
  }
}

/**
 * Value Object para Código de Trazabilidad Único de Cosecha (RN-07 / RN-08 / RF-M5-03).
 * Formato algorítmico inmodificable: COS-L[nro]-[YYYYMMDD]-[secuencia]
 * Ejemplo: COS-L03-20260915-01
 */
export class CodigoTrazabilidadCosecha {
  private static readonly REGEX = /^COS-L[A-Z0-9]+-\d{8}-\d{2,}$/;

  private constructor(private readonly valor: string) {}

  public static crear(valor: string): CodigoTrazabilidadCosecha {
    const normalizado = valor.trim().toUpperCase();
    if (!this.REGEX.test(normalizado)) {
      throw new FormatoCodigoTrazabilidadInvalidoError(valor);
    }
    return new CodigoTrazabilidadCosecha(normalizado);
  }

  /**
   * Generador algorítmico conforme a RN-07 y RN-08.
   * @param codigoLote Código del lote (ej. "LOT-2026-003", "LOT-2026-99001", "L03")
   * @param fecha Fecha de la cosecha (YYYY-MM-DD o Date)
   * @param secuencia Número correlativo en el día o ciclo (1, 2, ...)
   */
  public static generar(
    codigoLote: string,
    fecha: string | Date,
    secuencia: number = 1
  ): CodigoTrazabilidadCosecha {
    // 1. Extraer identificador de lote (L[nro])
    let loteIdTag = '';
    const cleanLote = codigoLote.trim().toUpperCase();
    const matchLot = cleanLote.match(/LOT-\d{4}-0*([A-Z0-9]+)/);
    if (matchLot) {
      const num = matchLot[1];
      loteIdTag = num.length === 1 ? `L0${num}` : `L${num}`;
    } else if (cleanLote.startsWith('L')) {
      loteIdTag = cleanLote;
    } else {
      const digits = cleanLote.replace(/[^A-Z0-9]/g, '');
      loteIdTag = `L${digits || '01'}`;
    }

    // 2. Extraer fecha en formato YYYYMMDD
    let fechaStr = '';
    if (fecha instanceof Date) {
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      fechaStr = `${anio}${mes}${dia}`;
    } else {
      fechaStr = fecha.replace(/[^0-9]/g, '').slice(0, 8);
      if (fechaStr.length < 8) {
        throw new FormatoCodigoTrazabilidadInvalidoError(fecha);
      }
    }

    // 3. Formatear secuencia de al menos 2 dígitos (ej. 01, 02)
    const secStr = String(secuencia).padStart(2, '0');

    return new CodigoTrazabilidadCosecha(`COS-${loteIdTag}-${fechaStr}-${secStr}`);
  }

  public get value(): string {
    return this.valor;
  }

  public equals(otro: CodigoTrazabilidadCosecha): boolean {
    return this.valor === otro.value;
  }

  public toString(): string {
    return this.valor;
  }
}
