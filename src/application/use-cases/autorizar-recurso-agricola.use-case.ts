import { AccesoRecursosAgricolasPort, RecursoAgricola } from '../../core/ports/acceso-recursos-agricolas.port.js';
import { AccesoDenegadoFincaError, CredencialesInvalidasError, EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';

export interface ActorRecursosAgricolas { perfil: string; fincas?: readonly string[] }

/** Solo recibe la identidad revalidada por el servidor, nunca un alcance del cliente. */
export function fincasVisiblesAgricolas(actor: ActorRecursosAgricolas | undefined): string[] | undefined {
  if (!actor) throw new CredencialesInvalidasError();
  return actor.perfil === 'ADMINISTRADOR' ? undefined : [...(actor.fincas ?? [])];
}

export class AutorizarRecursoAgricolaUseCase {
  constructor(private readonly repo: AccesoRecursosAgricolasPort) {}

  async execute(actor: ActorRecursosAgricolas | undefined, tipo: RecursoAgricola, id: string): Promise<void> {
    const fincas = fincasVisiblesAgricolas(actor);
    const recurso = await this.repo.buscarFinca(tipo, id);
    if (!recurso) throw new EntidadNoEncontradaError(tipo, id);
    if (fincas !== undefined && (!recurso.fincaId || !fincas.includes(recurso.fincaId))) {
      throw new AccesoDenegadoFincaError(recurso.fincaId ?? 'sin finca asignada');
    }
  }
}
