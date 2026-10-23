import { StockMovimiento } from '../../src/core/domain/entities/stock-movimiento.entity.js';
import {
  FiltrosStockMovimientos,
  SaldoInsumoCalculado,
  StockMovimientosRepositoryPort,
} from '../../src/core/ports/stock-movimientos-repository.port.js';

export class InMemoryStockMovimientosRepository implements StockMovimientosRepositoryPort {
  private items: Map<string, StockMovimiento> = new Map();

  public async guardar(movimiento: StockMovimiento): Promise<StockMovimiento> {
    this.items.set(movimiento.id, movimiento);
    return movimiento;
  }

  public async buscarPorId(id: string): Promise<StockMovimiento | null> {
    const item = this.items.get(id);
    return item ? StockMovimiento.crear(item.toJSON()) : null;
  }

  public async buscarPorClaveIdempotencia(clave: string): Promise<StockMovimiento | null> {
    for (const item of this.items.values()) {
      if (item.claveIdempotencia === clave) {
        return StockMovimiento.crear(item.toJSON());
      }
    }
    return null;
  }

  public async buscarPorMovimientoRevertidoId(movimientoRevertidoId: string): Promise<StockMovimiento | null> {
    for (const item of this.items.values()) {
      if (item.movimientoRevertidoId === movimientoRevertidoId) {
        return StockMovimiento.crear(item.toJSON());
      }
    }
    return null;
  }

  public async obtenerSaldoActual(
    insumoId: string,
    depositoId?: string,
    loteFabricacion?: string
  ): Promise<SaldoInsumoCalculado> {
    let movimientos = Array.from(this.items.values()).filter(m => m.insumoId === insumoId);
    if (depositoId) {
      movimientos = movimientos.filter(m => m.depositoId === depositoId);
    }
    if (loteFabricacion) {
      movimientos = movimientos.filter(m => m.loteFabricacion === loteFabricacion);
    }

    let totalIngresos = 0;
    let totalEgresos = 0;
    let envasesAbiertos = 0;
    let unidadMedida = movimientos[0]?.unidadMedida || 'UNIDAD';

    for (const m of movimientos) {
      if (m.unidadMedida) {
        unidadMedida = m.unidadMedida;
      }
      if (m.esEnvaseAbierto) {
        envasesAbiertos++;
      }

      if (StockMovimiento.esTipoIngreso(m.tipoMovimiento)) {
        totalIngresos += m.cantidad;
      } else if (StockMovimiento.esTipoEgreso(m.tipoMovimiento)) {
        totalEgresos += m.cantidad;
      } else if (m.tipoMovimiento === 'REVERSION') {
        // Un movimiento de reversión compensa el movimiento original
        if (m.movimientoRevertidoId) {
          const original = this.items.get(m.movimientoRevertidoId);
          if (original && StockMovimiento.esTipoEgreso(original.tipoMovimiento)) {
            // Revertir un egreso incrementa el stock
            totalIngresos += m.cantidad;
          } else if (original && StockMovimiento.esTipoIngreso(original.tipoMovimiento)) {
            // Revertir un ingreso disminuye el stock
            totalEgresos += m.cantidad;
          } else {
            // Por defecto reversión compensa como ingreso si vino de aplicación
            totalIngresos += m.cantidad;
          }
        } else {
          totalIngresos += m.cantidad;
        }
      } else if (m.tipoMovimiento === 'AJUSTE_FISICO') {
        if (m.esSaldoNegativo) {
          totalEgresos += m.cantidad;
        } else {
          totalIngresos += m.cantidad;
        }
      }
    }

    const saldo = Number((totalIngresos - totalEgresos).toFixed(4));

    return {
      insumoId,
      depositoId,
      loteFabricacion,
      saldo,
      unidadMedida,
      envasesAbiertos,
      totalIngresos: Number(totalIngresos.toFixed(4)),
      totalEgresos: Number(totalEgresos.toFixed(4)),
    };
  }

  public async listar(filtros?: FiltrosStockMovimientos): Promise<StockMovimiento[]> {
    let result = Array.from(this.items.values());

    if (filtros?.insumoId) {
      result = result.filter(m => m.insumoId === filtros.insumoId);
    }
    if (filtros?.depositoId) {
      result = result.filter(m => m.depositoId === filtros.depositoId);
    }
    if (filtros?.tipoMovimiento) {
      result = result.filter(m => m.tipoMovimiento === filtros.tipoMovimiento);
    }
    if (filtros?.referenciaTipo) {
      result = result.filter(m => m.referenciaTipo === filtros.referenciaTipo);
    }
    if (filtros?.referenciaId) {
      result = result.filter(m => m.referenciaId === filtros.referenciaId);
    }
    if (filtros?.loteFabricacion) {
      result = result.filter(m => m.loteFabricacion === filtros.loteFabricacion);
    }
    if (filtros?.desde) {
      result = result.filter(m => m.fecha >= filtros.desde!);
    }
    if (filtros?.hasta) {
      result = result.filter(m => m.fecha <= filtros.hasta!);
    }

    result.sort((a, b) => b.fecha.localeCompare(a.fecha));

    return result.map(m => StockMovimiento.crear(m.toJSON()));
  }
}
