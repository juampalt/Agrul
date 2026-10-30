import { randomUUID } from 'node:crypto';
import { DatosPlantacion, Plantacion } from '../../core/domain/entities/plantacion.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { FiltrosPlantaciones, PlantacionesRepositoryPort } from '../../core/ports/plantaciones-repository.port.js';

export class RegistrarPlantacionUseCase {
  constructor(private readonly repo: PlantacionesRepositoryPort) {}
  async execute(datos: DatosPlantacion) {
    const plantacion = Plantacion.crear({ ...datos, id: randomUUID() });
    await this.repo.guardar(plantacion);
    return plantacion.toJSON();
  }
}

export class ConsultarPlantacionesUseCase {
  constructor(private readonly repo: PlantacionesRepositoryPort) {}
  async execute(filtros: FiltrosPlantaciones) {
    return (await this.repo.listar(filtros)).map((plantacion) => plantacion.toJSON());
  }
  async obtenerPorId(id: string) {
    const plantacion = await this.repo.buscarPorId(id);
    if (!plantacion) throw new EntidadNoEncontradaError('Plantación', id);
    // CU16: el detalle incluye finca, lote con su ocupación y los ciclos productivos asociados.
    const detalle = await this.repo.detalle(id);
    return { ...plantacion.toJSON(), fincaId: detalle?.fincaId ?? null, lote: detalle?.lote ?? null, ciclos: detalle?.ciclos ?? [] };
  }
}

export class FinalizarPlantacionUseCase {
  constructor(private readonly repo: PlantacionesRepositoryPort) {}
  async execute(id: string, fechaFinalizacion: string) {
    const plantacion = await this.repo.finalizar(id, fechaFinalizacion);
    if (!plantacion) throw new EntidadNoEncontradaError('Plantación', id);
    return plantacion.toJSON();
  }
}
