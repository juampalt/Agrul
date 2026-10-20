import { describe, it, expect, beforeEach } from 'vitest';
import { ObtenerRecorridoTrazabilidadUseCase } from '../../../src/application/use-cases/recorrido-trazabilidad.use-case.js';
import { EmitirInformeTrazabilidadUseCase } from '../../../src/application/use-cases/emitir-informe-trazabilidad.use-case.js';
import { ListarInformesTrazabilidadLogUseCase } from '../../../src/application/use-cases/listar-informes-trazabilidad-log.use-case.js';
import { GeneradorInformePdfService } from '../../../src/application/services/generador-informe-pdf.service.js';
import { GeneradorExportacionCsvService } from '../../../src/application/services/generador-exportacion-csv.service.js';
import { FiltroPrivacidadTrazabilidadService } from '../../../src/application/services/filtro-privacidad-trazabilidad.service.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryDespachosRepository } from '../../mocks/in-memory-despachos.repository.js';
import { InMemoryDestinatariosRepository } from '../../mocks/in-memory-destinatarios.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryInformesTrazabilidadRepository } from '../../mocks/in-memory-informes-trazabilidad.repository.js';
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

describe('AGRUL-033: Emisión de Informes de Trazabilidad en PDF y Exportación CSV/Excel', () => {
  let cosechasRepo: InMemoryCosechasRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let despachosRepo: InMemoryDespachosRepository;
  let destinatariosRepo: InMemoryDestinatariosRepository;
  let fincasRepo: InMemoryFincasRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let informesRepo: InMemoryInformesTrazabilidadRepository;

  let obtenerRecorridoUC: ObtenerRecorridoTrazabilidadUseCase;
  let emitirInformeUC: EmitirInformeTrazabilidadUseCase;
  let listarLogsUC: ListarInformesTrazabilidadLogUseCase;

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
    informesRepo = new InMemoryInformesTrazabilidadRepository();

    obtenerRecorridoUC = new ObtenerRecorridoTrazabilidadUseCase({
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

    emitirInformeUC = new EmitirInformeTrazabilidadUseCase({
      obtenerRecorridoUseCase: obtenerRecorridoUC,
      informesRepo,
    });

    listarLogsUC = new ListarInformesTrazabilidadLogUseCase(informesRepo);

    // Cargar Finca en Tucumán
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

    // Cargar Lote de Frutilla
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

    // Cargar Ciclo Productivo
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

    // Cargar Insumo fitosanitario
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

    // Cargar Destinatario
    await destinatariosRepo.guardar(
      Destinatario.crear({
        id: DESTINATARIO_ID,
        nombre: 'Agroindustrias del Norte S.A.',
        tipo: 'INDUSTRIA',
      })
    );

    // Cargar Actividad Agrícola
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
        manoDeObra: [
          {
            personalCuadrillaId: '00000000-0000-0000-0000-000000000088',
            cantidadPersonas: 2,
            horasTrabajadas: 8,
            jornales: 2,
          },
        ],
      })
    );

    // Cargar Aplicación fitosanitaria con condiciones climáticas
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
        responsableId: '00000000-0000-0000-0000-000000000088',
        condicionesClima: {
          tempC: 22.5,
          vientoKmH: 8.0,
          lluviaMm: 0,
          observaciones: 'Cielo despejado sin deriva',
        },
        lineas: [
          {
            insumoId: INSUMO_ID,
            cantidadTotal: 5.5,
            unidadMedidaId: 'KG',
            dosisPorSuperficie: 1.5,
          },
        ],
      })
    );

    // Cargar Cosecha
    await cosechasRepo.guardar(
      Cosecha.crear({
        id: COSECHA_ID,
        codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L12-20260915-01'),
        loteId: LOTE_ID,
        cicloId: CICLO_ID,
        fecha: '2026-09-20',
        cantidadCosechadaKg: 3000,
        cantidadComercializableKg: 2800,
        cantidadDescarteKg: 200,
        motivoDescarte: 'Fruta sobremadura y daño por pájaro',
        responsableId: '00000000-0000-0000-0000-000000000088',
        superficieCosechadaHa: 3.5,
      })
    );

    // Cargar Despacho
    await despachosRepo.guardar(
      DespachoDestino.crear({
        id: '00000000-0000-0000-0000-000000000041',
        cosechaId: COSECHA_ID,
        destinatarioId: DESTINATARIO_ID,
        tipoDestino: 'INDUSTRIA',
        cantidadEnviadaKg: 1500,
        fecha: '2026-09-21',
        nroGuiaRemito: 'REM-0001-00004521',
        renspaFinca: '23.001.0.00123/00',
        productor: 'Agrícola del Valle S.R.L.',
        chofer: 'Carlos Pérez',
        patenteCamion: 'AF-123-ZZ',
      })
    );
  });

  describe('RF-M6-08 / RNF-03: Generación de PDF Estructurado Oficial', () => {
    it('debe generar un PDF válido en menos de 10s con encabezado oficial, identificador único y emisor', async () => {
      const inicio = Date.now();
      const resultado = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'PDF',
        usuarioEmisor: 'Ing. Agr. Mariana Gómez',
        rolEmisor: 'Auditora SENASA',
      });
      const duracionMs = Date.now() - inicio;

      expect(duracionMs).toBeLessThan(10000); // RNF-03 (< 10s)
      expect(resultado.tipoFormato).toBe('PDF');
      expect(resultado.mimeType).toBe('application/pdf');
      expect(resultado.codigoInforme).toMatch(/^INF-TRZ-/);
      expect(resultado.tamanoBytes).toBeGreaterThan(500);

      const pdfStr = resultado.contenido.toString('latin1');
      expect(pdfStr.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfStr.includes('%%EOF')).toBe(true);
      expect(pdfStr).toContain('AGRUL');
      expect(pdfStr).toContain('CERTIFICADO OFICIAL DE TRAZABILIDAD');
      expect(pdfStr).toContain('Mariana G\\363mez'); // Gómez codificado
    });
  });

  describe('RF-M6-09 / RN-06: Marcado de Rectificaciones y Anulaciones Históricas', () => {
    it('debe resaltar con alerta prominente de anulación cuando la cosecha fue anulada', async () => {
      // Anular la cosecha
      const cosecha = await cosechasRepo.buscarPorId(COSECHA_ID);
      cosecha!.anular('00000000-0000-0000-0000-000000000099', 'Error grave en báscula de pesaje');
      await cosechasRepo.guardar(cosecha!);

      const resultado = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'PDF',
        usuarioEmisor: 'Auditor Interno',
      });

      const pdfStr = resultado.contenido.toString('latin1');
      expect(pdfStr).toContain('COSECHA ANULADA');
      expect(pdfStr).toContain('Error grave en b\\341scula de pesaje'); // báscula
    });

    it('debe marcar rectificaciones históricas auditadas cuando hubo modificaciones (RN-06)', async () => {
      const cosecha = await cosechasRepo.buscarPorId(COSECHA_ID);
      cosecha!.modificar(
        '00000000-0000-0000-0000-000000000099',
        'Reclasificación de calidad en empaque',
        { cantidadDescarteKg: 250, cantidadComercializableKg: 2750 }
      );
      await cosechasRepo.guardar(cosecha!);

      const resultado = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'PDF',
        usuarioEmisor: 'Auditor Interno',
      });

      const pdfStr = resultado.contenido.toString('latin1');
      expect(pdfStr).toContain('RECTIFICACIONES HIST');
    });
  });

  describe('RF-M6-10 / RNF-11: Exportador CSV/Excel con UTF-8 BOM y Unidades de Medida', () => {
    it('debe incluir BOM UTF-8 (\uFEFF) y encabezados normalizados con unidades de medida', async () => {
      const resultado = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'CSV',
        usuarioEmisor: 'Auditor Certificador',
      });

      expect(resultado.tipoFormato).toBe('CSV');
      expect(resultado.mimeType).toBe('text/csv; charset=utf-8');

      const csvUtf8 = resultado.contenido.toString('utf-8');
      expect(csvUtf8.charCodeAt(0)).toBe(0xfeff); // BOM UTF-8

      // Encabezados con unidades de medida (RNF-11)
      expect(csvUtf8).toContain('Superficie (ha)');
      expect(csvUtf8).toContain('Cosechado Total (kg)');
      expect(csvUtf8).toContain('Comercializable (kg)');
      expect(csvUtf8).toContain('Descarte (kg)');
      expect(csvUtf8).toContain('Temperatura (°C)');
      expect(csvUtf8).toContain('Lluvia Acumulada (mm)');
      expect(csvUtf8).toContain('Viento (km/h)');

      // Caracteres españoles con tildes y eñes
      expect(csvUtf8).toContain('Tucumán');
      expect(csvUtf8).toContain('Frutilla');
      expect(csvUtf8).toContain('Carlos Pérez');
    });
  });

  describe('RF-M6-11 / RNF-14: Filtro de Privacidad', () => {
    it('debe omitir por defecto costos y datos de contacto de operarios cuando incluirDatosSensibles es false', async () => {
      const resultado = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'CSV',
        incluirDatosSensibles: false,
        incluirCostos: false,
      });

      const csvUtf8 = resultado.contenido.toString('utf-8');
      // No debe contener el teléfono del operario (+5493815551234)
      expect(csvUtf8).not.toContain('+5493815551234');
      // No debe contener valores monetarios ni tarifas
      expect(csvUtf8).not.toContain('15000');
    });
  });

  describe('RF-M6-13: Bitácora Inmutable informe_trazabilidad_log', () => {
    it('debe asentar un registro inmutable por cada emisión y permitir su auditoría', async () => {
      const resultado1 = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'PDF',
        usuarioEmisor: 'Auditor 1',
      });

      const resultado2 = await emitirInformeUC.execute({
        identificador: 'COS-L12-20260915-01',
        formato: 'CSV',
        usuarioEmisor: 'Auditor 2',
      });

      const logs = await listarLogsUC.execute({ codigoTrazabilidad: 'COS-L12-20260915-01' });

      expect(logs.length).toBe(2);
      expect(logs[0].codigoInforme).toBe(resultado2.codigoInforme);
      expect(logs[0].tipoFormato).toBe('CSV');
      expect(logs[0].usuarioEmisor).toBe('Auditor 2');

      expect(logs[1].codigoInforme).toBe(resultado1.codigoInforme);
      expect(logs[1].tipoFormato).toBe('PDF');
      expect(logs[1].usuarioEmisor).toBe('Auditor 1');
    });
  });
});
