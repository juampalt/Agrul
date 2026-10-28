import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { PasswordCambioObligatorioError, PermisoInsuficienteError } from '../../core/domain/errors/domain.error.js';
import { ConsultarAuditoriaInputDto } from '../dtos/auditoria.dto.js';
import { ConsultarAuditoriaSeguridadUseCase, ObtenerAuditoriaPorIdUseCase } from './auditoria.use-cases.js';

export class ConsultarAuditoriaSeguraUseCase {
  constructor(private readonly usuarios: UsuariosRepositoryPort,
    private readonly consulta: ConsultarAuditoriaSeguridadUseCase, private readonly detalle: ObtenerAuditoriaPorIdUseCase) {}

  async execute(filtros: ConsultarAuditoriaInputDto, responsableId: string | undefined) {
    await this.autorizar(responsableId);
    return this.consulta.execute(filtros);
  }
  async obtener(id: string, responsableId: string | undefined) {
    await this.autorizar(responsableId);
    return this.detalle.execute(id);
  }
  private async autorizar(id: string | undefined): Promise<void> {
    const usuario = id ? await this.usuarios.buscarPorId(id) : null;
    if (!usuario?.estaActivo || !['ADMIN_SISTEMA', 'ADMINISTRADOR'].includes(usuario.perfil)) throw new PermisoInsuficienteError();
    if (usuario.debeCambiarPassword) throw new PasswordCambioObligatorioError();
  }
}
