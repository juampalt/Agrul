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
  propietario?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
}

export type ModificarFincaDTO = Omit<RegistrarFincaDTO, 'id' | 'responsableId' | 'renspa' | 'geometria'>;

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
  propietario?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}
