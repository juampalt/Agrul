import { describe, it, expect, beforeEach } from 'vitest';
import { VerificarCarenciaLoteUseCase } from '../../../src/application/use-cases/verificar-carencia.use-case.js';
import { RegistrarAplicacionUseCase } from '../../../src/application/use-cases/aplicaciones.use-cases.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: VerificarCarenciaLoteUseCase (AGRUL-026 / RF-M4-08 / RF-M4-09 / RN-14)', () => {
  let lotesRepo: InMemoryLotesRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let registrarAplicacionUseCase: RegistrarAplicacionUseCase;
  let verificarCarenciaUseCase: VerificarCarenciaLoteUseCase;

  let loteId: string;
  let cicloId: string;
  let actividadId: string;
  let insumoFitoId: string;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    ciclosRepo = new InMemoryCiclosRepository();

    registrarAplicacionUseCase = new RegistrarAplicacionUseCase(
      aplicacionesRepo,
      actividadesRepo,
      lotesRepo,
      ciclosRepo,
      insumosRepo
    );

    verificarCarenciaUseCase = new VerificarCarenciaLoteUseCase(
      aplicacionesRepo,
      insumosRepo,
      lotesRepo
    );

    // 1. Crear lote
    loteId = crypto.randomUUID();
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-001',
      producto: 'Arándano Duke',
      variedad: 'Duke',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    // 2. Crear ciclo abierto
    cicloId = crypto.randomUUID();
    const ciclo = CicloProductivo.crear({
      id: cicloId,
      codigoCiclo: 'CICLO-2026-01',
      loteId,
      cultivo: 'Arándano',
      variedad: 'Duke',
      fechaInicio: '2026-08-01',
      superficieCultivadaHa: 5.5,
    });
    await ciclosRepo.guardar(ciclo);

    // 3. Crear actividad agrícola
    actividadId = crypto.randomUUID();
    const actividad = ActividadAgricola.registrar({
      id: actividadId,
      codigoActividad: 'ACT-2026-001',
      tipoActividadId: crypto.randomUUID(),
      loteId,
      cicloId,
      fechaHecho: '2026-10-01',
      usuarioCargaId: crypto.randomUUID(),
      superficieTrabajadaHa: 5.5,
      fechaReferenciaHoy: new Date('2026-10-25'),
    });
    await actividadesRepo.guardar(actividad);

    // 4. Crear insumo fitosanitario con carencia 14 días (RN-14)
    insumoFitoId = crypto.randomUUID();
    const insumoFito = InsumoCatalogo.crear({
      id: insumoFitoId,
      nombreComercial: 'Fungicida Agrul Protect',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'L',
      presentacion: 'Bidón 10L',
      fichaFitosanitaria: {
        principioActivo: 'Boscalid',
        periodoCarenciaDias: 14,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-F-1234',
        toxicologia: 'Clase IV - Banda Verde',
      },
    });
    await insumosRepo.guardar(insumoFito);
  });

  it('debe fallar si el lote no existe', async () => {
    await expect(
      verificarCarenciaUseCase.execute({ loteId: crypto.randomUUID() })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe indicar lote apto para cosecha si no tiene aplicaciones registradas', async () => {
    const res = await verificarCarenciaUseCase.execute({ loteId, fecha: '2026-10-05' });

    expect(res.aptoParaCosecha).toBe(true);
    expect(res.aptoParaReingreso).toBe(true);
    expect(res.fechaSeguraCosecha).toBeNull();
    expect(res.totalAlertasCarencia).toBe(0);
    expect(res.advertencias).toHaveLength(0);
  });

  it('debe emitir alerta clara si se intenta cosechar dentro del período de carencia (RF-M4-09 / RN-14)', async () => {
    // Registrar aplicación con fecha 2026-10-01 (carencia 14 días -> segura desde 2026-10-15)
    await registrarAplicacionUseCase.execute(
      {
        actividadId,
        loteId,
        cicloId,
        fecha: '2026-10-01',
        metodo: 'FOLIAR',
        motivo: 'Control de botrytis',
        equipoAplicacion: 'Pulverizador Martignani',
        lineas: [
          {
            insumoId: insumoFitoId,
            cantidadTotal: 5,
            unidadMedidaId: 'L',
            dosisPorSuperficie: 1,
          },
        ],
        recomendacionTecnica: {
          agronomoEmisor: 'Ing. Carlos Mendoza',
          nroMatricula: 'MP-9011',
          documentoUrl: 'https://cdn.agrul.internal/rec-tecnica.pdf',
        },
      },
      new Date('2026-10-10')
    );

    // Evaluar cosecha el 2026-10-06 (quedan 9 días)
    const res = await verificarCarenciaUseCase.execute({ loteId, fecha: '2026-10-06' });

    expect(res.aptoParaCosecha).toBe(false);
    expect(res.totalAlertasCarencia).toBe(1);
    expect(res.fechaSeguraCosecha).toBe('2026-10-15');

    const alerta = res.alertasCarencia[0];
    expect(alerta.nombreComercial).toBe('Fungicida Agrul Protect');
    expect(alerta.principioActivo).toBe('Boscalid');
    expect(alerta.periodoCarenciaDias).toBe(14);
    expect(alerta.diasRestantes).toBe(9);
    expect(alerta.fechaFinCarencia).toBe('2026-10-15');
    expect(alerta.mensajeAdvertencia).toContain('ADVERTENCIA DE SEGURIDAD ALIMENTARIA');
    expect(alerta.mensajeAdvertencia).toContain('restan 9 días de carencia');
  });

  it('debe indicar lote apto si la fecha evaluada superó el período de carencia', async () => {
    await registrarAplicacionUseCase.execute(
      {
        actividadId,
        loteId,
        cicloId,
        fecha: '2026-10-01',
        metodo: 'FOLIAR',
        motivo: 'Preventivo',
        equipoAplicacion: 'Pulverizador',
        lineas: [
          {
            insumoId: insumoFitoId,
            cantidadTotal: 5,
            unidadMedidaId: 'L',
          },
        ],
      },
      new Date('2026-10-20')
    );

    const res = await verificarCarenciaUseCase.execute({ loteId, fecha: '2026-10-16' });

    expect(res.aptoParaCosecha).toBe(true);
    expect(res.totalAlertasCarencia).toBe(0);
    expect(res.alertasCarencia).toHaveLength(0);
  });
});
