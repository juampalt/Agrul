import { GeoJSONGeometry } from '../../core/domain/value-objects/geojson.vo.js';

export interface RegistrarFincaDTO {
  id?: string;
  nombre: string;
  localidad: string;
  departamento: string;
  provincia: string;
  superficieTotalHa: number;
  responsableId?: string | null;
  renspa?: string | null;
  geometria?: GeoJSONGeometry | null;
}

export interface FincaResponseDTO {
  id: string;
  nombre: string;
  ubicacion: {
    localidad: string;
    departamento: string;
    provincia: string;
  };
  superficieTotalHa: number;
  responsableId?: string | null;
  renspa?: string | null;
  geometria?: GeoJSONGeometry | null;
  creadoEn: string;
  actualizadoEn: string;
}
