import { Destinatario } from '../../src/core/domain/entities/destinatario.entity.js';
import { DestinatariosRepositoryPort, DestinatariosFiltros } from '../../src/core/ports/destinatarios-repository.port.js';

export class InMemoryDestinatariosRepository implements DestinatariosRepositoryPort {
  private destinatarios: Map<string, Destinatario> = new Map();

  async guardar(destinatario: Destinatario): Promise<void> {
    this.destinatarios.set(destinatario.id, destinatario);
  }

  async buscarPorId(id: string): Promise<Destinatario | null> {
    return this.destinatarios.get(id) ?? null;
  }

  async listar(filtros?: DestinatariosFiltros): Promise<Destinatario[]> {
    let items = Array.from(this.destinatarios.values());

    if (filtros) {
      if (filtros.activo !== undefined) {
        items = items.filter(d => d.activo === filtros.activo);
      }
      if (filtros.tipo) {
        items = items.filter(d => d.tipo === filtros.tipo);
      }
      if (filtros.search) {
        const s = filtros.search.toLowerCase();
        items = items.filter(
          d =>
            d.nombre.toLowerCase().includes(s) ||
            (d.cuit && d.cuit.toLowerCase().includes(s))
        );
      }
    }

    return items;
  }
}
