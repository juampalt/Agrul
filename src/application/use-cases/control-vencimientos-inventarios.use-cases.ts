import crypto from 'node:crypto';
import {
  InventarioFisico,
  StockMovimiento,
  InsumoVencidoError,
  PermisoInsuficienteError,
  EntidadNoEncontradaError,
} from '../../core/domain/index.js';
import { InventariosFisicosRepositoryPort, FiltrosListarInventariosFisicos } from '../../core/ports/inventarios-fisicos-repository.port.js';
import { StockMovimientosRepositoryPort } from '../../core/ports/stock-movimientos-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { IngresosCompraRepositoryPort } from '../../core/ports/ingresos-compra-repository.port.js';
import { StockInicialRepositoryPort } from '../../core/ports/stock-inicial-repository.port.js';
import { UsuariosRepositoryPort } from '../../core/ports/usuarios-repository.port.js';
import {
  SugerirLotesFefoInputDTO,
  SugerirLotesFefoOutputDTO,
  LoteFefoOutputDTO,
  CoberturaLoteSugeridaDTO,
  ValidarLoteInsumoInputDTO,
  ValidarLoteInsumoOutputDTO,
  RegistrarInventarioFisicoInputDTO,
  InventarioFisicoOutputDTO,
  ListarInventariosFisicosQueryDTO,
  RegistrarPerdidaStockInputDTO,
  PerdidaStockOutputDTO,
  ReporteExistenciasValorizadasQueryDTO,
  ReporteExistenciasValorizadasOutputDTO,
  InsumoValorizadoItemDTO,
  LoteExistenciaValorizadaDTO,
  EstadoVencimientoLote,
} from '../dtos/control-vencimientos-inventarios.dto.js';

function calcularDiasDiferencia(fechaObjetivo: string, fechaReferencia: string): number {
  const tObjetivo = new Date(fechaObjetivo).getTime();
  const tRef = new Date(fechaReferencia).getTime();
  return Math.round((tObjetivo - tRef) / (1000 * 60 * 60 * 24));
}

function clasificarEstadoVencimiento(fechaVencimiento: string | null, fechaReferencia: string): {
  esVencido: boolean;
  diasHastaVencimiento: number | null;
  estado: EstadoVencimientoLote;
} {
  if (!fechaVencimiento) {
    return { esVencido: false, diasHastaVencimiento: null, estado: 'VIGENTE' };
  }

  const fechaVencIso = fechaVencimiento.includes('T') ? fechaVencimiento.split('T')[0] : fechaVencimiento;
  const fechaRefIso = fechaReferencia.includes('T') ? fechaReferencia.split('T')[0] : fechaReferencia;
  const dias = calcularDiasDiferencia(fechaVencIso, fechaRefIso);

  if (fechaVencIso < fechaRefIso || dias < 0) {
    return { esVencido: true, diasHastaVencimiento: dias, estado: 'VENCIDO' };
  }
  if (dias <= 30) {
    return { esVencido: false, diasHastaVencimiento: dias, estado: 'POR_VENCER' };
  }
  return { esVencido: false, diasHastaVencimiento: dias, estado: 'VIGENTE' };
}

/**
 * Caso de Uso: Sugerencia de Lotes de Insumo por FEFO (First Expired, First Out - RF-M9-16)
 * Bloquea la sugerencia y selección de lotes cuya fecha de vencimiento ya expiró (RF-M9-10).
 */
export class SugerirLotesFefoUseCase {
  constructor(
    private readonly insumosRepo: InsumosCatalogoRepository,
    private readonly ingresosCompraRepo: IngresosCompraRepositoryPort,
    private readonly stockMovimientosRepo: StockMovimientosRepositoryPort,
    private readonly stockInicialRepo?: StockInicialRepositoryPort,
  ) {}

  public async execute(input: SugerirLotesFefoInputDTO): Promise<SugerirLotesFefoOutputDTO> {
    const insumo = await this.insumosRepo.buscarPorId(input.insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', input.insumoId);
    }

    const fechaRef = input.fechaReferencia
      ? (input.fechaReferencia.includes('T') ? input.fechaReferencia.split('T')[0] : input.fechaReferencia)
      : new Date().toISOString().slice(0, 10);

    // 1. Obtener todos los ingresos de compra y stocks iniciales para identificar lotes y vencimientos
    const compras = await this.ingresosCompraRepo.listar({
      insumoId: input.insumoId,
      depositoId: input.depositoId,
    });

    const iniciales = this.stockInicialRepo
      ? await this.stockInicialRepo.listar({
          insumoId: input.insumoId,
          depositoId: input.depositoId,
        })
      : [];

    // Mapear metadatos por loteFabricacion (fechaVencimiento, depositoId, precioUnitario, unidadMedida)
    const lotesMetaMap = new Map<string, {
      depositoId: string;
      fechaVencimiento: string | null;
      unidadMedida: string;
      precioUnitarioCompra?: number | null;
      cantidadOriginal: number;
    }>();

    for (const c of compras) {
      const lote = c.loteFabricacion.trim();
      const existing = lotesMetaMap.get(lote);
      if (!existing) {
        lotesMetaMap.set(lote, {
          depositoId: c.depositoId,
          fechaVencimiento: c.fechaVencimiento,
          unidadMedida: c.unidadMedida,
          precioUnitarioCompra: c.precioUnitarioCompra,
          cantidadOriginal: c.cantidad,
        });
      } else {
        existing.cantidadOriginal += c.cantidad;
        if (!existing.fechaVencimiento && c.fechaVencimiento) {
          existing.fechaVencimiento = c.fechaVencimiento;
        }
      }
    }

    for (const init of iniciales) {
      const lote = init.loteFabricacion.trim();
      const existing = lotesMetaMap.get(lote);
      if (!existing) {
        lotesMetaMap.set(lote, {
          depositoId: init.depositoId,
          fechaVencimiento: init.fechaVencimiento,
          unidadMedida: init.unidadMedida,
          precioUnitarioCompra: null,
          cantidadOriginal: init.cantidad,
        });
      } else {
        existing.cantidadOriginal += init.cantidad;
        if (!existing.fechaVencimiento && init.fechaVencimiento) {
          existing.fechaVencimiento = init.fechaVencimiento;
        }
      }
    }

    // También inspeccionar movimientos en stock_movimientos para capturar cualquier lote registrado directamente
    const movimientos = await this.stockMovimientosRepo.listar({
      insumoId: input.insumoId,
      depositoId: input.depositoId,
    });

    for (const m of movimientos) {
      if (m.loteFabricacion) {
        const lote = m.loteFabricacion.trim();
        if (!lotesMetaMap.has(lote)) {
          lotesMetaMap.set(lote, {
            depositoId: m.depositoId,
            fechaVencimiento: m.fechaVencimiento,
            unidadMedida: m.unidadMedida,
            precioUnitarioCompra: null,
            cantidadOriginal: m.cantidad,
          });
        } else {
          const meta = lotesMetaMap.get(lote)!;
          if (!meta.fechaVencimiento && m.fechaVencimiento) {
            meta.fechaVencimiento = m.fechaVencimiento;
          }
        }
      }
    }

    // 2. Calcular existencia actual y evaluar vencimiento para cada lote
    const lotesEvaluados: LoteFefoOutputDTO[] = [];

    for (const [loteFabricacion, meta] of lotesMetaMap.entries()) {
      // Consultar saldo actual en stock ledger para ese lote
      const saldoInfo = await this.stockMovimientosRepo.obtenerSaldoActual(
        input.insumoId,
        input.depositoId,
        loteFabricacion
      );

      // Si hay movimientos en ledger se usa saldoInfo.saldo; si no hubo movimientos de ledger aún, se usa cantidadOriginal
      const huboMovimientosLote = movimientos.some(m => m.loteFabricacion === loteFabricacion);
      const saldoActual = huboMovimientosLote ? saldoInfo.saldo : meta.cantidadOriginal;

      if (saldoActual > 0) {
        const { esVencido, diasHastaVencimiento, estado } = clasificarEstadoVencimiento(
          meta.fechaVencimiento,
          fechaRef
        );

        lotesEvaluados.push({
          loteFabricacion,
          depositoId: meta.depositoId,
          cantidadDisponible: saldoActual,
          unidadMedida: meta.unidadMedida || insumo.unidadMedidaId,
          fechaVencimiento: meta.fechaVencimiento,
          diasHastaVencimiento,
          esVencido,
          estadoVencimiento: estado,
          precioUnitarioCompra: meta.precioUnitarioCompra,
        });
      }
    }

    // 3. Separar lotes disponibles no vencidos de los lotes vencidos bloqueados (RF-M9-10)
    const lotesDisponibles = lotesEvaluados.filter(l => !l.esVencido);
    const lotesVencidosBloqueados = lotesEvaluados.filter(l => l.esVencido);

    // 4. Ordenar lotes disponibles bajo algoritmo FEFO (el más próximo a vencer primero)
    lotesDisponibles.sort((a, b) => {
      if (a.fechaVencimiento && b.fechaVencimiento) {
        return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
      }
      if (a.fechaVencimiento && !b.fechaVencimiento) return -1;
      if (!a.fechaVencimiento && b.fechaVencimiento) return 1;
      return a.loteFabricacion.localeCompare(b.loteFabricacion);
    });

    // Lote principal sugerido: el primero de la lista FEFO disponible
    const loteSugerido = lotesDisponibles[0] ?? null;

    const totalStockDisponible = Number(
      lotesDisponibles.reduce((sum, l) => sum + l.cantidadDisponible, 0).toFixed(4)
    );
    const totalStockVencido = Number(
      lotesVencidosBloqueados.reduce((sum, l) => sum + l.cantidadDisponible, 0).toFixed(4)
    );

    // 5. Cobertura simulada si se requirió una cantidad específica
    let coberturaSugerida: CoberturaLoteSugeridaDTO[] | undefined;
    let cubiertoTotalmente: boolean | undefined;
    let cantidadFaltante: number | undefined;

    if (input.cantidadRequerida !== undefined && input.cantidadRequerida > 0) {
      coberturaSugerida = [];
      let remanente = input.cantidadRequerida;

      for (const lote of lotesDisponibles) {
        if (remanente <= 0) break;
        const aConsumir = Number(Math.min(lote.cantidadDisponible, remanente).toFixed(4));
        coberturaSugerida.push({
          loteFabricacion: lote.loteFabricacion,
          depositoId: lote.depositoId,
          cantidadASacar: aConsumir,
          fechaVencimiento: lote.fechaVencimiento,
        });
        remanente = Number((remanente - aConsumir).toFixed(4));
      }

      cubiertoTotalmente = remanente <= 0.0001;
      cantidadFaltante = cubiertoTotalmente ? 0 : Number(remanente.toFixed(4));
    }

    return {
      insumoId: insumo.id,
      insumoNombre: insumo.nombreComercial,
      unidadMedida: insumo.unidadMedidaId,
      loteSugerido,
      lotesDisponibles,
      lotesVencidosBloqueados,
      totalStockDisponible,
      totalStockVencido,
      coberturaSugerida,
      cubiertoTotalmente,
      cantidadFaltante,
    };
  }
}

/**
 * Caso de Uso: Validar Lote de Insumo para Aplicación en Campo (RF-M9-10)
 * Bloquea la selección de lotes cuya fecha de vencimiento ya expiró arrojando InsumoVencidoError.
 */
export class ValidarLoteInsumoUseCase {
  constructor(
    private readonly ingresosCompraRepo: IngresosCompraRepositoryPort,
    private readonly stockMovimientosRepo: StockMovimientosRepositoryPort,
    private readonly stockInicialRepo?: StockInicialRepositoryPort,
  ) {}

  public async execute(input: ValidarLoteInsumoInputDTO): Promise<ValidarLoteInsumoOutputDTO> {
    const fechaRef = input.fechaReferencia
      ? (input.fechaReferencia.includes('T') ? input.fechaReferencia.split('T')[0] : input.fechaReferencia)
      : new Date().toISOString().slice(0, 10);

    // Buscar vencimiento en compras
    const compras = await this.ingresosCompraRepo.listar({
      insumoId: input.insumoId,
      loteFabricacion: input.loteFabricacion,
    });

    let fechaVencimiento: string | null = compras[0]?.fechaVencimiento ?? null;

    if (!fechaVencimiento && this.stockInicialRepo) {
      const iniciales = await this.stockInicialRepo.listar({ insumoId: input.insumoId });
      const initLote = iniciales.find(i => i.loteFabricacion === input.loteFabricacion);
      if (initLote?.fechaVencimiento) {
        fechaVencimiento = initLote.fechaVencimiento;
      }
    }

    if (!fechaVencimiento) {
      const movs = await this.stockMovimientosRepo.listar({
        insumoId: input.insumoId,
        loteFabricacion: input.loteFabricacion,
      });
      const movConVenc = movs.find(m => m.fechaVencimiento);
      if (movConVenc?.fechaVencimiento) {
        fechaVencimiento = movConVenc.fechaVencimiento;
      }
    }

    const { esVencido, diasHastaVencimiento, estado } = clasificarEstadoVencimiento(
      fechaVencimiento,
      fechaRef
    );

    const saldoInfo = await this.stockMovimientosRepo.obtenerSaldoActual(
      input.insumoId,
      undefined,
      input.loteFabricacion
    );

    return {
      insumoId: input.insumoId,
      loteFabricacion: input.loteFabricacion,
      fechaVencimiento,
      esVencido,
      diasHastaVencimiento,
      estadoVencimiento: estado,
      saldoDisponible: saldoInfo.saldo,
      aptoParaAplicacion: !esVencido && saldoInfo.saldo > 0,
    };
  }

  public async validarAptitudOArrojar(input: ValidarLoteInsumoInputDTO): Promise<void> {
    const res = await this.execute(input);
    if (res.esVencido) {
      throw new InsumoVencidoError(input.insumoId, input.loteFabricacion, res.fechaVencimiento);
    }
  }
}

/**
 * Caso de Uso: Registrar Inventario Físico y Ajuste por Diferencia (RF-M9-11)
 * Audita recuento físico y genera movimiento transaccional AJUSTE_FISICO con motivo.
 * Exige perfil ADMINISTRADOR o ENCARGADO.
 */
export class RegistrarInventarioFisicoUseCase {
  constructor(
    private readonly inventariosRepo: InventariosFisicosRepositoryPort,
    private readonly stockMovimientosRepo: StockMovimientosRepositoryPort,
    private readonly usuariosRepo?: UsuariosRepositoryPort,
  ) {}

  public async execute(input: RegistrarInventarioFisicoInputDTO): Promise<InventarioFisicoOutputDTO> {
    // 1. Auditoría de Permisos RBAC: Exclusivo Encargado o Administrador (RF-M9-11)
    if (this.usuariosRepo) {
      const usuario = await this.usuariosRepo.buscarPorId(input.usuarioId);
      if (!usuario) {
        throw new EntidadNoEncontradaError('Usuario', input.usuarioId);
      }
      if (usuario.perfil !== 'ADMINISTRADOR' && usuario.perfil !== 'ENCARGADO') {
        throw new PermisoInsuficienteError(
          'Solo usuarios con rol ADMINISTRADOR o ENCARGADO pueden auditar y registrar inventarios físicos (RF-M9-11).'
        );
      }
    }

    // 2. Idempotencia en inventario físico (RN-11 / RF-M9-06)
    const existente = await this.inventariosRepo.buscarPorClaveIdempotencia(input.claveIdempotencia);
    if (existente) {
      return existente.toJSON();
    }

    // 3. Obtener saldo teórico del sistema
    const saldoSistemaCalculado = await this.stockMovimientosRepo.obtenerSaldoActual(
      input.insumoId,
      input.depositoId,
      input.loteFabricacion || undefined
    );
    const cantidadSistema = saldoSistemaCalculado.saldo;

    // 4. Calcular diferencia (conteo físico - sistema)
    const diferencia = Number((input.cantidadFisica - cantidadSistema).toFixed(4));
    let movimientoStockId: string | null = null;

    // 5. Si hay diferencia, generar movimiento AJUSTE_FISICO con motivo (RF-M9-11)
    if (Math.abs(diferencia) > 0.0001) {
      const esFaltante = diferencia < 0;
      const cantidadAjuste = Number(Math.abs(diferencia).toFixed(4));

      const motivoAjuste = `[AJUSTE_FISICO_${esFaltante ? 'FALTANTE' : 'SOBRANTE'}] ${input.motivo} (Teórico: ${cantidadSistema} ${input.unidadMedida}, Físico: ${input.cantidadFisica} ${input.unidadMedida}, Dif: ${diferencia > 0 ? '+' : ''}${diferencia} ${input.unidadMedida})`;

      const movimientoAjuste = StockMovimiento.crear({
        insumoId: input.insumoId,
        depositoId: input.depositoId,
        loteFabricacion: input.loteFabricacion,
        tipoMovimiento: 'AJUSTE_FISICO',
        cantidad: cantidadAjuste,
        unidadMedida: input.unidadMedida,
        usuarioId: input.usuarioId,
        fecha: input.fecha,
        referenciaTipo: 'INVENTARIO_FISICO',
        referenciaId: `inv-${input.claveIdempotencia}`,
        claveIdempotencia: input.claveIdempotencia,
        esSaldoNegativo: esFaltante,
        motivoJustificacion: motivoAjuste,
      });

      const guardadoMov = await this.stockMovimientosRepo.guardar(movimientoAjuste);
      movimientoStockId = guardadoMov.id;
    }

    // 6. Persistir el registro de Inventario Físico Auditado
    const inventario = InventarioFisico.crear({
      insumoId: input.insumoId,
      depositoId: input.depositoId,
      loteFabricacion: input.loteFabricacion,
      cantidadSistema,
      cantidadFisica: input.cantidadFisica,
      diferencia,
      unidadMedida: input.unidadMedida,
      motivo: input.motivo,
      usuarioId: input.usuarioId,
      movimientoStockId,
      claveIdempotencia: input.claveIdempotencia,
      fecha: input.fecha,
    });

    const guardadoInv = await this.inventariosRepo.guardar(inventario);
    return guardadoInv.toJSON();
  }
}

/**
 * Caso de Uso: Listar Inventarios Físicos Registrados
 */
export class ListarInventariosFisicosUseCase {
  constructor(private readonly inventariosRepo: InventariosFisicosRepositoryPort) {}

  public async execute(filtros?: ListarInventariosFisicosQueryDTO): Promise<InventarioFisicoOutputDTO[]> {
    const list = await this.inventariosRepo.listar(filtros);
    return list.map(i => i.toJSON());
  }
}

/**
 * Caso de Uso: Registrar Mermas y Pérdidas de Insumos (RF-M9-12)
 * Registra roturas, derrames, robos o vencimientos con motivo explícito generando movimiento PERDIDA.
 */
export class RegistrarPerdidaStockUseCase {
  constructor(private readonly stockMovimientosRepo: StockMovimientosRepositoryPort) {}

  public async execute(input: RegistrarPerdidaStockInputDTO): Promise<PerdidaStockOutputDTO> {
    // Idempotencia
    const existente = await this.stockMovimientosRepo.buscarPorClaveIdempotencia(input.claveIdempotencia);
    if (existente) {
      return {
        id: existente.id,
        insumoId: existente.insumoId,
        depositoId: existente.depositoId,
        loteFabricacion: existente.loteFabricacion,
        cantidad: existente.cantidad,
        unidadMedida: existente.unidadMedida,
        tipoPerdida: input.tipoPerdida,
        motivo: existente.motivoJustificacion || input.motivo,
        usuarioId: existente.usuarioId,
        claveIdempotencia: existente.claveIdempotencia,
        movimientoId: existente.id,
        fecha: existente.fecha,
        creadoEn: existente.creadoEn,
      };
    }

    const { saldo } = await this.stockMovimientosRepo.obtenerSaldoActual(
      input.insumoId,
      input.depositoId,
      input.loteFabricacion || undefined
    );

    const esSaldoNegativo = saldo < input.cantidad;
    const motivoFormateado = `[PERDIDA_${input.tipoPerdida}] ${input.motivo}`;

    const movimiento = StockMovimiento.crear({
      insumoId: input.insumoId,
      depositoId: input.depositoId,
      loteFabricacion: input.loteFabricacion,
      tipoMovimiento: 'PERDIDA',
      cantidad: input.cantidad,
      unidadMedida: input.unidadMedida,
      usuarioId: input.usuarioId,
      fecha: input.fecha,
      referenciaTipo: 'REGISTRO_PERDIDA',
      referenciaId: input.tipoPerdida,
      claveIdempotencia: input.claveIdempotencia,
      esSaldoNegativo,
      motivoJustificacion: motivoFormateado,
    });

    const guardado = await this.stockMovimientosRepo.guardar(movimiento);

    return {
      id: guardado.id,
      insumoId: guardado.insumoId,
      depositoId: guardado.depositoId,
      loteFabricacion: guardado.loteFabricacion,
      cantidad: guardado.cantidad,
      unidadMedida: guardado.unidadMedida,
      tipoPerdida: input.tipoPerdida,
      motivo: input.motivo,
      usuarioId: guardado.usuarioId,
      claveIdempotencia: guardado.claveIdempotencia,
      movimientoId: guardado.id,
      fecha: guardado.fecha,
      creadoEn: guardado.creadoEn,
    };
  }
}

/**
 * Caso de Uso: Reporte de Existencias Valorizadas según Precio Promedio Ponderado (RF-M9-20)
 * Computa el inventario valorizado por insumo y por lote según PPP de compras registradas.
 */
export class ReporteExistenciasValorizadasUseCase {
  constructor(
    private readonly insumosRepo: InsumosCatalogoRepository,
    private readonly ingresosCompraRepo: IngresosCompraRepositoryPort,
    private readonly stockMovimientosRepo: StockMovimientosRepositoryPort,
    private readonly stockInicialRepo?: StockInicialRepositoryPort,
  ) {}

  public async execute(
    query?: ReporteExistenciasValorizadasQueryDTO
  ): Promise<ReporteExistenciasValorizadasOutputDTO> {
    const fechaEmision = new Date().toISOString();
    let insumos = await this.insumosRepo.listar();

    if (query?.insumoId) {
      insumos = insumos.filter(i => i.id === query.insumoId);
    }
    if (query?.categoria) {
      insumos = insumos.filter(i => i.categoria === query.categoria);
    }

    const items: InsumoValorizadoItemDTO[] = [];
    const fechaRef = fechaEmision.slice(0, 10);

    for (const insumo of insumos) {
      // 1. Obtener compras registradas para calcular Precio Promedio Ponderado (PPP)
      const compras = await this.ingresosCompraRepo.listar({
        insumoId: insumo.id,
        depositoId: query?.depositoId,
      });

      let sumaImportes = 0;
      let sumaCantidades = 0;
      const preciosLoteMap = new Map<string, { precio: number; fechaVenc: string | null; depositoId: string }>();

      for (const c of compras) {
        if (c.precioUnitarioCompra && c.precioUnitarioCompra > 0) {
          sumaImportes += c.cantidad * c.precioUnitarioCompra;
          sumaCantidades += c.cantidad;
        }
        if (c.loteFabricacion) {
          preciosLoteMap.set(c.loteFabricacion.trim(), {
            precio: c.precioUnitarioCompra || 0,
            fechaVenc: c.fechaVencimiento || null,
            depositoId: c.depositoId,
          });
        }
      }

      const precioPromedioPonderado = sumaCantidades > 0
        ? Number((sumaImportes / sumaCantidades).toFixed(4))
        : 0;

      // 2. Obtener saldo actual total del insumo en el depósito o general
      const saldoCalculado = await this.stockMovimientosRepo.obtenerSaldoActual(
        insumo.id,
        query?.depositoId
      );

      // Si no hubo movimientos en el ledger pero sí ingresos de compra, sumar las compras
      const saldoStock = saldoCalculado.totalIngresos > 0 || saldoCalculado.totalEgresos > 0
        ? saldoCalculado.saldo
        : Number(compras.reduce((sum, c) => sum + c.cantidad, 0).toFixed(4));

      const valorTotal = Number((Math.max(0, saldoStock) * precioPromedioPonderado).toFixed(2));

      // 3. Desglose valorizado por lotes
      const lotesList: LoteExistenciaValorizadaDTO[] = [];
      const lotesVisitados = new Set<string>();

      for (const [loteFabricacion, meta] of preciosLoteMap.entries()) {
        lotesVisitados.add(loteFabricacion);
        const saldoLoteInfo = await this.stockMovimientosRepo.obtenerSaldoActual(
          insumo.id,
          query?.depositoId,
          loteFabricacion
        );

        const saldoLote = saldoLoteInfo.totalIngresos > 0 || saldoLoteInfo.totalEgresos > 0
          ? saldoLoteInfo.saldo
          : Number(compras.filter(c => c.loteFabricacion === loteFabricacion).reduce((s, c) => s + c.cantidad, 0).toFixed(4));

        if (saldoLote > 0) {
          const precioLote = meta.precio > 0 ? meta.precio : precioPromedioPonderado;
          const valorTotalLote = Number((saldoLote * precioLote).toFixed(2));
          const { estado } = clasificarEstadoVencimiento(meta.fechaVenc, fechaRef);

          lotesList.push({
            loteFabricacion,
            depositoId: meta.depositoId,
            saldo: saldoLote,
            unidadMedida: insumo.unidadMedidaId,
            fechaVencimiento: meta.fechaVenc,
            estadoVencimiento: estado,
            precioUnitarioCompra: precioLote,
            valorTotalLote,
          });
        }
      }

      items.push({
        insumoId: insumo.id,
        nombreComercial: insumo.nombreComercial,
        categoria: insumo.categoria,
        unidadMedida: insumo.unidadMedidaId,
        saldoStock,
        precioPromedioPonderado,
        valorTotal,
        lotes: lotesList,
      });
    }

    const totalExistenciasValorizadas = Number(
      items.reduce((sum, item) => sum + item.valorTotal, 0).toFixed(2)
    );
    const totalCantidadStock = Number(
      items.reduce((sum, item) => sum + Math.max(0, item.saldoStock), 0).toFixed(4)
    );

    return {
      fechaEmision,
      moneda: 'ARS',
      totalExistenciasValorizadas,
      totalInsumos: items.length,
      totalCantidadStock,
      items,
    };
  }
}
