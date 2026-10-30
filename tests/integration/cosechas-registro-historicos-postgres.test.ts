import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { JornadasPostgresFixture, URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: migración de cosechas heredadas sin inventar antecedentes', () => {
  const f = new JornadasPostgresFixture();
  const esquema = `agrul056_historico_${randomUUID().replaceAll('-', '')}`;
  const cicloId = randomUUID(), cosechaId = randomUUID();
  let nueva: ReturnType<typeof createDatabaseConnection> | undefined;
  let servidor: ReturnType<typeof crearServidorProduccion> | undefined;
  let headers = { authorization: '' }, creado = false;
  let anterior: Record<string, unknown>;
  beforeAll(async () => {
    await f.preparar(url!); // Valida base, versión y rol antes de crear el esquema propio.
    if (!/^agrul056_historico_[a-f0-9]{32}$/.test(esquema)) throw new Error('Esquema inválido.');
    await f.pool.query(`create schema "${esquema}"`); creado = true;
    const scoped = new URL(url!); scoped.searchParams.set('options', `-c search_path=${esquema},pg_catalog`);
    nueva = createDatabaseConnection(scoped.toString());
    const journal = z.object({ entries: z.array(z.object({ idx: z.number(), tag: z.string().regex(/^\d{4}_[a-z0-9_]+$/) })) })
      .parse(JSON.parse(await readFile('drizzle/migrations/meta/_journal.json', 'utf8')));
    for (const e of journal.entries) {
      await nueva.pool.query((await readFile(`drizzle/migrations/${e.tag}.sql`, 'utf8')).replace(/\bpublic\b/g, esquema));
      if (e.idx === 24) {
        await sembrarCiclosRn09(nueva.pool, [cicloId]);
        // Esquema anterior declarado por tables.ts: los kg comerciales/descarte
        // eran NOT NULL y no existían las columnas de pasada ni programación.
        await nueva.pool.query(`create table cosechas (
          id uuid primary key default gen_random_uuid(), codigo_trazabilidad varchar(80) not null unique,
          lote_id uuid not null references lotes(id) on delete restrict,
          ciclo_id uuid not null references ciclos_productivos(id) on delete restrict,
          fecha varchar(30) not null, cantidad_cosechada_kg numeric(14,4) not null,
          cantidad_comercializable_kg numeric(14,4) not null, cantidad_descarte_kg numeric(14,4) not null,
          motivo_descarte varchar(150), observaciones_calidad text, responsable_id uuid,cuadrilla_id uuid,
          recipientes jsonb,superficie_cosechada_ha numeric(10,2),estado varchar(30) not null default 'ACTIVA',
          motivo_anulacion text,usuario_anulacion_id uuid,anulado_en timestamptz,
          historial_modificaciones jsonb not null default '[]',clave_idempotencia varchar(150) unique,
          creado_en timestamptz not null default now(),actualizado_en timestamptz not null default now())`);
        await nueva.pool.query(`insert into cosechas(id,codigo_trazabilidad,lote_id,ciclo_id,fecha,cantidad_cosechada_kg,cantidad_comercializable_kg,cantidad_descarte_kg)
          select $1,'COS-L59-20261010-01',p.lote_id,c.id,'2026-10-10',12.3456,8.1111,4.2345
          from ciclos_productivos c join plantaciones p on p.id=c.plantacion_id where c.id=$2`, [cosechaId, cicloId]);
        anterior = (await nueva.pool.query('select row_to_json(c) as fila from cosechas c where id=$1', [cosechaId])).rows[0].fila;
      }
    }
    const { hash, salt } = CryptoAuthService.hashPassword(f.password);
    await nueva.pool.query(`insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil,estado,debe_cambiar_password)
      values($1,'Admin','Histórico',$2,$3,$4,'ADMINISTRADOR','ACTIVO',false)`, [f.adminId, f.email, hash, salt]);
    servidor = crearServidorProduccion({ connectionString: scoped.toString(), logger: false }); await servidor.app.ready();
    const login = await servidor.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: f.email, password: f.password } });
    expect(login.statusCode).toBe(200); headers = { authorization: `Bearer ${login.json().data.token}` };
  }, 30000);
  afterAll(async () => {
    try {
      await servidor?.app.close(); await nueva?.pool.end();
      if (creado) await f.pool.query(`drop schema "${esquema}" cascade`);
    } finally { await f.cerrar(); }
  });
  it('conserva todos los valores anteriores y deja nulos los nuevos campos desconocidos', async () => {
    const fila = (await nueva!.pool.query('select row_to_json(c) as fila from cosechas c where id=$1', [cosechaId])).rows[0].fila;
    expect(fila).toEqual({ ...anterior, cosecha_programada_id: null,fecha_efectiva: null,sector: null,numero_pasada: null,
      origen: null,registrado_por: null,solicitud: null,timestamp_captura_local: null });
    expect((await nueva!.pool.query('select count(*)::int as n from eventos_trazabilidad')).rows[0].n).toBe(0);
  });
  it('consulta detalle y listado desde el bootstrap sin aplicar reglas nuevas a los datos históricos', async () => {
    const detalle = await servidor!.app.inject({ method: 'GET', url: `/api/v1/cosechas/${cosechaId}`, headers });
    expect(detalle.statusCode).toBe(200);
    expect(detalle.json().data).toMatchObject({ id: cosechaId, fecha: '2026-10-10', fechaEfectiva: null,
      numeroPasada: null, origen: null, registradoPor: null, responsableId: null,
      cantidadCosechadaKg: 12.3456, cantidadComercializableKg: 8.1111, cantidadDescarteKg: 4.2345 });
    const lista = await servidor!.app.inject({ method: 'GET', url: `/api/v1/cosechas?cicloId=${cicloId}`, headers });
    expect(lista.statusCode).toBe(200); expect(lista.json().data).toHaveLength(1);
  });
  it('las escrituras nuevas exigen el contrato vigente y no alteran el registro anterior', async () => {
    await expect(nueva!.pool.query(`insert into cosechas(codigo_trazabilidad,lote_id,ciclo_id,fecha,cantidad_cosechada_kg)
      select 'LEGADO-NUEVO',lote_id,ciclo_id,fecha,1 from cosechas where id=$1`, [cosechaId])).rejects.toMatchObject({ code: '23514' });
    await expect(nueva!.pool.query('delete from cosechas where id=$1', [cosechaId])).rejects.toMatchObject({ code: '23514' });
    expect((await nueva!.pool.query('select cantidad_cosechada_kg from cosechas where id=$1', [cosechaId])).rows[0].cantidad_cosechada_kg).toBe('12.3456');
  });
});
