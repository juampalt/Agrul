export const TipoEventoEnum = {
  COSECHA: 'COSECHA',
  RECEPCION: 'RECEPCION',
  CLASIFICACION: 'CLASIFICACION',
  TRATAMIENTO: 'TRATAMIENTO',
  PROCESO: 'PROCESO',
  EMBALAJE: 'EMBALAJE',
  DESPACHO: 'DESPACHO',
  FUSION_ORIGEN: 'FUSION_ORIGEN',
  FUSION_RECEPCION: 'FUSION_RECEPCION',
  DIVISION_SPLIT: 'DIVISION_SPLIT',
  COMPENSACION_AJUSTE: 'COMPENSACION_AJUSTE',
  COMPENSACION_ANULACION: 'COMPENSACION_ANULACION',
} as const;

export type TipoEvento = typeof TipoEventoEnum[keyof typeof TipoEventoEnum];

export function esEventoCompensatorio(tipo: TipoEvento): boolean {
  return tipo === TipoEventoEnum.COMPENSACION_AJUSTE || tipo === TipoEventoEnum.COMPENSACION_ANULACION;
}

export function esEventoTerminal(tipo: TipoEvento): boolean {
  return tipo === TipoEventoEnum.DESPACHO;
}
