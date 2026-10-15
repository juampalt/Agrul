import { describe, it, expect } from 'vitest';
import {
  ServicioVerificacionCarencia,
  AplicacionAEvaluar,
} from '../../../src/core/domain/services/verificacion-carencia.service.js';

describe('Servicio de Dominio: ServicioVerificacionCarencia (AGRUL-026 / RF-M4-08 / RF-M4-09 / RN-14)', () => {
  describe('Cálculo de fechas límite (RN-14)', () => {
    it('debe calcular fechaFinCarencia sumando exactamente los días estipulados en rótulo', () => {
      const fechaFin = ServicioVerificacionCarencia.calcularFechaFinCarencia('2026-10-01', 14);
      expect(fechaFin).toBe('2026-10-15');
    });

    it('debe soportar carencia de 0 días (fecha fin igual a la fecha de aplicación)', () => {
      const fechaFin = ServicioVerificacionCarencia.calcularFechaFinCarencia('2026-10-01', 0);
      expect(fechaFin).toBe('2026-10-01');
    });

    it('debe calcular fechaFinReingreso sumando las horas de rótulo', () => {
      const fechaFin = ServicioVerificacionCarencia.calcularFechaFinReingreso('2026-10-01T08:00:00.000Z', 24);
      expect(fechaFin).toBe('2026-10-02T08:00:00.000Z');
    });
  });

  describe('Evaluación de Lote y Emisión de Alertas No Bloqueantes (RF-M4-09)', () => {
    const loteId = 'lote-123';

    it('debe indicar lote apto para cosecha si no tiene aplicaciones registradas', () => {
      const resultado = ServicioVerificacionCarencia.evaluarLote({
        loteId,
        aplicaciones: [],
        fechaEvaluacion: '2026-10-10',
      });

      expect(resultado.aptoParaCosecha).toBe(true);
      expect(resultado.aptoParaReingreso).toBe(true);
      expect(resultado.fechaSeguraCosecha).toBeNull();
      expect(resultado.totalAlertasCarencia).toBe(0);
      expect(resultado.alertasCarencia).toHaveLength(0);
      expect(resultado.advertencias).toHaveLength(0);
    });

    it('debe emitir alerta clara indicando producto aplicado, días restantes y fecha segura si fechaCosecha < fechaFinCarencia (RF-M4-09 / RN-14)', () => {
      const aplicaciones: AplicacionAEvaluar[] = [
        {
          id: 'apl-01',
          actividadId: 'act-01',
          loteId,
          cicloId: 'ciclo-01',
          fecha: '2026-10-01',
          lineas: [
            {
              insumoId: 'insumo-captan',
              cantidadTotal: 5,
              unidadMedidaId: 'KG',
              insumo: {
                id: 'insumo-captan',
                nombreComercial: 'Captan 80 WG',
                categoria: 'FITOSANITARIO',
                fichaFitosanitaria: {
                  principioActivo: 'Captan',
                  periodoCarenciaDias: 14,
                  periodoReingresoHoras: 24,
                  nroRegistroSenasa: 'SENASA-28941',
                },
              },
            },
          ],
        },
      ];

      // Evaluación el 2026-10-05 (4 días después de la aplicación, faltando 10 días para el 15)
      const resultado = ServicioVerificacionCarencia.evaluarLote({
        loteId,
        aplicaciones,
        fechaEvaluacion: '2026-10-05',
      });

      expect(resultado.aptoParaCosecha).toBe(false);
      expect(resultado.fechaSeguraCosecha).toBe('2026-10-15');
      expect(resultado.totalAlertasCarencia).toBe(1);

      const alerta = resultado.alertasCarencia[0];
      expect(alerta.nombreComercial).toBe('Captan 80 WG');
      expect(alerta.principioActivo).toBe('Captan');
      expect(alerta.nroRegistroSenasa).toBe('SENASA-28941');
      expect(alerta.periodoCarenciaDias).toBe(14);
      expect(alerta.fechaFinCarencia).toBe('2026-10-15');
      expect(alerta.diasRestantes).toBe(10);
      expect(alerta.mensajeAdvertencia).toContain('ADVERTENCIA DE SEGURIDAD ALIMENTARIA');
      expect(alerta.mensajeAdvertencia).toContain('Captan 80 WG');
      expect(alerta.mensajeAdvertencia).toContain('restan 10 días de carencia');
    });

    it('debe indicar apto si la fecha de cosecha es igual o posterior a fechaFinCarencia', () => {
      const aplicaciones: AplicacionAEvaluar[] = [
        {
          id: 'apl-01',
          actividadId: 'act-01',
          loteId,
          cicloId: 'ciclo-01',
          fecha: '2026-10-01',
          lineas: [
            {
              insumoId: 'insumo-captan',
              cantidadTotal: 5,
              unidadMedidaId: 'KG',
              insumo: {
                id: 'insumo-captan',
                nombreComercial: 'Captan 80 WG',
                categoria: 'FITOSANITARIO',
                fichaFitosanitaria: {
                  principioActivo: 'Captan',
                  periodoCarenciaDias: 14,
                  periodoReingresoHoras: 24,
                  nroRegistroSenasa: 'SENASA-28941',
                },
              },
            },
          ],
        },
      ];

      const resultado = ServicioVerificacionCarencia.evaluarLote({
        loteId,
        aplicaciones,
        fechaEvaluacion: '2026-10-15',
      });

      expect(resultado.aptoParaCosecha).toBe(true);
      expect(resultado.alertasCarencia).toHaveLength(0);
      expect(resultado.fechaSeguraCosecha).toBeNull();
    });

    it('debe calcular la fecha segura global considerando múltiples insumos en mezcla (RF-M4-06 / RF-M4-09)', () => {
      const aplicaciones: AplicacionAEvaluar[] = [
        {
          id: 'apl-mezcla',
          actividadId: 'act-01',
          loteId,
          cicloId: 'ciclo-01',
          fecha: '2026-10-01',
          lineas: [
            {
              insumoId: 'insumo-1',
              cantidadTotal: 2,
              unidadMedidaId: 'L',
              insumo: {
                id: 'insumo-1',
                nombreComercial: 'Fungicida Rápido',
                categoria: 'FITOSANITARIO',
                fichaFitosanitaria: {
                  principioActivo: 'Azoxistrobina',
                  periodoCarenciaDias: 7, // fin: 2026-10-08
                  periodoReingresoHoras: 12,
                  nroRegistroSenasa: 'SEN-001',
                },
              },
            },
            {
              insumoId: 'insumo-2',
              cantidadTotal: 1,
              unidadMedidaId: 'KG',
              insumo: {
                id: 'insumo-2',
                nombreComercial: 'Insecticida Prolongado',
                categoria: 'FITOSANITARIO',
                fichaFitosanitaria: {
                  principioActivo: 'Clorantraniliprol',
                  periodoCarenciaDias: 21, // fin: 2026-10-22
                  periodoReingresoHoras: 48,
                  nroRegistroSenasa: 'SEN-002',
                },
              },
            },
            {
              insumoId: 'insumo-fertilizante',
              cantidadTotal: 50,
              unidadMedidaId: 'KG',
              insumo: {
                id: 'insumo-fertilizante',
                nombreComercial: 'Urea Granulada',
                categoria: 'FERTILIZANTE',
                fichaFitosanitaria: null, // No aplica carencia
              },
            },
          ],
        },
      ];

      const resultado = ServicioVerificacionCarencia.evaluarLote({
        loteId,
        aplicaciones,
        fechaEvaluacion: '2026-10-05',
      });

      expect(resultado.aptoParaCosecha).toBe(false);
      expect(resultado.totalAlertasCarencia).toBe(2);
      // La fecha segura debe ser el 2026-10-22 (el más restrictivo de la mezcla)
      expect(resultado.fechaSeguraCosecha).toBe('2026-10-22');
    });

    it('debe emitir alerta de reingreso restringido si las horas no fueron superadas', () => {
      const aplicaciones: AplicacionAEvaluar[] = [
        {
          id: 'apl-reingreso',
          actividadId: 'act-01',
          loteId,
          cicloId: 'ciclo-01',
          fecha: '2026-10-01T08:00:00.000Z',
          lineas: [
            {
              insumoId: 'insumo-toxico',
              cantidadTotal: 3,
              unidadMedidaId: 'L',
              insumo: {
                id: 'insumo-toxico',
                nombreComercial: 'Acaricida Potente',
                categoria: 'FITOSANITARIO',
                fichaFitosanitaria: {
                  principioActivo: 'Abamectina',
                  periodoCarenciaDias: 14,
                  periodoReingresoHoras: 48,
                  nroRegistroSenasa: 'SEN-999',
                },
              },
            },
          ],
        },
      ];

      // Evaluación 12 horas después (fecha: 2026-10-01T20:00:00.000Z)
      const resultado = ServicioVerificacionCarencia.evaluarLote({
        loteId,
        aplicaciones,
        fechaEvaluacion: '2026-10-01T20:00:00.000Z',
      });

      expect(resultado.aptoParaReingreso).toBe(false);
      expect(resultado.alertasReingreso).toHaveLength(1);
      expect(resultado.alertasReingreso[0].horasRestantes).toBeGreaterThanOrEqual(1);
      expect(resultado.alertasReingreso[0].mensajeAdvertencia).toContain('ADVERTENCIA DE REINGRESO');
    });
  });
});
