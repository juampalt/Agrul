import { describe, it, expect, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryUsuariosRepository } from '../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../mocks/in-memory-usuario-fincas.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';

describe('AGRUL-038: Integration Tests — Autenticación, RBAC y Aislamiento por Finca', () => {
  let app: FastifyInstance;
  let fincasRepo: InMemoryFincasRepository;
  let usuariosRepo: InMemoryUsuariosRepository;
  let usuarioFincasRepo: InMemoryUsuarioFincasRepository;

  let adminToken: string;
  let encargadoToken: string;
  let operarioToken: string;
  let asesorToken: string;

  const FINCA_LULES_ID = '11111111-1111-4111-8111-111111111111';
  const FINCA_FAMAILLA_ID = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    fincasRepo = new InMemoryFincasRepository();
    usuariosRepo = new InMemoryUsuariosRepository();
    usuarioFincasRepo = new InMemoryUsuarioFincasRepository();

    // Crear dos fincas en el sistema
    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_LULES_ID,
        nombre: 'Finca Lules Citrícola',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 100,
        renspa: '23.001.0.00123/00',
      })
    );

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_FAMAILLA_ID,
        nombre: 'Finca Famaillá Arándanos',
        localidad: 'Famaillá',
        departamento: 'Famaillá',
        provincia: 'Tucumán',
        superficieTotalHa: 60,
        renspa: '23.002.0.00456/00',
      })
    );

    app = buildApp({
      lotesRepo: new InMemoryLotesRepository(),
      eventosRepo: new InMemoryEventosRepository(),
      genealogiaRepo: new InMemoryGenealogiaRepository(),
      fincasRepo,
      usuariosRepo,
      usuarioFincasRepo,
    });

    await app.ready();

    // 1. Inicializar usuario ADMINISTRADOR directamente
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@agrul.com',
        password: 'PasswordInvalida',
      },
    });
    // Debe fallar porque no existe aún
    expect(adminRes.statusCode).toBe(401);

    // Creamos los 4 usuarios usando el caso de uso a través del repo
    const { hash, salt } = (await import('../../src/infrastructure/services/crypto-auth.service.js')).CryptoAuthService.hashPassword('Password1234');
    const { Usuario } = await import('../../src/core/domain/entities/usuario.entity.js');

    const adminUser = Usuario.crear({
      id: 'usr-admin',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@agrul.com',
      passwordHash: hash,
      salt,
      perfil: 'ADMINISTRADOR',
    });
    await usuariosRepo.guardar(adminUser);

    const encargadoUser = Usuario.crear({
      id: 'usr-encargado',
      nombre: 'Encargado',
      apellido: 'Lules',
      email: 'encargado@agrul.com',
      passwordHash: hash,
      salt,
      perfil: 'ENCARGADO',
    });
    await usuariosRepo.guardar(encargadoUser);
    await usuarioFincasRepo.asignarFincas('usr-encargado', [FINCA_LULES_ID]);

    const operarioUser = Usuario.crear({
      id: 'usr-operario',
      nombre: 'Operario',
      apellido: 'Campo',
      email: 'operario@agrul.com',
      passwordHash: hash,
      salt,
      perfil: 'OPERARIO',
    });
    await usuariosRepo.guardar(operarioUser);
    await usuarioFincasRepo.asignarFincas('usr-operario', [FINCA_LULES_ID]);

    const asesorUser = Usuario.crear({
      id: 'usr-asesor',
      nombre: 'Asesor',
      apellido: 'Agrónomo',
      email: 'asesor@agrul.com',
      passwordHash: hash,
      salt,
      perfil: 'ASESOR_AGRONOMO',
    });
    await usuariosRepo.guardar(asesorUser);
    await usuarioFincasRepo.asignarFincas('usr-asesor', [FINCA_LULES_ID, FINCA_FAMAILLA_ID]);

    // Iniciar sesión con cada uno para obtener tokens
    const rAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@agrul.com', password: 'Password1234' },
    });
    adminToken = rAdmin.json().data.token;

    const rEncargado = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'encargado@agrul.com', password: 'Password1234' },
    });
    encargadoToken = rEncargado.json().data.token;

    const rOperario = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'operario@agrul.com', password: 'Password1234' },
    });
    operarioToken = rOperario.json().data.token;

    const rAsesor = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'asesor@agrul.com', password: 'Password1234' },
    });
    asesorToken = rAsesor.json().data.token;
  });

  describe('Autenticación y Sesión (/api/v1/auth/*)', () => {
    it('POST /auth/login con credenciales válidas retorna 200 y token JWT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'admin@agrul.com', password: 'Password1234' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.usuario.email).toBe('admin@agrul.com');
      expect(body.data.usuario.perfil).toBe('ADMINISTRADOR');
    });

    it('POST /auth/login con credenciales erróneas bloquea la cuenta tras 5 intentos (RF-M8-03)', async () => {
      for (let i = 1; i <= 4; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'operario@agrul.com', password: 'PasswordIncorrecta' },
        });
        expect(res.statusCode).toBe(401);
      }

      // Quinto intento fallido
      const resBloqueo = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'operario@agrul.com', password: 'PasswordIncorrecta' },
      });
      expect(resBloqueo.statusCode).toBe(403);
      expect(resBloqueo.json().error.code).toBe('USUARIO_BLOQUEADO');
    });

    it('GET /auth/me sin token retorna 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('TOKEN_REQUERIDO');
    });

    it('GET /auth/me con Bearer token válido retorna el perfil y fincas asignadas', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${encargadoToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.usuario.email).toBe('encargado@agrul.com');
      expect(body.data.usuario.fincasAsignadas).toEqual([FINCA_LULES_ID]);
    });

    it('POST /auth/cambiar-password actualiza la contraseña de la sesión activa', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/cambiar-password',
        headers: { authorization: `Bearer ${operarioToken}` },
        payload: {
          passwordActual: 'Password1234',
          passwordNueva: 'NuevaPassword2026',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Iniciar sesión con la nueva
      const resLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'operario@agrul.com', password: 'NuevaPassword2026' },
      });
      expect(resLogin.statusCode).toBe(200);
    });
  });

  describe('Control de Roles RBAC (/api/v1/usuarios)', () => {
    it('POST /usuarios exige perfil ADMINISTRADOR y rechaza a OPERARIO con 403 Forbidden', async () => {
      const resOperario = await app.inject({
        method: 'POST',
        url: '/api/v1/usuarios',
        headers: { authorization: `Bearer ${operarioToken}` },
        payload: {
          nombre: 'Nuevo',
          apellido: 'Usuario',
          email: 'nuevo@agrul.com',
          password: 'PasswordSegura2026',
          perfil: 'OPERARIO',
        },
      });

      expect(resOperario.statusCode).toBe(403);
      expect(resOperario.json().error.code).toBe('PERMISO_INSUFICIENTE');
    });

    it('POST /usuarios con perfil ADMINISTRADOR crea un nuevo usuario exitosamente (201 Created)', async () => {
      const resAdmin = await app.inject({
        method: 'POST',
        url: '/api/v1/usuarios',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          nombre: 'Claudio',
          apellido: 'Borges',
          email: 'claudio.borges@agrul.com',
          password: 'PasswordClaudio2026',
          perfil: 'ENCARGADO',
          fincaIds: [FINCA_LULES_ID],
        },
      });

      expect(resAdmin.statusCode).toBe(201);
      const body = resAdmin.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.email).toBe('claudio.borges@agrul.com');
      expect(body.data.fincasAsignadas).toEqual([FINCA_LULES_ID]);
    });

    it('GET /usuarios permite acceso a ADMINISTRADOR y ENCARGADO pero deniega a OPERARIO', async () => {
      const resEncargado = await app.inject({
        method: 'GET',
        url: '/api/v1/usuarios',
        headers: { authorization: `Bearer ${encargadoToken}` },
      });
      expect(resEncargado.statusCode).toBe(200);
      expect(Array.isArray(resEncargado.json().data)).toBe(true);

      const resOperario = await app.inject({
        method: 'GET',
        url: '/api/v1/usuarios',
        headers: { authorization: `Bearer ${operarioToken}` },
      });
      expect(resOperario.statusCode).toBe(403);
    });

    it('POST /usuarios/:id/bloquear permite al Administrador bloquear y desbloquear cuentas', async () => {
      const resBloqueo = await app.inject({
        method: 'POST',
        url: '/api/v1/usuarios/usr-operario/bloquear',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { motivo: 'Suspensión preventiva por auditoría' },
      });

      expect(resBloqueo.statusCode).toBe(200);
      expect(resBloqueo.json().data.estado).toBe('BLOQUEADO');

      // Desbloquear
      const resDesbloqueo = await app.inject({
        method: 'POST',
        url: '/api/v1/usuarios/usr-operario/desbloquear',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(resDesbloqueo.statusCode).toBe(200);
      expect(resDesbloqueo.json().data.estado).toBe('ACTIVO');
    });
  });

  describe('Aislamiento y Verificación de Acceso por Finca (RF-M8-05 / RN-16)', () => {
    it('GET /fincas/:id/verificar-acceso permite al ADMINISTRADOR operar cualquier finca', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_FAMAILLA_ID}/verificar-acceso`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.tieneAcceso).toBe(true);
      expect(res.json().data.esAdminGlobal).toBe(true);
    });

    it('GET /fincas/:id/verificar-acceso autoriza a ENCARGADO en finca asignada y rechaza con 403 en no asignada', async () => {
      // Finca Lules asignada
      const resAsignada = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_LULES_ID}/verificar-acceso`,
        headers: { authorization: `Bearer ${encargadoToken}` },
      });
      expect(resAsignada.statusCode).toBe(200);
      expect(resAsignada.json().data.tieneAcceso).toBe(true);

      // Finca Famaillá NO asignada
      const resNoAsignada = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_FAMAILLA_ID}/verificar-acceso`,
        headers: { authorization: `Bearer ${encargadoToken}` },
      });
      expect(resNoAsignada.statusCode).toBe(403);
      expect(resNoAsignada.json().error.code).toBe('ACCESO_DENEGADO_FINCA');
    });

    it('GET /fincas/:id con Bearer token bloquea con 403 si el usuario no tiene la finca asignada', async () => {
      // Intento de consulta de Finca Famaillá por Encargado de Lules
      const resDenegada = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_FAMAILLA_ID}`,
        headers: { authorization: `Bearer ${encargadoToken}` },
      });
      expect(resDenegada.statusCode).toBe(403);
      expect(resDenegada.json().error.code).toBe('ACCESO_DENEGADO_FINCA');

      // Consulta de Finca Lules por Encargado de Lules permitida
      const resPermitida = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_LULES_ID}`,
        headers: { authorization: `Bearer ${encargadoToken}` },
      });
      expect(resPermitida.statusCode).toBe(200);
      expect(resPermitida.json().data.id).toBe(FINCA_LULES_ID);
    });
  });
});
