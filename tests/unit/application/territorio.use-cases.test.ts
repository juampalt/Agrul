import { beforeEach, describe, expect, it } from 'vitest';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { ModificarFincaUseCase, SuperficieFincaInsuficienteError } from '../../../src/application/use-cases/finca-territorial.use-cases.js';
import {
  DesactivarLoteTerritorialUseCase,
  DesactivacionLoteNoPermitidaError,
  RegistrarLoteTerritorialUseCase,
  SuperficieLoteExcedidaError,
} from '../../../src/application/use-cases/lotes-territoriales.use-cases.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';

describe('Casos de uso territoriales', () => {
  let fincas: InMemoryFincasRepository;
  let lotes: InMemoryLotesRepository;
  let ciclos: InMemoryCiclosRepository;
  let registrar: RegistrarLoteTerritorialUseCase;

  beforeEach(async () => {
    fincas = new InMemoryFincasRepository();
    lotes = new InMemoryLotesRepository();
    ciclos = new InMemoryCiclosRepository();
    await fincas.guardar(Finca.crear({
      id: 'f0000000-0000-4000-8000-000000000051', nombre: 'Finca única', localidad: 'Lules',
      departamento: 'Lules', provincia: 'Tucumán', superficieTotalHa: 50,
    }));
    registrar = new RegistrarLoteTerritorialUseCase(lotes, fincas);
  });

  it('controla la suma de superficie activa al registrar y modificar la finca', async () => {
    await registrar.execute({ codigo: 'LOT-2026-05201', nombre: 'Lote 1', superficieHa: 40, ubicacionSector: 'Sector LOT-2026-05201' });
    await expect(registrar.execute({ codigo: 'LOT-2026-05202', nombre: 'Lote 2', superficieHa: 11, ubicacionSector: 'Sector LOT-2026-05202' }))
      .rejects.toBeInstanceOf(SuperficieLoteExcedidaError);
    const modificar = new ModificarFincaUseCase(fincas, lotes);
    await expect(modificar.execute({
      nombre: 'Finca única', localidad: 'Lules', departamento: 'Lules', provincia: 'Tucumán', superficieTotalHa: 39,
    })).rejects.toBeInstanceOf(SuperficieFincaInsuficienteError);
  });

  it('mantiene el código reservado después de desactivar el lote', async () => {
    const lote = await registrar.execute({ codigo: 'LOT-2026-05203', nombre: 'Lote 3', superficieHa: 20, ubicacionSector: 'Sector LOT-2026-05203' });
    await new DesactivarLoteTerritorialUseCase(lotes, ciclos).execute(lote.id);
    await expect(registrar.execute({ codigo: 'LOT-2026-05203', nombre: 'Nuevo lote', superficieHa: 20, ubicacionSector: 'Sector LOT-2026-05203' }))
      .rejects.toMatchObject({ code: 'DUPLICATE_BATCH_CODE' });
  });

  it('rechaza desactivar un lote en producción o con ciclo abierto', async () => {
    const productivo = await registrar.execute({
      codigo: 'LOT-2026-05204', nombre: 'Productivo', superficieHa: 10, ubicacionSector: 'Sector productivo',
    });
    const enProduccion = (await lotes.buscarPorId(productivo.id))!;
    enProduccion.marcarEnProduccion();
    await lotes.actualizar(enProduccion);
    const desactivar = new DesactivarLoteTerritorialUseCase(lotes, ciclos);
    await expect(desactivar.execute(productivo.id)).rejects.toBeInstanceOf(DesactivacionLoteNoPermitidaError);

    const disponible = await registrar.execute({ codigo: 'LOT-2026-05205', nombre: 'Disponible', superficieHa: 10, ubicacionSector: 'Sector LOT-2026-05205' });
    await ciclos.guardar(CicloProductivo.crear({
      id: 'c0000000-0000-4000-8000-000000000052', codigoCiclo: 'CICLO-2026-0052', loteId: disponible.id,
      cultivo: 'Limón', superficieCultivadaHa: 10, fechaInicio: '2026-10-27', estado: 'ABIERTO',
    }));
    await expect(desactivar.execute(disponible.id)).rejects.toBeInstanceOf(DesactivacionLoteNoPermitidaError);
  });
});
