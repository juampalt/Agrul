export interface RegistrarAplicacionLineaInputDto {
  insumoId: string;
  cantidadTotal: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null;
  dosisPorPlanta?: number | null;
  concentracion?: string | number | null;
}

export interface CondicionesClimaDto {
  vientoKmH?: number | null;
  tempC?: number | null;
  lluviaMm?: number | null;
  observaciones?: string | null;
}

export interface RegistrarAplicacionInputDto {
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  responsableId?: string | null;
  metodo: string;
  motivo: string;
  equipoAplicacion: string;
  condicionesClima?: CondicionesClimaDto | null;
  lineas: RegistrarAplicacionLineaInputDto[];
}

export interface AplicacionLineaOutputDto {
  id: string;
  insumoId: string;
  nombreComercial?: string;
  categoriaInsumo?: string;
  cantidadTotal: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null;
  dosisPorPlanta?: number | null;
  concentracion?: string | null;
}

export interface AplicacionOutputDto {
  id: string;
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  responsableId?: string | null;
  metodo: string;
  motivo: string;
  equipoAplicacion: string;
  condicionesClima?: CondicionesClimaDto | null;
  lineas: AplicacionLineaOutputDto[];
  esMezcla: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarAplicacionesFiltrosDto {
  loteId?: string;
  cicloId?: string;
  actividadId?: string;
  insumoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
