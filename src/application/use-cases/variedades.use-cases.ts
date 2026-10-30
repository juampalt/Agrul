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
  constructor(private readonly repo: VariedadesRepositoryPort) {}
  async execute(filtros: FiltrosVariedades) {
    return (await this.repo.listar(filtros)).map((variedad) => variedad.toJSON());
  }
  async obtenerPorId(id: string) {
    const variedad = await this.repo.buscarPorId(id);
    if (!variedad) throw new EntidadNoEncontradaError('Variedad', id);
    return variedad.toJSON();
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
