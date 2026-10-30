export interface CambioRegistrado {
  entidad: string;
  entidadId: string | null;
  accion: string;
  usuarioId: string | null;
  valorPrevio: unknown | null;
  valorNuevo: unknown | null;
}

export interface RegistroCambiosPort {
  /** Estado persistido actual de una entidad (null si no existe). Sin `id` devuelve la entidad única (finca). */
  capturar(entidad: string, id?: string): Promise<{ id: string; valor: unknown } | null>;
  registrar(cambio: CambioRegistrado): Promise<void>;
}
