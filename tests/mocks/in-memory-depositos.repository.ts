import { DepositoAlmacenamiento } from '../../src/core/domain/entities/deposito-almacenamiento.entity.js';
import {
  DepositosRepositoryPort,
  FiltrosListarDepositos,
} from '../../src/core/ports/depositos-repository.port.js';

export class InMemoryDepositosRepository implements DepositosRepositoryPort {
  private depositos: Map<string, DepositoAlmacenamiento> = new Map();

  async guardar(deposito: DepositoAlmacenamiento): Promise<void> {
    this.depositos.set(deposito.id, deposito);
  }

  async buscarPorId(id: string): Promise<DepositoAlmacenamiento | null> {
    return this.depositos.get(id) ?? null;
  }

  async listarPorFinca(fincaId: string, activo?: boolean): Promise<DepositoAlmacenamiento[]> {
    return Array.from(this.depositos.values()).filter(
      (d) => d.fincaId === fincaId && (activo === undefined || d.activo === activo)
    );
  }

  async listar(filtros?: FiltrosListarDepositos): Promise<DepositoAlmacenamiento[]> {
    let items = Array.from(this.depositos.values());

    if (filtros) {
      if (filtros.fincaId) {
        items = items.filter((d) => d.fincaId === filtros.fincaId);
      }
      if (filtros.tipoPermitido) {
        items = items.filter((d) => d.tipoPermitido === filtros.tipoPermitido);
      }
      if (filtros.activo !== undefined) {
        items = items.filter((d) => d.activo === filtros.activo);
      }
    }

    return items;
  }
}
