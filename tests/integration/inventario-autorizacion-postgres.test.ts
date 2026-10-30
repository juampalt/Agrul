import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { InventarioPostgresFixture } from '../helpers/inventario-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de inventario no autorizado.');
describe.skipIf(!url)('AGRUL-055: autorización de inventario por finca y sesión vigente', () => {
  const f = new InventarioPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });
  it('filtra en SQL antes de paginar y no entrega datos de otra finca por ID', async () => {
    const insumoId = await f.crear();
    const ajena = await f.alta({ insumoId, fincaId: f.otraFincaId, fechaIngreso: '2026-10-29' });
    const propia = await f.alta({ insumoId, fincaId: f.fincaId, fechaIngreso: '2026-10-01' });
    const lista = await f.consultar(`partidas?insumoId=${insumoId}&limit=1`);
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((p: { id: string }) => p.id)).toEqual([propia.partidaId]);
    expect((await f.consultar(`partidas/${ajena.partidaId}`)).statusCode).toBe(404);
    expect((await f.consultar(`movimientos/${ajena.movimientoId}`)).statusCode).toBe(404);
    expect((await f.consultar(`partidas/${propia.partidaId}`)).statusCode).toBe(200);
    for (const ruta of ['partidas', 'movimientos', 'existencias', 'alertas']) {
      const res = await f.consultar(`${ruta}?insumoId=${insumoId}&fincaId=${f.otraFincaId}`);
      expect(res.statusCode).toBe(200); expect(res.json().data).toEqual([]);
    }
    expect((await f.consultar(`partidas/${ajena.partidaId}`, f.admin)).statusCode).toBe(200);
  });
  it('deniega ingresos y modificaciones de stock de fincas no asignadas', async () => {
    const { insumoId, partidaId } = await f.alta({ fincaId: f.otraFincaId });
    expect((await f.ingresar(f.ingresoDatos(insumoId, { fincaId: f.otraFincaId }))).statusCode).toBe(403);
    expect((await f.mover(partidaId)).statusCode).toBe(403); expect(await f.saldo(partidaId)).toBe('10.00');
    const cuerpo = { operacionId: randomUUID(), partidaId, cantidad: 1, unidadMedida: 'kg', tipoMovimiento: 'PERDIDA',
      fechaMovimiento: '2026-10-29', motivo: 'Intento', fincaId: f.fincaId };
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/inventario/movimientos', headers: f.encargado, payload: cuerpo })).statusCode).toBe(400);
  });
  it('un encargado sin asignaciones no consulta ni modifica inventario', async () => {
    const { insumoId, partidaId, movimientoId } = await f.alta();
    for (const ruta of ['partidas', 'movimientos', 'existencias', 'alertas']) {
      expect((await f.consultar(`${ruta}?insumoId=${insumoId}`, f.sinAsignaciones)).json().data).toEqual([]);
    }
    expect((await f.consultar(`partidas/${partidaId}`, f.sinAsignaciones)).statusCode).toBe(404);
    expect((await f.consultar(`movimientos/${movimientoId}`, f.sinAsignaciones)).statusCode).toBe(404);
    expect((await f.mover(partidaId, {}, f.sinAsignaciones)).statusCode).toBe(403);
    expect((await f.ingresar(f.ingresoDatos(insumoId), f.sinAsignaciones)).statusCode).toBe(403);
  });
  it('revocar una asignación se aplica inmediatamente al mismo token', async () => {
    const { partidaId } = await f.alta();
    expect((await f.consultar(`partidas/${partidaId}`)).statusCode).toBe(200);
    await f.pool.query('update usuario_finca_asignacion set activo=false where usuario_id=$1 and finca_id=$2', [f.encargadoId, f.fincaId]);
    try {
      expect((await f.consultar(`partidas/${partidaId}`)).statusCode).toBe(404);
      expect((await f.mover(partidaId)).statusCode).toBe(403);
    } finally { await f.pool.query('update usuario_finca_asignacion set activo=true where usuario_id=$1 and finca_id=$2', [f.encargadoId, f.fincaId]); }
  });
  it('deniega todos los endpoints sin sesión y a ADMIN_SISTEMA sin atribuciones operativas', async () => {
    const { partidaId, movimientoId, insumoId } = await f.alta();
    const rutas = ['partidas', `partidas/${partidaId}`, 'movimientos', `movimientos/${movimientoId}`, 'existencias', 'alertas'];
    for (const ruta of rutas) {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/inventario/${ruta}` })).statusCode).toBe(401);
      expect((await f.consultar(ruta, f.sistema)).statusCode).toBe(403);
    }
    expect((await f.ingresar(f.ingresoDatos(insumoId), f.sistema)).statusCode).toBe(403);
    expect((await f.mover(partidaId, {}, f.sistema)).statusCode).toBe(403);
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/inventario/ingresos', payload: f.ingresoDatos(insumoId) })).statusCode).toBe(401);
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/inventario/movimientos', payload: {} })).statusCode).toBe(401);
  });
  it('valida UUID, filtros y rutas inexistentes antes de acceder a PostgreSQL', async () => {
    expect((await f.consultar('partidas/no-uuid')).statusCode).toBe(400);
    expect((await f.consultar(`partidas/${randomUUID()}`)).statusCode).toBe(404);
    expect((await f.consultar('movimientos/no-uuid')).statusCode).toBe(400);
    for (const ruta of ['partidas?limit=0', 'existencias?partidaId=' + randomUUID(), 'alertas?fincaId=no-uuid', 'movimientos?offset=-1']) {
      expect((await f.consultar(ruta)).statusCode).toBe(400);
    }
    expect((await f.mover(randomUUID())).statusCode).toBe(404);
  });
});
