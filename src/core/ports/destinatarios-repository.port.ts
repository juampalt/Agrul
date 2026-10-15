import { Destinatario } from '../domain/entities/destinatario.entity.js';

export interface DestinatariosFiltros {
  activo?: boolean;
  tipo?: string;
  search?: string;
}

export interface DestinatariosRepositoryPort {
  guardar(destinatario: Destinatario): Promise<void>;
  buscarPorId(id: string): Promise<Destinatario | null>;
  listar(filtros?: DestinatariosFiltros): Promise<Destinatario[]>;
}
