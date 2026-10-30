import { randomUUID } from 'node:crypto';
import { TipoActividad, DatosTipoActividad, TipoActividadInvalidoError } from '../../core/domain/entities/tipo-actividad-canonico.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { TiposActividadRepositoryPort, FiltrosTiposActividad } from '../../core/ports/tipos-actividad-repository.port.js';
import { CultivosRepositoryPort } from '../../core/ports/cultivos-repository.port.js';

/** Valida los cultivos aplicables: al menos uno, existentes y, salvo los ya asociados, activos. */
async function validarCultivosAplicables(
  cultivosRepo: CultivosRepositoryPort | undefined,
  cultivoIds: string[] | undefined,
  yaAsociados: string[] = [],
) {
  const ids = [...new Set(cultivoIds ?? [])];
  if (ids.length === 0) throw new TipoActividadInvalidoError('Debe indicarse al menos un cultivo aplicable.');
  if (!cultivosRepo) return ids;
  let activos = 0;
  for (const cultivoId of ids) {
    const cultivo = await cultivosRepo.buscarPorId(cultivoId);
    if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', cultivoId);
    const activo = cultivo.toJSON().estado === 'ACTIVO';
    if (activo) activos++;
    else if (!yaAsociados.includes(cultivoId)) {
      throw new TipoActividadInvalidoError('Solo pueden asociarse cultivos activos.');
    }
  }
  if (activos === 0) throw new TipoActividadInvalidoError('Debe conservarse al menos un cultivo activo asociado.');
  return ids;
}

export class RegistrarTipoActividadUseCase {
  constructor(
    private readonly repo: TiposActividadRepositoryPort,
    private readonly cultivosRepo?: CultivosRepositoryPort,
  ) {}

  async execute(datos: DatosTipoActividad) {
    const cultivoIds = await validarCultivosAplicables(this.cultivosRepo, datos.cultivoIds);
    const tipo = TipoActividad.crear({ ...datos, cultivoIds, id: randomUUID() });
    await this.repo.guardar(tipo);
    return tipo.toJSON();
  }
}

export class ConsultarTiposActividadUseCase {
  constructor(private readonly repo: TiposActividadRepositoryPort) {}

  async execute(filtros: FiltrosTiposActividad) {
    return (await this.repo.listar(filtros)).map((tipo) => tipo.toJSON());
  }

  async obtenerPorId(id: string) {
    const tipo = await this.repo.buscarPorId(id);
    if (!tipo) throw new EntidadNoEncontradaError('TipoActividad', id);
    return tipo.toJSON();
  }
}

export class ModificarTipoActividadUseCase {
  constructor(
    private readonly repo: TiposActividadRepositoryPort,
    private readonly cultivosRepo?: CultivosRepositoryPort,
  ) {}

  async execute(id: string, datos: DatosTipoActividad) {
    const actual = await this.repo.buscarPorId(id);
    if (!actual) throw new EntidadNoEncontradaError('TipoActividad', id);
    if (actual.estado !== 'ACTIVA') {
      throw new TipoActividadInvalidoError('Solo pueden modificarse tipos de actividad activos.');
    }
    const cultivoIds = await validarCultivosAplicables(this.cultivosRepo, datos.cultivoIds, actual.toJSON().cultivoIds);
    const validado = TipoActividad.crear({ ...datos, cultivoIds, id }).toJSON();
    const modificado = await this.repo.modificar(id, validado);
    if (!modificado) throw new EntidadNoEncontradaError('TipoActividad', id);
    return modificado.toJSON();
  }
}

export class DesactivarTipoActividadUseCase {
  constructor(private readonly repo: TiposActividadRepositoryPort) {}

  async execute(id: string) {
    const desactivado = await this.repo.desactivar(id);
    if (!desactivado) throw new EntidadNoEncontradaError('TipoActividad', id);
    return desactivado.toJSON();
  }
}
