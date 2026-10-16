import { describe, it, expect, beforeEach } from 'vitest';
import { RegistrarCosechaRapidaUseCase } from '../../../src/application/use-cases/cosechas.use-cases.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import {
  CicloNoAbiertoError,
  DesgloseCosechaInvalidoError,
  EntidadNoEncontradaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: RegistrarCosechaRapidaUseCase (AGRUL-031 / RF-M5-13 / RN-01 / RNF-01 / RNF-15)', () => {
  let cosechasRepo: InMemoryCosechasRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let eventosRepo: InMemoryEventosRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;

  let useCase: RegistrarCosechaRapidaUseCase;

  let lote: Lote;
  let ciclo: CicloProductivo;
  const fechaHoyRef = new Date('2026-10-15T12:00:00Z');

  beforeEach(async () => {
    cosechasRepo = new InMemoryCosechasRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();

    useCase = new RegistrarCosechaRapidaUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo,
      eventosRepo,
      aplicacionesRepo,
      insumosRepo
    );

    lote = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-00001',
      producto: 'Frutilla San Andreas',
      cantidadInicial: 0,
      unidadMedida: 'KG',
      fincaId: 'finca-lules-01',
    });
    await lotesRepo.guardar(lote);

    ciclo = CicloProductivo.crear({
      id: crypto.randomUUID(),
      codigoCiclo: 'CICLO-2026-0001',
      loteId: lote.id,
      cultivo: 'Frutilla',
      variedad: 'San Andreas',
      fechaInicio: '2026-03-01',
      superficieCultivadaHa: 2.5,
    });
    await ciclosRepo.guardar(ciclo);
  });

  it('debe registrar exitosamente con solo los 4 campos obligatorios (loteId, cantidadCosechadaKg, cantidadComercializableKg, fecha) en < 15s (RF-M5-13 / RN-01)', async () => {
    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 1000,
      cantidadComercializableKg: 850,
      fecha: '2026-10-15',
    };

    const resultado = await useCase.execute(input, fechaHoyRef);

    expect(resultado).toBeDefined();
    expect(resultado.id).toBeDefined();
    expect(resultado.codigoTrazabilidad).toMatch(/^COS-L\d+-20261015-\d{2}$/);
    expect(resultado.cantidadCosechadaKg).toBe(1000);
    expect(resultado.cantidadComercializableKg).toBe(850);
    expect(resultado.cantidadDescarteKg).toBe(150); // Calculado automáticamente (RN-09)
    expect(resultado.motivoDescarte).toBe('DESCARTE_CAMPO'); // Default asignado
    expect(resultado.estado).toBe('ACTIVA');

    // Verificar incremento de masa en lote
    const loteActualizado = await lotesRepo.buscarPorId(lote.id);
    expect(loteActualizado?.cantidadActual).toBe(850);
  });

  it('debe autocompletar la fecha actual si se omite en el payload (RN-01 / RF-M5-13)', async () => {
    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 500,
      cantidadComercializableKg: 500,
    };

    const resultado = await useCase.execute(input, fechaHoyRef);

    expect(resultado.fecha).toBe('2026-10-15');
    expect(resultado.cantidadDescarteKg).toBe(0);
    expect(resultado.porcentajeComercializable).toBe(100);
  });

  it('debe autocompletar el ciclo productivo activo del lote si se omite cicloId (RF-M5-13)', async () => {
    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 400,
      cantidadComercializableKg: 380,
      fecha: '2026-10-15',
    };

    const resultado = await useCase.execute(input, fechaHoyRef);

    expect(resultado.cicloId).toBe(ciclo.id);
    expect(resultado.codigoCiclo).toBe('CICLO-2026-0001');
  });

  it('debe permitir resolver el lote pasando su código alfanumérico (ej: LOT-2026-00001) para operarios con QR', async () => {
    const input = {
      loteId: 'LOT-2026-00001', // Código en vez de UUID
      cantidadCosechadaKg: 600,
      cantidadComercializableKg: 550,
      fecha: '2026-10-15',
    };

    const resultado = await useCase.execute(input, fechaHoyRef);

    expect(resultado.loteId).toBe(lote.id);
    expect(resultado.codigoLote).toBe('LOT-2026-00001');
    expect(resultado.cantidadDescarteKg).toBe(50);
  });

  it('debe rechazar con DesgloseCosechaInvalidoError si comercializable > total cosechado (RN-09)', async () => {
    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 200,
      cantidadComercializableKg: 250, // Imposible
      fecha: '2026-10-15',
    };

    await expect(useCase.execute(input, fechaHoyRef)).rejects.toThrow(DesgloseCosechaInvalidoError);
  });

  it('debe rechazar con CicloNoAbiertoError si el lote no tiene ciclo productivo abierto (RN-03)', async () => {
    // Cerrar el ciclo activo
    ciclo.cerrar('2026-10-10');
    await ciclosRepo.guardar(ciclo);

    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 100,
      cantidadComercializableKg: 100,
      fecha: '2026-10-15',
    };

    await expect(useCase.execute(input, fechaHoyRef)).rejects.toThrow(CicloNoAbiertoError);
  });

  it('debe rechazar con EntidadNoEncontradaError si el lote no existe', async () => {
    const input = {
      loteId: 'LOT-INEXISTENTE-999',
      cantidadCosechadaKg: 100,
      cantidadComercializableKg: 100,
    };

    await expect(useCase.execute(input, fechaHoyRef)).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe detectar y adjuntar advertencias de carencia fitosanitaria sin bloquear la cosecha (RF-M5-11 / RN-14)', async () => {
    // Registrar insumo con 7 días de carencia
    const insumo = InsumoCatalogo.crear({
      id: 'insumo-fungicida-1',
      nombreComercial: 'Captan 80 WP',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 1kg',
      fichaFitosanitaria: {
        principioActivo: 'Captan',
        periodoCarenciaDias: 7,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-F-1234',
        toxicologia: 'Clase IV - Banda Verde',
      },
    });
    await insumosRepo.guardar(insumo);

    // Aplicación hace 3 días (fecha: 2026-10-12, carencia hasta 2026-10-19)
    const aplicacion = AplicacionAgricola.crear({
      id: crypto.randomUUID(),
      actividadId: crypto.randomUUID(),
      loteId: lote.id,
      cicloId: ciclo.id,
      fecha: '2026-10-12',
      metodo: 'PULVERIZACION_TERRESTRE',
      motivo: 'Control Botrytis',
      equipoAplicacion: 'Tractor con botalón',
      lineas: [
        {
          insumoId: insumo.id,
          cantidadTotal: 5.0,
          unidadMedidaId: 'KG',
          dosisPorSuperficie: 2.0,
        },
      ],
      fechaReferenciaHoy: fechaHoyRef,
    });
    await aplicacionesRepo.guardar(aplicacion);

    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 300,
      cantidadComercializableKg: 280,
      fecha: '2026-10-15', // Violación de carencia: 3 días < 7 días
    };

    const resultado = await useCase.execute(input, fechaHoyRef);

    expect(resultado).toBeDefined();
    expect(resultado.alertaCarencia).not.toBeNull();
    expect(resultado.alertaCarencia?.totalAlertasCarencia).toBe(1);
    expect(resultado.alertaCarencia?.alertasCarencia[0].principioActivo).toBe('Captan');
    expect(resultado.alertaCarencia?.alertasCarencia[0].diasRestantes).toBe(4);
    expect(resultado.alertaCarencia?.advertencias.length).toBeGreaterThan(0);
  });

  it('debe registrar campos secundarios plegados (recipientes, cuadrilla, observaciones) si son especificados', async () => {
    const input = {
      loteId: lote.id,
      cantidadCosechadaKg: 1200,
      cantidadComercializableKg: 1100,
      cantidadDescarteKg: 100,
      motivoDescarte: 'DEFECTO_CALIBRE',
      observacionesCalidad: 'Fruta firme con 12 grados Brix',
      cuadrillaId: 'cuadrilla-norte-01',
      superficieCosechadaHa: 1.5,
      recipientes: [{ tipo: 'BIN', cantidad: 3 }],
      fecha: '2026-10-15',
    };

    const resultado = await useCase.execute(input, fechaHoyRef);

    expect(resultado.motivoDescarte).toBe('DEFECTO_CALIBRE');
    expect(resultado.observacionesCalidad).toBe('Fruta firme con 12 grados Brix');
    expect(resultado.cuadrillaId).toBe('cuadrilla-norte-01');
    expect(resultado.superficieCosechadaHa).toBe(1.5);
    expect(resultado.recipientes).toEqual([{ tipo: 'BIN', cantidad: 3 }]);
  });
});
