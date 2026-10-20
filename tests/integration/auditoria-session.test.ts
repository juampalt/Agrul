import { describe, it, expect, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryUsuariosRepository } from '../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../mocks/in-memory-usuario-fincas.repository.js';
import { InMemoryAuditoriaSeguridadRepository } from '../mocks/in-memory-auditoria-seguridad.repository.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { SessionInactivityService } from '../../src/infrastructure/services/session-inactivity.service.js';

describe('AGRUL-040: Integration Tests — Bitácora de Auditoría y Seguridad de Sesión', () => {
  let app: FastifyInstance;
  let usuariosRepo: InMemoryUsuariosRepository;
  let usuarioFincasRepo: InMemoryUsuarioFincasRepository;
  let auditoriaRepo: InMemoryAuditoriaSeguridadRepository;

  let adminToken: string;
  let operarioToken: string;

  beforeEach(async () => {
    usuariosRepo = new InMemoryUsuariosRepository();
    usuarioFincasRepo = new InMemoryUsuarioFincasRepository();
    auditoriaRepo = new InMemoryAuditoriaSeguridadRepository();

    SessionInactivityService.limpiar();
    SessionInactivityService.setTimeoutMs(15 * 60 * 1000); // 15 minutos

    const { hash, salt } = CryptoAuthService.hashPassword('PasswordSegura123');

    // Admin con debeCambiarPassword = false
    const adminUser = Usuario.crear({
      id: 'usr-admin-id',
      nombre: 'Admin',
      apellido: 'Principal',
      email: 'admin@agrul.com',
      passwordHash: hash,
      salt,
      perfil: 'ADMINISTRADOR',
      debeCambiarPassword: false,
    });
    await usuariosRepo.guardar(adminUser);

    // Operario con debeCambiarPassword = false
    const operarioUser = Usuario.crear({
      id: 'usr-operario-id',
      nombre: 'Juan',
      apellido: 'Operario',
      email: 'operario@agrul.com',
      passwordHash: hash,
      salt,
      perfil: 'OPERARIO',
      debeCambiarPassword: false,
    });
    await usuariosRepo.guardar(operarioUser);

    app = buildApp({
      lotesRepo: new InMemoryLotesRepository(),
      eventosRepo: new InMemoryEventosRepository(),
      genealogiaRepo: new InMemoryGenealogiaRepository(),
      fincasRepo: new InMemoryFincasRepository(),
      usuariosRepo,
      usuarioFincasRepo,
      auditoriaRepo,
    });

    await app.ready();

    // Obtener tokens de login
    const loginAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@agrul.com', password: 'PasswordSegura123' },
    });
    adminToken = loginAdmin.json().data.token;

    const loginOperario = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'operario@agrul.com', password: 'PasswordSegura123' },
    });
    operarioToken = loginOperario.json().data.token;
  });

  describe('Control de Acceso y Consulta de la Bitácora (/api/v1/auditoria)', () => {
    it('debe denegar acceso anónimo con 401 TOKEN_REQUERIDO', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auditoria',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('TOKEN_REQUERIDO');
    });

    it('debe denegar acceso a perfil OPERARIO con 403 PERMISO_INSUFICIENTE (RF-M8-04)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auditoria',
        headers: { authorization: `Bearer ${operarioToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('PERMISO_INSUFICIENTE');
    });

    it('debe permitir a ADMINISTRADOR listar la bitácora con formato envelope estándar', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auditoria',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.logs).toBeInstanceOf(Array);
      expect(body.data.total).toBeGreaterThanOrEqual(1); // Ya registró los logins
      expect(body.timestamp).toBeDefined();
    });

    it('debe permitir consultar el detalle de un log con su delta de valor previo y posterior (RN-06)', async () => {
      // 1. Crear un usuario para generar evento de auditoría
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/usuarios',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          nombre: 'Auditable',
          apellido: 'Test',
          email: 'auditable@agrul.com',
          password: 'Password1234',
          perfil: 'ENCARGADO',
        },
      });
      expect(createRes.statusCode).toBe(201);

      // 2. Consultar logs
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auditoria?accion=CREAR',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const logs = listRes.json().data.logs;
      expect(logs.length).toBeGreaterThan(0);
      const logId = logs[0].id;

      // 3. Consultar por ID
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/v1/auditoria/${logId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(detailRes.statusCode).toBe(200);
      const detail = detailRes.json().data;
      expect(detail.id).toBe(logId);
      expect(detail.accion).toBe('CREAR');
      expect(detail.valorNuevoJson).toBeDefined();
    });
  });

  describe('Seguridad de Sesión: Cierre Automático por Inactividad (RF-M8-09)', () => {
    it('debe incluir cabeceras de actividad y timeout en respuestas autenticadas', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-last-activity']).toBeDefined();
      expect(res.headers['x-session-timeout-ms']).toBe('900000');
    });

    it('debe cerrar la sesión con 401 SESION_EXPIRADA_POR_INACTIVIDAD si transcurrió más del tiempo configurado', async () => {
      // Configuramos timeout en 5 minutos
      SessionInactivityService.setTimeoutMs(5 * 60 * 1000);

      // Enviamos x-last-activity simulando 6 minutos en el pasado
      const inactividadPasada = Date.now() - 6 * 60 * 1000;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'x-last-activity': inactividadPasada.toString(),
        },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SESION_EXPIRADA_POR_INACTIVIDAD');
    });

    it('debe responder correctamente al endpoint de simulación de inactividad', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auditoria/simular-inactividad',
        payload: {
          timeoutMs: 60000,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.timeoutMs).toBe(60000);
      expect(SessionInactivityService.getTimeoutMs()).toBe(60000);
    });
  });

  describe('Primer Ingreso: Cambio Obligatorio de Contraseña (RF-M8-08 / RF-M8-09)', () => {
    it('debe exigir cambio de password a un nuevo usuario bloqueando endpoints operativos con 403', async () => {
      // 1. Admin crea nuevo usuario (debeCambiarPassword = true por defecto en CrearUsuarioUseCase)
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/usuarios',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          nombre: 'Recién',
          apellido: 'Llegado',
          email: 'recien@agrul.com',
          password: 'PasswordTemporal1',
          perfil: 'ADMINISTRADOR',
        },
      });
      expect(createRes.statusCode).toBe(201);
      expect(createRes.json().data.debeCambiarPassword).toBe(true);

      // 2. Nuevo usuario se loguea
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'recien@agrul.com',
          password: 'PasswordTemporal1',
        },
      });
      expect(loginRes.statusCode).toBe(200);
      const nuevoToken = loginRes.json().data.token;
      expect(loginRes.json().data.usuario.debeCambiarPassword).toBe(true);

      // 3. Intenta acceder a endpoint protegido con verificarPasswordInicial
      const restrictedRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auditoria',
        headers: { authorization: `Bearer ${nuevoToken}` },
      });
      expect(restrictedRes.statusCode).toBe(403);
      expect(restrictedRes.json().error.code).toBe('PASSWORD_CAMBIO_OBLIGATORIO');

      // 4. Pero SÍ puede acceder a /auth/me
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${nuevoToken}` },
      });
      expect(meRes.statusCode).toBe(200);

      // 5. Y SÍ puede cambiar la contraseña
      const changePassRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/cambiar-password',
        headers: { authorization: `Bearer ${nuevoToken}` },
        payload: {
          passwordActual: 'PasswordTemporal1',
          passwordNueva: 'PasswordDefinitiva99',
        },
      });
      expect(changePassRes.statusCode).toBe(200);

      // 6. Nuevo login con la nueva contraseña
      const loginNuevo = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'recien@agrul.com',
          password: 'PasswordDefinitiva99',
        },
      });
      expect(loginNuevo.statusCode).toBe(200);
      const tokenDesbloqueado = loginNuevo.json().data.token;
      expect(loginNuevo.json().data.usuario.debeCambiarPassword).toBe(false);

      // 7. Ahora el acceso a /auditoria es exitoso (200 OK)
      const allowedRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auditoria',
        headers: { authorization: `Bearer ${tokenDesbloqueado}` },
      });
      expect(allowedRes.statusCode).toBe(200);
    });
  });
});
