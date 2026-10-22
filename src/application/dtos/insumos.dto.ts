import { CategoriaInsumo } from '../../core/domain/entities/insumo-catalogo.entity.js';

export interface FichaFitosanitariaInputDto {
  principioActivo: string;
  periodoCarenciaDias: number;
  periodoReingresoHoras: number;
  nroRegistroSenasa: string;
  toxicologia?: string | null;
}

export interface FichaFitosanitariaOutputDto {
  insumoId?: string;
  principioActivo: string;
  periodoCarenciaDias: number;
  periodoReingresoHoras: number;
  nroRegistroSenasa: string;
  toxicologia?: string | null;
}

export interface RegistrarInsumoInputDto {
  nombreComercial: string;
  categoria: CategoriaInsumo;
  unidadMedidaId: string;
  presentacion: string;
  activo?: boolean;
  stockMinimoConfigurable?: number | null;
  fichaFitosanitaria?: FichaFitosanitariaInputDto | null;
}

export interface ConfigurarStockMinimoInputDto {
  stockMinimo: number | null;
}

export interface InsumoOutputDto {
  id: string;
  nombreComercial: string;
  categoria: CategoriaInsumo;
  unidadMedidaId: string;
  presentacion: string;
  activo: boolean;
  stockMinimoConfigurable?: number | null;
  fichaFitosanitaria?: FichaFitosanitariaOutputDto | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarInsumosFiltrosDto {
  categoria?: CategoriaInsumo;
  activo?: boolean;
}
