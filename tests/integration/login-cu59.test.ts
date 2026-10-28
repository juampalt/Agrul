import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { InMemoryUsuariosRepository } from '../mocks/in-memory-usuarios.repository.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';

describe('AGRUL-053 CU59: contrato de inicio de sesión', () => {
  let app: FastifyInstance;
  let repo: InMemoryUsuariosRepository;
  const password = 'Password1234';

  beforeEach(async () => {
    repo = new InMemoryUsuariosRepository();
    const { hash, salt } = CryptoAuthService.hashPassword(password);
    await repo.guardar(Usuario.crear({ id: 'cu59', nombre: 'Ana', apellido: 'Prueba',
      nombreUsuario: 'ana.campo', email: 'ana@example.test', perfil: 'ENCARGADO', passwordHash: hash, salt }));
    app = buildApp({ usuariosRepo: repo, lotesRepo: new InMemoryLotesRepository(),
      eventosRepo: new InMemoryEventosRepository(), genealogiaRepo: new InMemoryGenealogiaRepository() });
    await app.ready();
  });
  afterEach(async () => { await app?.close(); });

  function login(payload: object) {
    return app.inject({ method: 'POST', url: '/api/v1/auth/login', payload });
  }

  it.each([{ email: ' ANA@EXAMPLE.TEST ' }, { nombreUsuario: ' ANA.CAMPO ' }])(
    'autentica por %j sin exponer credenciales y evita cachear la respuesta', async identificador => {
      const res = await login({ ...identificador, password });
      expect(res.statusCode).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      const body = res.json();
      expect(body.data.usuario.id).toBe('cu59');
      expect(CryptoAuthService.verifyToken(body.data.token)?.sub).toBe('cu59');
      expect(res.body).not.toContain('passwordHash');
      expect(res.body).not.toContain('salt');
      expect(res.body).not.toContain(password);
      const me = await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${body.data.token}` } });
      expect(me.statusCode).toBe(200);
    });

  it.each([
    { password }, { email: 'ana@example.test', nombreUsuario: 'ana.campo', password },
    { nombreUsuario: '', password }, { nombreUsuario: 'ana.campo', password, perfil: 'ADMINISTRADOR' },
  ])('rechaza identificadores ambiguos o entradas inválidas: %j', async payload => {
    expect((await login(payload)).statusCode).toBe(400);
  });

  it('rechaza desconocidos e inactivos sin emitir tokens', async () => {
    const desconocido = await login({ nombreUsuario: 'inexistente', password });
    expect(desconocido.statusCode).toBe(401);
    const usuario = (await repo.buscarPorId('cu59'))!;
    usuario.desactivar();
    await repo.actualizar(usuario);
    const inactivo = await login({ nombreUsuario: 'ana.campo', password });
    expect(inactivo.statusCode).toBe(403);
    expect(inactivo.json().data).toBeNull();
  });

  it('comparte el contador de bloqueo entre usuario y correo', async () => {
    for (let i = 0; i < 5; i++) {
      const identificador = i % 2 ? { email: 'ana@example.test' } : { nombreUsuario: 'ana.campo' };
      expect((await login({ ...identificador, password: 'Incorrecta123' })).statusCode).toBe(i < 4 ? 401 : 403);
    }
    expect((await repo.buscarPorId('cu59'))?.intentosFallidos).toBe(5);
    expect((await login({ nombreUsuario: 'ana.campo', password })).statusCode).toBe(403);
  });
});
