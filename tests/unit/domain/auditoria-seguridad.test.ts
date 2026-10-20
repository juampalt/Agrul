import { describe, it, expect } from 'vitest';
import {
  AuditoriaSeguridadLog,
  AccionAuditoria,
} from '../../../src/core/domain/entities/auditoria-seguridad-log.entity.js';
import { Usuario } from '../../../src/core/domain/entities/usuario.entity.js';
import { AuditoriaInvalidaError } from '../../../src/core/domain/errors/domain.error.js';

describe('AGRUL-040: Dominio de Auditoría de Seguridad y Sesión (RF-M8-08 / RN-06)', () => {
  describe('AuditoriaSeguridadLog Entity', () => {
    it('debe instanciar correctamente un log con todas sus propiedades y deltas JSON', () => {
      const ahora = new Date().toISOString();
      const log = AuditoriaSeguridadLog.crear({
        id: '11111111-1111-4111-8111-111111111111',
        usuarioId: 'usr-admin-1',
        usuarioEmail: 'admin@agrul.com',
        accion: 'EDITAR',
        entidad: 'LOTE',
        entidadId: 'lote-123',
        valorPrevioJson: { estado: 'CREADO', cantidad: 1000 },
        valorNuevoJson: { estado: 'EN_PRODUCCION', cantidad: 1000 },
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: ahora,
      });

      expect(log.id).toBe('11111111-1111-4111-8111-111111111111');
      expect(log.usuarioId).toBe('usr-admin-1');
      expect(log.usuarioEmail).toBe('admin@agrul.com');
      expect(log.accion).toBe('EDITAR');
      expect(log.entidad).toBe('LOTE');
      expect(log.entidadId).toBe('lote-123');
      expect(log.valorPrevioJson).toEqual({ estado: 'CREADO', cantidad: 1000 });
      expect(log.valorNuevoJson).toEqual({ estado: 'EN_PRODUCCION', cantidad: 1000 });
      expect(log.ip).toBe('192.168.1.100');
      expect(log.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(log.timestamp).toBe(ahora);

      const json = log.toJSON();
      expect(json.accion).toBe('EDITAR');
      expect(json.valorPrevioJson).toEqual({ estado: 'CREADO', cantidad: 1000 });
      expect(json.valorNuevoJson).toEqual({ estado: 'EN_PRODUCCION', cantidad: 1000 });
    });

    it('debe rechazar la creación sin ID', () => {
      expect(() =>
        AuditoriaSeguridadLog.crear({
          id: '',
          accion: 'LOGIN',
          entidad: 'USUARIO',
        })
      ).toThrow(AuditoriaInvalidaError);
    });

    it('debe rechazar una acción de auditoría no permitida', () => {
      expect(() =>
        AuditoriaSeguridadLog.crear({
          id: '11111111-1111-4111-8111-111111111111',
          accion: 'ACCION_FANTASMA' as AccionAuditoria,
          entidad: 'USUARIO',
        })
      ).toThrow(AuditoriaInvalidaError);
    });

    it('debe rechazar una entidad vacía', () => {
      expect(() =>
        AuditoriaSeguridadLog.crear({
          id: '11111111-1111-4111-8111-111111111111',
          accion: 'LOGIN',
          entidad: '   ',
        })
      ).toThrow(AuditoriaInvalidaError);
    });

    it('debe reconstituir un log inmutable desde la base de datos', () => {
      const props = {
        id: '22222222-2222-4222-8222-222222222222',
        usuarioId: null,
        usuarioEmail: 'sistema@agrul.com',
        accion: 'EMITIR_REPORTE' as AccionAuditoria,
        entidad: 'REPORTE',
        entidadId: 'rep-001',
        valorPrevioJson: null,
        valorNuevoJson: { formato: 'PDF', codigo: 'INF-2026-001' },
        ip: null,
        userAgent: null,
        timestamp: new Date().toISOString(),
      };

      const log = AuditoriaSeguridadLog.reconstituir(props);
      expect(log.id).toBe(props.id);
      expect(log.accion).toBe('EMITIR_REPORTE');
      expect(log.valorNuevoJson).toEqual({ formato: 'PDF', codigo: 'INF-2026-001' });
    });
  });

  describe('Usuario Entity - debeCambiarPassword (RF-M8-08 / RF-M8-09)', () => {
    it('debe permitir configurar debeCambiarPassword y reiniciarlo a false al cambiar la password', () => {
      const usuario = Usuario.crear({
        id: 'usr-test-1',
        nombre: 'Pedro',
        apellido: 'Gómez',
        email: 'pedro@agrul.com',
        passwordHash: 'hash123',
        salt: 'salt123',
        perfil: 'OPERARIO',
        debeCambiarPassword: true,
      });

      expect(usuario.debeCambiarPassword).toBe(true);

      usuario.cambiarPassword('hashNuevo456', 'saltNuevo456');
      expect(usuario.debeCambiarPassword).toBe(false);
      expect(usuario.toJSON().debeCambiarPassword).toBe(false);
    });
  });
});
