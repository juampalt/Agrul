import { describe, it, expect } from 'vitest';
import {
  ObservacionMonitoreo,
  SintomasMonitoreoInvalidoError,
} from '../../../src/core/domain/entities/observacion-monitoreo.entity.js';
import {
  ActividadAgricola,
  MotivoCancelacionRequeridoError,
  ActividadYaCanceladaError,
} from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { FechaFuturaInvalidaError } from '../../../src/core/domain/errors/domain.error.js';

describe('AGRUL-023: Entidad de Dominio ObservacionMonitoreo y Anulación de Labores', () => {
  const hoyRef = new Date('2026-10-14T12:00:00.000Z');

  describe('ObservacionMonitoreo (RF-M3-11)', () => {
    it('debe crear exitosamente una observación de monitoreo válida', () => {
      const obs = ObservacionMonitoreo.crear({
        id: 'obs-001',
        loteId: 'lote-101',
        cicloId: 'ciclo-202',
        fecha: '2026-10-14',
        sintomas: 'Presencia de manchas amarillas en bordes de hojas basales',
        plagas: 'Arañuela roja (Tetranychus urticae)',
        estadoCultivo: 'FLORACION',
        fotosUrls: ['https://storage.agrul.local/fotos/obs-001-1.jpg'],
        usuarioId: 'usr-agronomo-1',
        fechaReferenciaHoy: hoyRef,
      });

      expect(obs.id).toBe('obs-001');
      expect(obs.loteId).toBe('lote-101');
      expect(obs.cicloId).toBe('ciclo-202');
      expect(obs.fecha).toBe('2026-10-14');
      expect(obs.sintomas).toContain('manchas amarillas');
      expect(obs.plagas).toBe('Arañuela roja (Tetranychus urticae)');
      expect(obs.estadoCultivo).toBe('FLORACION');
      expect(obs.fotosUrls).toHaveLength(1);
      expect(obs.usuarioId).toBe('usr-agronomo-1');
    });

    it('debe rechazar observaciones con síntomas vacíos o menores a 3 caracteres', () => {
      expect(() => {
        ObservacionMonitoreo.crear({
          id: 'obs-002',
          loteId: 'lote-101',
          cicloId: 'ciclo-202',
          fecha: '2026-10-14',
          sintomas: 'ab',
          usuarioId: 'usr-1',
          fechaReferenciaHoy: hoyRef,
        });
      }).toThrowError(SintomasMonitoreoInvalidoError);
    });

    it('debe rechazar observaciones con fecha futura (RN-04)', () => {
      expect(() => {
        ObservacionMonitoreo.crear({
          id: 'obs-003',
          loteId: 'lote-101',
          cicloId: 'ciclo-202',
          fecha: '2026-10-25',
          sintomas: 'Presencia de plagas',
          usuarioId: 'usr-1',
          fechaReferenciaHoy: hoyRef,
        });
      }).toThrowError(FechaFuturaInvalidaError);
    });
  });

  describe('Anulación Auditada de Actividad (RF-M3-12, RN-05, RN-06)', () => {
    it('debe permitir anular una actividad ejecutada con motivo obligatorio', () => {
      const act = ActividadAgricola.registrar({
        id: 'act-001',
        codigoActividad: 'ACT-2026-001',
        tipoActividadId: 'tipo-01',
        loteId: 'lote-101',
        cicloId: 'ciclo-202',
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-1',
        superficieTrabajadaHa: 2.5,
        fechaReferenciaHoy: hoyRef,
      });

      expect(act.estado).toBe('REALIZADA');

      act.anular('Error de carga de parcela, correspondía a cuadro B', hoyRef);

      expect(act.estado).toBe('CANCELADA');
      expect(act.motivoCancelacion).toBe('Error de carga de parcela, correspondía a cuadro B');
      expect(act.canceladoEn).toBe(hoyRef.toISOString());
    });

    it('debe exigir motivo de anulación no vacío', () => {
      const act = ActividadAgricola.registrar({
        id: 'act-002',
        codigoActividad: 'ACT-2026-002',
        tipoActividadId: 'tipo-01',
        loteId: 'lote-101',
        cicloId: 'ciclo-202',
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-1',
        superficieTrabajadaHa: 2.5,
        fechaReferenciaHoy: hoyRef,
      });

      expect(() => {
        act.anular('   ');
      }).toThrowError(MotivoCancelacionRequeridoError);
    });

    it('debe impedir re-anular una actividad que ya se encuentra cancelada', () => {
      const act = ActividadAgricola.registrar({
        id: 'act-003',
        codigoActividad: 'ACT-2026-003',
        tipoActividadId: 'tipo-01',
        loteId: 'lote-101',
        cicloId: 'ciclo-202',
        fechaHecho: '2026-10-14',
        usuarioCargaId: 'usr-1',
        superficieTrabajadaHa: 2.5,
        fechaReferenciaHoy: hoyRef,
      });

      act.anular('Primer motivo', hoyRef);

      expect(() => {
        act.anular('Segundo intento', hoyRef);
      }).toThrowError(ActividadYaCanceladaError);
    });
  });
});
