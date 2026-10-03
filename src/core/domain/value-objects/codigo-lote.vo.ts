import { DomainError } from '../errors/domain.error.js';

export class FormatoCodigoLoteInvalidoError extends DomainError {
  public readonly code = 'INVALID_BATCH_CODE_FORMAT';

  constructor(valor: string) {
    super(`El código de lote '${valor}' no cumple con el formato requerido (ej: LOT-YYYY-XXXXX).`);
  }
}

export class CodigoLote {
  // Formato: Prefijo (2-5 letras)-Año(4 dígitos)-Secuencial(3 a 8 caracteres alfanuméricos)
  private static readonly REGEX = /^[A-Z]{2,6}-\d{4}-[A-Z0-9]{3,8}$/;

  private constructor(private readonly valor: string) {}

  public static crear(valor: string): CodigoLote {
    const normalizado = valor.trim().toUpperCase();
    if (!this.REGEX.test(normalizado)) {
      throw new FormatoCodigoLoteInvalidoError(valor);
    }
    return new CodigoLote(normalizado);
  }

  public static generar(prefijo: string = 'LOT', secuencial: number | string): CodigoLote {
    const anio = new Date().getFullYear();
    const secStr = String(secuencial).padStart(5, '0');
    return new CodigoLote(`${prefijo.toUpperCase()}-${anio}-${secStr}`);
  }

  public get value(): string {
    return this.valor;
  }

  public equals(otro: CodigoLote): boolean {
    return this.valor === otro.value;
  }

  public toString(): string {
    return this.valor;
  }
}
