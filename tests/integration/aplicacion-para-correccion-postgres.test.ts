import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AplicacionesInsumosPostgresFixture } from '../helpers/aplicaciones-insumos-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';
import { cargarAplicacionParaCorreccion } from '../../src/infrastructure/database/aplicacion-para-correccion.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de correcciones no autorizado.');
describe.skipIf(!url)('AGRUL-055 CU40: verificación de procedencia previa a una corrección', () => {
  const f = new AplicacionesInsumosPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });
  it('resuelve aplicación, finca, egresos y evento reales sin modificar los hechos', async () => {
    const { insumoId, partidaId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(201);
    const actor = { usuarioId: f.encargadoId, fincaIds: [f.fincaId] };
    const origen = await f.aislado.connection.db.transaction(tx => cargarAplicacionParaCorreccion(tx, datos.operacionId, actor));
    expect(origen.original).toMatchObject({ id: datos.operacionId, fincaId: f.fincaId, responsableId: f.encargadoId });
    expect(origen.items).toEqual([expect.objectContaining({ insumoId, partidaId, cantidad: '1.00', tipoMovimiento: 'EGRESO_APLICACION' })]);
    expect(origen.eventoId).toBeTruthy(); expect(await f.saldo(partidaId)).toBe('9.00');
    expect(await f.conteos(datos.operacionId)).toEqual({ aplicaciones: 1, items: 1, movimientos: 1, eventos: 1 });
  });
  it('no revela ni bloquea como propia una aplicación fuera de las fincas autorizadas', async () => {
    const { insumoId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(201);
    await expect(f.aislado.connection.db.transaction(tx => cargarAplicacionParaCorreccion(tx, datos.operacionId,
      { usuarioId: f.encargadoId, fincaIds: [f.otraFincaId] }))).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  });
  it('rechaza históricos sin solicitud ni evento de origen en lugar de inventar una compensación', async () => {
    const historica = await f.aplicacion();
    await expect(f.aislado.connection.db.transaction(tx => cargarAplicacionParaCorreccion(tx, historica,
      { usuarioId: f.adminId }))).rejects.toThrow('procedencia de consumo verificable');
  });
});
