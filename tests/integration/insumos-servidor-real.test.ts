import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { z } from 'zod';
import { InsumosPostgresFixture, URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de pruebas AGRUL-055 no autorizado.');

describe.skipIf(!url)('AGRUL-055: entrada compilada de npm start y HTTP real', () => {
  const f = new InsumosPostgresFixture();
  let proceso: ChildProcess | undefined;
  let direccion = '';
  beforeAll(async () => {
    await f.preparar(url!);
    const puerto = createServer(); puerto.listen(0, '127.0.0.1'); await once(puerto, 'listening');
    const address = puerto.address();
    if (!address || typeof address === 'string') throw new Error('No se pudo reservar el puerto de pruebas.');
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
      if (proceso.exitCode !== null) throw new Error('El servidor compilado terminó antes de iniciar. Ejecutar npm run build antes de esta suite.');
      try {
        const res = await fetch(`${direccion}/api/v1/health`);
        if (res.ok) return;
      } catch { /* Esperar solo durante el arranque del proceso propio. */ }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('El servidor no inició en el tiempo esperado.');
  }, 30000);
  afterAll(async () => {
    try {
      if (proceso && proceso.exitCode === null) {
        const cerrado = once(proceso, 'exit'); proceso.kill(); await cerrado;
      }
    } finally { await f.cerrar(); }
  });
  it('autentica, registra, consulta y persiste desde el entrypoint normal de producción', async () => {
    const login = await fetch(`${direccion}/api/v1/auth/login`, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin-055@example.test', password: 'OperadorPrueba123!' }) });
    expect(login.status).toBe(200);
    const { data: { token } } = z.object({ data: z.object({ token: z.string() }) }).parse(await login.json());
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const datos = f.datos('CU34-START');
    const alta = await fetch(`${direccion}/api/v1/insumos`, { method: 'POST', headers, body: JSON.stringify(datos) });
    expect(alta.status).toBe(201);
    const { data: { id } } = z.object({ data: z.object({ id: z.string().uuid() }) }).parse(await alta.json());
    expect((await fetch(`${direccion}/api/v1/insumos/${id}`, { headers })).status).toBe(200);
    expect((await f.pool.query('select codigo from insumos where id=$1', [id])).rows[0].codigo).toBe('CU34-START');
    expect((await fetch(`${direccion}/api/v1/insumos/${id}`)).status).toBe(401);
  });
});
