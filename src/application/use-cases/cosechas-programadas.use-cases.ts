import {
  cancelarJornadaCosecha, ConflictoProgramacionCosechaError, DatosProgramacionCosecha,
  reprogramarCosecha, validarProgramacionCosecha,
} from '../../core/domain/entities/cosecha-programada.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { CosechasProgramadasRepositoryPort, FiltrosJornadasCosecha } from '../../core/ports/cosechas-programadas-repository.port.js';

export class ProgramarCosechaUseCase {
  constructor(private readonly repo: CosechasProgramadasRepositoryPort) {}
  execute(operacionId: string, datos: DatosProgramacionCosecha, actorId: string) {
    return this.repo.programar(operacionId, validarProgramacionCosecha(datos), actorId);
  }
}
export class ConsultarCosechasProgramadasUseCase {
  constructor(private readonly repo: CosechasProgramadasRepositoryPort) {}
  listar(filtros: FiltrosJornadasCosecha) { return this.repo.listar(filtros); }
  async obtener(id: string) {
    const jornada = await this.repo.buscarPorId(id);
    if (!jornada) throw new EntidadNoEncontradaError('CosechaProgramada', id);
    return jornada;
  }
  async historial(id: string, limit: number, offset: number) {
    await this.obtener(id);
    return this.repo.historial(id, limit, offset);
  }
}
export class ReprogramarCosechaUseCase {
  constructor(private readonly repo: CosechasProgramadasRepositoryPort) {}
  async execute(id: string, version: number, datos: { fechaPrevista: string; responsableId?: string }, actorId: string) {
    const jornada = await new ConsultarCosechasProgramadasUseCase(this.repo).obtener(id);
    if (jornada.version !== version) throw new ConflictoProgramacionCosechaError();
    return this.repo.actualizar(reprogramarCosecha(jornada, datos), version, actorId);
  }
}
export class CancelarJornadaCosechaUseCase {
  constructor(private readonly repo: CosechasProgramadasRepositoryPort) {}
  async execute(id: string, version: number, motivo: string, actorId: string) {
    const jornada = await new ConsultarCosechasProgramadasUseCase(this.repo).obtener(id);
    if (jornada.version !== version) throw new ConflictoProgramacionCosechaError();
    return this.repo.actualizar(cancelarJornadaCosecha(jornada, motivo), version, actorId);
  }
}
