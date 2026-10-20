import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryIngresosCompraRepository } from '../../mocks/in-memory-ingresos-compra.repository.js';
import { InMemoryStockInicialRepository } from '../../mocks/in-memory-stock-inicial.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryProveedoresRepository } from '../../mocks/in-memory-proveedores.repository.js';
import { InMemoryDepositosRepository } from '../../mocks/in-memory-depositos.repository.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { Proveedor } from '../../../src/core/domain/entities/proveedor.entity.js';
import { DepositoAlmacenamiento } from '../../../src/core/domain/entities/deposito-almacenamiento.entity.js';
import {
  RegistrarIngresoCompraUseCase,
  CargarStockInicialUseCase,
  ListarIngresosCompraUseCase,
  ListarStockInicialUseCase,
} from '../../../src/application/use-cases/compras-stock.use-cases.js';
import {
  EntidadNoEncontradaError,
  DepositoIncompatibleBpaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Ingreso por Compra y Segregación BPA (AGRUL-042 / RF-M9-03, RF-M9-05, RF-M9-19)', () => {
  let ingresosRepo: InMemoryIngresosCompraRepository;
  let stockInicialRepo: InMemoryStockInicialRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let proveedoresRepo: InMemoryProveedoresRepository;
  let depositosRepo: InMemoryDepositosRepository;

  let registrarIngresoUseCase: RegistrarIngresoCompraUseCase;
  let stockInicialUseCase: CargarStockInicialUseCase;
  let listarIngresosUseCase: ListarIngresosCompraUseCase;
  let listarStockInicialUseCase: ListarStockInicialUseCase;

  const proveedor = Proveedor.crear({
    id: 'prov-001',
    razonSocial: 'Agroquímica Cuyo S.A.',
    cuit: '30-71122334-5',
  });

  const insumoFitosanitario = InsumoCatalogo.crear({
    id: 'ins-fito-01',
    nombreComercial: 'Abamectina 1.8%',
    categoria: 'FITOSANITARIO',
    unidadMedidaId: 'LT',
    presentacion: 'Bidón 5L',
    fichaFitosanitaria: {
      principioActivo: 'Abamectina',
      periodoCarenciaDias: 7,
      periodoReingresoHoras: 24,
      nroRegistroSenasa: 'SENASA-1234',
    },
  });

  const insumoFertilizante = InsumoCatalogo.crear({
    id: 'ins-fert-01',
    nombreComercial: 'Nitrato de Calcio',
    categoria: 'FERTILIZANTE',
    unidadMedidaId: 'KG',
    presentacion: 'Bolsa 25kg',
  });

  const depFitosanitarios = DepositoAlmacenamiento.crear({
    id: 'dep-fito-01',
    fincaId: 'finca-01',
    nombre: 'Depósito Fitosanitarios BPA',
    tipoPermitido: 'FITOSANITARIOS',
  });

  const depFertilizantes = DepositoAlmacenamiento.crear({
    id: 'dep-fert-01',
    fincaId: 'finca-01',
    nombre: 'Galpón de Fertilizantes',
    tipoPermitido: 'FERTILIZANTES',
  });

  beforeEach(async () => {
    ingresosRepo = new InMemoryIngresosCompraRepository();
    stockInicialRepo = new InMemoryStockInicialRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    proveedoresRepo = new InMemoryProveedoresRepository();
    depositosRepo = new InMemoryDepositosRepository();

    await proveedoresRepo.guardar(proveedor);
    await insumosRepo.guardar(insumoFitosanitario);
    await insumosRepo.guardar(insumoFertilizante);
    await depositosRepo.guardar(depFitosanitarios);
    await depositosRepo.guardar(depFertilizantes);

    registrarIngresoUseCase = new RegistrarIngresoCompraUseCase(
      ingresosRepo,
      insumosRepo,
      proveedoresRepo,
      depositosRepo
    );

    stockInicialUseCase = new CargarStockInicialUseCase(
      stockInicialRepo,
      insumosRepo,
      depositosRepo
    );

    listarIngresosUseCase = new ListarIngresosCompraUseCase(ingresosRepo);
    listarStockInicialUseCase = new ListarStockInicialUseCase(stockInicialRepo);
  });

  it('debe registrar un ingreso por compra exitosamente con proveedor, lote de fabricación y vencimiento (RF-M9-03)', async () => {
    const ingreso = await registrarIngresoUseCase.execute({
      insumoId: 'ins-fito-01',
      proveedorId: 'prov-001',
      depositoId: 'dep-fito-01',
      cantidad: 20,
      unidadMedida: 'LT',
      loteFabricacion: 'LOTE-FAB-2026-X1',
      fechaVencimiento: '2027-12-31',
      nroFacturaRemito: 'FAC-0001-00045678',
      precioUnitarioCompra: 15.5,
    });

    expect(ingreso.id).toBeDefined();
    expect(ingreso.insumoId).toBe('ins-fito-01');
    expect(ingreso.proveedorId).toBe('prov-001');
    expect(ingreso.loteFabricacion).toBe('LOTE-FAB-2026-X1');
    expect(ingreso.fechaVencimiento).toBe('2027-12-31');
    expect(ingreso.nroFacturaRemito).toBe('FAC-0001-00045678');

    const lista = await listarIngresosUseCase.execute({ insumoId: 'ins-fito-01' });
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(ingreso.id);
  });

  it('debe PROHIBIR almacenar fitosanitarios junto a fertilizantes conforme a las BPA (RF-M9-19)', async () => {
    await expect(
      registrarIngresoUseCase.execute({
        insumoId: 'ins-fito-01', // Fitosanitario
        proveedorId: 'prov-001',
        depositoId: 'dep-fert-01', // Depósito de fertilizantes
        cantidad: 10,
        unidadMedida: 'LT',
        loteFabricacion: 'LOTE-BPA-FAIL',
        fechaVencimiento: '2028-01-01',
        nroFacturaRemito: 'REM-1234',
      })
    ).rejects.toThrow(DepositoIncompatibleBpaError);
  });

  it('debe PROHIBIR almacenar fertilizantes en el depósito exclusivo de fitosanitarios (RF-M9-19)', async () => {
    await expect(
      registrarIngresoUseCase.execute({
        insumoId: 'ins-fert-01', // Fertilizante
        proveedorId: 'prov-001',
        depositoId: 'dep-fito-01', // Depósito de fitosanitarios
        cantidad: 50,
        unidadMedida: 'KG',
        loteFabricacion: 'LOTE-FERT-FAIL',
        fechaVencimiento: '2028-01-01',
        nroFacturaRemito: 'REM-5678',
      })
    ).rejects.toThrow(DepositoIncompatibleBpaError);
  });

  it('debe cargar saldo inicial auditado de implantación del sistema (RF-M9-05)', async () => {
    const saldo = await stockInicialUseCase.execute({
      insumoId: 'ins-fert-01',
      depositoId: 'dep-fert-01',
      cantidad: 500,
      unidadMedida: 'KG',
      motivo: 'Inventario físico de arranque',
      usuarioCargaId: 'user-admin-01',
      loteFabricacion: 'LOTE-INICIAL-001',
      fechaVencimiento: '2027-06-30',
    });

    expect(saldo.id).toBeDefined();
    expect(saldo.insumoId).toBe('ins-fert-01');
    expect(saldo.cantidad).toBe(500);
    expect(saldo.motivo).toBe('Inventario físico de arranque');
    expect(saldo.usuarioCargaId).toBe('user-admin-01');

    const lista = await listarStockInicialUseCase.execute({ insumoId: 'ins-fert-01' });
    expect(lista).toHaveLength(1);
    expect(lista[0].cantidad).toBe(500);
  });

  it('debe arrojar EntidadNoEncontradaError ante insumo, proveedor o depósito inexistente', async () => {
    await expect(
      registrarIngresoUseCase.execute({
        insumoId: 'ins-fantasma',
        proveedorId: 'prov-001',
        depositoId: 'dep-fito-01',
        cantidad: 10,
        unidadMedida: 'LT',
        loteFabricacion: 'L1',
        fechaVencimiento: '2027-01-01',
        nroFacturaRemito: 'F1',
      })
    ).rejects.toThrow(EntidadNoEncontradaError);

    await expect(
      registrarIngresoUseCase.execute({
        insumoId: 'ins-fito-01',
        proveedorId: 'prov-fantasma',
        depositoId: 'dep-fito-01',
        cantidad: 10,
        unidadMedida: 'LT',
        loteFabricacion: 'L1',
        fechaVencimiento: '2027-01-01',
        nroFacturaRemito: 'F1',
      })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });
});
