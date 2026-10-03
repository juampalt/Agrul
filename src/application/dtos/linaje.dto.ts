export interface NodoLinajeDTO {
  loteId: string;
  codigoLote: string;
  producto: string;
  estadoActual: string;
  cantidadAportada?: number;
  unidadMedida?: string;
  motivoRelacion?: string;
  fechaRelacionUtc?: string;
}

export interface ArbolLinajeResponseDTO {
  loteObjetivo: {
    id: string;
    codigoLote: string;
    producto: string;
    estadoActual: string;
    cantidadActual: number;
    unidadMedida: string;
  };
  ancestros: NodoLinajeDTO[];   // Aguas arriba (trace-back)
  descendientes: NodoLinajeDTO[]; // Aguas abajo (trace-forward)
}
