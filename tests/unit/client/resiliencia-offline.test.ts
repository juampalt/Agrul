import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResilienciaOfflineService,
  InMemoryStorageProvider,
} from '../../../src/infrastructure/offline/resiliencia-offline.service.js';

describe('AGRUL-049: Resiliencia Móvil Offline, Borradores Locales y Backoff Exponencial (RNF-02 / RN-11)', () => {
  let storage: InMemoryStorageProvider;
  let service: ResilienciaOfflineService;

  beforeEach(() => {
    storage = new InMemoryStorageProvider();
    service = new ResilienciaOfflineService(storage);
  });

  describe('Generación de Claves de Idempotencia (RN-11 / RF-M9-06)', () => {
    it('debe generar claves de idempotencia únicas en formato UUIDv4', () => {
      const key1 = service.generarClaveIdempotencia('cos');
      const key2 = service.generarClaveIdempotencia('cos');

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^cos_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Gestión de Borradores Locales (RNF-02)', () => {
    it('debe guardar, recuperar y limpiar borradores de formularios de campo', () => {
      const datosCosecha = {
        loteId: 'lote-123',
        cantidadCosechadaKg: 1500,
        cantidadComercializableKg: 1400,
        fecha: '2026-10-23',
        claveIdempotencia: 'cos-idem-test',
      };

      service.guardarBorrador('cosecha_rapida', datosCosecha);

      const borradorRecuperado = service.obtenerBorrador('cosecha_rapida');
      expect(borradorRecuperado).toEqual(datosCosecha);

      service.limpiarBorrador('cosecha_rapida');
      expect(service.obtenerBorrador('cosecha_rapida')).toBeNull();
    });

    it('debe devolver null si el borrador no existe o no tiene datos válidos', () => {
      expect(service.obtenerBorrador('formulario_inexistente')).toBeNull();
    });
  });

  describe('Cálculo de Backoff Exponencial (RNF-02)', () => {
    it('debe calcular el backoff exponencial base * 2^intento sin jitter de forma exacta', () => {
      expect(service.calcularBackoffMs(0, 1000, 60000, false)).toBe(1000); // 1s
      expect(service.calcularBackoffMs(1, 1000, 60000, false)).toBe(2000); // 2s
      expect(service.calcularBackoffMs(2, 1000, 60000, false)).toBe(4000); // 4s
      expect(service.calcularBackoffMs(3, 1000, 60000, false)).toBe(8000); // 8s
      expect(service.calcularBackoffMs(4, 1000, 60000, false)).toBe(16000); // 16s
      expect(service.calcularBackoffMs(5, 1000, 60000, false)).toBe(32000); // 32s
    });

    it('debe respetar el límite superior (cap) configurado (ej. 60s)', () => {
      expect(service.calcularBackoffMs(6, 1000, 60000, false)).toBe(60000); // capped at 60s
      expect(service.calcularBackoffMs(10, 1000, 60000, false)).toBe(60000);
    });

    it('debe agregar jitter aleatorio sin exceder el límite máximo', () => {
      const delayConJitter = service.calcularBackoffMs(2, 1000, 60000, true);
      expect(delayConJitter).toBeGreaterThanOrEqual(4000);
      expect(delayConJitter).toBeLessThanOrEqual(4500);
    });
  });

  describe('Cola de Peticiones Offline y Reintentos Idempotentes (RNF-02 / RN-11)', () => {
    it('debe encolar operaciones preservando la clave de idempotencia', () => {
      const idemKey = service.generarClaveIdempotencia('cos');
      const item = service.encolarPeticionOffline({
        url: '/api/v1/cosechas/rapida',
        method: 'POST',
        body: { cantidadKg: 1000 },
        claveIdempotencia: idemKey,
        tipoOperacion: 'COSECHA_RAPIDA',
      });

      expect(item.id).toBeDefined();
      expect(item.claveIdempotencia).toBe(idemKey);
      expect(item.headers['X-Idempotency-Key']).toBe(idemKey);
      expect(service.cantidadPendientes()).toBe(1);

      const cola = service.obtenerColaOffline();
      expect(cola).toHaveLength(1);
      expect(cola[0].claveIdempotencia).toBe(idemKey);
    });

    it('debe procesar exitosamente la cola cuando el servidor responde 201', async () => {
      const idemKey = service.generarClaveIdempotencia('cos');
      service.encolarPeticionOffline({
        url: '/api/v1/cosechas/rapida',
        method: 'POST',
        body: { cantidadKg: 500 },
        claveIdempotencia: idemKey,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true, data: { id: 'cos-1' } }),
      });

      const resultado = await service.sincronizarCola(mockFetch as any);

      expect(resultado.exitosos).toBe(1);
      expect(resultado.fallidos).toBe(0);
      expect(resultado.pendientes).toBe(0);
      expect(service.cantidadPendientes()).toBe(0);
    });

    it('debe reprogramar con backoff exponencial si la red falla (Failed to fetch)', async () => {
      const idemKey = service.generarClaveIdempotencia('cos');
      service.encolarPeticionOffline({
        url: '/api/v1/cosechas/rapida',
        method: 'POST',
        body: { cantidadKg: 500 },
        claveIdempotencia: idemKey,
      });

      const mockFetchFalla = vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)'));

      const resultado = await service.sincronizarCola(mockFetchFalla as any);

      expect(resultado.exitosos).toBe(0);
      expect(resultado.fallidos).toBe(1);
      expect(resultado.pendientes).toBe(1);

      const colaActualizada = service.obtenerColaOffline();
      expect(colaActualizada[0].intentos).toBe(1);
      expect(colaActualizada[0].proximoIntento).toBeGreaterThan(Date.now());
      expect(colaActualizada[0].claveIdempotencia).toBe(idemKey); // clave intacta para próximo reintento
    });

    it('debe dar por exitoso el reintento si el servidor informa que la clave ya fue registrada (Idempotencia cumplida)', async () => {
      const idemKey = service.generarClaveIdempotencia('cos');
      service.encolarPeticionOffline({
        url: '/api/v1/cosechas/rapida',
        method: 'POST',
        body: { cantidadKg: 500 },
        claveIdempotencia: idemKey,
      });

      const mockFetchIdem = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          error: { message: `Ya existe una operación registrada con la clave de idempotencia '${idemKey}' (RN-11 / RF-M9-06).` },
        }),
      });

      const resultado = await service.sincronizarCola(mockFetchIdem as any);

      expect(resultado.exitosos).toBe(1);
      expect(resultado.pendientes).toBe(0);
      expect(service.cantidadPendientes()).toBe(0);
    });
  });
});
