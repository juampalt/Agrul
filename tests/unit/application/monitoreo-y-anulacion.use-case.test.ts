import { describe, it, expect, beforeEach } from 'vitest';
import {
  RegistrarObservacionMonitoreoUseCase,
  ListarObservacionesMonitoreoUseCase,
  ObtenerObservacionMonitoreoPorIdUseCase,
} from '../../../src/application/use-cases/monitoreo.use-cases.js';
import {
  RegistrarActividadEjecutadaUseCase,
  AnularActividadUseCase,
} from '../../../src/application/use-cases/actividades-agricolas.use-cases.js';
import { InMemoryObservacionesMonitoreoRepository } from '../../mocks/in-memory-observaciones-monitoreo.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../../mocks/in-memory-catalogos-actividades.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { TipoActividad } from '../../../src/core/domain/entities/tipo-actividad.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CicloNoAbiertoError,
} from '../../../src/core/domain/errors/domain.error.js';
import {
  MotivoCancelacionRequeridoError,
  ActividadYaCanceladaError,
} from '../../../src/core/domain/entities/actividad-agricola.entity.js';

describe('AGRUL-023: Use Cases de Monitoreo de Campo y Anulación de Labores', () => {
  let observacionesRepo: InMemoryObservacionesMonitoreoRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let catalogosRepo: InMemoryCatalogosActividadesRepository;

  let registrarObsUseCase: RegistrarObservacionMonitoreoUseCase;
  let listarObsUseCase: ListarObservacionesMonitoreoUseCase;
  let obtenerObsUseCase: ObtenerObservacionMonitoreoPorIdUseCase;
  let registrarActUseCase: RegistrarActividadEjecutadaUseCase;
  let anularActUseCase: AnularActividadUseCase;

  const loteId = 'lote-101';
  const cicloId = 'ciclo-202';
  const tipoActividadId = 'tipo-pulverizacion';

  beforeEach(async () => {
    observacionesRepo = new InMemoryObservacionesMonitoreoRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    catalogosRepo = new InMemoryCatalogosActividadesRepository();

    // Crear Lote
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-00101',
      producto: 'Arándano',
      variedad: 'Emerald',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    // Crear Ciclo ABIERTO
    const ciclo = CicloProductivo.crear({
      id: cicloId,
      codigoCiclo: 'CIC-2026-001',
      loteId,
      cultivo: 'Arándano',
      variedad: 'Emerald',
      estado: 'ABIERTO',
      superficieCultivadaHa: 3.5,
      fechaInicio: '2026-01-10',
    });
    await ciclosRepo.guardar(ciclo);

    // Precargar tipo de actividad en catálogo
    await catalogosRepo.guardarTipoActividad(
      TipoActividad.crear({
        id: tipoActividadId,
        nombre: 'Control Fitosanitario',
        categoria: 'SANIDAD',
        requiereMaquinaria: true,
        requiereInsumos: true,
      })
    );

    registrarObsUseCase = new RegistrarObservacionMonitoreoUseCase(observacionesRepo, lotesRepo, ciclosRepo);
    listarObsUseCase = new ListarObservacionesMonitoreoUseCase(observacionesRepo);
    obtenerObsUseCase = new ObtenerObservacionMonitoreoPorIdUseCase(observacionesRepo);
    registrarActUseCase = new RegistrarActividadEjecutadaUseCase(
      actividadesRepo,
      lotesRepo,
      ciclosRepo,
      catalogosRepo,
      observacionesRepo,
    );
    anularActUseCase = new AnularActividadUseCase(actividadesRepo);
  });

  describe('RegistrarObservacionMonitoreoUseCase (RF-M3-11)', () => {
    it('debe registrar exitosamente una observación de monitoreo en campo', async () => {
      const output = await registrarObsUseCase.execute({
        loteId,
        cicloId,
        fecha: '2026-10-14',
        sintomas: 'Focos de roya detectados en hilera 4 a 7',
        plagas: 'Roya (Pucciniastrum vaccinii)',
        estadoCultivo: 'FLORACION',
        fotosUrls: ['https://storage.agrul.local/fotos/foco-roya-1.jpg'],
        usuarioId: 'usr-agronomo-9',
      });

      expect(output.id).toBeDefined();
      expect(output.sintomas).toBe('Focos de roya detectados en hilera 4 a 7');
      expect(output.fotosUrls).toHaveLength(1);

      // Verificar persistencia
      const guardada = await obtenerObsUseCase.execute(output.id);
      expect(guardada.id).toBe(output.id);
    });

    it('debe fallar si el lote no existe', async () => {
      await expect(
        registrarObsUseCase.execute({
          loteId: 'lote-inexistente',
          cicloId,
          fecha: '2026-10-14',
          sintomas: 'Síntoma cualquiera',
          usuarioId: 'usr-1',
        })
      ).rejects.toThrowError(EntidadNoEncontradaError);
    });

    it('debe fallar si el ciclo no pertenece al lote (RN-01)', async () => {
      const otroCiclo = CicloProductivo.crear({
        id: 'ciclo-otro-lote',
        codigoCiclo: 'CIC-2026-OTRO',
        loteId: 'otro-lote-id',
        cultivo: 'Arándano',
        estado: 'ABIERTO',
        superficieCultivadaHa: 1,
        fechaInicio: '2026-01-01',
      });
      await ciclosRepo.guardar(otroCiclo);

      await expect(
        registrarObsUseCase.execute({
          loteId,
          cicloId: otroCiclo.id,
          fecha: '2026-10-14',
          sintomas: 'Síntoma de prueba',
          usuarioId: 'usr-1',
        })
      ).rejects.toThrowError(InconsistenciaLoteCicloError);
    });

    it('debe fallar si el ciclo se encuentra CERRADO (RN-03)', async () => {
      const cicloCerrado = CicloProductivo.crear({
        id: 'ciclo-cerrado',
        codigoCiclo: 'CIC-2026-CERR',
        loteId,
        cultivo: 'Arándano',
        estado: 'CERRADO',
        superficieCultivadaHa: 1,
        fechaInicio: '2026-01-01',
      });
      await ciclosRepo.guardar(cicloCerrado);

      await expect(
        registrarObsUseCase.execute({
          loteId,
          cicloId: cicloCerrado.id,
          fecha: '2026-10-14',
          sintomas: 'Síntoma en ciclo cerrado',
          usuarioId: 'usr-1',
        })
      ).rejects.toThrowError(CicloNoAbiertoError);
    });

    it('debe permitir listar observaciones con filtros', async () => {
      await registrarObsUseCase.execute({
        loteId,
        cicloId,
        fecha: '2026-10-10',
        sintomas: 'Observación 1',
        usuarioId: 'usr-1',
      });
      await registrarObsUseCase.execute({
        loteId,
        cicloId,
        fecha: '2026-10-12',
        sintomas: 'Observación 2',
        usuarioId: 'usr-2',
      });

      const listAll = await listarObsUseCase.execute({ loteId });
      expect(listAll).toHaveLength(2);

      const listUsr1 = await listarObsUseCase.execute({ usuarioId: 'usr-1' });
      expect(listUsr1).toHaveLength(1);
    });
  });

  describe('Vínculo entre Actividad y Observación de Monitoreo (RF-M3-10)', () => {
    it('debe vincular exitosamente la actividad realizada a la observación motivadora', async () => {
      const obs = await registrarObsUseCase.execute({
        loteId,
        cicloId,
        fecha: '2026-10-14',
        sintomas: 'Pulgones en hojas tiernas',
        usuarioId: 'usr-agronomo',
      });

      const actividad = await registrarActUseCase.execute({
        tipoActividadId,
        loteId,
        cicloId,
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-agronomo',
        superficieTrabajadaHa: 3.5,
        observacionMonitoreoId: obs.id,
        observaciones: 'Aplicación correctiva disparada por monitoreo de pulgones',
      });

      expect(actividad.observacionMonitoreoId).toBe(obs.id);
      expect(actividad.estado).toBe('REALIZADA');
    });

    it('debe rechazar la actividad si la observación referenciada no existe', async () => {
      await expect(
        registrarActUseCase.execute({
          tipoActividadId,
          loteId,
          cicloId,
          fechaHecho: '2026-10-14',
          usuarioCargaId: 'usr-agronomo',
          superficieTrabajadaHa: 3.5,
          observacionMonitoreoId: 'obs-fantasma-999',
        })
      ).rejects.toThrowError(EntidadNoEncontradaError);
    });
  });

  describe('AnularActividadUseCase (RF-M3-12, RN-05, RN-06)', () => {
    it('debe anular una labor de campo guardando el motivo de cancelación', async () => {
      const act = await registrarActUseCase.execute({
        tipoActividadId,
        loteId,
        cicloId,
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-1',
        superficieTrabajadaHa: 2.0,
      });

      const anulada = await anularActUseCase.execute({
        id: act.id,
        motivo: 'Condiciones climáticas de viento impidieron la correcta pulverización',
        usuarioId: 'usr-supervisor',
      });

      expect(anulada.estado).toBe('CANCELADA');
      expect(anulada.motivoCancelacion).toBe(
        'Condiciones climáticas de viento impidieron la correcta pulverización'
      );
      expect(anulada.canceladoEn).toBeDefined();

      // Verificar persistencia del estado en el repositorio
      const enDb = await actividadesRepo.buscarPorId(act.id);
      expect(enDb?.estado).toBe('CANCELADA');
    });

    it('debe arrojar error si la actividad a anular no existe', async () => {
      await expect(
        anularActUseCase.execute({
          id: 'id-inexistente',
          motivo: 'Motivo cualquiera',
          usuarioId: 'usr-1',
        })
      ).rejects.toThrowError(EntidadNoEncontradaError);
    });

    it('debe rechazar anulación con motivo vacío', async () => {
      const act = await registrarActUseCase.execute({
        tipoActividadId,
        loteId,
        cicloId,
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-1',
        superficieTrabajadaHa: 2.0,
      });

      await expect(
        anularActUseCase.execute({
          id: act.id,
          motivo: '',
          usuarioId: 'usr-1',
        })
      ).rejects.toThrowError(MotivoCancelacionRequeridoError);
    });

    it('debe impedir anular dos veces la misma actividad', async () => {
      const act = await registrarActUseCase.execute({
        tipoActividadId,
        loteId,
        cicloId,
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-1',
        superficieTrabajadaHa: 2.0,
      });

      await anularActUseCase.execute({
        id: act.id,
        motivo: 'Primera anulación',
        usuarioId: 'usr-1',
      });

      await expect(
        anularActUseCase.execute({
          id: act.id,
          motivo: 'Segunda anulación',
          usuarioId: 'usr-1',
        })
      ).rejects.toThrowError(ActividadYaCanceladaError);
    });
  });
});
