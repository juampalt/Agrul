import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { expect } from 'vitest';
import { CryptoAuthService, TokenPayload } from '../../src/infrastructure/services/crypto-auth.service.js';

async function verificarBase(pool: Pool) {
  const { rows } = await pool.query<{ nombre: string }>('select current_database() as nombre');
  const basesValidas = [
    'agrul_test_agrul_054',
    'agrul_test_agrul_055',
    'agrul_test_agrul_056',
    ...[1, 2, 3, 4].map(etapa => `agrul_test_agrul_052_etapa${etapa}`),
    ...[1, 2, 3, 4, 5].map(etapa => `agrul_test_agrul_054_etapa${etapa}`),
  ];
  if (!basesValidas.includes(rows[0]?.nombre)) {
    throw new Error('Operador de pruebas permitido solo en bases descartables de AGRUL-052, AGRUL-054, AGRUL-055 o AGRUL-056.');
  }
}

export async function autenticarOperadorPrueba(pool: Pool, app: FastifyInstance,
  datos: { sub: string; email: string; nombre: string; apellido: string; perfil?: string; password?: string }) {
  await verificarBase(pool);
  const password = datos.password ?? crypto.randomUUID() + 'aA1!';
  const { hash, salt } = CryptoAuthService.hashPassword(password);
  const perfil = datos.perfil ?? 'ADMINISTRADOR';
  await pool.query(`insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil,estado,debe_cambiar_password)
    values ($1,$2,$3,$4,$5,$6,$7,'ACTIVO',false)
    on conflict(id) do update set email=excluded.email,password_hash=excluded.password_hash,salt=excluded.salt,
      perfil=excluded.perfil,estado='ACTIVO',debe_cambiar_password=false,intentos_fallidos=0`,
  [datos.sub, datos.nombre, datos.apellido, datos.email, hash, salt, perfil]);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: datos.email, password } });
  expect(login.statusCode).toBe(200);
  return { authorization: `Bearer ${login.json<{ data: { token: string } }>().data.token}` };
}

/** Sesión firmada de fixture para ejercer guards con claims anteriores o restringidos. */
export async function emitirSesionPrueba(pool: Pool, payload: TokenPayload): Promise<string> {
  await verificarBase(pool);
  const { rows } = await pool.query<{ version_sesion: number }>('select version_sesion from usuarios where id=$1', [payload.sub]);
  if (!rows.length) throw new Error('El actor del fixture debe existir.');
  const token = CryptoAuthService.generateToken({ ...payload, versionSesion: rows[0].version_sesion });
  await pool.query('insert into sesiones_usuarios(token_hash,usuario_id,expira_en) values($1,$2,$3)',
    [CryptoAuthService.hashToken(token), payload.sub, new Date(Date.now() + 86400000).toISOString()]);
  return token;
}
