import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { inspect } from 'node:util';
import { errorHandler } from '../../src/infrastructure/http/middlewares/error-handler.js';

describe('AGRUL-053: errores internos sin datos sensibles', () => {
  it('oculta mensaje, detalle, parámetros y causas tanto en HTTP como en el log', async () => {
    const app = Fastify({ logger: false });
    const registros: unknown[][] = [];
    app.setErrorHandler(errorHandler);
    app.addHook('onRequest', async request => {
      request.log.error = (...args: unknown[]) => { registros.push(args); };
    });
    app.get('/fallo', async () => {
      throw Object.assign(new Error('Consulta fallida: credencial-sensible-de-prueba'), {
        detail: 'Failing row contains hash-sensible-de-prueba', params: ['token-sensible-de-prueba'],
        cause: new Error('salt-sensible-de-prueba'),
      });
    });
    try {
      const res = await app.inject({ url: '/fallo' });
      expect(res.statusCode).toBe(500);
      expect(res.json().error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body).not.toContain('sensible-de-prueba');
      expect(registros).toHaveLength(1);
      expect(inspect(registros, { depth: 10 })).not.toContain('sensible-de-prueba');
      expect(registros[0][0]).toMatchObject({ errorType: 'Error', requestId: expect.any(String) });
    } finally { await app.close(); }
  });
});
