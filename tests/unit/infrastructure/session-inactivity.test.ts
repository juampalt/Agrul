import { describe, it, expect, beforeEach } from 'vitest';
import { SessionInactivityService } from '../../../src/infrastructure/services/session-inactivity.service.js';

describe('AGRUL-040: Infraestructura — SessionInactivityService (RF-M8-09)', () => {
  beforeEach(() => {
    SessionInactivityService.limpiar();
    SessionInactivityService.setTimeoutMs(15 * 60 * 1000); // 15 minutos por defecto
  });

  it('debe registrar y recuperar la última actividad de un usuario', () => {
    const ahora = Date.now();
    SessionInactivityService.registrarActividad('usr-1', ahora);

    expect(SessionInactivityService.obtenerUltimaActividad('usr-1')).toBe(ahora);
  });

  it('no debe expirar si la actividad ocurre dentro del timeout configurado', () => {
    const inicio = Date.now();
    SessionInactivityService.registrarActividad('usr-1', inicio);

    // 5 minutos después (dentro de los 15 min)
    const posterior = inicio + 5 * 60 * 1000;
    const expirado = SessionInactivityService.verificarExpiracion('usr-1', posterior);

    expect(expirado).toBe(false);
  });

  it('debe expirar la sesión si el tiempo transcurrido supera el timeout configurable', () => {
    SessionInactivityService.setTimeoutMs(10 * 60 * 1000); // 10 minutos
    const inicio = Date.now();
    SessionInactivityService.registrarActividad('usr-1', inicio);

    // 11 minutos después (> 10 min)
    const posterior = inicio + 11 * 60 * 1000;
    const expirado = SessionInactivityService.verificarExpiracion('usr-1', posterior);

    expect(expirado).toBe(true);
  });

  it('debe respetar el timestamp de inactividad provisto por el cliente', () => {
    SessionInactivityService.setTimeoutMs(5 * 60 * 1000); // 5 min
    const ahora = Date.now();
    const clienteAntiguo = ahora - 6 * 60 * 1000; // 6 min atrás

    const expirado = SessionInactivityService.verificarExpiracion('usr-1', ahora, clienteAntiguo);
    expect(expirado).toBe(true);
  });

  it('debe eliminar la sesión activa al cerrar sesión', () => {
    SessionInactivityService.registrarActividad('usr-1');
    expect(SessionInactivityService.obtenerUltimaActividad('usr-1')).toBeDefined();

    SessionInactivityService.cerrarSesion('usr-1');
    expect(SessionInactivityService.obtenerUltimaActividad('usr-1')).toBeUndefined();
  });

  it('AGRUL-053: un timestamp del cliente no prolonga una sesión vencida', () => {
    const inicio = Date.now();
    SessionInactivityService.registrarActividad('usr-1', inicio);
    const ahora = inicio + 16 * 60 * 1000;
    expect(SessionInactivityService.verificarExpiracion('usr-1', ahora, ahora)).toBe(true);
    expect(SessionInactivityService.verificarExpiracion('usr-1', ahora, ahora + 3600000)).toBe(true);
    expect(SessionInactivityService.obtenerUltimaActividad('usr-1')).toBe(inicio);
  });
});
