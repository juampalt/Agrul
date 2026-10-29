import { randomUUID } from 'node:crypto';
import { ActividadRealizada, DatosEjecucionDirecta } from '../../core/domain/entities/actividad-realizada.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { ActividadesRealizadasGestionPort, FiltrosActividadesRealizadas } from '../../core/ports/actividades-realizadas-repository.port.js';

export class RegistrarActividadDirectaUseCase {
  constructor(private readonly repo: ActividadesRealizadasGestionPort) {}

  async execute(datos: DatosEjecucionDirecta) {
    const actividad = await this.repo.registrarDirecta(datos.cicloId, datos.tipoActividadId, datos.responsableId,
      contexto => ActividadRealizada.directa(randomUUID(), datos, contexto));
    return actividad.toJSON();
  }
}

export class ConsultarActividadesRealizadasUseCase {
  constructor(private readonly repo: ActividadesRealizadasGestionPort) {}

  async execute(filtros: FiltrosActividadesRealizadas) {
    return (await this.repo.listar(filtros)).map(a => a.toJSON());
  }

  async obtenerPorId(id: string) {
    const actividad = await this.repo.buscarPorId(id);
    if (!actividad) throw new EntidadNoEncontradaError('ActividadRealizada', id);
    return actividad.toJSON();
  }
}
