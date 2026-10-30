import { randomUUID } from 'node:crypto';
import { DatosVariedad, Variedad, VariedadInvalidaError } from '../../core/domain/entities/variedad.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { CultivosRepositoryPort } from '../../core/ports/cultivos-repository.port.js';
import { FiltrosVariedades, VariedadesRepositoryPort } from '../../core/ports/variedades-repository.port.js';

export class RegistrarVariedadUseCase {
  constructor(private readonly repo: VariedadesRepositoryPort, private readonly cultivos: CultivosRepositoryPort) {}
  async execute(datos: DatosVariedad & { cultivoId: string }) {
    const cultivo = await this.cultivos.buscarPorId(datos.cultivoId);
    if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', datos.cultivoId);
    if (cultivo.toJSON().estado !== 'ACTIVO') {
      throw new VariedadInvalidaError('Solo pueden registrarse variedades en cultivos activos.');
    }
    const variedad = Variedad.crear({ ...datos, id: randomUUID() });
    await this.repo.guardar(variedad);
    return variedad.toJSON();
  }
}

export class ConsultarVariedadesUseCase {
  constructor(private readonly repo: VariedadesRepositoryPort, private readonly cultivos?: CultivosRepositoryPort) {}

  /** CU12: indica si la variedad está disponible para nuevas plantaciones (ella y su cultivo activos). */
  private async enriquecer(variedades: Variedad[]) {
    const estados = new Map<string, string | null>();
    const resultado = [];
    for (const variedad of variedades) {
      const datos = variedad.toJSON();
      if (this.cultivos && !estados.has(datos.cultivoId)) {
        estados.set(datos.cultivoId, (await this.cultivos.buscarPorId(datos.cultivoId))?.toJSON().estado ?? null);
      }
      const cultivoEstado = estados.get(datos.cultivoId) ?? null;
      resultado.push({ ...datos, cultivoEstado, disponibleParaNuevasPlantaciones: datos.estado === 'ACTIVO' && cultivoEstado === 'ACTIVO' });
    }
    return resultado;
  }

  async execute(filtros: FiltrosVariedades) {
    return this.enriquecer(await this.repo.listar(filtros));
  }
  async obtenerPorId(id: string) {
    const variedad = await this.repo.buscarPorId(id);
    if (!variedad) throw new EntidadNoEncontradaError('Variedad', id);
    return (await this.enriquecer([variedad]))[0];
  }
}

export class ModificarVariedadUseCase {
  constructor(private readonly repo: VariedadesRepositoryPort) {}
  async execute(id: string, datos: DatosVariedad) {
    const actual = await this.repo.buscarPorId(id);
    if (!actual) throw new EntidadNoEncontradaError('Variedad', id);
    const validado = Variedad.reconstituir({ ...actual.toJSON(), ...datos }).toJSON();
    const variedad = await this.repo.modificar(id, validado);
    if (!variedad) throw new EntidadNoEncontradaError('Variedad', id);
    return variedad.toJSON();
  }
}

export class DesactivarVariedadUseCase {
  constructor(private readonly repo: VariedadesRepositoryPort) {}
  async execute(id: string) {
    const variedad = await this.repo.desactivar(id);
    if (!variedad) throw new EntidadNoEncontradaError('Variedad', id);
    return variedad.toJSON();
  }
}
