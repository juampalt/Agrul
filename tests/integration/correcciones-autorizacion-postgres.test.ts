import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CorreccionesAplicacionesPostgresFixture } from '../helpers/correcciones-aplicaciones-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de correcciones no autorizado.');
describe.skipIf(!url)('AGRUL-055 CU40: autorización de origen/destino y validación', () => {
  const f = new CorreccionesAplicacionesPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });
  it('no permite corregir ni consultar correcciones de una finca no autorizada', async () => {
    const labor = await f.crearLaborAjena(); const { insumoId, partidaId } = await f.alta({ fincaId: f.otraFincaId });
    const res = await f.registrarAplicacion(f.datosAplicacion(insumoId, { actividadRealizadaId: labor }), f.admin); expect(res.statusCode).toBe(201);
    const id = res.json().data.id;
    expect((await f.corregir(id, f.datosCorreccion(insumoId))).statusCode).toBe(404);
    expect((await f.consultarAplicaciones(`/${id}/correcciones`)).statusCode).toBe(404); expect(await f.saldo(partidaId)).toBe('9.00');
  });
  it('comprueba también el destino antes de compensar y permite a administración una reasignación auditada', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(); const labor = await f.crearLaborAjena();
    const otra = await f.alta({ insumoId, cantidad: 5, fincaId: f.otraFincaId });
    const datos = f.datosCorreccion(insumoId, 2); datos.nuevaAplicacion.actividadRealizadaId = labor;
    expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(403); expect(await f.saldo(partidaId)).toBe('6.00'); expect(await f.saldo(otra.partidaId)).toBe('5.00');
    const res = await f.corregir(aplicacion.id, datos, f.admin); expect(res.statusCode).toBe(201);
    expect(await f.saldo(partidaId)).toBe('10.00'); expect(await f.saldo(otra.partidaId)).toBe('3.00');
    expect((await f.consultarAplicaciones(`/${res.json().data.aplicacionNuevaId}`)).statusCode).toBe(404);
    expect((await f.consultarAplicaciones(`/${aplicacion.id}/correcciones`)).json().data).toEqual([]);
  });
  it('revocar la finca impide la corrección y el reintento con el mismo token', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(); const datos = f.datosCorreccion(insumoId, 2);
    expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(201);
    await f.pool.query('update usuario_finca_asignacion set activo=false where usuario_id=$1 and finca_id=$2', [f.encargadoId, f.fincaId]);
    try {
      expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(404);
      expect((await f.consultarAplicaciones(`/${aplicacion.id}/correcciones`)).statusCode).toBe(404);
    } finally { await f.pool.query('update usuario_finca_asignacion set activo=true where usuario_id=$1 and finca_id=$2', [f.encargadoId, f.fincaId]); }
    expect(await f.saldo(partidaId)).toBe('8.00');
  });
  it('requiere sesión y rol operativo, y rechaza usuarios sin asignaciones', async () => {
    const { aplicacion, insumoId } = await f.original(); const datos = f.datosCorreccion(insumoId);
    expect((await f.app.inject({ method: 'POST', url: `/api/v1/aplicaciones-insumos/${aplicacion.id}/correcciones`, payload: datos })).statusCode).toBe(401);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/aplicaciones-insumos/${aplicacion.id}/correcciones` })).statusCode).toBe(401);
    expect((await f.corregir(aplicacion.id, datos, f.sistema)).statusCode).toBe(403);
    expect((await f.consultarAplicaciones(`/${aplicacion.id}/correcciones`, f.sistema)).statusCode).toBe(403);
    expect((await f.corregir(aplicacion.id, datos, f.sinAsignaciones)).statusCode).toBe(404);
  });
  it('valida motivo, contenido, UUID y propiedades extra sin permitir reemplazar identificadores o responsables', async () => {
    const { aplicacion, insumoId } = await f.original(); const datos = f.datosCorreccion(insumoId);
    expect((await f.corregir(aplicacion.id, { ...datos, motivoCorreccion: ' ' })).statusCode).toBe(400);
    expect((await f.corregir('no-uuid', datos)).statusCode).toBe(400);
    expect((await f.corregir(randomUUID(), datos)).statusCode).toBe(404);
    expect((await f.corregir(aplicacion.id, { ...datos, nuevaAplicacion: { ...datos.nuevaAplicacion, items: [] } })).statusCode).toBe(400);
    for (const extra of [{ responsableId: f.adminId }, { nuevaAplicacion: { ...datos.nuevaAplicacion, operacionId: randomUUID() } }]) {
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/aplicaciones-insumos/${aplicacion.id}/correcciones`, headers: f.encargado, payload: { ...datos, ...extra } })).statusCode).toBe(400);
    }
    expect((await f.consultarAplicaciones(`/${aplicacion.id}/correcciones?limit=1`)).statusCode).toBe(400);
    expect((await f.consultarAplicaciones('?incluirHistoricas=1')).statusCode).toBe(400);
  });
  it('restituye un insumo desactivado si la versión corregida lo reemplaza por otro activo', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(); const nueva = await f.alta({ cantidad: 5 });
    expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${insumoId}/desactivar`, headers: f.admin })).statusCode).toBe(200);
    expect((await f.corregir(aplicacion.id, f.datosCorreccion(nueva.insumoId, 2))).statusCode).toBe(201);
    expect(await f.saldo(partidaId)).toBe('10.00'); expect(await f.saldo(nueva.partidaId)).toBe('3.00');
  });
});
