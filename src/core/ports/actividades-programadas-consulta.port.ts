/** Consulta mínima de RN-09 sobre la tabla canónica que ampliará AGRUL-054 (#48). */
export interface ActividadesProgramadasConsultaPort {
  tienePendientes(cicloId: string): Promise<boolean>;
}
