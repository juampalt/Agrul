import {
  CatalogosActividadesRepositoryPort,
  ListarTiposActividadFiltros,
  ListarPersonalFiltros,
  ListarMaquinariaFiltros,
} from '../../core/ports/catalogos-actividades-repository.port.js';
import { TipoActividad } from '../../core/domain/entities/tipo-actividad.entity.js';
import { PersonalCuadrilla } from '../../core/domain/entities/personal-cuadrilla.entity.js';
import { Maquinaria } from '../../core/domain/entities/maquinaria.entity.js';
import {
  CrearTipoActividadInputDTO,
  TipoActividadResponseDTO,
  CrearPersonalInputDTO,
  PersonalResponseDTO,
  CrearMaquinariaInputDTO,
  MaquinariaResponseDTO,
} from '../dtos/catalogos.dto.js';

// --- Tipos de Actividad ---
export class CrearTipoActividadUseCase {
  constructor(private readonly repo: CatalogosActividadesRepositoryPort) {}

  async execute(input: CrearTipoActividadInputDTO): Promise<TipoActividadResponseDTO> {
    const id = crypto.randomUUID();
    const tipo = TipoActividad.crear({ id, ...input });
    await this.repo.guardarTipoActividad(tipo);
    return tipo.toJSON();
  }
}

export class ListarTiposActividadUseCase {
  constructor(private readonly repo: CatalogosActividadesRepositoryPort) {}

  async execute(filtros?: ListarTiposActividadFiltros): Promise<TipoActividadResponseDTO[]> {
    const tipos = await this.repo.listarTiposActividad(filtros);
    return tipos.map((t) => t.toJSON());
  }
}

// --- Personal y Cuadrillas ---
export class CrearPersonalCuadrillaUseCase {
  constructor(private readonly repo: CatalogosActividadesRepositoryPort) {}

  async execute(input: CrearPersonalInputDTO): Promise<PersonalResponseDTO> {
    const id = crypto.randomUUID();
    const personal = PersonalCuadrilla.crear({ id, ...input });
    await this.repo.guardarPersonal(personal);
    return personal.toJSON();
  }
}

export class ListarPersonalCuadrillaUseCase {
  constructor(private readonly repo: CatalogosActividadesRepositoryPort) {}

  async execute(filtros?: ListarPersonalFiltros): Promise<PersonalResponseDTO[]> {
    const personal = await this.repo.listarPersonal(filtros);
    return personal.map((p) => p.toJSON());
  }
}

// --- Maquinaria ---
export class CrearMaquinariaUseCase {
  constructor(private readonly repo: CatalogosActividadesRepositoryPort) {}

  async execute(input: CrearMaquinariaInputDTO): Promise<MaquinariaResponseDTO> {
    const id = crypto.randomUUID();
    const maquinaria = Maquinaria.crear({ id, ...input });
    await this.repo.guardarMaquinaria(maquinaria);
    return maquinaria.toJSON();
  }
}

export class ListarMaquinariaUseCase {
  constructor(private readonly repo: CatalogosActividadesRepositoryPort) {}

  async execute(filtros?: ListarMaquinariaFiltros): Promise<MaquinariaResponseDTO[]> {
    const maquinaria = await this.repo.listarMaquinaria(filtros);
    return maquinaria.map((m) => m.toJSON());
  }
}
