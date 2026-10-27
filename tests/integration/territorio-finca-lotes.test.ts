import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';

const FINCA_ID = 'f0000000-0000-4000-8000-000000000051';

describe('Issue #45 - finca única y lotes territoriales (CU01-CU06)', () => {
  let app: FastifyInstance;
  let fincas: InMemoryFincasRepository;
  let lotes: InMemoryLotesRepository;
  let ciclos: InMemoryCiclosRepository;

  beforeEach(async () => {
    fincas = new InMemoryFincasRepository();
    lotes = new InMemoryLotesRepository();
    ciclos = new InMemoryCiclosRepository();
    await fincas.guardar(Finca.crear({
      id: FINCA_ID, nombre: 'Finca Agrul', provincia: 'Tucumán', departamento: 'Lules',
      localidad: 'San Pablo', superficieTotalHa: 100, propietario: 'Productor Agrul',
    }));
    app = buildApp({
      fincasRepo: fincas, lotesRepo: lotes, ciclosRepo: ciclos,
      eventosRepo: new InMemoryEventosRepository(lotes),
      genealogiaRepo: new InMemoryGenealogiaRepository(), logger: false,
    });
    await app.ready();
  });

  afterEach(async () => app.close());

  async function registrar(codigo: string, nombre: string, superficieHa: number, estado = 'DISPONIBLE') {
    return app.inject({
      method: 'POST', url: '/api/v1/lotes-territorio',
      payload: { codigo, nombre, superficieHa, ubicacionSector: 'Norte', estado },
    });
  }

  it('CU01 consulta la finca única', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/finca' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ id: FINCA_ID, nombre: 'Finca Agrul', superficieTotalHa: 100 });
  });

  it('CU02 modifica la finca sin aceptar una superficie menor a sus lotes vigentes', async () => {
    expect((await registrar('LOT-2026-05101', 'Lote Norte', 40)).statusCode).toBe(201);
    const invalida = await app.inject({
      method: 'PUT', url: '/api/v1/finca',
      payload: { nombre: 'Finca Agrul', provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 30 },
    });
    expect(invalida.statusCode).toBe(422);
    const valida = await app.inject({
      method: 'PUT', url: '/api/v1/finca',
      payload: { nombre: 'Finca Agrul Actualizada', provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 80, telefono: '381-555' },
    });
    expect(valida.statusCode).toBe(200);
    expect(valida.json().data).toMatchObject({ nombre: 'Finca Agrul Actualizada', superficieTotalHa: 80, telefono: '381-555' });
  });

  it('CU03 registra lote, rechaza código repetido y exceso de superficie', async () => {
    expect((await registrar('LOT-2026-05102', 'Lote A', 60)).statusCode).toBe(201);
    expect((await registrar('LOT-2026-05102', 'Duplicado', 10)).statusCode).toBe(409);
    const excedido = await registrar('LOT-2026-05103', 'Lote B', 41);
    expect(excedido.statusCode).toBe(422);
    expect(excedido.json().error.code).toBe('SUPERFICIE_LOTE_EXCEDIDA');
  });

  it('CU04 combina filtros por código, nombre, sector y estado en menos de 2 segundos', async () => {
    await registrar('LOT-2026-05104', 'Norte Productivo', 10, 'EN_PRODUCCION');
    await registrar('LOT-2026-05105', 'Sur Disponible', 10);
    const inicio = performance.now();
    const res = await app.inject({
      method: 'GET', url: '/api/v1/lotes-territorio?codigo=05104&nombre=Norte&sector=Norte&estado=EN_PRODUCCION',
    });
    expect(performance.now() - inicio).toBeLessThan(2000);
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].codigoLote).toBe('LOT-2026-05104');
  });

  it('CU05 modifica datos territoriales conservando código y finca', async () => {
    const creado = (await registrar('LOT-2026-05106', 'Original', 20)).json().data;
    const res = await app.inject({
      method: 'PUT', url: `/api/v1/lotes-territorio/${creado.id}`,
      payload: { nombre: 'Modificado', superficieHa: 25, ubicacionSector: 'Oeste', tipoSuelo: 'Franco' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ codigoLote: 'LOT-2026-05106', fincaId: FINCA_ID, nombreTerritorial: 'Modificado', superficieHa: 25 });
  });

  it('CU06 desactiva solo lotes disponibles sin ciclos abiertos y libera superficie', async () => {
    const disponible = (await registrar('LOT-2026-05107', 'Disponible', 70)).json().data;
    const desactivado = await app.inject({ method: 'PATCH', url: `/api/v1/lotes-territorio/${disponible.id}/desactivar` });
    expect(desactivado.statusCode).toBe(200);
    expect(desactivado.json().data.estadoTerritorial).toBe('INACTIVO');
    expect((await registrar('LOT-2026-05108', 'Reutiliza superficie', 100)).statusCode).toBe(201);

    const loteConCiclo = (await lotes.buscarPorCodigo('LOT-2026-05108'))!;
    loteConCiclo.modificarTerritorio({ nombreTerritorial: 'Reutiliza superficie', superficieHa: 100, estadoTerritorial: 'DISPONIBLE' });
    await lotes.actualizar(loteConCiclo);
    await ciclos.guardar(CicloProductivo.crear({
      id: 'c0000000-0000-4000-8000-000000000051', codigoCiclo: 'CICLO-2026-0051',
      loteId: loteConCiclo.id, cultivo: 'Arándano', superficieCultivadaHa: 10, fechaInicio: '2026-10-27', estado: 'ABIERTO',
    }));
    const bloqueado = await app.inject({ method: 'PATCH', url: `/api/v1/lotes-territorio/${loteConCiclo.id}/desactivar` });
    expect(bloqueado.statusCode).toBe(422);
    expect(bloqueado.json().error.code).toBe('DESACTIVACION_LOTE_NO_PERMITIDA');
  });

  it('devuelve 400 para payload inválido y 404 para lote inexistente', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/v1/lotes-territorio', payload: { codigo: 'x' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PUT', url: '/api/v1/lotes-territorio/00000000-0000-4000-8000-000000000099', payload: { nombre: 'No existe', superficieHa: 1 } })).statusCode).toBe(404);
  });
});
