import {
  StockMovimiento,
  StockInsuficienteSinJustificacionError,
  StockReservadoComprometidoError,
  MovimientoYaRevertidoError,
  EntidadNoEncontradaError,
} from '../../core/domain/index.js';
import { StockMovimientosRepositoryPort } from '../../core/ports/stock-movimientos-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import {
  RegistrarMovimientoStockDTO,
  RevertirMovimientoStockDTO,
  AjustarMovimientoAplicacionDTO,
  ListarMovimientosStockFiltrosDTO,
  StockMovimientoResponseDTO,
  SaldoInsumoResponseDTO,
} from '../dtos/stock-movimientos.dto.js';

/**
 * Calcula el stock reservado de un insumo sumando las cantidades previstas en
 * actividades agrícolas con estado PLANIFICADA (RF-M9-18 / RN-13).
 */
export async function calcularStockReservado(
  insumoId: string,
  actividadesRepo?: ActividadesRepositoryPort,
  aplicacionesRepo?: AplicacionesRepositoryPort
): Promise<number> {
  let stockReservado = 0;
  if (!actividadesRepo) {
    return 0;
  }

  // 1. Insumos previstos directamente en la tabla/entidad de actividades PLANIFICADA
  const actividadesPlanificadas = await actividadesRepo.listar({ estado: 'PLANIFICADA' });
  const planificadasMap = new Map(actividadesPlanificadas.map(a => [a.id, a]));

  for (const act of actividadesPlanificadas) {
    if (act.insumos && act.insumos.length > 0) {
      for (const ins of act.insumos) {
        if (ins.insumoId === insumoId) {
          stockReservado += ins.cantidad;
        }
      }
    }
  }

  // 2. Líneas de insumos en aplicaciones asociadas a actividades PLANIFICADA
  if (aplicacionesRepo) {
    const apps = await aplicacionesRepo.listar({ insumoId });
    for (const app of apps) {
      const act = planificadasMap.get(app.actividadId);
      if (act && act.estado === 'PLANIFICADA') {
        const yaContadoEnActividad = act.insumos?.some(i => i.insumoId === insumoId);
        if (!yaContadoEnActividad) {
          for (const linea of app.lineas) {
            if (linea.insumoId === insumoId) {
              stockReservado += linea.cantidadTotal;
            }
          }
        }
      }
    }
  }

  return Number(stockReservado.toFixed(4));
}

export class RegistrarMovimientoStockUseCase {
  constructor(
    private readonly stockRepo: StockMovimientosRepositoryPort,
    private readonly actividadesRepo?: ActividadesRepositoryPort,
    private readonly aplicacionesRepo?: AplicacionesRepositoryPort
  ) {}

  public async execute(dto: RegistrarMovimientoStockDTO): Promise<StockMovimientoResponseDTO> {
    // Protección contra dobles descuentos mediante clave de idempotencia (RN-11 / RF-M9-06)
    const existente = await this.stockRepo.buscarPorClaveIdempotencia(dto.claveIdempotencia);
    if (existente) {
      return existente.toJSON();
    }

    let esSaldoNegativo = false;

    // Regla RF-M9-15 y RF-M9-18: Si la salida excede el stock físico o compromete stock reservado
    if (StockMovimiento.esTipoEgreso(dto.tipoMovimiento)) {
      const { saldo } = await this.stockRepo.obtenerSaldoActual(dto.insumoId, dto.depositoId);
      const stockReservado = await calcularStockReservado(dto.insumoId, this.actividadesRepo, this.aplicacionesRepo);
      const stockDisponible = Number((saldo - stockReservado).toFixed(4));

      // Caso 1: Saldo físico insuficiente (RF-M9-15)
      if (saldo < dto.cantidad) {
        esSaldoNegativo = true;
        if (!dto.motivoJustificacion || dto.motivoJustificacion.trim().length === 0) {
          throw new StockInsuficienteSinJustificacionError(
            `El stock disponible (${saldo} ${dto.unidadMedida}) es insuficiente para el egreso solicitado (${dto.cantidad} ${dto.unidadMedida}). Se requiere justificación explícita para registrar saldo negativo (RF-M9-15).`
          );
        }
      }
      // Caso 2: Saldo físico suficiente pero compromete el stock reservado para actividades planificadas (RF-M9-18 / RN-13)
      else if (stockDisponible < dto.cantidad) {
        if (!dto.motivoJustificacion || dto.motivoJustificacion.trim().length === 0) {
          throw new StockReservadoComprometidoError(
            `El stock disponible (${stockDisponible} ${dto.unidadMedida}) es insuficiente para el egreso solicitado (${dto.cantidad} ${dto.unidadMedida}) debido a que ${stockReservado} ${dto.unidadMedida} se encuentran comprometidos/reservados para actividades planificadas (RF-M9-18). Se requiere justificación explícita para disponer del stock reservado.`
          );
        }
      }
    }

    const movimiento = StockMovimiento.crear({
      insumoId: dto.insumoId,
      depositoId: dto.depositoId,
      loteFabricacion: dto.loteFabricacion,
      tipoMovimiento: dto.tipoMovimiento,
      cantidad: dto.cantidad,
      unidadMedida: dto.unidadMedida,
      fecha: dto.fecha,
      usuarioId: dto.usuarioId,
      referenciaTipo: dto.referenciaTipo,
      referenciaId: dto.referenciaId,
      claveIdempotencia: dto.claveIdempotencia,
      esSaldoNegativo,
      motivoJustificacion: dto.motivoJustificacion,
      esEnvaseAbierto: dto.esEnvaseAbierto,
    });

    const guardado = await this.stockRepo.guardar(movimiento);
    return guardado.toJSON();
  }
}

export class RevertirMovimientoStockUseCase {
  constructor(private readonly stockRepo: StockMovimientosRepositoryPort) {}

  public async execute(dto: RevertirMovimientoStockDTO): Promise<StockMovimientoResponseDTO> {
    // Idempotencia
    const existente = await this.stockRepo.buscarPorClaveIdempotencia(dto.claveIdempotencia);
    if (existente) {
      return existente.toJSON();
    }

    const original = await this.stockRepo.buscarPorId(dto.movimientoId);
    if (!original) {
      throw new EntidadNoEncontradaError('MovimientoStock', dto.movimientoId);
    }

    // Regla RF-M9-07: Comprobar que no haya sido revertido previamente
    const yaRevertido = await this.stockRepo.buscarPorMovimientoRevertidoId(dto.movimientoId);
    if (yaRevertido) {
      throw new MovimientoYaRevertidoError(dto.movimientoId);
    }

    const reversion = StockMovimiento.crear({
      insumoId: original.insumoId,
      depositoId: original.depositoId,
      loteFabricacion: original.loteFabricacion,
      tipoMovimiento: 'REVERSION',
      cantidad: original.cantidad,
      unidadMedida: original.unidadMedida,
      usuarioId: dto.usuarioId,
      referenciaTipo: 'REVERSION_MOVIMIENTO',
      referenciaId: original.id,
      claveIdempotencia: dto.claveIdempotencia,
      motivoJustificacion: dto.motivo,
      movimientoRevertidoId: original.id,
      esEnvaseAbierto: false,
    });

    const guardado = await this.stockRepo.guardar(reversion);
    return guardado.toJSON();
  }
}

export class AjustarMovimientoAplicacionUseCase {
  constructor(
    private readonly stockRepo: StockMovimientosRepositoryPort,
    private readonly revertirUseCase: RevertirMovimientoStockUseCase,
    private readonly registrarUseCase: RegistrarMovimientoStockUseCase
  ) {}

  public async execute(dto: AjustarMovimientoAplicacionDTO): Promise<{
    reversion: StockMovimientoResponseDTO;
    nuevoMovimiento: StockMovimientoResponseDTO;
  }> {
    const original = await this.stockRepo.buscarPorId(dto.movimientoAnteriorId);
    if (!original) {
      throw new EntidadNoEncontradaError('MovimientoStock', dto.movimientoAnteriorId);
    }

    // 1. Revertir movimiento anterior
    const claveReversion = `rev-${dto.claveIdempotencia}-${dto.movimientoAnteriorId}`;
    const reversion = await this.revertirUseCase.execute({
      movimientoId: dto.movimientoAnteriorId,
      usuarioId: dto.usuarioId,
      motivo: `Ajuste de dosis de aplicación: ${dto.motivoJustificacion || 'Corrección de dosificación en campo'}`,
      claveIdempotencia: claveReversion,
    });

    // 2. Insertar nuevo movimiento ajustado
    const nuevoMovimiento = await this.registrarUseCase.execute({
      insumoId: original.insumoId,
      depositoId: original.depositoId,
      loteFabricacion: original.loteFabricacion,
      tipoMovimiento: original.tipoMovimiento,
      cantidad: dto.nuevaCantidad,
      unidadMedida: original.unidadMedida,
      usuarioId: dto.usuarioId,
      referenciaTipo: original.referenciaTipo,
      referenciaId: original.referenciaId,
      claveIdempotencia: dto.claveIdempotencia,
      motivoJustificacion: dto.motivoJustificacion,
    });

    return { reversion, nuevoMovimiento };
  }
}

export class ConsultarSaldoInsumoUseCase {
  constructor(
    private readonly stockRepo: StockMovimientosRepositoryPort,
    private readonly insumosRepo?: InsumosCatalogoRepository,
    private readonly actividadesRepo?: ActividadesRepositoryPort,
    private readonly aplicacionesRepo?: AplicacionesRepositoryPort
  ) {}

  public async execute(insumoId: string, depositoId?: string): Promise<SaldoInsumoResponseDTO> {
    const res = await this.stockRepo.obtenerSaldoActual(insumoId, depositoId);
    const stockReservado = await calcularStockReservado(insumoId, this.actividadesRepo, this.aplicacionesRepo);
    const stockDisponible = Number((res.saldo - stockReservado).toFixed(4));

    let stockMinimoConfigurable: number | null = null;
    if (this.insumosRepo) {
      const insumo = await this.insumosRepo.buscarPorId(insumoId);
      if (insumo && insumo.stockMinimoConfigurable !== undefined && insumo.stockMinimoConfigurable !== null) {
        stockMinimoConfigurable = insumo.stockMinimoConfigurable;
      }
    }

    const enAlertaReposicion = stockMinimoConfigurable !== null && stockDisponible <= stockMinimoConfigurable;

    return {
      insumoId: res.insumoId,
      depositoId: res.depositoId,
      saldo: res.saldo,
      stockFisico: res.saldo,
      stockReservado,
      stockDisponible,
      unidadMedida: res.unidadMedida,
      envasesAbiertos: res.envasesAbiertos,
      totalIngresos: res.totalIngresos,
      totalEgresos: res.totalEgresos,
      esSaldoNegativo: res.saldo < 0,
      stockMinimoConfigurable,
      enAlertaReposicion,
    };
  }
}

export class ListarMovimientosStockUseCase {
  constructor(private readonly stockRepo: StockMovimientosRepositoryPort) {}

  public async execute(filtros?: ListarMovimientosStockFiltrosDTO): Promise<StockMovimientoResponseDTO[]> {
    const items = await this.stockRepo.listar(filtros);
    return items.map(i => i.toJSON());
  }
}
