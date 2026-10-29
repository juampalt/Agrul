import { beforeEach, expect, it, vi } from 'vitest';
import { crearEsquemaPostgresAislado } from '../../helpers/esquema-postgres-aislado.fixture.js';
import { createDatabaseConnection } from '../../../src/infrastructure/database/connection.js';

vi.mock('../../../src/infrastructure/database/connection.js', () => ({ createDatabaseConnection: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it.each([
  'postgresql://postgres@127.0.0.1:5432/agrul_test_agrul_054',
  'postgresql://agrul_test_user@127.0.0.1:5432/gimnasio_db',
  'postgresql://agrul_test_user@127.0.0.1:5433/agrul_test_agrul_054',
  'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054?options=-c%20search_path=public',
])('rechaza destino no autorizado antes de crear un pool: %s', async url => {
  await expect(crearEsquemaPostgresAislado(url)).rejects.toThrow('Solo se admite la base descartable autorizada');
  expect(createDatabaseConnection).not.toHaveBeenCalled();
});
