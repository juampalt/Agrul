import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';
import { PoscosechaFixture } from '../helpers/poscosecha-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: clasificación y acondicionamiento por HTTP real', () => {
  const f = new PoscosechaFixture();
  let proceso: ChildProcess | undefined, direccion = '';
  beforeAll(async () => {
    await f.preparar(url!);
    const puerto = createServer(); puerto.listen(0, '127.0.0.1'); await once(puerto, 'listening');
    const address = puerto.address(); if (!address || typeof address === 'string') throw new Error('No se pudo reservar el puerto.');
    direccion = `http://127.0.0.1:${address.port}`;
    await new Promise<void>((resolve, reject) => puerto.close(error => error ? reject(error) : resolve()));
    const env = { ...process.env }; for (const n of Object.keys(env)) if (/DATABASE_URL$/.test(n)) delete env[n];
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
  it('autentica, cosecha, clasifica, empaca y consulta saldos con eventos y persistencia reales', async () => {
    const login = await fetch(`${direccion}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: f.email, password: f.password }) });
    expect(login.status).toBe(200);
    const { data: { token } } = z.object({ data: z.object({ token: z.string() }) }).parse(await login.json());
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const cosecha = { ...f.datosCosecha(), cantidadCosechadaKg: 10 };
    expect((await fetch(`${direccion}/api/v1/cosechas`, { method: 'POST', headers, body: JSON.stringify(cosecha) })).status).toBe(201);
    const datos = f.datosClasificacion(cosecha.operacionId);
    const clasificada = await fetch(`${direccion}/api/v1/clasificaciones`, { method: 'POST', headers, body: JSON.stringify(datos) });
    expect(clasificada.status).toBe(201);
    const c = z.object({ data: z.object({ id: z.string(), partidas: z.array(z.object({ id: z.string(), categoria: z.string() })) }) }).parse(await clasificada.json()).data;
    const fresca = c.partidas.find(p => p.categoria === 'FRESCO'); expect(fresca).toBeDefined();
    const empaque = f.datosAcondicionamiento(fresca!.id, 3);
    expect((await fetch(`${direccion}/api/v1/acondicionamientos`, { method: 'POST', headers, body: JSON.stringify(empaque) })).status).toBe(201);
    const detalle = await fetch(`${direccion}/api/v1/partidas-produccion/${fresca!.id}`, { headers }); expect(detalle.status).toBe(200);
    expect(await detalle.json()).toMatchObject({ data: { cantidadDisponibleKg: 6, cantidadAcondicionadaKg: 3, cantidadSinAcondicionarKg: 3 } });
    expect((await fetch(`${direccion}/api/v1/acondicionamientos/${empaque.operacionId}`, { headers })).status).toBe(200);
    expect((await fetch(`${direccion}/api/v1/clasificaciones/${c.id}`, { headers })).status).toBe(200);
    expect((await fetch(`${direccion}/api/v1/partidas-produccion/${fresca!.id}`)).status).toBe(401);
    expect((await f.pool.query('select sum(cantidad_inicial_kg)::text as kg from partidas_produccion where clasificacion_id=$1', [c.id])).rows[0].kg).toBe('9.00');
    expect((await f.pool.query("select tipo_evento from eventos_trazabilidad order by timestamp_servidor,id")).rows.map(r => r.tipo_evento)).toEqual(['COSECHA','CLASIFICACION','ACONDICIONAMIENTO']);
  });
});
