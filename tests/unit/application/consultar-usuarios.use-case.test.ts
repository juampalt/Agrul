import { beforeEach, describe, expect, it } from 'vitest';
import { ConsultarUsuariosUseCase } from '../../../src/application/use-cases/consultar-usuarios.use-case.js';
import { ListarUsuariosUseCase, ObtenerUsuarioPorIdUseCase } from '../../../src/application/use-cases/usuarios.use-cases.js';
import { PERFILES_USUARIO, Usuario } from '../../../src/core/domain/entities/usuario.entity.js';
import { EntidadNoEncontradaError, PasswordCambioObligatorioError, PermisoInsuficienteError } from '../../../src/core/domain/errors/domain.error.js';
import { InMemoryUsuariosRepository } from '../../mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../../mocks/in-memory-usuario-fincas.repository.js';

describe('AGRUL-053 CU61: filtros y autorización del caso de uso', () => {
  let repo: InMemoryUsuariosRepository;
  let consultar: ConsultarUsuariosUseCase;
  let responsable: Usuario;

  beforeEach(async () => {
    repo = new InMemoryUsuariosRepository();
    const fincas = new InMemoryUsuarioFincasRepository();
    consultar = new ConsultarUsuariosUseCase(repo, new ListarUsuariosUseCase(repo, fincas), new ObtenerUsuarioPorIdUseCase(repo, fincas));
    responsable = Usuario.crear({ id: 'sistema', nombre: 'Admin', apellido: 'Sistema', email: 'sistema@example.test',
      perfil: 'ADMIN_SISTEMA', passwordHash: 'hash-fixture', salt: 'salt-fixture' });
    await repo.guardar(responsable);
    await repo.guardar(Usuario.crear({ id: 'ana', nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test',
      nombreUsuario: 'huerta.norte', perfil: 'ENCARGADO_CAMPO', estado: 'INACTIVO', passwordHash: 'hash-fixture', salt: 'salt-fixture' }));
    await repo.guardar(Usuario.crear({ id: 'otro', nombre: 'Juan', apellido: 'Pérez', email: 'juan@example.test',
      nombreUsuario: 'huerta.sur', perfil: 'ENCARGADO_CAMPO', passwordHash: 'hash-fixture', salt: 'salt-fixture' }));
    await fincas.asignarFincas('ana', ['finca-1']);
  });

  it('combina perfil, estado y búsqueda por nombre de usuario sin exponer credenciales', async () => {
    const salida = await consultar.execute({ perfil: 'ENCARGADO_CAMPO', estado: 'INACTIVO', busqueda: ' HUERTA.NORTE ' }, 'sistema');
    expect(salida).toMatchObject([{ id: 'ana', nombreUsuario: 'huerta.norte', fincasAsignadas: ['finca-1'] }]);
    expect(salida).toHaveLength(1);
    expect(JSON.stringify(salida)).not.toContain('hash-fixture');
    expect(JSON.stringify(salida)).not.toContain('salt-fixture');
    expect(await consultar.execute({ perfil: 'ADMINISTRADOR', busqueda: 'huerta' }, 'sistema')).toEqual([]);
  });

  it.each(['ADMIN_SISTEMA', 'ADMINISTRADOR', 'ENCARGADO'] as const)('permite la consulta general a %s', async perfil => {
    responsable.actualizarPerfil(perfil);
    expect(await consultar.execute({}, responsable.id)).toHaveLength(3);
    expect((await consultar.obtener('ana', responsable.id)).id).toBe('ana');
  });

  it.each(PERFILES_USUARIO.filter(perfil => !['ADMIN_SISTEMA', 'ADMINISTRADOR', 'ENCARGADO'].includes(perfil)))(
    '%s consulta su propia ficha pero no listas ni fichas ajenas', async perfil => {
      responsable.actualizarPerfil(perfil);
      expect((await consultar.obtener(responsable.id, responsable.id)).id).toBe(responsable.id);
      await expect(consultar.execute({}, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
      await expect(consultar.obtener('ana', responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
      await expect(consultar.obtener('inexistente', responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    });

  it.each([undefined, 'inexistente'])('rechaza responsables ausentes: %s', async responsableId => {
    await expect(consultar.execute({}, responsableId)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    await expect(consultar.obtener('ana', responsableId)).rejects.toBeInstanceOf(PermisoInsuficienteError);
  });

  it('revalida el estado y rechaza cuentas inactivas o bloqueadas', async () => {
    responsable.desactivar();
    await expect(consultar.execute({}, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    await expect(consultar.obtener(responsable.id, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
    responsable.bloquear();
    await expect(consultar.execute({}, responsable.id)).rejects.toBeInstanceOf(PermisoInsuficienteError);
  });

  it('permite el perfil propio durante el primer ingreso y exige cambio de contraseña para la consulta general', async () => {
    await repo.guardar(Usuario.reconstituir({ ...responsable.toJSON(), passwordHash: responsable.passwordHash,
      salt: responsable.salt, debeCambiarPassword: true }));
    expect((await consultar.obtener(responsable.id, responsable.id)).id).toBe(responsable.id);
    await expect(consultar.execute({}, responsable.id)).rejects.toBeInstanceOf(PasswordCambioObligatorioError);
    await expect(consultar.obtener('ana', responsable.id)).rejects.toBeInstanceOf(PasswordCambioObligatorioError);
  });

  it('devuelve entidad inexistente solamente después de autorizar la consulta', async () => {
    await expect(consultar.obtener('inexistente', responsable.id)).rejects.toBeInstanceOf(EntidadNoEncontradaError);
  });
});
