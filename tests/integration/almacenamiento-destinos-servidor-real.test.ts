import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';
import { AlmacenamientoProduccionFixture } from '../helpers/almacenamiento-produccion-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: cámaras y destinos desde el proceso compilado', () => {
  const f = new AlmacenamientoProduccionFixture();
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
    try { if (proceso && proceso.exitCode === null) { const cerrado = once(proceso, 'exit'); proceso.kill(); await cerrado; } }
    finally { await f.cerrar(); }
  });
  it('completa cosecha, clasificación, cámara, ingreso, destino y salida conservando la masa', async () => {
    const login = await fetch(`${direccion}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: f.email, password: f.password }) }); expect(login.status).toBe(200);
    const { data: { token } } = z.object({ data: z.object({ token: z.string() }) }).parse(await login.json());
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const post = (ruta: string, datos: unknown) => fetch(`${direccion}/api/v1/${ruta}`, { method: 'POST', headers, body: JSON.stringify(datos) });
    const cosecha = { ...f.datosCosecha(), cantidadCosechadaKg: 10 };
    expect((await post('cosechas', cosecha)).status).toBe(201);
    const clasificada = await post('clasificaciones', { ...f.datosClasificacion(cosecha.operacionId), kgFresco: 10, kgIndustria: 0, kgDescarte: 0, motivosDescarte: [] });
    expect(clasificada.status).toBe(201);
    const partida = z.object({ data: z.object({ partidas: z.array(z.object({ id: z.string() })) }) }).parse(await clasificada.json()).data.partidas[0].id;
    expect((await post('acondicionamientos', f.datosAcondicionamiento(partida))).status).toBe(201);
    const camara = f.datosCamara(); expect((await post('almacenamiento/camaras', camara)).status).toBe(201);
    expect((await post('almacenamiento/movimientos', f.datosMovimiento(partida, camara.operacionId, 6))).status).toBe(201);
    const destino = f.datosDestino(partida, 3); expect((await post('destinos-produccion', destino)).status).toBe(201);
    expect((await post('almacenamiento/movimientos', f.datosMovimiento(partida, camara.operacionId, 2, 'SALIDA'))).status).toBe(201);
    const p = await fetch(`${direccion}/api/v1/partidas-produccion/${partida}`, { headers }); expect(p.status).toBe(200);
    expect(await p.json()).toMatchObject({ data: { cantidadInicialKg: 10, cantidadDisponibleKg: 3, cantidadEnCamaraKg: 4, cantidadDestinadaKg: 3, cantidadFisicaKg: 7 } });
    const saldos = await fetch(`${direccion}/api/v1/almacenamiento/saldos?camaraSectorId=${camara.operacionId}`, { headers });
    expect(saldos.status).toBe(200); expect(await saldos.json()).toMatchObject({ data: [{ partidaProduccionId: partida, cantidadKg: 4 }] });
    expect((await fetch(`${direccion}/api/v1/destinos-produccion/${destino.operacionId}`, { headers })).status).toBe(200);
    expect((await fetch(`${direccion}/api/v1/almacenamiento/saldos`)).status).toBe(401);
    expect((await f.pool.query('select cantidad_disponible_kg from partidas_produccion where id=$1', [partida])).rows[0].cantidad_disponible_kg).toBe('3.00');
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where tipo_evento in ('ALMACENAMIENTO','DESTINO_PRODUCCION')")).rows[0].n).toBe(3);
  });
});
