import { Usuario } from '../../core/domain/entities/usuario.entity.js';
import { PasswordCambioObligatorioError, PermisoInsuficienteError } from '../../core/domain/errors/domain.error.js';
import { FiltrosUsuarios, UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { UsuarioOutputDto } from '../dtos/usuarios.dto.js';
import { ListarUsuariosUseCase, ObtenerUsuarioPorIdUseCase } from './usuarios.use-cases.js';

/** CU61: conserva las consultas autorizadas previamente e incorpora al Administrador del Sistema. */
export class ConsultarUsuariosUseCase {
  constructor(
    private readonly usuariosRepo: UsuariosRepositoryPort,
    private readonly listarUsuarios: ListarUsuariosUseCase,
    private readonly obtenerUsuario: ObtenerUsuarioPorIdUseCase,
  ) {}

  async execute(filtros: FiltrosUsuarios, responsableId: string | undefined): Promise<UsuarioOutputDto[]> {
    const responsable = await this.responsableActivo(responsableId);
    this.exigirConsultaGeneral(responsable);
    return this.listarUsuarios.execute(filtros);
  }

  async obtener(id: string, responsableId: string | undefined): Promise<UsuarioOutputDto> {
    const responsable = await this.responsableActivo(responsableId);
    // El perfil propio sigue siendo accesible, como /auth/me, incluso durante el primer ingreso.
    if (id !== responsable.id) this.exigirConsultaGeneral(responsable);
    return this.obtenerUsuario.execute(id);
  }

  private async responsableActivo(id: string | undefined): Promise<Usuario> {
    const responsable = id ? await this.usuariosRepo.buscarPorId(id) : null;
    if (!responsable?.estaActivo) {
      throw new PermisoInsuficienteError('Se requiere una cuenta activa para consultar usuarios.');
    }
    return responsable;
  }

  private exigirConsultaGeneral(responsable: Usuario): void {
    if (!['ADMIN_SISTEMA', 'ADMINISTRADOR', 'ENCARGADO'].includes(responsable.perfil)) {
      throw new PermisoInsuficienteError('El perfil no tiene autorización para consultar otros usuarios.');
    }
    if (responsable.debeCambiarPassword) throw new PasswordCambioObligatorioError();
  }
}
