import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';
import { CosechasRegistroFixture } from '../helpers/cosechas-registro-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: pesajes desde proceso compilado y HTTP real', () => {
  const f = new CosechasRegistroFixture();
  let proceso: ChildProcess | undefined, direccion = '';
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
  it('registra cosecha directa y programada con login real, pasadas, evento y transición persistidos', async () => {
    const login = await fetch(`${direccion}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: f.email, password: f.password }) });
    expect(login.status).toBe(200);
    const { data: { token } } = z.object({ data: z.object({ token: z.string() }) }).parse(await login.json());
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const directa = f.datosCosecha();
    expect((await fetch(`${direccion}/api/v1/cosechas`, { method: 'POST', headers, body: JSON.stringify(directa) })).status).toBe(201);
    const jornada = await fetch(`${direccion}/api/v1/cosechas-programadas`, { method: 'POST', headers, body: JSON.stringify(f.datos()) });
    expect(jornada.status).toBe(201);
    const { data: { id } } = z.object({ data: z.object({ id: z.string().uuid() }) }).parse(await jornada.json());
    const { cicloId: _cicloId, ...pesaje } = f.datosCosecha();
    const programada = { ...pesaje, origen: 'PROGRAMADA', cosechaProgramadaId: id, versionProgramacion: 1 };
    expect((await fetch(`${direccion}/api/v1/cosechas`, { method: 'POST', headers, body: JSON.stringify(programada) })).status).toBe(201);
    expect((await fetch(`${direccion}/api/v1/cosechas/${directa.operacionId}`, { headers })).status).toBe(200);
    const lista = await fetch(`${direccion}/api/v1/cosechas?cicloId=${f.cicloId}`, { headers });
    expect(lista.status).toBe(200);
    const listado = z.object({ data: z.array(z.object({ id: z.string(), cantidadCosechadaKg: z.number() })) }).parse(await lista.json());
    expect(listado.data).toHaveLength(2); expect(listado.data.every(c => c.cantidadCosechadaKg === 10.25)).toBe(true);
    expect((await fetch(`${direccion}/api/v1/cosechas/${directa.operacionId}`)).status).toBe(401);
    expect((await f.pool.query('select estado,cantidad_estimada_kg from cosechas_programadas where id=$1', [id])).rows[0]).toEqual({ estado: 'EJECUTADA', cantidad_estimada_kg: '100.25' });
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where tipo_evento='COSECHA'")).rows[0].n).toBe(2);
    expect((await f.pool.query('select cantidad_comercializable_kg,cantidad_descarte_kg from cosechas where id=$1', [programada.operacionId])).rows[0]).toEqual({ cantidad_comercializable_kg: null, cantidad_descarte_kg: null });
  });
});
