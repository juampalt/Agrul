import { describe, it, expect } from 'vitest';
import { Usuario, UsuarioInvalidoError } from '../../../src/core/domain/entities/usuario.entity.js';
import { UsuarioFinca } from '../../../src/core/domain/entities/usuario-finca.entity.js';
import { CryptoAuthService } from '../../../src/infrastructure/services/crypto-auth.service.js';
import { PasswordInseguraError } from '../../../src/core/domain/errors/domain.error.js';

describe('AGRUL-038: Dominio de Usuario, Criptografía y Control de Acceso', () => {
  const hashValido = 'a'.repeat(128);
  const saltValido = 'b'.repeat(32);

  describe('Entidad Usuario', () => {
    it('debe crear un usuario válido con estado ACTIVO por defecto', () => {
      const usuario = Usuario.crear({
        id: 'usr-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan.perez@agrul.com.ar',
        passwordHash: hashValido,
        salt: saltValido,
        perfil: 'ENCARGADO',
      });

      expect(usuario.id).toBe('usr-1');
      expect(usuario.nombre).toBe('Juan');
      expect(usuario.apellido).toBe('Pérez');
      expect(usuario.nombreCompleto).toBe('Juan Pérez');
      expect(usuario.email).toBe('juan.perez@agrul.com.ar');
      expect(usuario.perfil).toBe('ENCARGADO');
      expect(usuario.estado).toBe('ACTIVO');
      expect(usuario.intentosFallidos).toBe(0);
      expect(usuario.estaActivo).toBe(true);
      expect(usuario.estaBloqueado).toBe(false);
    });

    it('debe rechazar nombres o apellidos vacíos', () => {
      expect(() =>
        Usuario.crear({
          id: 'usr-2',
          nombre: '   ',
          apellido: 'Pérez',
          email: 'test@agrul.com',
          passwordHash: hashValido,
          salt: saltValido,
          perfil: 'OPERARIO',
        })
      ).toThrow(UsuarioInvalidoError);

      expect(() =>
        Usuario.crear({
          id: 'usr-2',
          nombre: 'Juan',
          apellido: '',
          email: 'test@agrul.com',
          passwordHash: hashValido,
          salt: saltValido,
          perfil: 'OPERARIO',
        })
      ).toThrow(UsuarioInvalidoError);
    });

    it('debe validar el formato del correo electrónico', () => {
      expect(() =>
        Usuario.crear({
          id: 'usr-3',
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'email-invalido',
          passwordHash: hashValido,
          salt: saltValido,
          perfil: 'OPERARIO',
        })
      ).toThrow(UsuarioInvalidoError);
    });

    it('debe rechazar perfiles no contemplados en el sistema', () => {
      expect(() =>
        Usuario.crear({
          id: 'usr-4',
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan@agrul.com',
          passwordHash: hashValido,
          salt: saltValido,
          perfil: 'HACKER' as any,
        })
      ).toThrow(UsuarioInvalidoError);
    });

    it('debe bloquear la cuenta tras 5 intentos fallidos consecutivos (RF-M8-03)', () => {
      const usuario = Usuario.crear({
        id: 'usr-5',
        nombre: 'Carlos',
        apellido: 'Gómez',
        email: 'carlos@agrul.com',
        passwordHash: hashValido,
        salt: saltValido,
        perfil: 'OPERARIO',
      });

      expect(usuario.intentosFallidos).toBe(0);
      expect(usuario.estaBloqueado).toBe(false);

      // Intentos 1 a 4
      for (let i = 1; i <= 4; i++) {
        const res = usuario.registrarIntentoFallido(5);
        expect(res.bloqueado).toBe(false);
        expect(res.intentosActuales).toBe(i);
        expect(usuario.estaBloqueado).toBe(false);
      }

      // Intento 5: se bloquea
      const res5 = usuario.registrarIntentoFallido(5);
      expect(res5.bloqueado).toBe(true);
      expect(res5.intentosActuales).toBe(5);
      expect(usuario.estaBloqueado).toBe(true);
      expect(usuario.estado).toBe('BLOQUEADO');
    });

    it('debe permitir desbloqueo administrativo y reiniciar el contador', () => {
      const usuario = Usuario.crear({
        id: 'usr-6',
        nombre: 'Ana',
        apellido: 'López',
        email: 'ana@agrul.com',
        passwordHash: hashValido,
        salt: saltValido,
        perfil: 'ASESOR_AGRONOMO',
      });

      usuario.bloquear();
      expect(usuario.estaBloqueado).toBe(true);

      usuario.desbloquear();
      expect(usuario.estaBloqueado).toBe(false);
      expect(usuario.estado).toBe('ACTIVO');
      expect(usuario.intentosFallidos).toBe(0);
    });

    it('debe registrar el acceso exitoso y actualizar ultimoAcceso', () => {
      const usuario = Usuario.crear({
        id: 'usr-7',
        nombre: 'Sofía',
        apellido: 'Ruiz',
        email: 'sofia@agrul.com',
        passwordHash: hashValido,
        salt: saltValido,
        perfil: 'ADMINISTRADOR',
      });

      usuario.registrarIntentoFallido();
      expect(usuario.intentosFallidos).toBe(1);

      usuario.registrarAccesoExitoso();
      expect(usuario.intentosFallidos).toBe(0);
      expect(usuario.ultimoAcceso).toBeDefined();
    });
  });

  describe('Entidad UsuarioFinca', () => {
    it('debe crear una asignación activa por defecto y permitir activar/desactivar', () => {
      const asignacion = UsuarioFinca.crear({
        id: 'asig-1',
        usuarioId: 'usr-1',
        fincaId: 'finca-1',
      });

      expect(asignacion.id).toBe('asig-1');
      expect(asignacion.usuarioId).toBe('usr-1');
      expect(asignacion.fincaId).toBe('finca-1');
      expect(asignacion.activo).toBe(true);

      asignacion.desactivar();
      expect(asignacion.activo).toBe(false);

      asignacion.activar();
      expect(asignacion.activo).toBe(true);
    });
  });

  describe('CryptoAuthService (Seguridad RNF-04)', () => {
    it('debe validar la fortaleza de la contraseña (mínimo 8 caracteres, letras y números)', () => {
      expect(() => CryptoAuthService.validarFortalezaPassword('corta')).toThrow(PasswordInseguraError);
      expect(() => CryptoAuthService.validarFortalezaPassword('sololetras')).toThrow(PasswordInseguraError);
      expect(() => CryptoAuthService.validarFortalezaPassword('12345678')).toThrow(PasswordInseguraError);
      expect(() => CryptoAuthService.validarFortalezaPassword('Valida1234')).not.toThrow();
    });

    it('debe hashear con salt único y verificar contraseñas correctas e incorrectas', () => {
      const p1 = 'Agrul2026!';
      const { hash: h1, salt: s1 } = CryptoAuthService.hashPassword(p1);
      const { hash: h2, salt: s2 } = CryptoAuthService.hashPassword(p1);

      // Los salts deben ser únicos y aleatorios
      expect(s1).not.toBe(s2);
      expect(h1).not.toBe(h2);

      // Verificación exitosa
      expect(CryptoAuthService.verifyPassword(p1, h1, s1)).toBe(true);
      expect(CryptoAuthService.verifyPassword(p1, h2, s2)).toBe(true);

      // Verificación fallida
      expect(CryptoAuthService.verifyPassword('PasswordErronea123', h1, s1)).toBe(false);
      expect(CryptoAuthService.verifyPassword('', h1, s1)).toBe(false);
    });

    it('debe emitir y validar tokens JWT válidos, detectando tokens manipulados o expirados', () => {
      const token = CryptoAuthService.generateToken({
        sub: 'usr-100',
        email: 'admin@agrul.com',
        nombre: 'Administrador',
        apellido: 'General',
        perfil: 'ADMINISTRADOR',
        fincas: ['finca-1', 'finca-2'],
      }, 3600);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = CryptoAuthService.verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('usr-100');
      expect(decoded?.email).toBe('admin@agrul.com');
      expect(decoded?.perfil).toBe('ADMINISTRADOR');
      expect(decoded?.fincas).toEqual(['finca-1', 'finca-2']);

      // Token manipulado
      const tokenManipulado = token.slice(0, -5) + 'xxxxx';
      expect(CryptoAuthService.verifyToken(tokenManipulado)).toBeNull();

      // Token expirado (expiración -10s)
      const tokenExpirado = CryptoAuthService.generateToken({
        sub: 'usr-100',
        email: 'admin@agrul.com',
        nombre: 'Admin',
        apellido: 'General',
        perfil: 'ADMINISTRADOR',
        fincas: [],
      }, -10);

      expect(CryptoAuthService.verifyToken(tokenExpirado)).toBeNull();
    });
  });
});
