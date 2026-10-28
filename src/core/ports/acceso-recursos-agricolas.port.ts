export type RecursoAgricola = 'ciclo' | 'lote' | 'programada' | 'realizada' | 'monitoreo';

export interface AccesoRecursosAgricolasPort {
  /** Resuelve el propietario persistido; distingue recurso inexistente de finca nula. */
  buscarFinca(tipo: RecursoAgricola, id: string): Promise<{ fincaId: string | null } | null>;
}
