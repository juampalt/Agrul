export class SessionInactivityService {
  // Timeout de inactividad configurable: por defecto 15 minutos (900.000 ms)
  private static timeoutMs = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MS || '900000', 10);
  private static lastActivityByUser = new Map<string, number>();

  public static setTimeoutMs(ms: number): void {
    this.timeoutMs = ms;
  }

  public static getTimeoutMs(): number {
    return this.timeoutMs;
  }

  public static registrarActividad(usuarioId: string, timestamp: number = Date.now()): void {
    this.lastActivityByUser.set(usuarioId, timestamp);
  }

  public static obtenerUltimaActividad(usuarioId: string): number | undefined {
    return this.lastActivityByUser.get(usuarioId);
  }

  public static verificarExpiracion(
    usuarioId: string,
    currentTimestamp: number = Date.now(),
    clientLastActivityMs?: number
  ): boolean {
    const serverLast = this.lastActivityByUser.get(usuarioId);
    // El cliente puede informar una actividad anterior, pero no prolongar la sesión.
    const ultimaActividad = clientLastActivityMs !== undefined
      ? Math.min(clientLastActivityMs, serverLast ?? currentTimestamp)
      : serverLast;

    if (!ultimaActividad) {
      // Primera actividad registrada en esta sesión
      this.lastActivityByUser.set(usuarioId, currentTimestamp);
      return false;
    }

    const tiempoInactivo = currentTimestamp - ultimaActividad;
    if (tiempoInactivo > this.timeoutMs) {
      return true; // Expiró por inactividad
    }

    // Actualizar última actividad
    this.lastActivityByUser.set(usuarioId, currentTimestamp);
    return false;
  }

  public static cerrarSesion(usuarioId: string): void {
    this.lastActivityByUser.delete(usuarioId);
  }

  public static limpiar(): void {
    this.lastActivityByUser.clear();
  }
}
