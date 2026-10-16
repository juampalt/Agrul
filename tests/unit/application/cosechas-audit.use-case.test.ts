import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import {
  RegistrarCosechaUseCase,
  AnularCosechaUseCase,
  ModificarCosechaUseCase,
} from '../../../src/application/use-cases/cosechas.use-cases.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import { TipoEventoEnum } from '../../../src/core/domain/value-objects/tipo-evento.vo.js';

describe('Casos de Uso: Cosechas - Alerta de Carencia y Auditoría (AGRUL-030 / RF-M5-11, RF-M5-12, RN-05, RN-06)', () => {
  let cosechasRepo: InMemoryCosechasRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let eventosRepo: InMemoryEventosRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;

  let registrarCosechaUC: RegistrarCosechaUseCase;
  let anularCosechaUC: AnularCosechaUseCase;
  let modificarCosechaUC: ModificarCosechaUseCase;

  const hoyRef = new Date('2026-10-15T12:00:00Z');
  let lote1: Lote;
  let ciclo1: CicloProductivo;

  beforeEach(async () => {
    cosechasRepo = new InMemoryCosechasRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    eventosRepo = new InMemoryEventosRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();

    registrarCosechaUC = new RegistrarCosechaUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo,
      eventosRepo,
      aplicacionesRepo,
      insumosRepo
    );

    anularCosechaUC = new AnularCosechaUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo,
      eventosRepo
    );

    modificarCosechaUC = new ModificarCosechaUseCase(
      cosechasRepo,
      lotesRepo,
      ciclosRepo,
      eventosRepo
    );

    lote1 = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-001',
      producto: 'Pera Williams',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote1);

    ciclo1 = CicloProductivo.crear({
      id: crypto.randomUUID(),
      codigoCiclo: 'CICLO-2026-001',
      loteId: lote1.id,
      cultivo: 'Pera Williams',
      superficieCultivadaHa: 5.0,
      fechaInicio: '2026-08-01',
    });
    await ciclosRepo.guardar(ciclo1);
  });

  describe('Alerta de Carencia en Cosecha (RF-M5-11 / RN-14)', () => {
    it('debe registrar la cosecha con advertencia si viola el período de carencia fitosanitaria vigente (no bloqueante)', async () => {
      // 1. Crear insumo con carencia de 14 días
      const fungicida = InsumoCatalogo.crear({
        id: crypto.randomUUID(),
        nombreComercial: 'Captan 80 WG',
        categoria: 'FITOSANITARIO',
        unidadMedidaId: 'KG',
        presentacion: 'Bolsa 1 kg',
        fichaFitosanitaria: {
          principioActivo: 'Captan',
          periodoCarenciaDias: 14,
          periodoReingresoHoras: 24,
          nroRegistroSenasa: 'SENASA-F-1234',
        },
      });
      await insumosRepo.guardar(fungicida);

      // 2. Registrar aplicación 5 días antes de la cosecha (dentro del período de 14 días)
      const aplicacion = AplicacionAgricola.crear({
        id: crypto.randomUUID(),
        actividadId: crypto.randomUUID(),
        loteId: lote1.id,
        cicloId: ciclo1.id,
        fecha: '2026-10-01',
        metodo: 'FOLIAR',
        motivo: 'Control preventivo de sarna',
        equipoAplicacion: 'Pulverizadora de arrastre',
        lineas: [
          {
            insumoId: fungicida.id,
            cantidadTotal: 5.0,
            unidadMedidaId: 'KG',
          },
        ],
        fechaReferenciaHoy: hoyRef,
      });
      await aplicacionesRepo.guardar(aplicacion);

      // 3. Registrar cosecha el 2026-10-06 (restan 9 días de carencia)
      const cosechaDto = await registrarCosechaUC.execute(
        {
          loteId: lote1.id,
          cicloId: ciclo1.id,
          fecha: '2026-10-06',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 900,
          cantidadDescarteKg: 100,
          motivoDescarte: 'CALIBRE',
        },
        hoyRef
      );

      // La cosecha se registró exitosamente (no bloqueante)
      expect(cosechaDto.id).toBeDefined();
      expect(cosechaDto.cantidadComercializableKg).toBe(900);

      // Se adjuntó la alerta clara de carencia
      expect(cosechaDto.alertaCarencia).not.toBeNull();
      expect(cosechaDto.alertaCarencia?.aptoParaCosecha).toBe(false);
      expect(cosechaDto.alertaCarencia?.totalAlertasCarencia).toBe(1);
      expect(cosechaDto.alertaCarencia?.alertasCarencia[0].nombreComercial).toBe('Captan 80 WG');
      expect(cosechaDto.alertaCarencia?.alertasCarencia[0].diasRestantes).toBe(9);
      expect(cosechaDto.alertaCarencia?.advertencias[0]).toContain('ADVERTENCIA DE SEGURIDAD ALIMENTARIA');

      // Se guardó en el lote y eventos
      const loteActualizado = await lotesRepo.buscarPorId(lote1.id);
      expect(loteActualizado?.cantidadActual).toBe(900);
    });

    it('no debe emitir alerta si la cosecha se realiza después de cumplida la carencia', async () => {
      const cosechaDto = await registrarCosechaUC.execute(
        {
          loteId: lote1.id,
          cicloId: ciclo1.id,
          fecha: '2026-10-10',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
        hoyRef
      );

      expect(cosechaDto.alertaCarencia).toBeNull();
    });
  });

  describe('AnularCosechaUseCase (RF-M5-12 / RN-05 / RN-06)', () => {
    it('debe anular la cosecha, descontar el saldo del lote y emitir evento compensatorio', async () => {
      // 1. Cosechar 1000 kg comercializables
      const cosechaDto = await registrarCosechaUC.execute(
        {
          loteId: lote1.id,
          cicloId: ciclo1.id,
          fecha: '2026-10-10',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 1000,
          cantidadDescarteKg: 0,
        },
        hoyRef
      );

      let lote = await lotesRepo.buscarPorId(lote1.id);
      expect(lote?.cantidadActual).toBe(1000);

      // 2. Anular la cosecha
      const usuarioId = crypto.randomUUID();
      const anuladaDto = await anularCosechaUC.execute(
        {
          cosechaId: cosechaDto.id,
          usuarioId,
          motivo: 'Cosecha registrada en lote incorrecto por confusión de cuadrilla',
        },
        hoyRef
      );

      expect(anuladaDto.estado).toBe('ANULADA');
      expect(anuladaDto.motivoAnulacion).toContain('confusión de cuadrilla');
      expect(anuladaDto.usuarioAnulacionId).toBe(usuarioId);

      // 3. Balance del lote descontado a 0
      lote = await lotesRepo.buscarPorId(lote1.id);
      expect(lote?.cantidadActual).toBe(0);

      // 4. TraceEvent de tipo COMPENSACION_ANULACION registrado
      const eventos = await eventosRepo.listarPorLote(lote1.id);
      const compensatorio = eventos.find(e => e.tipoEvento === TipoEventoEnum.COMPENSACION_ANULACION);
      expect(compensatorio).toBeDefined();
      expect(compensatorio?.eventoReferenciadoId).toBe(cosechaDto.id);
      expect((compensatorio?.payloadEspecifico as any).motivo).toContain('confusión de cuadrilla');
    });
  });

  describe('ModificarCosechaUseCase (RF-M5-12 / RN-05 / RN-06)', () => {
    it('debe modificar cantidades, auditar en historial y ajustar el balance de masa con evento compensatorio', async () => {
      // 1. Registrar cosecha inicial de 1000 kg (800 comercializable, 200 descarte)
      const cosechaDto = await registrarCosechaUC.execute(
        {
          loteId: lote1.id,
          cicloId: ciclo1.id,
          fecha: '2026-10-10',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 800,
          cantidadDescarteKg: 200,
          motivoDescarte: 'CALIBRE',
        },
        hoyRef
      );

      let lote = await lotesRepo.buscarPorId(lote1.id);
      expect(lote?.cantidadActual).toBe(800);

      // 2. Modificar cosecha: reclasificación sube comercializable a 900 kg (delta +100 kg)
      const usuarioId = crypto.randomUUID();
      const modifDto = await modificarCosechaUC.execute(
        {
          cosechaId: cosechaDto.id,
          usuarioId,
          motivo: 'Recuperación de fruta tras calibrado de precisión',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 900,
          cantidadDescarteKg: 100,
          motivoDescarte: 'CALIBRE_FINAL',
        },
        hoyRef
      );

      expect(modifDto.cantidadComercializableKg).toBe(900);
      expect(modifDto.cantidadDescarteKg).toBe(100);
      expect(modifDto.historialModificaciones).toHaveLength(1);
      expect(modifDto.historialModificaciones[0].usuarioId).toBe(usuarioId);

      // 3. Balance del lote incrementado a 900
      lote = await lotesRepo.buscarPorId(lote1.id);
      expect(lote?.cantidadActual).toBe(900);

      // 4. TraceEvent de tipo COMPENSACION_AJUSTE registrado
      const eventos = await eventosRepo.listarPorLote(lote1.id);
      const compensatorio = eventos.find(e => e.tipoEvento === TipoEventoEnum.COMPENSACION_AJUSTE);
      expect(compensatorio).toBeDefined();
      expect(compensatorio?.eventoReferenciadoId).toBe(cosechaDto.id);
      expect((compensatorio?.payloadEspecifico as any).deltaComercializableKg).toBe(100);
    });
  });
});
