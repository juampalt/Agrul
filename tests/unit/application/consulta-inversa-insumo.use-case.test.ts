import { describe, it, expect, beforeEach } from 'vitest';
import { ConsultaInversaInsumoUseCase, ConsultaInversaInsumoError } from '../../../src/application/use-cases/consulta-inversa-insumo.use-case.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryDespachosRepository } from '../../mocks/in-memory-despachos.repository.js';
import { InMemoryDestinatariosRepository } from '../../mocks/in-memory-destinatarios.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { InMemoryGenealogiaRepository } from '../../mocks/in-memory-genealogia.repository.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { DespachoDestino } from '../../../src/core/domain/entities/despacho-destino.entity.js';
import { Destinatario } from '../../../src/core/domain/entities/destinatario.entity.js';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import { LoteGenealogia } from '../../../src/core/domain/entities/lote-genealogia.entity.js';

describe('AGRUL-034: Consulta Inversa de Trazabilidad para Retiro Preventivo (Recall - RF-M6-12)', () => {
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let lotesRepo: InMemoryLotesRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let despachosRepo: InMemoryDespachosRepository;
  let destinatariosRepo: InMemoryDestinatariosRepository;
  let fincasRepo: InMemoryFincasRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let useCase: ConsultaInversaInsumoUseCase;

  const INSUMO_ID = '00000000-0000-0000-0000-000000000101';
  const LOTE_1_ID = '00000000-0000-0000-0000-000000000201';
  const LOTE_HIJO_ID = '00000000-0000-0000-0000-000000000202';
  const CICLO_ID = '00000000-0000-0000-0000-000000000301';
  const FINCA_ID = '00000000-0000-0000-0000-000000000401';
  const DESTINATARIO_1_ID = '00000000-0000-0000-0000-000000000501';
  const DESTINATARIO_2_ID = '00000000-0000-0000-0000-000000000502';

  beforeEach(async () => {
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    lotesRepo = new InMemoryLotesRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    despachosRepo = new InMemoryDespachosRepository();
    destinatariosRepo = new InMemoryDestinatariosRepository();
    fincasRepo = new InMemoryFincasRepository();
    genealogiaRepo = new InMemoryGenealogiaRepository();

    useCase = new ConsultaInversaInsumoUseCase({
      insumosRepo,
      aplicacionesRepo,
      lotesRepo,
      cosechasRepo,
      despachosRepo,
      destinatariosRepo,
      fincasRepo,
      genealogiaRepo,
    });

    // 1. Crear Insumo fitosanitario
    await insumosRepo.guardar(
      InsumoCatalogo.crear({
        id: INSUMO_ID,
        nombreComercial: 'Captan 80 WG',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'KG',
        presentacion: 'Bolsa 5 kg',
        fichaFitosanitaria: {
          principioActivo: 'Captan',
          periodoCarenciaDias: 14,
          periodoReingresoHoras: 24,
          nroRegistroSenasa: 'SENASA-33412',
          toxicologia: 'Clase II - Amarilla',
        },
      })
    );

    // 2. Crear Finca y Lotes
    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca Las Moras',
        superficieTotalHa: 80,
        provincia: 'Tucumán',
        departamento: 'Lules',
        localidad: 'Lules',
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_1_ID,
        codigoLote: 'LOT-2026-MORA1',
        producto: 'Frutilla',
        variedad: 'San Andreas',
        cantidadInicial: 10000,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
        superficieHa: 4.5,
      })
    );

    // 3. Crear Destinatarios / Clientes
    await destinatariosRepo.guardar(
      Destinatario.crear({
        id: DESTINATARIO_1_ID,
        nombre: 'Supermercados del Norte S.A.',
        tipo: 'MERCADO_FRESCO',
        cuit: '30-71122334-9',
        contacto: 'Lic. Mariana Gómez',
        telefono: '+5493815123456',
        email: 'calidad@supernorte.com.ar',
        localidad: 'San Miguel de Tucumán',
        provincia: 'Tucumán',
      })
    );

    await destinatariosRepo.guardar(
      Destinatario.crear({
        id: DESTINATARIO_2_ID,
        nombre: 'Exportadora Citrícola & Berries Global',
        tipo: 'EXPORTACION',
        cuit: '33-65432109-9',
        contacto: 'Ing. Carlos Rossi',
        telefono: '+5491149876543',
        email: 'recall@berriesglobal.com',
        localidad: 'Buenos Aires',
        provincia: 'CABA',
      })
    );
  });

  it('debe realizar el mapeo descendente completo: insumo -> aplicaciones -> lotes -> cosechas -> despachos -> clientes (RF-M6-12)', async () => {
    // Registrar aplicación fitosanitaria el 2026-09-01 con lote comercial LOT-FAB-77
    await aplicacionesRepo.guardar(
      AplicacionAgricola.crear({
        id: '00000000-0000-0000-0000-000000000601',
        actividadId: '00000000-0000-0000-0000-000000000701',
        loteId: LOTE_1_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-01',
        metodo: 'FOLIAR',
        motivo: 'Control de botrytis',
        equipoAplicacion: 'Tractor Pulverizador John Deere',
        lineas: [
          {
            insumoId: INSUMO_ID,
            cantidadTotal: 10,
            unidadMedidaId: 'KG',
            dosisPorSuperficie: 2.5,
            numeroLote: 'LOT-FAB-77',
            loteInsumoId: 'INV-LOT-01',
          },
        ],
      })
    );

    // Cosecha 1: realizada el 2026-09-05 (4 días después -> viola carencia de 14 días!)
    const cos1 = Cosecha.crear({
      id: '00000000-0000-0000-0000-000000000801',
      codigoTrazabilidad: 'COS-L1-20260905-01',
      loteId: LOTE_1_ID,
      cicloId: CICLO_ID,
      fecha: '2026-09-05',
      cantidadCosechadaKg: 1200,
      cantidadComercializableKg: 1100,
      cantidadDescarteKg: 100,
      motivoDescarte: 'Descarte por calibre menor',
    });
    await cosechasRepo.guardar(cos1);

    // Cosecha 2: realizada el 2026-09-20 (19 días después -> carencia cumplida)
    const cos2 = Cosecha.crear({
      id: '00000000-0000-0000-0000-000000000802',
      codigoTrazabilidad: 'COS-L1-20260920-01',
      loteId: LOTE_1_ID,
      cicloId: CICLO_ID,
      fecha: '2026-09-20',
      cantidadCosechadaKg: 2000,
      cantidadComercializableKg: 1900,
      cantidadDescarteKg: 100,
      motivoDescarte: 'Descarte por golpe mecánico',
    });
    await cosechasRepo.guardar(cos2);

    // Despacho 1 de Cosecha 1 al cliente 1
    await despachosRepo.guardar(
      DespachoDestino.crear({
        id: '00000000-0000-0000-0000-000000000901',
        cosechaId: cos1.id,
        destinatarioId: DESTINATARIO_1_ID,
        tipoDestino: 'MERCADO_FRESCO',
        cantidadEnviadaKg: 600,
        fecha: '2026-09-06',
        nroGuiaRemito: 'REM-001-000452',
        renspaFinca: '23.001.0.00123/00',
        productor: 'Agrul Agrícola',
        chofer: 'Juan Pérez',
        patenteCamion: 'AF123JK',
      })
    );

    // Despacho 2 de Cosecha 2 al cliente 2
    await despachosRepo.guardar(
      DespachoDestino.crear({
        id: '00000000-0000-0000-0000-000000000902',
        cosechaId: cos2.id,
        destinatarioId: DESTINATARIO_2_ID,
        tipoDestino: 'EXPORTACION',
        cantidadEnviadaKg: 1000,
        fecha: '2026-09-21',
        nroGuiaRemito: 'REM-001-000453',
        renspaFinca: '23.001.0.00123/00',
        productor: 'Agrul Agrícola',
      })
    );

    // Ejecutar consulta inversa por insumoId
    const resultado = await useCase.execute({ insumoId: INSUMO_ID });

    expect(resultado).toBeDefined();
    expect(resultado.insumo.nombreComercial).toBe('Captan 80 WG');
    expect(resultado.insumo.principioActivo).toBe('Captan');

    // 1 aplicación
    expect(resultado.aplicaciones).toHaveLength(1);
    expect(resultado.aplicaciones[0].numeroLoteInsumo).toBe('LOT-FAB-77');

    // 1 lote de campo
    expect(resultado.lotes).toHaveLength(1);
    expect(resultado.lotes[0].codigoLote).toBe('LOT-2026-MORA1');
    expect(resultado.lotes[0].fincaNombre).toBe('Finca Las Moras');

    // 2 cosechas comprometidas
    expect(resultado.cosechas).toHaveLength(2);
    const cosechaConAlerta = resultado.cosechas.find(c => c.alertaViolacionCarencia);
    expect(cosechaConAlerta).toBeDefined();
    expect(cosechaConAlerta?.diasDesdeAplicacion).toBe(4);

    // 2 despachos comprometidos
    expect(resultado.despachos).toHaveLength(2);
    expect(resultado.despachos.some(d => d.nroGuiaRemito === 'REM-001-000452')).toBe(true);
    expect(resultado.despachos.some(d => d.nroGuiaRemito === 'REM-001-000453')).toBe(true);

    // 2 destinatarios agrupados para notificación inmediata
    expect(resultado.destinatariosParaNotificar).toHaveLength(2);
    const dest1 = resultado.destinatariosParaNotificar.find(d => d.destinatarioId === DESTINATARIO_1_ID);
    expect(dest1).toBeDefined();
    expect(dest1?.nombre).toBe('Supermercados del Norte S.A.');
    expect(dest1?.totalKilosRecibidos).toBe(600);
    expect(dest1?.remitosAfectados).toContain('REM-001-000452');
    expect(dest1?.telefono).toBe('+5493815123456');

    // Métricas
    expect(resultado.metricas.totalKilosCosechadosAfectados).toBe(3000); // 1100 + 1900
    expect(resultado.metricas.totalKilosEnMercadoDespachados).toBe(1600); // 600 + 1000
    expect(resultado.metricas.totalKilosEnStockPendientes).toBe(1400);
    expect(resultado.metricas.nivelRiesgoSanitario).toBe('CRITICO');

    // Protocolo
    expect(resultado.protocoloRetiroSugerido.length).toBeGreaterThanOrEqual(4);
  });

  it('debe excluir cosechas realizadas antes de la fecha de aplicación', async () => {
    // Aplicación fitosanitaria el 2026-09-10
    await aplicacionesRepo.guardar(
      AplicacionAgricola.crear({
        id: '00000000-0000-0000-0000-000000000602',
        actividadId: '00000000-0000-0000-0000-000000000702',
        loteId: LOTE_1_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-10',
        metodo: 'FOLIAR',
        motivo: 'Tratamiento fitosanitario',
        equipoAplicacion: 'Mochila manual',
        lineas: [
          {
            insumoId: INSUMO_ID,
            cantidadTotal: 5,
            unidadMedidaId: 'KG',
          },
        ],
      })
    );

    // Cosecha previa el 2026-09-02 (anterior a la aplicación -> NO contaminada)
    await cosechasRepo.guardar(
      Cosecha.crear({
        id: '00000000-0000-0000-0000-000000000803',
        codigoTrazabilidad: 'COS-L1-20260902-01',
        loteId: LOTE_1_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-02',
        cantidadCosechadaKg: 800,
        cantidadComercializableKg: 750,
        cantidadDescarteKg: 50,
        motivoDescarte: 'Descarte por calibre menor',
      })
    );

    // Cosecha posterior el 2026-09-12 (comprometida)
    await cosechasRepo.guardar(
      Cosecha.crear({
        id: '00000000-0000-0000-0000-000000000804',
        codigoTrazabilidad: 'COS-L1-20260912-01',
        loteId: LOTE_1_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-12',
        cantidadCosechadaKg: 900,
        cantidadComercializableKg: 850,
        cantidadDescarteKg: 50,
        motivoDescarte: 'Descarte por calibre menor',
      })
    );

    const resultado = await useCase.execute({ insumoId: INSUMO_ID });

    expect(resultado.cosechas).toHaveLength(1);
    expect(resultado.cosechas[0].codigoTrazabilidad).toBe('COS-L1-20260912-01');
  });

  it('debe propagar el recall a lotes descendientes por linaje N:M (split/merge)', async () => {
    // Aplicación en Lote Padre
    await aplicacionesRepo.guardar(
      AplicacionAgricola.crear({
        id: '00000000-0000-0000-0000-000000000603',
        actividadId: '00000000-0000-0000-0000-000000000703',
        loteId: LOTE_1_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-01',
        metodo: 'FOLIAR',
        motivo: 'Aplicación en lote padre',
        equipoAplicacion: 'Pulverizador',
        lineas: [{ insumoId: INSUMO_ID, cantidadTotal: 2, unidadMedidaId: 'KG' }],
      })
    );

    // Crear Lote Hijo derivado por split
    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_HIJO_ID,
        codigoLote: 'LOT-2026-MORA01',
        producto: 'Frutilla Seleccionada',
        variedad: 'San Andreas',
        cantidadInicial: 4000,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
      })
    );

    // Registrar relación de linaje
    await genealogiaRepo.guardarRelacion(
      LoteGenealogia.crear({
        id: '00000000-0000-0000-0000-000000000750',
        lotePadreId: LOTE_1_ID,
        loteHijoId: LOTE_HIJO_ID,
        cantidadAportada: 4000,
        unidadMedida: 'KG',
        motivoRelacion: 'SPLIT',
      })
    );

    const resultado = await useCase.execute({ insumoId: INSUMO_ID });

    expect(resultado.lotes.length).toBeGreaterThanOrEqual(2);
    const hijo = resultado.lotes.find(l => l.loteId === LOTE_HIJO_ID);
    expect(hijo).toBeDefined();
    expect(hijo?.esDescendienteLinaje).toBe(true);
    expect(hijo?.lotePadreOrigenCodigo).toBe('LOT-2026-MORA1');
  });

  it('debe poder consultar por numeroLote de fabricante', async () => {
    await aplicacionesRepo.guardar(
      AplicacionAgricola.crear({
        id: '00000000-0000-0000-0000-000000000604',
        actividadId: '00000000-0000-0000-0000-000000000704',
        loteId: LOTE_1_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-05',
        metodo: 'FOLIAR',
        motivo: 'Pesticida lote defectuoso',
        equipoAplicacion: 'Mochila',
        lineas: [
          {
            insumoId: INSUMO_ID,
            cantidadTotal: 3,
            unidadMedidaId: 'KG',
            numeroLote: 'BATCH-CONTAMINADO-99',
          },
        ],
      })
    );

    const resultado = await useCase.execute({ numeroLote: 'BATCH-CONTAMINADO-99' });

    expect(resultado.aplicaciones).toHaveLength(1);
    expect(resultado.aplicaciones[0].numeroLoteInsumo).toBe('BATCH-CONTAMINADO-99');
    expect(resultado.insumo.nombreComercial).toBe('Captan 80 WG');
  });

  it('debe arrojar error si no se pasa ningún criterio de búsqueda', async () => {
    await expect(useCase.execute({})).rejects.toThrow(ConsultaInversaInsumoError);
  });
});
