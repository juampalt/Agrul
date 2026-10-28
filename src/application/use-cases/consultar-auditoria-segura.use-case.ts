import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import { PasswordCambioObligatorioError, PermisoInsuficienteError } from '../../core/domain/errors/domain.error.js';
import { ConsultarAuditoriaInputDto } from '../dtos/auditoria.dto.js';
import { ConsultarAuditoriaSeguridadUseCase, ObtenerAuditoriaPorIdUseCase } from './auditoria.use-cases.js';

export class ConsultarAuditoriaSeguraUseCase {
  constructor(private readonly usuarios: UsuariosRepositoryPort,
    private readonly consulta: ConsultarAuditoriaSeguridadUseCase, private readonly detalle: ObtenerAuditoriaPorIdUseCase) {}

  async execute(filtros: ConsultarAuditoriaInputDto, responsableId: string | undefined) {
    await this.verificarAcceso(responsableId);
    return this.consulta.execute(filtros);
  }
  async obtener(id: string, responsableId: string | undefined) {
    await this.verificarAcceso(responsableId);
    return this.detalle.execute(id);
  }
  async verificarAcceso(id: string | undefined, soloSistema = false): Promise<void> {
    const usuario = id ? await this.usuarios.buscarPorId(id) : null;
    const roles = soloSistema ? ['ADMIN_SISTEMA'] : ['ADMIN_SISTEMA', 'ADMINISTRADOR'];
    if (!usuario?.estaActivo || !roles.includes(usuario.perfil)) throw new PermisoInsuficienteError();
    if (usuario.debeCambiarPassword) throw new PasswordCambioObligatorioError();
  }
}
