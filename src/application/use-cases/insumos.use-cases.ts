import { randomUUID } from 'node:crypto';
import { DatosInsumo, Insumo } from '../../core/domain/entities/insumo.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { FiltrosInsumos, InsumosRepositoryPort } from '../../core/ports/insumos-repository.port.js';

function requerido(insumo: Insumo | null, id: string) {
  if (!insumo) throw new EntidadNoEncontradaError('Insumo', id);
  return insumo.toJSON();
}

export class RegistrarInsumoUseCase {
  constructor(private readonly repo: InsumosRepositoryPort) {}
  async execute(datos: DatosInsumo) {
    const insumo = Insumo.crear(randomUUID(), datos);
    await this.repo.guardar(insumo);
    return insumo.toJSON();
  }
}
export class ConsultarInsumosUseCase {
  constructor(private readonly repo: InsumosRepositoryPort) {}
  async execute(filtros: FiltrosInsumos) { return (await this.repo.listar(filtros)).map(i => i.toJSON()); }
  async obtenerPorId(id: string) { return requerido(await this.repo.buscarPorId(id), id); }
}
export class ModificarInsumoUseCase {
  constructor(private readonly repo: InsumosRepositoryPort) {}
  async execute(id: string, datos: DatosInsumo) {
    return requerido(await this.repo.modificar(id, Insumo.validar(datos)), id);
  }
}
export class DesactivarInsumoUseCase {
  constructor(private readonly repo: InsumosRepositoryPort) {}
  async execute(id: string) { return requerido(await this.repo.desactivar(id), id); }
}
