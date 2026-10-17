import { describe, it, expect, beforeEach } from 'vitest';
import { ObtenerRecorridoTrazabilidadUseCase } from '../../../src/application/use-cases/recorrido-trazabilidad.use-case.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryDespachosRepository } from '../../mocks/in-memory-despachos.repository.js';
import { InMemoryDestinatariosRepository } from '../../mocks/in-memory-destinatarios.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import { DespachoDestino } from '../../../src/core/domain/entities/despacho-destino.entity.js';
import { Destinatario } from '../../../src/core/domain/entities/destinatario.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { CodigoTrazabilidadCosecha } from '../../../src/core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('AGRUL-032: ObtenerRecorridoTrazabilidadUseCase', () => {
  let cosechasRepo: InMemoryCosechasRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let despachosRepo: InMemoryDespachosRepository;
  let destinatariosRepo: InMemoryDestinatariosRepository;
  let fincasRepo: InMemoryFincasRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let useCase: ObtenerRecorridoTrazabilidadUseCase;

  const FINCA_ID = '00000000-0000-0000-0000-000000000001';
  const LOTE_ID = '00000000-0000-0000-0000-000000000010';
  const CICLO_ID = '00000000-0000-0000-0000-000000000100';
  const COSECHA_ID = '00000000-0000-0000-0000-000000001000';
  const INSUMO_ID = '00000000-0000-0000-0000-000000010000';
  const DESTINATARIO_ID = '00000000-0000-0000-0000-000001000000';

  beforeEach(async () => {
    cosechasRepo = new InMemoryCosechasRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    despachosRepo = new InMemoryDespachosRepository();
    destinatariosRepo = new InMemoryDestinatariosRepository();
    fincasRepo = new InMemoryFincasRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();

    useCase = new ObtenerRecorridoTrazabilidadUseCase({
      cosechasRepo,
      lotesRepo,
      ciclosRepo,
      actividadesRepo,
      aplicacionesRepo,
      despachosRepo,
      destinatariosRepo,
      fincasRepo,
      insumosRepo,
    });

    // 1. Cargar Finca
    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca La Querencia',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 50,
        renspa: '23.001.0.00123/00',
      })
    );

    // 2. Cargar Lote
    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_ID,
        codigoLote: 'LOT-2026-00012',
        producto: 'Frutilla',
        variedad: 'San Andreas',
        cantidadInicial: 5000,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
        superficieHa: 3.5,
      })
    );

    // 3. Cargar Ciclo
    await ciclosRepo.guardar(
      CicloProductivo.crear({
        id: CICLO_ID,
        codigoCiclo: 'CIC-2026-001',
        loteId: LOTE_ID,
        cultivo: 'Frutilla',
        variedad: 'San Andreas',
        superficieCultivadaHa: 3.5,
        fechaInicio: '2026-03-01',
      })
    );

    // 4. Cargar Insumo
    await insumosRepo.guardar(
      InsumoCatalogo.crear({
        id: INSUMO_ID,
        nombreComercial: 'Captan 80 WG',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'KG',
        presentacion: 'Bolsa 5kg',
        fichaFitosanitaria: {
          principioActivo: 'Captan',
          periodoCarenciaDias: 7,
          periodoReingresoHoras: 24,
          nroRegistroSenasa: 'SENASA-34567',
        },
      })
    );

    // 5. Cargar Destinatario
    await destinatariosRepo.guardar(
      Destinatario.crear({
        id: DESTINATARIO_ID,
        nombre: 'Agroindustrias del Norte S.A.',
        tipo: 'INDUSTRIA',
      })
    );

    // 6. Cargar Actividades culturales
    await actividadesRepo.guardar(
      ActividadAgricola.registrar({
        id: '00000000-0000-0000-0000-000000000021',
        codigoActividad: 'ACT-2026-0001',
        tipoActividadId: 'PREPARACION_SUELO',
        loteId: LOTE_ID,
        cicloId: CICLO_ID,
        fechaHecho: '2026-03-05',
        usuarioCargaId: '00000000-0000-0000-0000-000000000099',
        trabajadorResponsableId: '00000000-0000-0000-0000-000000000088',
        superficieTrabajadaHa: 3.5,
        observaciones: 'Desmalezado y rastreo profundo',
        maquinarias: [],
        manoDeObra: [],
      })
    );

    // 7. Cargar Aplicación fitosanitaria
    await aplicacionesRepo.guardar(
      AplicacionAgricola.crear({
        id: '00000000-0000-0000-0000-000000000031',
        actividadId: '00000000-0000-0000-0000-000000000021',
        loteId: LOTE_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-01',
        metodo: 'FOLIAR',
        motivo: 'Control preventivo de botrytis',
        equipoAplicacion: 'Pulverizador de arrastre 2000L',
        responsableId: '00000000-0000-0000-0000-000000000077',
        condicionesClima: {
          tempC: 22.5,
          vientoKmH: 8.0,
          lluviaMm: 0,
          observaciones: 'Viento calmo, sin precipitaciones',
        },
        lineas: [
          {
            id: 'linea-1',
            insumoId: INSUMO_ID,
            cantidadTotal: 5.0,
            unidadMedidaId: 'KG',
            dosisPorSuperficie: 1.42,
          },
        ],
      })
    );

    // 8. Cargar Cosecha
    await cosechasRepo.guardar(
      Cosecha.crear({
        id: COSECHA_ID,
        codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L12-20260915-01'),
        loteId: LOTE_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 950,
        cantidadDescarteKg: 50,
        motivoDescarte: 'Fruta sobremadura o con daño mecánico leve',
        responsableId: '00000000-0000-0000-0000-000000000077',
      })
    );

    // 9. Cargar Despacho
    await despachosRepo.guardar(
      DespachoDestino.crear({
        id: '00000000-0000-0000-0000-000000000041',
        cosechaId: COSECHA_ID,
        destinatarioId: DESTINATARIO_ID,
        tipoDestino: 'INDUSTRIA',
        cantidadEnviadaKg: 600,
        fecha: '2026-09-16',
        nroGuiaRemito: 'REM-0001-00045612',
        renspaFinca: '23.001.0.00123/00',
        productor: 'Agrícola Lules S.R.L.',
      })
    );
  });

  it('debe reconstruir el recorrido cronológico completo por ID de cosecha (RF-M6-01, RF-M6-02)', async () => {
    const res = await useCase.execute({ identificador: COSECHA_ID });

    expect(res).toBeDefined();
    expect(res.cosecha.id).toBe(COSECHA_ID);
    expect(res.cosecha.codigoTrazabilidad).toBe('COS-L12-20260915-01');
    expect(res.lote.codigoLote).toBe('LOT-2026-00012');
    expect(res.lote.fincaNombre).toBe('Finca La Querencia');
    expect(res.ciclo.codigoCiclo).toBe('CIC-2026-001');

    // Verificar timeline ordenado cronológicamente
    expect(res.timeline.length).toBeGreaterThanOrEqual(5);
    const tipos = res.timeline.map((h) => h.tipo);
    expect(tipos).toEqual(['INICIO_CICLO', 'LABOR_CULTURAL', 'APLICACION', 'COSECHA', 'DESPACHO']);

    // Fechas en orden ascendente
    for (let i = 0; i < res.timeline.length - 1; i++) {
      expect(res.timeline[i].fecha <= res.timeline[i + 1].fecha).toBe(true);
    }
  });

  it('debe resolver la búsqueda por código legible de trazabilidad de cosecha (RF-M6-01)', async () => {
    const res = await useCase.execute({ identificador: 'COS-L12-20260915-01' });

    expect(res.cosecha.id).toBe(COSECHA_ID);
    expect(res.cosecha.codigoTrazabilidad).toBe('COS-L12-20260915-01');
  });

  it('debe permitir consultar por código o ID de lote devolviendo la cosecha más reciente (RF-M6-01)', async () => {
    const res = await useCase.execute({ identificador: 'LOT-2026-00012' });

    expect(res.cosecha.id).toBe(COSECHA_ID);
    expect(res.lote.id).toBe(LOTE_ID);
  });

  it('debe arrojar EntidadNoEncontradaError si no existe la cosecha o lote', async () => {
    await expect(
      useCase.execute({ identificador: '00000000-0000-0000-0000-999999999999' })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe enriquecer las aplicaciones con los datos técnicos de ficha fitosanitaria (RF-M6-05)', async () => {
    const res = await useCase.execute({ identificador: COSECHA_ID });

    const hitoApp = res.timeline.find((h) => h.tipo === 'APLICACION');
    expect(hitoApp).toBeDefined();
    expect(hitoApp!.detalles.lineas).toHaveLength(1);

    const linea = hitoApp!.detalles.lineas[0];
    expect(linea.nombreComercial).toBe('Captan 80 WG');
    expect(linea.principioActivo).toBe('Captan');
    expect(linea.periodoCarenciaDias).toBe(7);
    expect(linea.periodoReingresoHoras).toBe(24);
    expect(linea.nroRegistroSenasa).toBe('SENASA-34567');
  });

  it('debe calcular correctamente el balance de masa de la cosecha (total, comercializable, descarte, despachado y saldo)', async () => {
    const res = await useCase.execute({ identificador: COSECHA_ID });

    expect(res.balanceMasa).toEqual({
      totalCosechadoKg: 1000,
      comercializableKg: 950,
      descarteKg: 50,
      despachadoKg: 600,
      saldoRemanenteKg: 350, // 950 - 600
    });
  });

  it('debe consolidar el resumen agrometeorológico del ciclo a partir de las aplicaciones registradas (RF-M6-07)', async () => {
    const res = await useCase.execute({ identificador: COSECHA_ID });

    expect(res.resumenMeteorologico).toBeDefined();
    expect(res.resumenMeteorologico.temperaturaPromedioC).toBe(22.5);
    expect(res.resumenMeteorologico.vientoPromedioKmH).toBe(8.0);
    expect(res.resumenMeteorologico.observacionesClimaticas).toContain('Viento calmo, sin precipitaciones');
  });

  it('debe detectar y resaltar explícitamente lagunas de información para auditoría de calidad (RF-M6-06)', async () => {
    // Crear una cosecha incompleta (sin operario responsable ni cuadrilla)
    const COSECHA_INCOMPLETA_ID = '00000000-0000-0000-0000-000000002000';
    await cosechasRepo.guardar(
      Cosecha.crear({
        id: COSECHA_INCOMPLETA_ID,
        codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L12-20260915-02'),
        loteId: LOTE_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-15',
        cantidadCosechadaKg: 500,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 0,
        responsableId: null, // Laguna 1: sin responsable ni cuadrilla
        cuadrillaId: null,
      })
    );

    // Crear aplicación incompleta (sin aplicador y sin clima)
    await aplicacionesRepo.guardar(
      AplicacionAgricola.crear({
        id: '00000000-0000-0000-0000-000000000099',
        actividadId: '00000000-0000-0000-0000-000000000021',
        loteId: LOTE_ID,
        cicloId: CICLO_ID,
        fecha: '2026-08-10',
        metodo: 'FOLIAR',
        motivo: 'Fertilización foliar',
        equipoAplicacion: 'Mochila manual',
        responsableId: null, // Laguna 2: sin aplicador
        condicionesClima: null, // Laguna 3: sin condiciones climáticas
        lineas: [
          {
            id: 'linea-99',
            insumoId: INSUMO_ID,
            cantidadTotal: 2.0,
            unidadMedidaId: 'KG',
          },
        ],
      })
    );

    const res = await useCase.execute({ identificador: COSECHA_INCOMPLETA_ID });

    expect(res.auditoriaCalidad.tieneLagunas).toBe(true);
    expect(res.auditoriaCalidad.totalLagunas).toBeGreaterThanOrEqual(2);

    const camposConLagunas = res.auditoriaCalidad.lagunas.map((l) => l.campo);
    expect(camposConLagunas).toContain('responsableId/cuadrillaId');
    expect(camposConLagunas).toContain('responsableId');
    expect(camposConLagunas).toContain('condicionesClima');
  });
});

