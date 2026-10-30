import { randomUUID } from 'node:crypto';
import {
  ActividadProgramada,
  DatosProgramacionActividad,
  validarFechaNoAnteriorAHoy,
} from '../../core/domain/entities/actividad-programada.entity.js';
import {
  EntidadNoEncontradaError,
  DomainError,
} from '../../core/domain/errors/domain.error.js';
import {
  ActividadesProgramadasRepositoryPort,
  FiltrosActividadesProgramadas,
} from '../../core/ports/actividades-programadas-repository.port.js';
import { CiclosProductivosRepositoryPort } from '../../core/ports/ciclos-productivos-repository.port.js';
import { TiposActividadRepositoryPort } from '../../core/ports/tipos-actividad-repository.port.js';
import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';

export class CicloNoActivoParaProgramacionError extends DomainError {
  readonly code = 'CICLO_NO_ACTIVO_PARA_PROGRAMACION';
  constructor(mensaje: string) {
    super(mensaje);
  }
}

export class ResponsableNoHabilitadoError extends DomainError {
  readonly code = 'RESPONSABLE_NO_HABILITADO';
  constructor() { super('El responsable asignado debe encontrarse habilitado.'); }
}

export class TipoActividadInactivoError extends DomainError {
  readonly code = 'TIPO_ACTIVIDAD_INACTIVO';
  constructor(nombre: string) {
    super(`El tipo de actividad '${nombre}' se encuentra inactivo y no puede programarse.`);
  }
}

export class ProgramarActividadUseCase {
  constructor(
    private readonly repo: ActividadesProgramadasRepositoryPort,
    private readonly ciclosRepo: CiclosProductivosRepositoryPort,
    private readonly tiposRepo: TiposActividadRepositoryPort,
    private readonly usuariosRepo: UsuariosRepositoryPort,
  ) {}

  async execute(datos: DatosProgramacionActividad) {
    validarFechaNoAnteriorAHoy(datos.fechaProgramada);
    // 1. Validar ciclo
    const ciclo = await this.ciclosRepo.buscarPorId(datos.cicloId);
    if (!ciclo) throw new EntidadNoEncontradaError('CicloProductivo', datos.cicloId);
    if (ciclo.estado !== 'ACTIVO' && ciclo.estado !== 'ABIERTO') {
      throw new CicloNoActivoParaProgramacionError('Solo pueden programarse actividades en ciclos productivos activos (RN-09).');
    }

    // 2. Validar tipo de actividad
    const tipo = await this.tiposRepo.buscarPorId(datos.tipoActividadId);
    if (!tipo) throw new EntidadNoEncontradaError('TipoActividad', datos.tipoActividadId);
    if (tipo.estado === 'INACTIVA') {
      throw new TipoActividadInactivoError(tipo.nombre);
    }

    // 3. Validar responsable
    const responsable = await this.usuariosRepo.buscarPorId(datos.responsableId);
    if (!responsable) throw new EntidadNoEncontradaError('Usuario', datos.responsableId);
    if (!responsable.estaActivo) throw new ResponsableNoHabilitadoError();

    const actividad = ActividadProgramada.programar({ ...datos, id: randomUUID() });
    await this.repo.guardar(actividad);
    return actividad.toJSON();
  }
}

export class ConsultarActividadesProgramadasUseCase {
  constructor(private readonly repo: ActividadesProgramadasRepositoryPort) {}

  async execute(filtros: FiltrosActividadesProgramadas) {
    return (await this.repo.listar(filtros)).map((act) => act.toJSON());
  }

  async obtenerPorId(id: string) {
    const act = await this.repo.buscarPorId(id);
    if (!act) throw new EntidadNoEncontradaError('ActividadProgramada', id);
    return act.toJSON();
  }
}

export class ReprogramarActividadUseCase {
  constructor(
    private readonly repo: ActividadesProgramadasRepositoryPort,
    private readonly usuariosRepo?: UsuariosRepositoryPort,
  ) {}

  async execute(id: string, params: { fechaProgramada: string; responsableId?: string; superficiePrevista?: number | null; descripcion?: string | null }) {
    validarFechaNoAnteriorAHoy(params.fechaProgramada);
    const act = await this.repo.buscarPorId(id);
    if (!act) throw new EntidadNoEncontradaError('ActividadProgramada', id);

    if (params.responsableId && this.usuariosRepo) {
      const resp = await this.usuariosRepo.buscarPorId(params.responsableId);
      if (!resp) throw new EntidadNoEncontradaError('Usuario', params.responsableId);
      if (!resp.estaActivo) throw new ResponsableNoHabilitadoError();
    }

    const reprogramada = act.reprogramar(params);
    await this.repo.actualizar(reprogramada);
    return reprogramada.toJSON();
  }
}

export class CancelarActividadUseCase {
  constructor(private readonly repo: ActividadesProgramadasRepositoryPort) {}

  async execute(id: string, motivo: string) {
    const act = await this.repo.buscarPorId(id);
    if (!act) throw new EntidadNoEncontradaError('ActividadProgramada', id);

    const cancelada = act.cancelar(motivo);
    await this.repo.actualizar(cancelada);
    return cancelada.toJSON();
  }
}
