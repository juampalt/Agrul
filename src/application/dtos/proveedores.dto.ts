export interface RegistrarProveedorInputDTO {
  id?: string;
  razonSocial: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
}

export interface ActualizarProveedorInputDTO {
  id: string;
  razonSocial?: string;
  cuit?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

export interface ProveedorOutputDTO {
  id: string;
  razonSocial: string;
  cuit: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarProveedoresQueryDTO {
  activo?: boolean;
  busqueda?: string;
}
