import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de migración no autorizado.');
describe.skipIf(!url)('AGRUL-055: cadena SQL desde cero y actualización de partidas históricas', () => {
  let base: ReturnType<typeof createDatabaseConnection> | undefined;
  let aislada: ReturnType<typeof createDatabaseConnection> | undefined;
  let servidor: ReturnType<typeof crearServidorProduccion> | undefined;
  const esquema = `agrul055_upgrade_${randomUUID().replaceAll('-', '')}`;
  const insumoId = randomUUID(); const partidaId = randomUUID();
  const aplicacionHistoricaId = randomUUID();
  const insumoDudoso = randomUUID(); const partidaDudosa = randomUUID(); const aplicacionDudosa = randomUUID();
  let admin = { authorization: '' }; let encargado = { authorization: '' };
  let historico: unknown; let publico: unknown;
  async function estadoPublico() {
    return (await base!.pool.query(`select (select count(*) from public.insumos) as insumos,
      (select count(*) from public.usuarios) as usuarios,(select count(*) from public.partidas_insumo) as partidas,
      (select count(*) from public.movimientos_inventario) as movimientos`)).rows;
  }
  beforeAll(async () => {
    base = createDatabaseConnection(url);
    const { rows } = await base.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: new URL(URL_INSUMOS).pathname.slice(1), usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000); expect(rows[0].version).toBeLessThan(190000);
    publico = await estadoPublico();
    if (!/^agrul055_upgrade_[a-f0-9]{32}$/.test(esquema)) throw new Error('Esquema inválido.');
    await base.pool.query(`create schema "${esquema}"`);
    const scoped = new URL(url!); scoped.searchParams.set('options', `-c search_path=${esquema},pg_catalog`);
    aislada = createDatabaseConnection(scoped.toString());
    const journal = z.object({ entries: z.array(z.object({ idx: z.number(), tag: z.string().regex(/^\d{4}_[a-z0-9_]+$/) })) })
      .parse(JSON.parse(await readFile('drizzle/migrations/meta/_journal.json', 'utf8')));
    for (const entrada of journal.entries) {
      // Las referencias explícitas a public también apuntan al esquema propio.
      const ddl = (await readFile(`drizzle/migrations/${entrada.tag}.sql`, 'utf8')).replace(/\bpublic\b/g, esquema);
      await aislada.pool.query(ddl);
      if (entrada.idx === 18) {
        await aislada.pool.query(`insert into insumos(id,codigo,nombre,categoria,unidad_medida,nivel_minimo) values($1,'HIST-019','Histórico','OTRO','kg',1)`, [insumoId]);
        await aislada.pool.query(`insert into partidas_insumo(id,insumo_id,fecha_ingreso,cantidad_inicial,cantidad_disponible,proveedor)
          values($1,$2,'2026-10-01',5,5,'Proveedor histórico')`, [partidaId, insumoId]);
        historico = (await aislada.pool.query('select row_to_json(p) as fila from partidas_insumo p where id=$1', [partidaId])).rows[0].fila;
      }
      if (entrada.idx === 20) {
        const ciclo = randomUUID(); const tipo = randomUUID(); const labor = randomUUID();
        await sembrarCiclosRn09(aislada.pool, [ciclo]);
        await aislada.pool.query("update ciclos_productivos set estado='ACTIVO',fecha_inicio_efectiva='2026-10-01' where id=$1", [ciclo]);
        await aislada.pool.query("insert into tipos_actividad(id,nombre,categoria) values($1,'Histórico de aplicación','FERTILIZACION')", [tipo]);
        await aislada.pool.query(`insert into actividades_realizadas(id,ciclo_id,lote_id,tipo_actividad_id,fecha_ejecucion,responsable_id,superficie_trabajada)
          select $1,$2,p.lote_id,$3,'2026-10-15',c.responsable_seguimiento_id,1 from ciclos_productivos c join plantaciones p on p.id=c.plantacion_id where c.id=$2`, [labor, ciclo, tipo]);
        await aislada.pool.query(`insert into aplicaciones_insumo(id,actividad_realizada_id,superficie_tratada,metodo_aplicacion,motivo_aplicacion,responsable_id)
          select $1,id,1,'Manual','Histórico',responsable_id from actividades_realizadas where id=$2`, [aplicacionHistoricaId, labor]);
        await aislada.pool.query(`insert into aplicaciones_insumo_items(aplicacion_id,insumo_id,partida_insumo_id,cantidad_aplicada,dosis)
          values($1,$2,$3,1,1)`, [aplicacionHistoricaId, insumoId, partidaId]);
      }
      if (entrada.idx === 21) {
        const responsable = 'f0000000-0000-4000-8000-000000000059';
        await aislada.pool.query("insert into insumos(id,codigo,nombre,categoria,unidad_medida,nivel_minimo) values($1,'HIST-DUDOSO','Sin conciliar','OTRO','kg',0)", [insumoDudoso]);
        await aislada.pool.query(`insert into partidas_insumo(id,insumo_id,finca_id,unidad_medida,fecha_ingreso,cantidad_inicial,cantidad_disponible,proveedor)
          values($1,$2,$3,'kg','2026-10-01',10,0,'Histórico')`, [partidaDudosa, insumoDudoso, responsable]);
        await aislada.pool.query(`insert into movimientos_inventario(insumo_id,finca_id,partida_id,tipo_movimiento,cantidad,unidad_medida,fecha_movimiento,motivo,responsable_id,solicitud)
          values($1,$2,$3,'INGRESO',10,'kg','2026-10-01','Origen',$2,'{}')`, [insumoDudoso, responsable, partidaDudosa]);
        await aislada.pool.query(`insert into aplicaciones_insumo(id,actividad_realizada_id,superficie_tratada,metodo_aplicacion,motivo_aplicacion,responsable_id,solicitud,registrado_en)
          select $1,actividad_realizada_id,1,'Manual','Origen conocido',responsable_id,'{}',now() from aplicaciones_insumo where id=$2`, [aplicacionDudosa, aplicacionHistoricaId]);
        await aislada.pool.query(`insert into aplicaciones_insumo_items(aplicacion_id,insumo_id,partida_insumo_id,cantidad_aplicada,dosis)
          values($1,$2,$3,1,1)`, [aplicacionDudosa, insumoDudoso, partidaDudosa]);
        await aislada.pool.query(`insert into eventos_trazabilidad(lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local,timestamp_servidor,payload_especifico)
          select r.lote_id,a.responsable_id,$2,'APLICACION_INSUMOS',now(),now(),jsonb_build_object('aplicacionId',a.id)
          from aplicaciones_insumo a join actividades_realizadas r on r.id=a.actividad_realizada_id where a.id=$1`, [aplicacionDudosa, responsable]);
        // Movimiento legado permitido antes de 0022: no conocemos qué egreso compensó.
        await aislada.pool.query(`insert into movimientos_inventario(insumo_id,finca_id,partida_id,tipo_movimiento,cantidad,unidad_medida,fecha_movimiento,motivo,responsable_id,solicitud)
          values($1,$2,$3,'REGULARIZACION_CORRECCION',1,'kg','2026-10-20','Regularización sin vínculo',$2,'{}')`, [insumoDudoso, responsable, partidaDudosa]);
      }
    }
    servidor = crearServidorProduccion({ connectionString: scoped.toString(), logger: false }); await servidor.app.ready();
    admin = await autenticarOperadorPrueba(aislada.pool, servidor.app, { sub: randomUUID(), nombre: 'Admin', apellido: 'Histórico', email: 'admin-upgrade@example.test' });
    encargado = await autenticarOperadorPrueba(aislada.pool, servidor.app, { sub: randomUUID(), nombre: 'Campo', apellido: 'Histórico', email: 'campo-upgrade@example.test', perfil: 'ENCARGADO_CAMPO' });
  }, 30000);
  afterAll(async () => {
    try {
      await servidor?.app.close(); await aislada?.pool.end();
      if (base) { expect(await estadoPublico()).toEqual(publico); await base.pool.query(`drop schema if exists "${esquema}" cascade`); }
    } finally { await base?.pool.end(); }
  });
  it('conserva cantidades y campos históricos sin inventar finca ni unidad', async () => {
    const fila = (await aislada!.pool.query('select row_to_json(p) as fila from partidas_insumo p where id=$1', [partidaId])).rows[0].fila;
    expect(fila).toEqual({ ...z.record(z.unknown()).parse(historico), finca_id: null, unidad_medida: null });
    const detalle = await servidor!.app.inject({ method: 'GET', url: `/api/v1/inventario/partidas/${partidaId}`, headers: admin });
    expect(detalle.statusCode).toBe(200); expect(detalle.json().data).toMatchObject({ fincaId: null, unidadMedida: null, cantidadDisponible: '5.00' });
    const lista = await servidor!.app.inject({ method: 'GET', url: `/api/v1/inventario/partidas?insumoId=${insumoId}`, headers: admin });
    expect(lista.statusCode).toBe(200); expect(lista.json().data).toHaveLength(1);
  });
  it('rechaza nuevas partidas sin atribución y no concede al encargado acceso a históricos sin finca', async () => {
    await expect(aislada!.pool.query(`insert into partidas_insumo(insumo_id,fecha_ingreso,cantidad_inicial,cantidad_disponible,proveedor)
      values($1,'2026-10-01',1,0,'Nuevo')`, [insumoId])).rejects.toMatchObject({ code: '23514' });
    const detalle = await servidor!.app.inject({ method: 'GET', url: `/api/v1/inventario/partidas/${partidaId}`, headers: encargado });
    expect(detalle.statusCode).toBe(404);
    const lista = await servidor!.app.inject({ method: 'GET', url: '/api/v1/inventario/partidas', headers: encargado });
    expect(lista.json().data).toEqual([]);
  });
  it('no vuelve a consumir una aplicación histórica ni inventa solicitudes, movimientos o fechas al migrar', async () => {
    const res = await servidor!.app.inject({ method: 'GET', url: `/api/v1/aplicaciones-insumos/${aplicacionHistoricaId}`, headers: admin });
    expect(res.statusCode).toBe(200); expect(res.json().data).toMatchObject({ registradoEn: null,
      items: [expect.objectContaining({ cantidadAplicada: '1.00', movimientoId: null })] });
    expect((await aislada!.pool.query('select solicitud from aplicaciones_insumo where id=$1', [aplicacionHistoricaId])).rows[0].solicitud).toBeNull();
    expect((await aislada!.pool.query('select cantidad_disponible from partidas_insumo where id=$1', [partidaId])).rows[0].cantidad_disponible).toBe('5.00');
  });
  it('exige conciliación explícita si una regularización histórica podría haber devuelto ya el consumo', async () => {
    const { rows } = await aislada!.pool.query<{ actividad_realizada_id: string }>('select actividad_realizada_id from aplicaciones_insumo where id=$1', [aplicacionDudosa]);
    const res = await servidor!.app.inject({ method: 'POST', url: `/api/v1/aplicaciones-insumos/${aplicacionDudosa}/correcciones`, headers: admin,
      payload: { operacionId: randomUUID(), motivoCorreccion: 'Intento sobre saldo no verificable', nuevaAplicacion: {
        actividadRealizadaId: rows[0].actividad_realizada_id, superficieTratada: 1, metodoAplicacion: 'Manual', motivoAplicacion: 'Prueba',
        items: [{ insumoId: insumoDudoso, cantidad: 1, unidadMedida: 'kg', dosis: 1 }] } } });
    expect(res.statusCode).toBe(422); expect(res.json().error.code).toBe('CONCILIACION_INVENTARIO_REQUERIDA');
    expect((await aislada!.pool.query('select cantidad_disponible from partidas_insumo where id=$1', [partidaDudosa])).rows[0].cantidad_disponible).toBe('10.00');
    expect((await aislada!.pool.query('select id from correcciones_aplicaciones_insumo where aplicacion_anterior_id=$1', [aplicacionDudosa])).rows).toEqual([]);
  });
});
