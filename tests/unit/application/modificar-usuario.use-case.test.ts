import { beforeEach, describe, expect, it } from 'vitest';
import { ModificarUsuarioUseCase } from '../../../src/application/use-cases/modificar-usuario.use-case.js';
import { Usuario, UsuarioInvalidoError } from '../../../src/core/domain/entities/usuario.entity.js';
import { PasswordCambioObligatorioError, PermisoInsuficienteError, UsuarioDuplicadoError } from '../../../src/core/domain/errors/domain.error.js';
import { InMemoryUsuariosRepository } from '../../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../mocks/in-memory-usuario-fincas.repository.js';
import { InMemoryAuditoriaSeguridadRepository } from '../../mocks/in-memory-auditoria-seguridad.repository.js';

describe('AGRUL-053 CU62: validaciones y deltas del caso de uso', () => {
  let repo: InMemoryUsuariosRepository;
  let auditoria: InMemoryAuditoriaSeguridadRepository;
  let modificar: ModificarUsuarioUseCase;
  let original: Usuario;
  beforeEach(async () => {
    repo = new InMemoryUsuariosRepository();
    auditoria = new InMemoryAuditoriaSeguridadRepository();
    modificar = new ModificarUsuarioUseCase({ usuariosRepo: repo, usuarioFincasRepo: new InMemoryUsuarioFincasRepository(), auditoriaRepo: auditoria });
    await repo.guardar(Usuario.crear({ id: 'sistema', nombre: 'Admin', apellido: 'Sistema', email: 'sistema@example.test',
      nombreUsuario: 'sistema', perfil: 'ADMIN_SISTEMA', passwordHash: 'hash-fixture', salt: 'salt-fixture' }));
    original = Usuario.crear({ id: 'usuario', nombre: 'Ana', apellido: 'Prueba', email: 'ana@example.test',
      perfil: 'OPERARIO', passwordHash: 'hash-fixture', salt: 'salt-fixture' });
    await repo.guardar(original);
  });

  it('reutiliza la entidad, normaliza datos y registra al responsable separado del usuario afectado', async () => {
    const res = await modificar.execute('usuario', { nombreUsuario: ' ANA.NUEVA ', email: ' ANA.NUEVA@EXAMPLE.TEST ', perfil: 'ENCARGADO_CAMPO' }, 'sistema');
    expect(res).toMatchObject({ nombreUsuario: 'ana.nueva', email: 'ana.nueva@example.test', perfil: 'ENCARGADO_CAMPO' });
    const { logs } = await auditoria.listar();
    expect(logs[0].toJSON()).toMatchObject({ usuarioId: 'sistema', entidadId: 'usuario',
      valorPrevioJson: { perfil: 'OPERARIO' }, valorNuevoJson: { perfil: 'ENCARGADO_CAMPO' } });
    expect(JSON.stringify(logs)).not.toContain('hash-fixture');
    expect(JSON.stringify(logs)).not.toContain('salt-fixture');
  });

  it('conserva el perfil histórico cuando no se modifica explícitamente', async () => {
    expect((await modificar.execute('usuario', { nombre: 'Ana María' }, 'sistema')).perfil).toBe('OPERARIO');
  });

  it('evita alterar la entidad original si falla una validación posterior', async () => {
    await expect(modificar.execute('usuario', { nombre: 'No guardar', email: 'sistema@example.test' }, 'sistema'))
      .rejects.toBeInstanceOf(UsuarioDuplicadoError);
    expect(original.nombre).toBe('Ana');
    expect((await repo.buscarPorId('usuario'))?.nombre).toBe('Ana');
    await expect(modificar.execute('usuario', { nombre: 'No guardar', apellido: ' ' }, 'sistema'))
      .rejects.toBeInstanceOf(UsuarioInvalidoError);
    expect(original.nombre).toBe('Ana');
  });

  it.each([undefined, 'inexistente', 'usuario'])('exige un responsable autorizado incluso sin pasar por HTTP: %s', async responsableId => {
    await expect(modificar.execute('usuario', { nombre: 'No guardar' }, responsableId)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    expect(original.nombre).toBe('Ana');
  });

  it('rechaza asignar un perfil histórico en una modificación nueva', async () => {
    await expect(modificar.execute('usuario', { perfil: 'OPERARIO' }, 'sistema')).rejects.toBeInstanceOf(UsuarioInvalidoError);
  });

  it('rechaza al administrador con cambio inicial de contraseña pendiente', async () => {
    const sistema = (await repo.buscarPorId('sistema'))!;
    await repo.guardar(Usuario.reconstituir({ ...sistema.toJSON(), passwordHash: sistema.passwordHash, salt: sistema.salt, debeCambiarPassword: true }));
    await expect(modificar.execute('usuario', { nombre: 'No guardar' }, 'sistema')).rejects.toBeInstanceOf(PasswordCambioObligatorioError);
  });

  it('no genera auditoría para un cambio sin diferencias de contenido', async () => {
    await modificar.execute('usuario', { nombre: ' Ana ' }, 'sistema');
    expect((await auditoria.listar()).logs).toEqual([]);
  });
});
