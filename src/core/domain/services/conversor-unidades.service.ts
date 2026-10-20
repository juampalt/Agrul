import { InsumoUnidadEquivalencia } from '../entities/insumo-unidad-equivalencia.entity.js';
import { UnidadConversionInvalidaError } from '../errors/domain.error.js';

export interface ParametrosConversion {
  insumoId?: string;
  cantidad: number;
  unidadOrigen: string;
  unidadDestino: string;
  equivalencias?: InsumoUnidadEquivalencia[];
  densidadKgL?: number | null;
}

export interface ResultadoConversion {
  cantidadOriginal: number;
  unidadOrigen: string;
  cantidadConvertida: number;
  unidadDestino: string;
  factorAplicado: number;
  densidadUtilizada?: number | null;
}

// Mapeos métricos estándar
const FACTORES_VOLUMEN_A_LITROS: Record<string, number> = {
  L: 1,
  LT: 1,
  LITRO: 1,
  LITROS: 1,
  ML: 0.001,
  CC: 0.001,
  CM3: 0.001,
  M3: 1000,
};

const FACTORES_MASA_A_KG: Record<string, number> = {
  KG: 1,
  KILO: 1,
  KILOS: 1,
  KILOGRAMO: 1,
  KILOGRAMOS: 1,
  G: 0.001,
  GR: 0.001,
  GRAMO: 0.001,
  GRAMOS: 0.001,
  MG: 0.000001,
  TN: 1000,
  TON: 1000,
  TONELADA: 1000,
  TONELADAS: 1000,
};

function normalizarUnidad(u: string): string {
  return u.trim().toUpperCase();
}

function esUnidadVolumen(u: string): boolean {
  return normalizarUnidad(u) in FACTORES_VOLUMEN_A_LITROS;
}

function esUnidadMasa(u: string): boolean {
  return normalizarUnidad(u) in FACTORES_MASA_A_KG;
}

/**
 * Servicio de Dominio para conversión rigurosa de unidades de medida en insumos.
 * Implementa las reglas RN-12, RF-M9-01 y RF-M9-14:
 * - Prohibida la conversión automática litros a kg salvo que exista densidad registrada para ese insumo.
 * - Soporta conversiones entre unidad de compra y unidad de consumo mediante factor multiplicador.
 * - Arroja UnidadConversionInvalidaError ante equivalencias inexistentes o conversiones no autorizadas.
 */
export class ConversorUnidadesService {
  /**
   * Ejecuta la conversión de una cantidad dada entre dos unidades de medida para un insumo.
   */
  public static convertir(params: ParametrosConversion): ResultadoConversion {
    const { cantidad, equivalencias = [] } = params;

    if (typeof cantidad !== 'number' || isNaN(cantidad)) {
      throw new UnidadConversionInvalidaError('La cantidad a convertir debe ser un valor numérico válido.');
    }

    const uOrigen = normalizarUnidad(params.unidadOrigen);
    const uDestino = normalizarUnidad(params.unidadDestino);

    // Caso 1: Misma unidad (identidad)
    if (uOrigen === uDestino) {
      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: cantidad,
        unidadDestino: uDestino,
        factorAplicado: 1,
      };
    }

    // Extraer densidad disponible (del parámetro o de las equivalencias del insumo)
    let densidad: number | null = params.densidadKgL ?? null;
    if (densidad === null) {
      const eqConDensidad = equivalencias.find(
        (eq) => eq.densidadKgL !== null && eq.densidadKgL !== undefined && eq.densidadKgL > 0
      );
      if (eqConDensidad) {
        densidad = eqConDensidad.densidadKgL;
      }
    }

    // Caso 2: Conversión directa dentro de la misma dimensión métrica (volumen <-> volumen)
    if (esUnidadVolumen(uOrigen) && esUnidadVolumen(uDestino)) {
      const factorOrigen = FACTORES_VOLUMEN_A_LITROS[uOrigen];
      const factorDestino = FACTORES_VOLUMEN_A_LITROS[uDestino];
      const litros = cantidad * factorOrigen;
      const resultado = litros / factorDestino;
      const factorAplicado = factorOrigen / factorDestino;

      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: Number(resultado.toFixed(6)),
        unidadDestino: uDestino,
        factorAplicado,
      };
    }

    // Caso 3: Conversión directa dentro de la misma dimensión métrica (masa <-> masa)
    if (esUnidadMasa(uOrigen) && esUnidadMasa(uDestino)) {
      const factorOrigen = FACTORES_MASA_A_KG[uOrigen];
      const factorDestino = FACTORES_MASA_A_KG[uDestino];
      const kg = cantidad * factorOrigen;
      const resultado = kg / factorDestino;
      const factorAplicado = factorOrigen / factorDestino;

      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: Number(resultado.toFixed(6)),
        unidadDestino: uDestino,
        factorAplicado,
      };
    }

    // Caso 4: Conversión cruzada Volumen <-> Masa (Regla RN-12 / RF-M9-14)
    if (
      (esUnidadVolumen(uOrigen) && esUnidadMasa(uDestino)) ||
      (esUnidadMasa(uOrigen) && esUnidadVolumen(uDestino))
    ) {
      if (!densidad || densidad <= 0) {
        throw new UnidadConversionInvalidaError(
          `Prohibida la conversión automática entre volumen ('${uOrigen}') y masa ('${uDestino}') sin una densidad (kg/L) explícitamente registrada para el insumo (RN-12 / RF-M9-14).`
        );
      }

      if (esUnidadVolumen(uOrigen) && esUnidadMasa(uDestino)) {
        // Volumen -> Litros -> Kg (kg = L * densidad) -> Masa destino
        const litros = cantidad * FACTORES_VOLUMEN_A_LITROS[uOrigen];
        const kg = litros * densidad;
        const resultado = kg / FACTORES_MASA_A_KG[uDestino];
        const factorAplicado = (FACTORES_VOLUMEN_A_LITROS[uOrigen] * densidad) / FACTORES_MASA_A_KG[uDestino];

        return {
          cantidadOriginal: cantidad,
          unidadOrigen: uOrigen,
          cantidadConvertida: Number(resultado.toFixed(6)),
          unidadDestino: uDestino,
          factorAplicado,
          densidadUtilizada: densidad,
        };
      } else {
        // Masa -> Kg -> Litros (L = kg / densidad) -> Volumen destino
        const kg = cantidad * FACTORES_MASA_A_KG[uOrigen];
        const litros = kg / densidad;
        const resultado = litros / FACTORES_VOLUMEN_A_LITROS[uDestino];
        const factorAplicado = (FACTORES_MASA_A_KG[uOrigen] / densidad) / FACTORES_VOLUMEN_A_LITROS[uDestino];

        return {
          cantidadOriginal: cantidad,
          unidadOrigen: uOrigen,
          cantidadConvertida: Number(resultado.toFixed(6)),
          unidadDestino: uDestino,
          factorAplicado,
          densidadUtilizada: densidad,
        };
      }
    }

    // Caso 5: Conversión basada en equivalencias de presentación (ej: BIDON_20L <-> L)
    // 5.a: Directa (uOrigen es unidadCompra, uDestino es unidadConsumo)
    const eqDirecta = equivalencias.find(
      (eq) => normalizarUnidad(eq.unidadCompra) === uOrigen && normalizarUnidad(eq.unidadConsumo) === uDestino
    );
    if (eqDirecta) {
      const convertida = cantidad * eqDirecta.factorMultiplicador;
      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: Number(convertida.toFixed(6)),
        unidadDestino: uDestino,
        factorAplicado: eqDirecta.factorMultiplicador,
        densidadUtilizada: eqDirecta.densidadKgL ?? densidad,
      };
    }

    // 5.b: Inversa (uOrigen es unidadConsumo, uDestino es unidadCompra)
    const eqInversa = equivalencias.find(
      (eq) => normalizarUnidad(eq.unidadConsumo) === uOrigen && normalizarUnidad(eq.unidadCompra) === uDestino
    );
    if (eqInversa) {
      const convertida = cantidad / eqInversa.factorMultiplicador;
      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: Number(convertida.toFixed(6)),
        unidadDestino: uDestino,
        factorAplicado: 1 / eqInversa.factorMultiplicador,
        densidadUtilizada: eqInversa.densidadKgL ?? densidad,
      };
    }

    // 5.c: Conversión en dos etapas a través de la unidad de consumo de la equivalencia
    // Ej: De BIDON_20L a ML (BIDON_20L -> L vía equivalencia, luego L -> ML vía métrica)
    const eqOrigenCompra = equivalencias.find(
      (eq) => normalizarUnidad(eq.unidadCompra) === uOrigen
    );
    if (eqOrigenCompra) {
      const cantidadEnUnidadConsumo = cantidad * eqOrigenCompra.factorMultiplicador;
      const subConversion = this.convertir({
        cantidad: cantidadEnUnidadConsumo,
        unidadOrigen: eqOrigenCompra.unidadConsumo,
        unidadDestino: uDestino,
        equivalencias,
        densidadKgL: eqOrigenCompra.densidadKgL ?? densidad,
      });

      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: subConversion.cantidadConvertida,
        unidadDestino: uDestino,
        factorAplicado: subConversion.factorAplicado * eqOrigenCompra.factorMultiplicador,
        densidadUtilizada: subConversion.densidadUtilizada,
      };
    }

    // Ej: De ML a BIDON_20L (ML -> L vía métrica, luego L -> BIDON_20L vía equivalencia)
    const eqDestinoCompra = equivalencias.find(
      (eq) => normalizarUnidad(eq.unidadCompra) === uDestino
    );
    if (eqDestinoCompra) {
      const subConversion = this.convertir({
        cantidad,
        unidadOrigen: uOrigen,
        unidadDestino: eqDestinoCompra.unidadConsumo,
        equivalencias,
        densidadKgL: eqDestinoCompra.densidadKgL ?? densidad,
      });

      const cantidadFinal = subConversion.cantidadConvertida / eqDestinoCompra.factorMultiplicador;
      return {
        cantidadOriginal: cantidad,
        unidadOrigen: uOrigen,
        cantidadConvertida: Number(cantidadFinal.toFixed(6)),
        unidadDestino: uDestino,
        factorAplicado: subConversion.factorAplicado / eqDestinoCompra.factorMultiplicador,
        densidadUtilizada: subConversion.densidadUtilizada,
      };
    }

    // Si no se encontró ninguna regla o equivalencia válida
    throw new UnidadConversionInvalidaError(
      `No existe una equivalencia registrada o regla de conversión válida para transformar de '${uOrigen}' a '${uDestino}' en este insumo (RN-12 / RF-M9-14).`
    );
  }
}
