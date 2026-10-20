export interface RegistrarInsumoEquivalenciaInputDTO {
  id?: string;
  insumoId: string;
  unidadCompra: string;
  unidadConsumo: string;
  factorMultiplicador: number;
  densidadKgL?: number | null;
}

export interface InsumoEquivalenciaOutputDTO {
  id: string;
  insumoId: string;
  unidadCompra: string;
  unidadConsumo: string;
  factorMultiplicador: number;
  densidadKgL: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ConvertirUnidadInsumoInputDTO {
  insumoId: string;
  cantidad: number;
  unidadOrigen: string;
  unidadDestino: string;
}

export interface ResultadoConversionOutputDTO {
  cantidadOriginal: number;
  unidadOrigen: string;
  cantidadConvertida: number;
  unidadDestino: string;
  factorAplicado: number;
  densidadUtilizada?: number | null;
}
