import { DomainError } from '../../core/domain/errors/domain.error.js';
import { ActividadesProgramadasConsultaPort } from '../../core/ports/actividades-programadas-consulta.port.js';

export class CicloConActividadesPendientesError extends DomainError {
  readonly code = 'CICLO_CON_ACTIVIDADES_PENDIENTES';
  constructor() { super('El ciclo no puede finalizarse mientras tenga actividades programadas pendientes (RN-09).'); }
}

export class VerificarCierreCicloUseCase {
  constructor(private readonly actividades: ActividadesProgramadasConsultaPort) {}

  async execute(cicloId: string): Promise<void> {
    // Los errores de consulta se propagan: una fuente inaccesible nunca equivale a cero pendientes.
    if (await this.actividades.tienePendientes(cicloId)) throw new CicloConActividadesPendientesError();
  }
}
