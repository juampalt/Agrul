import { randomUUID } from 'node:crypto';
import { ActividadRealizada, DatosEjecucionProgramada } from '../../core/domain/entities/actividad-realizada.entity.js';
import { ActividadesRealizadasRepositoryPort } from '../../core/ports/actividades-realizadas-repository.port.js';

export class EjecutarActividadProgramadaUseCase {
  constructor(private readonly repo: ActividadesRealizadasRepositoryPort) {}

  async execute(datos: DatosEjecucionProgramada) {
    const actividad = await this.repo.registrarDesdeProgramada(datos.actividadProgramadaId, datos.responsableId,
      (contexto) => ActividadRealizada.desdeProgramada(randomUUID(), datos, contexto));
    return actividad.toJSON();
  }
}
