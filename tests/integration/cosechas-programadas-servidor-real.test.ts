import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';
import { JornadasPostgresFixture, RUTA_JORNADAS as ruta, URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: proceso compilado y HTTP real', () => {
  const f = new JornadasPostgresFixture();
  let proceso: ChildProcess | undefined;
  let direccion = '';
  beforeAll(async () => {
    await f.preparar(url!);
    const puerto = createServer(); puerto.listen(0, '127.0.0.1'); await once(puerto, 'listening');
    const address = puerto.address();
    if (!address || typeof address === 'string') throw new Error('No se pudo reservar el puerto.');
    direccion = `http://127.0.0.1:${address.port}`;
    await new Promise<void>((resolve, reject) => puerto.close(error => error ? reject(error) : resolve()));
    const env = { ...process.env };
    for (const nombre of Object.keys(env)) if (/DATABASE_URL$/.test(nombre)) delete env[nombre];
    proceso = spawn(process.execPath, [resolve('dist/src/index.js')], { windowsHide: true, stdio: 'ignore', env: {
      ...env, DATABASE_URL: f.aislado.connectionString, HOST: '127.0.0.1', PORT: String(address.port),
      NODE_ENV: 'production', JWT_SECRET: randomBytes(48).toString('base64url'),
    } });
    const inicio = Date.now();
    while (Date.now() - inicio < 10000) {
      if (proceso.exitCode !== null) throw new Error('El proceso compilado terminó antes de iniciar; ejecutar npm run build.');
      try { if ((await fetch(`${direccion}/api/v1/health`)).ok) return; } catch { /* Arranque del proceso propio. */ }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('El servidor no inició dentro del plazo.');
  }, 30000);
  afterAll(async () => {
    try {
      if (proceso && proceso.exitCode === null) { const cerrado = once(proceso, 'exit'); proceso.kill(); await cerrado; }
    } finally { await f.cerrar(); }
  });
  it('autentica y completa programación, consulta, reprogramación, cancelación e historial con persistencia', async () => {
    const login = await fetch(`${direccion}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: f.email, password: f.password }) });
    expect(login.status).toBe(200);
    const { data: { token } } = z.object({ data: z.object({ token: z.string() }) }).parse(await login.json());
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const datos = f.datos();
    const alta = await fetch(`${direccion}${ruta}`, { method: 'POST', headers, body: JSON.stringify(datos) });
    expect(alta.status).toBe(201);
    const { data: { id } } = z.object({ data: z.object({ id: z.string().uuid() }) }).parse(await alta.json());
    expect((await fetch(`${direccion}${ruta}/${id}`, { headers })).status).toBe(200);
    expect((await fetch(`${direccion}${ruta}?cicloId=${f.cicloId}`, { headers })).status).toBe(200);
    expect((await fetch(`${direccion}${ruta}/${id}/reprogramar`, { method: 'PATCH', headers,
      body: JSON.stringify({ version: 1, fechaPrevista: '2026-11-20' }) })).status).toBe(200);
    expect((await fetch(`${direccion}${ruta}/${id}/cancelar`, { method: 'PATCH', headers,
      body: JSON.stringify({ version: 2, motivoCancelacion: 'Lluvia HTTP real' }) })).status).toBe(200);
    expect((await fetch(`${direccion}${ruta}/${id}/historial`, { headers })).status).toBe(200);
    expect((await fetch(`${direccion}${ruta}/${id}`)).status).toBe(401);
    const { rows } = await f.pool.query('select estado,version,cantidad_estimada_kg from cosechas_programadas where id=$1', [id]);
    expect(rows[0]).toEqual({ estado: 'CANCELADA', version: 3, cantidad_estimada_kg: '100.25' });
    expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [id])).rows[0].n).toBe(3);
  });
});
