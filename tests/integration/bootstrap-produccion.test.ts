import { afterEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';

describe('Bootstrap real de producción (regresión AGRUL-0511)', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('registra las rutas territoriales con adaptadores PostgreSQL reales', async () => {
    const servidor = crearServidorProduccion({
      connectionString: 'postgresql://agrul_user:agrul_pass@127.0.0.1:5432/agrul_test_bootstrap',
      logger: false,
    });
    app = servidor.app;
    await app.ready();

    expect(app.hasRoute({ method: 'GET', url: '/api/v1/finca' })).toBe(true);
    expect(app.hasRoute({ method: 'PUT', url: '/api/v1/finca' })).toBe(true);
    expect(app.hasRoute({ method: 'POST', url: '/api/v1/lotes-territorio' })).toBe(true);
    expect(app.hasRoute({ method: 'GET', url: '/api/v1/lotes-territorio' })).toBe(true);
    expect(app.hasRoute({ method: 'PUT', url: '/api/v1/lotes-territorio/:id' })).toBe(true);
    expect(app.hasRoute({ method: 'PATCH', url: '/api/v1/lotes-territorio/:id/desactivar' })).toBe(true);

    const respuesta = await app.inject({ method: 'GET', url: '/api/v1/finca' });
    expect(respuesta.statusCode).not.toBe(404);
  });
});
