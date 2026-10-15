import {
  CatalogosActividadesRepositoryPort,
  ListarTiposActividadFiltros,
  ListarPersonalFiltros,
  ListarMaquinariaFiltros,
} from '../../../core/ports/catalogos-actividades-repository.port.js';
import { TipoActividad } from '../../../core/domain/entities/tipo-actividad.entity.js';
import { PersonalCuadrilla } from '../../../core/domain/entities/personal-cuadrilla.entity.js';
import { Maquinaria } from '../../../core/domain/entities/maquinaria.entity.js';

export class InMemoryCatalogosActividadesRepository implements CatalogosActividadesRepositoryPort {
  private readonly tiposActividad = new Map<string, TipoActividad>();
  private readonly personal = new Map<string, PersonalCuadrilla>();
  private readonly maquinaria = new Map<string, Maquinaria>();

  constructor(precargarEstandar = true) {
    if (precargarEstandar) {
      this.precargarTiposEstandar();
    }
  }

  private precargarTiposEstandar(): void {
    for (const estandar of TipoActividad.TIPOS_ESTANDAR) {
      const id = crypto.randomUUID();
      const tipo = TipoActividad.crear({ id, ...estandar });
      this.tiposActividad.set(id, tipo);
    }
  }

  // --- Tipos de Actividad ---
  async guardarTipoActividad(tipo: TipoActividad): Promise<void> {
    this.tiposActividad.set(tipo.id, tipo);
  }

  async buscarTipoActividadPorId(id: string): Promise<TipoActividad | null> {
    return this.tiposActividad.get(id) ?? null;
  }

  async listarTiposActividad(filtro?: ListarTiposActividadFiltros): Promise<TipoActividad[]> {
    let items = Array.from(this.tiposActividad.values());

    if (filtro?.activo !== undefined) {
      items = items.filter((t) => t.activo === filtro.activo);
    }

    if (filtro?.categoria) {
      const cat = filtro.categoria.toUpperCase();
      items = items.filter((t) => t.categoria.toUpperCase() === cat);
    }

    if (filtro?.nombre) {
      const nom = filtro.nombre.toLowerCase();
      items = items.filter((t) => t.nombre.toLowerCase().includes(nom));
    }

    return items;
  }

  async actualizarTipoActividad(tipo: TipoActividad): Promise<void> {
    this.tiposActividad.set(tipo.id, tipo);
  }

  // --- Personal y Cuadrillas ---
  async guardarPersonal(personal: PersonalCuadrilla): Promise<void> {
    this.personal.set(personal.id, personal);
  }

  async buscarPersonalPorId(id: string): Promise<PersonalCuadrilla | null> {
    return this.personal.get(id) ?? null;
  }

  async listarPersonal(filtro?: ListarPersonalFiltros): Promise<PersonalCuadrilla[]> {
    let items = Array.from(this.personal.values());

    if (filtro?.activo !== undefined) {
      items = items.filter((p) => p.activo === filtro.activo);
    }

    if (filtro?.tipo) {
      items = items.filter((p) => p.tipo === filtro.tipo);
    }

    if (filtro?.nombre) {
      const nom = filtro.nombre.toLowerCase();
      items = items.filter((p) => p.nombre.toLowerCase().includes(nom));
    }

    return items;
  }

  async actualizarPersonal(personal: PersonalCuadrilla): Promise<void> {
    this.personal.set(personal.id, personal);
  }

  // --- Maquinaria ---
  async guardarMaquinaria(maquinaria: Maquinaria): Promise<void> {
    this.maquinaria.set(maquinaria.id, maquinaria);
  }

  async buscarMaquinariaPorId(id: string): Promise<Maquinaria | null> {
    return this.maquinaria.get(id) ?? null;
  }

  async listarMaquinaria(filtro?: ListarMaquinariaFiltros): Promise<Maquinaria[]> {
    let items = Array.from(this.maquinaria.values());

    if (filtro?.activo !== undefined) {
      items = items.filter((m) => m.activo === filtro.activo);
    }

    if (filtro?.condicion) {
      const cond = filtro.condicion.toUpperCase();
      items = items.filter((m) => m.condicion.toUpperCase() === cond);
    }

    if (filtro?.tipo) {
      const tip = filtro.tipo.toUpperCase();
      items = items.filter((m) => m.tipo.toUpperCase() === tip);
    }

    if (filtro?.identificacion) {
      const iden = filtro.identificacion.toLowerCase();
      items = items.filter((m) => m.identificacion.toLowerCase().includes(iden));
    }

    return items;
  }

  async actualizarMaquinaria(maquinaria: Maquinaria): Promise<void> {
    this.maquinaria.set(maquinaria.id, maquinaria);
  }
}
