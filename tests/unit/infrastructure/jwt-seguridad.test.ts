import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CryptoAuthService } from '../../../src/infrastructure/services/crypto-auth.service.js';

const secret = 'clave-exclusiva-de-pruebas-de-mas-de-32-bytes';
const payload = { sub: 'usuario-1', email: 'uno@example.test', nombre: 'Uno', apellido: 'Prueba',
  perfil: 'ADMINISTRADOR' as const, fincas: [] };

function firmar(claims: object, header = { alg: 'HS256', typ: 'JWT' }) {
  const partes = [header, claims].map(value => Buffer.from(JSON.stringify(value)).toString('base64url'));
  const contenido = partes.join('.');
  return `${contenido}.${crypto.createHmac('sha256', secret).update(contenido).digest('base64url')}`;
}

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('AGRUL-053 CU59: validación estricta JWT', () => {
  it('requiere un secreto externo suficientemente largo en producción', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', '');
    expect(() => CryptoAuthService.generateToken(payload)).toThrow('JWT_SECRET');
    vi.stubEnv('JWT_SECRET', 'corta');
    expect(() => CryptoAuthService.generateToken(payload)).toThrow('JWT_SECRET');
    vi.stubEnv('JWT_SECRET', secret);
    expect(CryptoAuthService.verifyToken(CryptoAuthService.generateToken(payload))?.sub).toBe(payload.sub);
  });

  it('rechaza al llegar al segundo exacto de expiración', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const token = CryptoAuthService.generateToken(payload, 60, secret);
    expect(CryptoAuthService.verifyToken(token, secret)?.sub).toBe(payload.sub);
    vi.advanceTimersByTime(60000);
    expect(CryptoAuthService.verifyToken(token, secret)).toBeNull();
  });

  it('rechaza claims incompletos o inválidos aun con firma correcta', () => {
    const now = Math.floor(Date.now() / 1000);
    const valido = { ...payload, iat: now, exp: now + 60 };
    for (const claims of [payload, { ...valido, exp: undefined }, { ...valido, sub: '' },
      { ...valido, perfil: 'SUPERUSUARIO' }, { ...valido, fincas: 'todas' },
      { ...valido, iat: now + 30 }, { ...valido, exp: 'infinito' }]) {
      expect(CryptoAuthService.verifyToken(firmar(claims), secret)).toBeNull();
    }
    expect(CryptoAuthService.verifyToken(firmar(valido, { alg: 'none', typ: 'JWT' }), secret)).toBeNull();
    expect(CryptoAuthService.verifyToken(firmar(valido), 'otra-clave')).toBeNull();
  });
});
