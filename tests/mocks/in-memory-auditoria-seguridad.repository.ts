import { AuditoriaSeguridadLog } from '../../src/core/domain/entities/auditoria-seguridad-log.entity.js';
import {
  AuditoriaSeguridadRepositoryPort,
  FiltrosAuditoria,
} from '../../src/core/ports/auditoria-seguridad-repository.port.js';

export class InMemoryAuditoriaSeguridadRepository implements AuditoriaSeguridadRepositoryPort {
  private items: AuditoriaSeguridadLog[] = [];

  public async registrar(log: AuditoriaSeguridadLog): Promise<void> {
    // Append-only inmutable
    this.items.push(log);
  }

  public async listar(filtros?: FiltrosAuditoria): Promise<{ logs: AuditoriaSeguridadLog[]; total: number }> {
    let result = [...this.items];

    if (filtros?.usuarioId) {
      result = result.filter((item) => item.usuarioId === filtros.usuarioId);
    }

    if (filtros?.accion) {
      result = result.filter((item) => item.accion === filtros.accion);
    }

    if (filtros?.entidad) {
      result = result.filter(
        (item) => item.entidad.toUpperCase() === filtros.entidad!.toUpperCase()
      );
    }

    if (filtros?.entidadId) {
      result = result.filter((item) => item.entidadId === filtros.entidadId);
    }

    if (filtros?.fechaDesde) {
      const desde = new Date(filtros.fechaDesde).getTime();
      result = result.filter((item) => new Date(item.timestamp).getTime() >= desde);
    }

    if (filtros?.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta).getTime();
      result = result.filter((item) => new Date(item.timestamp).getTime() <= hasta);
    }

    // Ordenar de más reciente a más antiguo por defecto
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = result.length;
    const offset = filtros?.offset ?? 0;
    const limit = filtros?.limit ?? 50;

    const paginated = result.slice(offset, offset + limit);

    return {
      logs: paginated,
      total,
    };
  }

  public async obtenerPorId(id: string): Promise<AuditoriaSeguridadLog | null> {
    const found = this.items.find((item) => item.id === id);
    return found ? found : null;
  }

  public obtenerTodos(): AuditoriaSeguridadLog[] {
    return [...this.items];
  }

  public limpiar(): void {
    this.items = [];
  }
}
