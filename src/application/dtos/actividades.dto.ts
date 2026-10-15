export interface MaquinariaActividadInputDto {
  maquinariaId: string;
  horasUso: number;
}

export interface ManoDeObraActividadInputDto {
  personalCuadrillaId: string;
  cantidadPersonas: number;
  horasTrabajadas: number;
  jornales: number;
}

export interface RegistrarActividadEjecutadaInputDto {
  codigoActividad?: string;
  tipoActividadId: string;
  loteId: string;
  cicloId: string;
  fechaHecho: string;
  hora?: string | null;
  usuarioCargaId: string;
  trabajadorResponsableId?: string | null;
  superficieTrabajadaHa?: number | null;
  observaciones?: string | null;
  observacionMonitoreoId?: string | null;
  maquinarias?: MaquinariaActividadInputDto[];
  manoDeObra?: ManoDeObraActividadInputDto[];
}

export interface AnularActividadInputDto {
  id: string;
  motivo: string;
  usuarioId: string;
}

export interface MaquinariaActividadOutputDto {
  id: string;
  maquinariaId: string;
  horasUso: number;
}

export interface ManoDeObraActividadOutputDto {
  id: string;
  personalCuadrillaId: string;
  cantidadPersonas: number;
  horasTrabajadas: number;
  jornales: number;
}

export interface ActividadOutputDto {
  id: string;
  codigoActividad: string;
  tipoActividadId: string;
  loteId: string;
  cicloId: string;
  fechaHecho: string;
  hora: string | null;
  usuarioCargaId: string;
  trabajadorResponsableId: string | null;
  superficieTrabajadaHa: number;
  observaciones: string | null;
  observacionMonitoreoId: string | null;
  estado: string;
  motivoCancelacion: string | null;
  canceladoEn: string | null;
  maquinarias: MaquinariaActividadOutputDto[];
  manoDeObra: ManoDeObraActividadOutputDto[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarActividadesFiltrosDto {
  loteId?: string;
  cicloId?: string;
  tipoActividadId?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
}
