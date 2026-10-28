import { PERFILES_CANONICOS, UsuarioInvalidoError } from '../../core/domain/entities/usuario.entity.js';
import { PasswordCambioObligatorioError, PermisoInsuficienteError, UsuarioDuplicadoError } from '../../core/domain/errors/domain.error.js';
import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { RegistrarUsuarioInputDto, UsuarioOutputDto } from '../dtos/usuarios.dto.js';
import { CrearUsuarioUseCase } from './usuarios.use-cases.js';

/** CU60 / confirmarRegistroUsuario: autorización sobre el estado persistido del responsable. */
export class RegistrarUsuarioUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly crearUsuario: CrearUsuarioUseCase,
  ) {}

  async execute(input: RegistrarUsuarioInputDto, responsableId: string | undefined): Promise<UsuarioOutputDto> {
    const responsable = responsableId ? await this.usuariosRepo.buscarPorId(responsableId) : null;
    if (!responsable?.estaActivo || responsable.perfil !== 'ADMIN_SISTEMA') {
      throw new PermisoInsuficienteError('Solo un Administrador del Sistema activo puede registrar usuarios.');
    }
    if (responsable.debeCambiarPassword) throw new PasswordCambioObligatorioError();
    if (!PERFILES_CANONICOS.includes(input.perfil) || !input.nombreUsuario?.trim()) {
      throw new UsuarioInvalidoError('El nombre de usuario y un perfil canónico son obligatorios para el registro.');
    }
    const existente = await this.usuariosRepo.buscarPorNombreUsuario(input.nombreUsuario);
    if (existente) throw new UsuarioDuplicadoError(input.nombreUsuario.trim(), 'nombre de usuario');
    return this.crearUsuario.execute(input, responsable);
  }
}
