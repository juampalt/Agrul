export interface SesionesRepositoryPort {
  abrir(tokenHash: string, usuarioId: string, expiraEn: string): Promise<void>;
  validar(tokenHash: string, usuarioId: string, timeoutMs: number): Promise<boolean>;
  cerrar(tokenHash: string, usuarioId: string): Promise<boolean>;
  estaRevocada(tokenHash: string): Promise<boolean>;
  simularInactividad(usuarioId: string, fecha: string): Promise<void>;
}
