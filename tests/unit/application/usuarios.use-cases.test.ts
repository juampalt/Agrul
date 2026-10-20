import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUsuariosRepository } from '../../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../mocks/in-memory-usuario-fincas.repository.js';
import {
  CrearUsuarioUseCase,
  AutenticarUsuarioUseCase,
  ListarUsuariosUseCase,
  ObtenerUsuarioPorIdUseCase,
  ActualizarUsuarioUseCase,
  BloquearUsuarioUseCase,
  DesbloquearUsuarioUseCase,
  CambiarPasswordUseCase,
  VerificarAccesoFincaUseCase,
} from '../../../src/application/use-cases/usuarios.use-cases.js';
import {
  UsuarioDuplicadoError,
  CredencialesInvalidasError,
  UsuarioBloqueadoError,
  UsuarioInactivoError,
  EntidadNoEncontradaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('AGRUL-038: Casos de Uso de Gestión de Usuarios y Autenticación', () => {
  let usuariosRepo: InMemoryUsuariosRepository;
  let usuarioFincasRepo: InMemoryUsuarioFincasRepository;

  let crearUsuarioUC: CrearUsuarioUseCase;
  let autenticarUsuarioUC: AutenticarUsuarioUseCase;
  let listarUsuariosUC: ListarUsuariosUseCase;
  let obtenerUsuarioPorIdUC: ObtenerUsuarioPorIdUseCase;
  let actualizarUsuarioUC: ActualizarUsuarioUseCase;
  let bloquearUsuarioUC: BloquearUsuarioUseCase;
  let desbloquearUsuarioUC: DesbloquearUsuarioUseCase;
  let cambiarPasswordUC: CambiarPasswordUseCase;
  let verificarAccesoFincaUC: VerificarAccesoFincaUseCase;

  beforeEach(() => {
    usuariosRepo = new InMemoryUsuariosRepository();
    usuarioFincasRepo = new InMemoryUsuarioFincasRepository();

    crearUsuarioUC = new CrearUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
    autenticarUsuarioUC = new AutenticarUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
    listarUsuariosUC = new ListarUsuariosUseCase(usuariosRepo, usuarioFincasRepo);
    obtenerUsuarioPorIdUC = new ObtenerUsuarioPorIdUseCase(usuariosRepo, usuarioFincasRepo);
    actualizarUsuarioUC = new ActualizarUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
    bloquearUsuarioUC = new BloquearUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
    desbloquearUsuarioUC = new DesbloquearUsuarioUseCase(usuariosRepo, usuarioFincasRepo);
    cambiarPasswordUC = new CambiarPasswordUseCase(usuariosRepo);
    verificarAccesoFincaUC = new VerificarAccesoFincaUseCase(usuariosRepo, usuarioFincasRepo);
  });

  describe('Creación de Usuario (RF-M8-01, RF-M8-02)', () => {
    it('debe crear un usuario con hash seguro y asignarle fincas correctamente', async () => {
      const output = await crearUsuarioUC.execute({
        nombre: 'Mariana',
        apellido: 'Sosa',
        email: 'mariana.sosa@finca-lules.com',
        password: 'PasswordSegura2026',
        perfil: 'ENCARGADO',
        fincaIds: ['finca-lules-1', 'finca-lules-2'],
      });

      expect(output.id).toBeDefined();
      expect(output.email).toBe('mariana.sosa@finca-lules.com');
      expect(output.perfil).toBe('ENCARGADO');
      expect(output.estado).toBe('ACTIVO');
      expect(output.fincasAsignadas).toEqual(['finca-lules-1', 'finca-lules-2']);

      const enDb = await usuariosRepo.buscarPorId(output.id);
      expect(enDb).not.toBeNull();
      expect(enDb?.passwordHash).not.toBe('PasswordSegura2026'); // Debe estar hasheada
    });

    it('debe rechazar la creación si el email ya existe en el sistema', async () => {
      await crearUsuarioUC.execute({
        nombre: 'Mariana',
        apellido: 'Sosa',
        email: 'repetido@agrul.com',
        password: 'Password1234',
        perfil: 'OPERARIO',
      });

      await expect(
        crearUsuarioUC.execute({
          nombre: 'Otro',
          apellido: 'Usuario',
          email: 'repetido@agrul.com',
          password: 'Password5678',
          perfil: 'OPERARIO',
        })
      ).rejects.toThrow(UsuarioDuplicadoError);
    });
  });

  describe('Autenticación y Bloqueo tras Intentos Fallidos (RF-M8-03)', () => {
    beforeEach(async () => {
      await crearUsuarioUC.execute({
        nombre: 'Pedro',
        apellido: 'Alonso',
        email: 'pedro@agrul.com',
        password: 'Password1234',
        perfil: 'OPERARIO',
        fincaIds: ['finca-1'],
      });
    });

    it('debe autenticar exitosamente y retornar token JWT firmado con claims', async () => {
      const res = await autenticarUsuarioUC.execute({
        email: 'pedro@agrul.com',
        password: 'Password1234',
      });

      expect(res.token).toBeDefined();
      expect(res.expiraEnSegundos).toBe(86400);
      expect(res.usuario.email).toBe('pedro@agrul.com');
      expect(res.usuario.fincasAsignadas).toEqual(['finca-1']);
    });

    it('debe registrar intentos fallidos y bloquear la cuenta exactamente al quinto intento', async () => {
      // 4 intentos fallidos
      for (let i = 1; i <= 4; i++) {
        await expect(
          autenticarUsuarioUC.execute({
            email: 'pedro@agrul.com',
            password: 'PasswordErronea',
          })
        ).rejects.toThrow(CredencialesInvalidasError);
      }

      const userAntes = await usuariosRepo.buscarPorEmail('pedro@agrul.com');
      expect(userAntes?.intentosFallidos).toBe(4);
      expect(userAntes?.estaBloqueado).toBe(false);

      // 5to intento fallido: debe bloquearse
      await expect(
        autenticarUsuarioUC.execute({
          email: 'pedro@agrul.com',
          password: 'PasswordErronea',
        })
      ).rejects.toThrow(UsuarioBloqueadoError);

      const userDespues = await usuariosRepo.buscarPorEmail('pedro@agrul.com');
      expect(userDespues?.estaBloqueado).toBe(true);

      // Próximos intentos con password correcta deben ser rechazados por estar bloqueado
      await expect(
        autenticarUsuarioUC.execute({
          email: 'pedro@agrul.com',
          password: 'Password1234',
        })
      ).rejects.toThrow(UsuarioBloqueadoError);
    });

    it('debe rechazar el acceso si el usuario se encuentra inactivo', async () => {
      const user = await usuariosRepo.buscarPorEmail('pedro@agrul.com');
      user?.desactivar();
      await usuariosRepo.actualizar(user!);

      await expect(
        autenticarUsuarioUC.execute({
          email: 'pedro@agrul.com',
          password: 'Password1234',
        })
      ).rejects.toThrow(UsuarioInactivoError);
    });
  });

  describe('Control de Acceso y Aislamiento por Finca (RF-M8-05 / RN-16)', () => {
    let adminId: string;
    let encargadoId: string;
    let operarioId: string;

    beforeEach(async () => {
      const admin = await crearUsuarioUC.execute({
        nombre: 'Admin',
        apellido: 'General',
        email: 'admin@agrul.com',
        password: 'PasswordAdmin123',
        perfil: 'ADMINISTRADOR',
      });
      adminId = admin.id;

      const enc = await crearUsuarioUC.execute({
        nombre: 'Encargado',
        apellido: 'Norte',
        email: 'encargado@agrul.com',
        password: 'PasswordEncargado123',
        perfil: 'ENCARGADO',
        fincaIds: ['finca-lules-1', 'finca-lules-2'],
      });
      encargadoId = enc.id;

      const op = await crearUsuarioUC.execute({
        nombre: 'Operario',
        apellido: 'Lules',
        email: 'operario@agrul.com',
        password: 'PasswordOperario123',
        perfil: 'OPERARIO',
        fincaIds: ['finca-lules-1'],
      });
      operarioId = op.id;
    });

    it('el rol ADMINISTRADOR debe tener acceso global a cualquier finca (RN-16)', async () => {
      const res = await verificarAccesoFincaUC.execute({
        usuarioId: adminId,
        fincaId: 'finca-cualquiera-999',
      });

      expect(res.tieneAcceso).toBe(true);
      expect(res.esAdminGlobal).toBe(true);
      expect(res.fincasAutorizadas).toEqual(['*']);
    });

    it('el rol ENCARGADO debe acceder solo a sus fincas asignadas y ser denegado en otras (RF-M8-05)', async () => {
      const accesoFinca1 = await verificarAccesoFincaUC.execute({
        usuarioId: encargadoId,
        fincaId: 'finca-lules-1',
      });
      expect(accesoFinca1.tieneAcceso).toBe(true);

      const accesoFinca2 = await verificarAccesoFincaUC.execute({
        usuarioId: encargadoId,
        fincaId: 'finca-lules-2',
      });
      expect(accesoFinca2.tieneAcceso).toBe(true);

      const accesoFincaAjena = await verificarAccesoFincaUC.execute({
        usuarioId: encargadoId,
        fincaId: 'finca-famailla-3',
      });
      expect(accesoFincaAjena.tieneAcceso).toBe(false);
      expect(accesoFincaAjena.motivo).toContain('no está asignado a la finca');
    });

    it('el rol OPERARIO no debe poder acceder a fincas no asignadas', async () => {
      const accesoFinca2 = await verificarAccesoFincaUC.execute({
        usuarioId: operarioId,
        fincaId: 'finca-lules-2',
      });
      expect(accesoFinca2.tieneAcceso).toBe(false);
    });
  });

  describe('Actualización, Bloqueo Administrativo y Cambio de Contraseña', () => {
    it('debe permitir actualizar datos y reasignar fincas', async () => {
      const u = await crearUsuarioUC.execute({
        nombre: 'Esteban',
        apellido: 'Quito',
        email: 'esteban@agrul.com',
        password: 'Password1234',
        perfil: 'OPERARIO',
        fincaIds: ['finca-1'],
      });

      const updated = await actualizarUsuarioUC.execute(u.id, {
        nombre: 'Esteban Carlos',
        perfil: 'ENCARGADO',
        fincaIds: ['finca-1', 'finca-3'],
      });

      expect(updated.nombre).toBe('Esteban Carlos');
      expect(updated.perfil).toBe('ENCARGADO');
      expect(updated.fincasAsignadas).toEqual(['finca-1', 'finca-3']);
    });

    it('debe permitir bloquear y desbloquear manualmente', async () => {
      const u = await crearUsuarioUC.execute({
        nombre: 'Lucas',
        apellido: 'Vera',
        email: 'lucas@agrul.com',
        password: 'Password1234',
        perfil: 'OPERARIO',
      });

      const bloqueado = await bloquearUsuarioUC.execute(u.id);
      expect(bloqueado.estado).toBe('BLOQUEADO');

      const desbloqueado = await desbloquearUsuarioUC.execute(u.id);
      expect(desbloqueado.estado).toBe('ACTIVO');
    });

    it('debe permitir cambiar contraseña validando la anterior', async () => {
      const u = await crearUsuarioUC.execute({
        nombre: 'Lucía',
        apellido: 'Méndez',
        email: 'lucia@agrul.com',
        password: 'PasswordVieja123',
        perfil: 'OPERARIO',
      });

      // Contraseña actual errónea
      await expect(
        cambiarPasswordUC.execute(u.id, {
          passwordActual: 'Erronea1234',
          passwordNueva: 'PasswordNueva123',
        })
      ).rejects.toThrow(CredencialesInvalidasError);

      // Contraseña actual correcta
      await cambiarPasswordUC.execute(u.id, {
        passwordActual: 'PasswordVieja123',
        passwordNueva: 'PasswordNueva123',
      });

      // Login con la nueva
      const res = await autenticarUsuarioUC.execute({
        email: 'lucia@agrul.com',
        password: 'PasswordNueva123',
      });
      expect(res.token).toBeDefined();
    });
  });
});
