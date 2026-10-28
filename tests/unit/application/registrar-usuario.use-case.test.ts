import { beforeEach, describe, expect, it } from 'vitest';
import { RegistrarUsuarioUseCase } from '../../../src/application/use-cases/registrar-usuario.use-case.js';
import { CrearUsuarioUseCase } from '../../../src/application/use-cases/usuarios.use-cases.js';
import { RegistrarUsuarioInputDto } from '../../../src/application/dtos/usuarios.dto.js';
import { PERFILES_CANONICOS, PERFILES_USUARIO, Usuario } from '../../../src/core/domain/entities/usuario.entity.js';
import { PasswordCambioObligatorioError, PermisoInsuficienteError, UsuarioDuplicadoError } from '../../../src/core/domain/errors/domain.error.js';
import { CryptoAuthService } from '../../../src/infrastructure/services/crypto-auth.service.js';
import { InMemoryUsuariosRepository } from '../../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../mocks/in-memory-usuario-fincas.repository.js';
import { InMemoryAuditoriaSeguridadRepository } from '../../mocks/in-memory-auditoria-seguridad.repository.js';

describe('AGRUL-053 CU60: autorización del registro y seguridad de credenciales', () => {
  let repo: InMemoryUsuariosRepository;
  let auditoria: InMemoryAuditoriaSeguridadRepository;
  let registrar: RegistrarUsuarioUseCase;
  let responsable: Usuario;
  const input: RegistrarUsuarioInputDto = { nombre: 'Ana', apellido: 'Prueba', nombreUsuario: 'ana.campo',
    email: 'ana@example.test', password: 'Password1234', perfil: 'ENCARGADO_CAMPO' };

  beforeEach(async () => {
    repo = new InMemoryUsuariosRepository();
    auditoria = new InMemoryAuditoriaSeguridadRepository();
    registrar = new RegistrarUsuarioUseCase(repo, new CrearUsuarioUseCase(repo, new InMemoryUsuarioFincasRepository(), auditoria));
    const { hash, salt } = CryptoAuthService.hashPassword('ClaveAdmin123');
    responsable = Usuario.crear({ id: 'responsable', nombre: 'Admin', apellido: 'Sistema',
      email: 'sistema@example.test', passwordHash: hash, salt, perfil: 'ADMIN_SISTEMA' });
    await repo.guardar(responsable);
  });

  it.each(PERFILES_CANONICOS)('registra %s, protege su contraseña e identifica al responsable real', async perfil => {
    const salida = await registrar.execute({ ...input, perfil }, responsable.id);
    expect(salida).toMatchObject({ perfil, nombreUsuario: 'ana.campo', debeCambiarPassword: true, estado: 'ACTIVO' });
    const guardado = (await repo.buscarPorId(salida.id))!;
    expect(CryptoAuthService.verifyPassword(input.password, guardado.passwordHash, guardado.salt)).toBe(true);
    expect(JSON.stringify(salida)).not.toContain(input.password);
    expect(salida).not.toHaveProperty('passwordHash');
    expect(salida).not.toHaveProperty('salt');
    const { logs } = await auditoria.listar({ accion: 'CREAR' });
    expect(logs[0].toJSON()).toMatchObject({ usuarioId: responsable.id, entidadId: salida.id });
    expect(JSON.stringify(logs)).not.toContain(input.password);
  });

  it.each(PERFILES_USUARIO.filter(perfil => perfil !== 'ADMIN_SISTEMA'))(
    'rechaza al responsable %s aunque se invoque el caso de uso directamente', async perfil => {
      responsable.actualizarPerfil(perfil);
      await expect(registrar.execute(input, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
      expect(await repo.buscarPorEmail(input.email)).toBeNull();
    });

  it.each([undefined, 'inexistente'])('rechaza responsables ausentes: %s', async responsableId => {
    await expect(registrar.execute(input, responsableId)).rejects.toBeInstanceOf(PermisoInsuficienteError);
  });

  it('rechaza al responsable inactivo o bloqueado sin crear el usuario', async () => {
    responsable.desactivar();
    await expect(registrar.execute(input, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    responsable.bloquear();
    await expect(registrar.execute(input, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    expect(await repo.buscarPorEmail(input.email)).toBeNull();
  });

  it('exige que el responsable cambie su contraseña inicial', async () => {
    await repo.guardar(Usuario.reconstituir({ ...responsable.toJSON(), passwordHash: responsable.passwordHash,
      salt: responsable.salt, debeCambiarPassword: true }));
    await expect(registrar.execute(input, responsable.id)).rejects.toBeInstanceOf(PasswordCambioObligatorioError);
  });

  it('rechaza duplicados de nombre y correo normalizados', async () => {
    await registrar.execute(input, responsable.id);
    await expect(registrar.execute({ ...input, nombreUsuario: ' ANA.CAMPO ', email: 'otra@example.test' }, responsable.id))
      .rejects.toBeInstanceOf(UsuarioDuplicadoError);
    await expect(registrar.execute({ ...input, nombreUsuario: 'otra', email: ' ANA@EXAMPLE.TEST ' }, responsable.id))
      .rejects.toBeInstanceOf(UsuarioDuplicadoError);
    expect((await repo.listar()).length).toBe(2);
  });
});
