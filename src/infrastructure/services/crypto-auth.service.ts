import crypto from 'node:crypto';
import { PasswordInseguraError } from '../../core/domain/errors/domain.error.js';
import { PerfilUsuario } from '../../core/domain/entities/usuario.entity.js';

export interface TokenPayload {
  sub: string;
  email: string;
  nombre: string;
  apellido: string;
  perfil: PerfilUsuario;
  fincas: string[];
  iat?: number;
  exp?: number;
}

export class CryptoAuthService {
  private static readonly DEFAULT_SECRET = process.env.JWT_SECRET || 'agrul-jwt-super-secret-key-tucuman-bpa-2026';
  private static readonly SALT_LENGTH = 16;
  private static readonly ITERATIONS = 100000;
  private static readonly KEYLEN = 64;
  private static readonly DIGEST = 'sha512';

  /**
   * Valida la fortaleza de la contraseña según RNF-04:
   * Mínimo 8 caracteres, al menos una letra y un dígito numérico.
   */
  public static validarFortalezaPassword(password: string): void {
    if (!password || password.length < 8) {
      throw new PasswordInseguraError('La contraseña debe tener un mínimo de 8 caracteres (RNF-04).');
    }

    const tieneLetra = /[a-zA-Z]/.test(password);
    const tieneNumero = /\d/.test(password);

    if (!tieneLetra || !tieneNumero) {
      throw new PasswordInseguraError('La contraseña debe contener al menos una letra y un número (RNF-04).');
    }
  }

  /**
   * Hashea una contraseña con salt criptográfico usando PBKDF2-SHA512 (100.000 iteraciones).
   */
  public static hashPassword(password: string): { hash: string; salt: string } {
    this.validarFortalezaPassword(password);
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEYLEN, this.DIGEST).toString('hex');
    return { hash, salt };
  }

  /**
   * Verifica si la contraseña coincide con el hash y salt almacenados de forma inmune a ataques de tiempo (timing-safe).
   */
  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    if (!password || !hash || !salt) {
      return false;
    }
    const computedHash = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEYLEN, this.DIGEST).toString('hex');
    try {
      const hashBuffer = Buffer.from(hash, 'hex');
      const computedBuffer = Buffer.from(computedHash, 'hex');
      if (hashBuffer.length !== computedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(hashBuffer, computedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Genera un token JWT (RFC 7519) firmado con HMAC-SHA256.
   * Por defecto expira en 86400 segundos (24 horas).
   */
  public static generateToken(payload: TokenPayload, expiresInSeconds: number = 86400, secret: string = this.DEFAULT_SECRET): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Valida un token JWT: verifica formato, firma criptográfica y expiración.
   * Retorna el payload decodificado o null si el token es inválido o expiró.
   */
  public static verifyToken(token: string, secret: string = this.DEFAULT_SECRET): TokenPayload | null {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      const sigBuffer = Buffer.from(signature);
      const expectedSigBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
        return null;
      }

      const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const payload: TokenPayload = JSON.parse(payloadJson);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Token expirado
      }

      return payload;
    } catch {
      return null;
    }
  }
}
