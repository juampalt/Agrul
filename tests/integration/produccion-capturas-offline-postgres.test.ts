import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AlmacenamientoProduccionFixture } from '../helpers/almacenamiento-produccion-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
describe.skipIf(!url)('AGRUL-056: auditoría de capturas anteriores a la ingesta', () => {
  const f = new AlmacenamientoProduccionFixture();
  beforeAll(() => f.preparar(url!), 30000);
  afterAll(() => f.cerrar());

  it('marca los cinco hechos capturados previamente sin cambiar kilos ni timestamps', async () => {
    const partida = await f.partida();
    expect((await f.acondicionar(f.datosAcondicionamiento(partida, 2))).statusCode).toBe(201);
    const ingreso = f.datosMovimiento(partida, await f.camara(), 3);
    expect((await f.mover(ingreso)).statusCode).toBe(201);
    expect((await f.destinar(f.datosDestino(partida, 2))).statusCode).toBe(201);
    const { rows } = await f.pool.query(`select tipo_evento,estado_sincronizacion,
      timestamp_captura_local < timestamp_servidor as anterior from eventos_trazabilidad`);
    expect(rows).toHaveLength(5);
    expect(rows.map(r => r.tipo_evento).sort()).toEqual([
      'ACONDICIONAMIENTO', 'ALMACENAMIENTO', 'CLASIFICACION', 'COSECHA', 'DESTINO_PRODUCCION',
    ]);
    for (const fila of rows) expect(fila).toMatchObject({ estado_sincronizacion: 'PENDIENTE_AUDITORIA_OFFLINE', anterior: true });
    const evento = await f.pool.query(`select timestamp_captura_local=$2::timestamptz as intacto
      from eventos_trazabilidad where payload_especifico->>'movimientoAlmacenamientoId'=$1`,
    [ingreso.operacionId, ingreso.timestampCapturaLocal]);
    expect(evento.rows).toEqual([{ intacto: true }]);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 5, cantidadEnCamaraKg: 3, cantidadDestinadaKg: 2 });
  });

  it('mantiene sincronizado un hecho capturado por el servidor en la misma transacción', async () => {
    const { timestampCapturaLocal: _captura, ...datos } = f.datosCosecha();
    expect((await f.registrar(datos)).statusCode).toBe(201);
    const { rows } = await f.pool.query(`select estado_sincronizacion from eventos_trazabilidad
      where payload_especifico->>'cosechaId'=$1`, [datos.operacionId]);
    expect(rows).toEqual([{ estado_sincronizacion: 'SINCRONIZADO' }]);
  });
});
