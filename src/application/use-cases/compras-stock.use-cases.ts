import crypto from 'node:crypto';
import { IngresoCompraInsumo } from '../../core/domain/entities/ingreso-compra-insumo.entity.js';
import { StockInicialInsumo } from '../../core/domain/entities/stock-inicial-insumo.entity.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { IngresosCompraRepositoryPort } from '../../core/ports/ingresos-compra-repository.port.js';
import { StockInicialRepositoryPort } from '../../core/ports/stock-inicial-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { ProveedoresRepositoryPort } from '../../core/ports/proveedores-repository.port.js';
import { DepositosRepositoryPort } from '../../core/ports/depositos-repository.port.js';
import {
  RegistrarIngresoCompraInputDTO,
  IngresoCompraOutputDTO,
  CargarStockInicialInputDTO,
  StockInicialOutputDTO,
  ListarIngresosCompraQueryDTO,
} from '../dtos/compras-stock.dto.js';

function toIngresoOutputDTO(i: IngresoCompraInsumo): IngresoCompraOutputDTO {
  return {
    id: i.id,
    insumoId: i.insumoId,
    proveedorId: i.proveedorId,
    depositoId: i.depositoId,
    cantidad: i.cantidad,
    unidadMedida: i.unidadMedida,
    loteFabricacion: i.loteFabricacion,
    fechaVencimiento: i.fechaVencimiento,
    nroFacturaRemito: i.nroFacturaRemito,
    fechaIngreso: i.fechaIngreso,
    precioUnitarioCompra: i.precioUnitarioCompra,
    comprobanteAdjuntoUrl: i.comprobanteAdjuntoUrl,
    observaciones: i.observaciones,
    usuarioCargaId: i.usuarioCargaId,
    creadoEn: i.creadoEn,
    actualizadoEn: i.actualizadoEn,
  };
}

function toStockInicialOutputDTO(s: StockInicialInsumo): StockInicialOutputDTO {
  return {
    id: s.id,
    insumoId: s.insumoId,
    depositoId: s.depositoId,
    cantidad: s.cantidad,
    unidadMedida: s.unidadMedida,
    loteFabricacion: s.loteFabricacion,
    fechaVencimiento: s.fechaVencimiento,
    motivo: s.motivo,
    usuarioCargaId: s.usuarioCargaId,
    fecha: s.fecha,
    creadoEn: s.creadoEn,
  };
}

export class RegistrarIngresoCompraUseCase {
  constructor(
    private readonly ingresosRepo: IngresosCompraRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
    private readonly proveedoresRepo: ProveedoresRepositoryPort,
    private readonly depositosRepo: DepositosRepositoryPort
  ) {}

  async execute(input: RegistrarIngresoCompraInputDTO): Promise<IngresoCompraOutputDTO> {
    const insumo = await this.insumosRepo.buscarPorId(input.insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', input.insumoId);
    }

    const proveedor = await this.proveedoresRepo.buscarPorId(input.proveedorId);
    if (!proveedor) {
      throw new EntidadNoEncontradaError('Proveedor', input.proveedorId);
    }

    const deposito = await this.depositosRepo.buscarPorId(input.depositoId);
    if (!deposito) {
      throw new EntidadNoEncontradaError('Depósito', input.depositoId);
    }

    // Regla RF-M9-19: Validación de segregación física de depósito según Buenas Prácticas Agrícolas (BPA)
    const fechaRef = input.fechaIngreso ?? new Date().toISOString().slice(0, 10);
    const esVencido = input.fechaVencimiento < fechaRef;
    deposito.validarCompatibilidadBpa(insumo.categoria, esVencido);

    const ingreso = IngresoCompraInsumo.crear({
      id: input.id ?? crypto.randomUUID(),
      insumoId: input.insumoId,
      proveedorId: input.proveedorId,
      depositoId: input.depositoId,
      cantidad: input.cantidad,
      unidadMedida: input.unidadMedida,
      loteFabricacion: input.loteFabricacion,
      fechaVencimiento: input.fechaVencimiento,
      nroFacturaRemito: input.nroFacturaRemito,
      fechaIngreso: input.fechaIngreso,
      precioUnitarioCompra: input.precioUnitarioCompra,
      comprobanteAdjuntoUrl: input.comprobanteAdjuntoUrl,
      observaciones: input.observaciones,
      usuarioCargaId: input.usuarioCargaId,
    });

    await this.ingresosRepo.guardar(ingreso);

    return toIngresoOutputDTO(ingreso);
  }
}

export class CargarStockInicialUseCase {
  constructor(
    private readonly stockInicialRepo: StockInicialRepositoryPort,
    private readonly insumosRepo: InsumosCatalogoRepository,
    private readonly depositosRepo: DepositosRepositoryPort
  ) {}

  async execute(input: CargarStockInicialInputDTO): Promise<StockInicialOutputDTO> {
    const insumo = await this.insumosRepo.buscarPorId(input.insumoId);
    if (!insumo) {
      throw new EntidadNoEncontradaError('Insumo', input.insumoId);
    }

    const deposito = await this.depositosRepo.buscarPorId(input.depositoId);
    if (!deposito) {
      throw new EntidadNoEncontradaError('Depósito', input.depositoId);
    }

    // Validación BPA de segregación física (RF-M9-19)
    if (input.fechaVencimiento) {
      const fechaRef = input.fecha ?? new Date().toISOString().slice(0, 10);
      const esVencido = input.fechaVencimiento < fechaRef;
      deposito.validarCompatibilidadBpa(insumo.categoria, esVencido);
    } else {
      deposito.validarCompatibilidadBpa(insumo.categoria, false);
    }

    const saldoInicial = StockInicialInsumo.crear({
      id: input.id ?? crypto.randomUUID(),
      insumoId: input.insumoId,
      depositoId: input.depositoId,
      cantidad: input.cantidad,
      unidadMedida: input.unidadMedida,
      loteFabricacion: input.loteFabricacion,
      fechaVencimiento: input.fechaVencimiento,
      motivo: input.motivo ?? 'Carga de saldo inicial de implantación del sistema',
      usuarioCargaId: input.usuarioCargaId,
      fecha: input.fecha,
    });

    await this.stockInicialRepo.guardar(saldoInicial);

    return toStockInicialOutputDTO(saldoInicial);
  }
}

export class ListarIngresosCompraUseCase {
  constructor(private readonly ingresosRepo: IngresosCompraRepositoryPort) {}

  async execute(filtros?: ListarIngresosCompraQueryDTO): Promise<IngresoCompraOutputDTO[]> {
    const list = await this.ingresosRepo.listar(filtros);
    return list.map(toIngresoOutputDTO);
  }
}

export class ListarStockInicialUseCase {
  constructor(private readonly stockInicialRepo: StockInicialRepositoryPort) {}

  async execute(filtros?: { insumoId?: string; depositoId?: string }): Promise<StockInicialOutputDTO[]> {
    const list = await this.stockInicialRepo.listar(filtros);
    return list.map(toStockInicialOutputDTO);
  }
}
