import { SesionesRepositoryPort } from '../../src/core/ports/sesiones-repository.port.js';

export class InMemorySesionesRepository implements SesionesRepositoryPort {
  private readonly sesiones = new Map<string, { usuarioId: string; expira: number; ultimaActividad: number; revocada: boolean }>();
  async abrir(hash: string, usuarioId: string, expiraEn: string): Promise<void> {
    this.sesiones.set(hash, { usuarioId, expira: Date.parse(expiraEn), ultimaActividad: Date.now(), revocada: false });
  }
  async validar(hash: string, usuarioId: string, timeoutMs: number): Promise<boolean> {
    const sesion = this.sesiones.get(hash);
    if (!sesion || sesion.usuarioId !== usuarioId || sesion.revocada || sesion.expira <= Date.now()
      || Date.now() - sesion.ultimaActividad >= timeoutMs) return false;
    sesion.ultimaActividad = Date.now();
    return true;
  }
  async cerrar(hash: string, usuarioId: string): Promise<boolean> {
    const sesion = this.sesiones.get(hash);
    if (!sesion || sesion.usuarioId !== usuarioId || sesion.revocada) return false;
    sesion.revocada = true;
    return true;
  }
  async estaRevocada(hash: string): Promise<boolean> { return this.sesiones.get(hash)?.revocada ?? false; }
  async simularInactividad(usuarioId: string, fecha: string): Promise<void> {
    for (const sesion of this.sesiones.values()) if (sesion.usuarioId === usuarioId) sesion.ultimaActividad = Date.parse(fecha);
  }
}
