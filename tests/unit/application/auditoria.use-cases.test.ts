import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAuditoriaSeguridadRepository } from '../../mocks/in-memory-auditoria-seguridad.repository.js';
import { InMemoryUsuariosRepository } from '../../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../mocks/in-memory-usuario-fincas.repository.js';
import {
  RegistrarAuditoriaSeguridadUseCase,
  ConsultarAuditoriaSeguridadUseCase,
  ObtenerAuditoriaPorIdUseCase,
} from '../../../src/application/use-cases/auditoria.use-cases.js';
import {
  CrearUsuarioUseCase,
  AutenticarUsuarioUseCase,
  ActualizarUsuarioUseCase,
  BloquearUsuarioUseCase,
  DesbloquearUsuarioUseCase,
  CambiarPasswordUseCase,
} from '../../../src/application/use-cases/usuarios.use-cases.js';
import { CryptoAuthService } from '../../../src/infrastructure/services/crypto-auth.service.js';
import { UsuarioBloqueadoError } from '../../../src/core/domain/errors/domain.error.js';

describe('AGRUL-040: Casos de Uso de Bitácora de Auditoría y Seguridad (RF-M8-08 / RN-06)', () => {
  let auditoriaRepo: InMemoryAuditoriaSeguridadRepository;
  let usuariosRepo: InMemoryUsuariosRepository;
  let usuarioFincasRepo: InMemoryUsuarioFincasRepository;

  let registrarAuditoriaUC: RegistrarAuditoriaSeguridadUseCase;
  let consultarAuditoriaUC: ConsultarAuditoriaSeguridadUseCase;
  let obtenerAuditoriaPorIdUC: ObtenerAuditoriaPorIdUseCase;

  beforeEach(() => {
    auditoriaRepo = new InMemoryAuditoriaSeguridadRepository();
    usuariosRepo = new InMemoryUsuariosRepository();
    usuarioFincasRepo = new InMemoryUsuarioFincasRepository();

    registrarAuditoriaUC = new RegistrarAuditoriaSeguridadUseCase(auditoriaRepo);
    consultarAuditoriaUC = new ConsultarAuditoriaSeguridadUseCase(auditoriaRepo);
    obtenerAuditoriaPorIdUC = new ObtenerAuditoriaPorIdUseCase(auditoriaRepo);
  });

  describe('Registrar y Consultar Auditoría Directa', () => {
    it('debe registrar y consultar un evento de auditoría con deltas de valor previo y posterior (RN-06)', async () => {
      const log = await registrarAuditoriaUC.execute({
        usuarioId: 'usr-admin',
        usuarioEmail: 'admin@agrul.com',
        accion: 'CREAR',
        entidad: 'LOTE',
        entidadId: 'lote-1',
        valorPrevioJson: null,
        valorNuevoJson: { codigo: 'LOT-2026-001', producto: 'Limón Eureka' },
        ip: '127.0.0.1',
        userAgent: 'Vitest Test Agent',
      });

      expect(log.id).toBeDefined();
      expect(log.accion).toBe('CREAR');
      expect(log.valorNuevoJson).toEqual({ codigo: 'LOT-2026-001', producto: 'Limón Eureka' });

      const consulta = await consultarAuditoriaUC.execute({ entidad: 'LOTE' });
      expect(consulta.total).toBe(1);
      expect(consulta.logs[0].id).toBe(log.id);

      const detalle = await obtenerAuditoriaPorIdUC.execute(log.id);
      expect(detalle).not.toBeNull();
      expect(detalle?.entidadId).toBe('lote-1');
    });

    it('debe filtrar auditoría por acción, usuario y rango de fechas', async () => {
      const ayer = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const ahora = new Date().toISOString();

      await registrarAuditoriaUC.execute({
        usuarioId: 'usr-1',
        accion: 'LOGIN',
        entidad: 'USUARIO',
        timestamp: ayer,
      });

      await registrarAuditoriaUC.execute({
        usuarioId: 'usr-2',
        accion: 'EDITAR',
        entidad: 'ACTIVIDAD',
        timestamp: ahora,
      });

      const soloLogin = await consultarAuditoriaUC.execute({ accion: 'LOGIN' });
      expect(soloLogin.total).toBe(1);
      expect(soloLogin.logs[0].usuarioId).toBe('usr-1');

      const soloUsr2 = await consultarAuditoriaUC.execute({ usuarioId: 'usr-2' });
      expect(soloUsr2.total).toBe(1);
      expect(soloUsr2.logs[0].accion).toBe('EDITAR');
    });
  });

  describe('Integración Automática de Auditoría con Operaciones de Usuario', () => {
    it('debe auditar la creación de usuarios con valorNuevoJson', async () => {
      const crearUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);

      const nuevo = await crearUC.execute({
        nombre: 'Carlos',
        apellido: 'Pérez',
        email: 'carlos@agrul.com',
        password: 'Password123',
        perfil: 'OPERARIO',
      });

      expect(nuevo.debeCambiarPassword).toBe(true);

      const logs = auditoriaRepo.obtenerTodos();
      expect(logs.length).toBe(1);
      expect(logs[0].accion).toBe('CREAR');
      expect(logs[0].entidad).toBe('USUARIO');
      expect(logs[0].usuarioId).toBe(nuevo.id);
      expect(logs[0].valorNuevoJson).toBeDefined();
    });

    it('debe auditar el inicio de sesión exitoso con acción LOGIN', async () => {
      const crearUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
      await crearUC.execute({
        nombre: 'Admin',
        apellido: 'Principal',
        email: 'admin@agrul.com',
        password: 'Password123',
        perfil: 'ADMINISTRADOR',
      });

      auditoriaRepo.limpiar();

      const authUC = new AutenticarUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
      const res = await authUC.execute({
        email: 'admin@agrul.com',
        password: 'Password123',
        ip: '10.0.0.1',
        userAgent: 'Chrome Browser',
      });

      expect(res.token).toBeDefined();

      const logs = auditoriaRepo.obtenerTodos();
      expect(logs.length).toBe(1);
      expect(logs[0].accion).toBe('LOGIN');
      expect(logs[0].ip).toBe('10.0.0.1');
      expect(logs[0].userAgent).toBe('Chrome Browser');
    });

    it('debe auditar el bloqueo de usuario al 5to intento fallido con deltas previo/posterior (RN-06)', async () => {
      const crearUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
      await crearUC.execute({
        nombre: 'Víctima',
        apellido: 'Bruteforce',
        email: 'victima@agrul.com',
        password: 'PasswordSegura123',
        perfil: 'OPERARIO',
      });

      auditoriaRepo.limpiar();

      const authUC = new AutenticarUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);

      for (let i = 1; i <= 4; i++) {
        try {
          await authUC.execute({ email: 'victima@agrul.com', password: 'ClaveEquivocada' });
        } catch {
          // Intentos fallidos 1 a 4
        }
      }

      await expect(
        authUC.execute({ email: 'victima@agrul.com', password: 'ClaveEquivocada' })
      ).rejects.toThrow(UsuarioBloqueadoError);

      const logs = auditoriaRepo.obtenerTodos();
      const logBloqueo = logs.find((l) => l.accion === 'BLOQUEO');
      expect(logBloqueo).toBeDefined();
      expect(logBloqueo?.valorPrevioJson).toEqual({ estado: 'ACTIVO', intentosFallidos: 4 });
      expect(logBloqueo?.valorNuevoJson).toEqual({ estado: 'BLOQUEADO', intentosFallidos: 5 });
    });

    it('debe auditar la modificación de usuarios registrando delta previo y nuevo (RN-06)', async () => {
      const crearUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
      const user = await crearUC.execute({
        nombre: 'Original',
        apellido: 'User',
        email: 'original@agrul.com',
        password: 'Password123',
        perfil: 'ENCARGADO',
      });

      auditoriaRepo.limpiar();

      const actualizarUC = new ActualizarUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
      await actualizarUC.execute(user.id, {
        nombre: 'Modificado',
        perfil: 'ADMINISTRADOR',
      });

      const logs = auditoriaRepo.obtenerTodos();
      expect(logs.length).toBe(1);
      expect(logs[0].accion).toBe('EDITAR');
      expect(logs[0].valorPrevioJson).toMatchObject({
        nombre: 'Original',
        perfil: 'ENCARGADO',
      });
      expect(logs[0].valorNuevoJson).toMatchObject({
        nombre: 'Modificado',
        perfil: 'ADMINISTRADOR',
      });
    });

    it('debe auditar el cambio de contraseña y apagar el flag debeCambiarPassword', async () => {
      const crearUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo, auditoriaRepo);
      const user = await crearUC.execute({
        nombre: 'Nuevo',
        apellido: 'Ingreso',
        email: 'nuevo@agrul.com',
        password: 'PasswordTemporal1',
        perfil: 'OPERARIO',
      });

      expect(user.debeCambiarPassword).toBe(true);
      auditoriaRepo.limpiar();

      const cambiarPassUC = new CambiarPasswordUseCase(usuariosRepo, auditoriaRepo);
      await cambiarPassUC.execute(user.id, {
        passwordActual: 'PasswordTemporal1',
        passwordNueva: 'PasswordDefinitiva2',
      });

      const logs = auditoriaRepo.obtenerTodos();
      expect(logs.length).toBe(1);
      expect(logs[0].accion).toBe('CAMBIO_PASSWORD');
      expect(logs[0].valorPrevioJson).toEqual({ debeCambiarPassword: true });
      expect(logs[0].valorNuevoJson).toEqual({ debeCambiarPassword: false });

      const usuarioActualizado = await usuariosRepo.buscarPorId(user.id);
      expect(usuarioActualizado?.debeCambiarPassword).toBe(false);
    });
  });
});
