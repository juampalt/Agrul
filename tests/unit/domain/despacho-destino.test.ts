import { describe, it, expect } from 'vitest';
import { DespachoDestino } from '../../../src/core/domain/entities/despacho-destino.entity.js';
import { Destinatario } from '../../../src/core/domain/entities/destinatario.entity.js';
import {
  DespachoInvalidoError,
  DestinatarioInvalidoError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Entidades de Dominio: Destinatario y DespachoDestino (AGRUL-029)', () => {
  describe('Destinatario (RF-M5-08)', () => {
    it('debe crear un destinatario válido con atributos completos', () => {
      const dest = Destinatario.crear({
        id: 'dest-001',
        nombre: 'Empaque Frutícola del Comahue S.A.',
        tipo: 'EMPAQUE',
        cuit: '30-71122334-9',
        direccion: 'Ruta 22 Km 1210',
        localidad: 'Cipolletti',
        provincia: 'Río Negro',
        contacto: 'Juan Martínez',
        telefono: '+54 299 4445555',
        email: 'contacto@empaquecomahue.com.ar',
      });

      expect(dest.id).toBe('dest-001');
      expect(dest.nombre).toBe('Empaque Frutícola del Comahue S.A.');
      expect(dest.tipo).toBe('EMPAQUE');
      expect(dest.cuit).toBe('30-71122334-9');
      expect(dest.activo).toBe(true);
      expect(dest.creadoEn).toBeDefined();
    });

    it('debe permitir activar y desactivar un destinatario', () => {
      const dest = Destinatario.crear({
        id: 'dest-002',
        nombre: 'Mayorista Central',
        tipo: 'MAYORISTA' as any,
      });

      expect(dest.activo).toBe(true);
      dest.desactivar();
      expect(dest.activo).toBe(false);
      dest.activar();
      expect(dest.activo).toBe(true);
    });

    it('debe lanzar DestinatarioInvalidoError si falta id o nombre', () => {
      expect(() =>
        Destinatario.crear({
          id: '',
          nombre: 'Industria Jugos',
          tipo: 'INDUSTRIA',
        })
      ).toThrow(DestinatarioInvalidoError);

      expect(() =>
        Destinatario.crear({
          id: 'dest-003',
          nombre: '   ',
          tipo: 'INDUSTRIA',
        })
      ).toThrow(DestinatarioInvalidoError);
    });
  });

  describe('DespachoDestino (RF-M5-07, RF-M5-10, RN-04, RN-09)', () => {
    const validProps = {
      id: 'desp-001',
      cosechaId: 'cos-123',
      destinatarioId: 'dest-001',
      tipoDestino: 'MERCADO_FRESCO' as const,
      cantidadEnviadaKg: 500,
      fecha: '2026-09-20',
      nroGuiaRemito: 'REM-0001-00045231',
      renspaFinca: '16.023.0.00142/00',
      productor: 'Agrícola Los Manzanos S.R.L.',
      precinto: 'PREC-99881',
      chofer: 'Carlos Benítez',
      patenteCamion: 'AF 342 JK',
      temperaturaTransporteC: 4.5,
      observaciones: 'Fruta transportada en bines plásticos refrigerados',
    };

    it('debe crear un despacho válido con todos los datos requeridos por BPA (RF-M5-10)', () => {
      const despacho = DespachoDestino.crear(validProps);

      expect(despacho.id).toBe('desp-001');
      expect(despacho.cosechaId).toBe('cos-123');
      expect(despacho.destinatarioId).toBe('dest-001');
      expect(despacho.tipoDestino).toBe('MERCADO_FRESCO');
      expect(despacho.cantidadEnviadaKg).toBe(500);
      expect(despacho.fecha).toBe('2026-09-20');
      expect(despacho.nroGuiaRemito).toBe('REM-0001-00045231');
      expect(despacho.renspaFinca).toBe('16.023.0.00142/00');
      expect(despacho.productor).toBe('Agrícola Los Manzanos S.R.L.');
      expect(despacho.precinto).toBe('PREC-99881');
      expect(despacho.temperaturaTransporteC).toBe(4.5);
    });

    it('debe rechazar un despacho con cantidad enviada menor o igual a cero', () => {
      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          cantidadEnviadaKg: 0,
        })
      ).toThrow(DespachoInvalidoError);

      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          cantidadEnviadaKg: -50,
        })
      ).toThrow(DespachoInvalidoError);
    });

    it('debe rechazar el despacho si falta el número de guía o remito (RF-M5-10)', () => {
      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          nroGuiaRemito: '',
        })
      ).toThrow(DespachoInvalidoError);
    });

    it('debe rechazar el despacho si falta el RENSPA de la finca de origen (RF-M5-10)', () => {
      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          renspaFinca: '   ',
        })
      ).toThrow(DespachoInvalidoError);
    });

    it('debe rechazar el despacho si falta la razón social o nombre del productor (RF-M5-10)', () => {
      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          productor: '',
        })
      ).toThrow(DespachoInvalidoError);
    });

    it('debe rechazar una fecha con formato inválido', () => {
      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          fecha: '20-09-2026',
        })
      ).toThrow(DespachoInvalidoError);
    });

    it('debe rechazar una fecha futura respecto al día de hoy (RN-04)', () => {
      expect(() =>
        DespachoDestino.crear({
          ...validProps,
          fecha: '2099-12-31',
        })
      ).toThrow(FechaFuturaInvalidaError);
    });

    it('debe permitir reconstituir un despacho desde persistencia y exportar a JSON', () => {
      const despacho = DespachoDestino.reconstituir({
        ...validProps,
        creadoEn: '2026-09-20T14:30:00.000Z',
      });

      expect(despacho.id).toBe('desp-001');
      const json = despacho.toJSON();
      expect(json.nroGuiaRemito).toBe('REM-0001-00045231');
      expect(json.creadoEn).toBe('2026-09-20T14:30:00.000Z');
    });
  });
});
