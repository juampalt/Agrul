import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProveedoresRepository } from '../../mocks/in-memory-proveedores.repository.js';
import {
  RegistrarProveedorUseCase,
  ListarProveedoresUseCase,
  ObtenerProveedorPorIdUseCase,
  ActualizarProveedorUseCase,
} from '../../../src/application/use-cases/proveedores.use-cases.js';
import {
  ProveedorDuplicadoError,
  EntidadNoEncontradaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Gestión de Proveedores (AGRUL-041 / RF-M9-01)', () => {
  let repo: InMemoryProveedoresRepository;
  let registrarUseCase: RegistrarProveedorUseCase;
  let listarUseCase: ListarProveedoresUseCase;
  let obtenerUseCase: ObtenerProveedorPorIdUseCase;
  let actualizarUseCase: ActualizarProveedorUseCase;

  beforeEach(() => {
    repo = new InMemoryProveedoresRepository();
    registrarUseCase = new RegistrarProveedorUseCase(repo);
    listarUseCase = new ListarProveedoresUseCase(repo);
    obtenerUseCase = new ObtenerProveedorPorIdUseCase(repo);
    actualizarUseCase = new ActualizarProveedorUseCase(repo);
  });

  it('debe registrar un proveedor exitosamente y recuperarlo por ID', async () => {
    const prov = await registrarUseCase.execute({
      razonSocial: 'Fertilizantes del Sur S.A.',
      cuit: '30-71122334-5',
      contacto: 'Ing. Laura Morales',
      email: 'contacto@fertsur.com',
      telefono: '0261-4223344',
    });

    expect(prov.id).toBeDefined();
    expect(prov.razonSocial).toBe('Fertilizantes del Sur S.A.');
    expect(prov.cuit).toBe('30-71122334-5');
    expect(prov.activo).toBe(true);

    const obtenido = await obtenerUseCase.execute(prov.id);
    expect(obtenido.id).toBe(prov.id);
    expect(obtenido.email).toBe('contacto@fertsur.com');
  });

  it('debe rechazar registro de proveedor con CUIT duplicado', async () => {
    await registrarUseCase.execute({
      razonSocial: 'Agroquímicos Argentinos S.A.',
      cuit: '30-99887766-1',
    });

    await expect(
      registrarUseCase.execute({
        razonSocial: 'Otra Empresa Con Mismo CUIT',
        cuit: '30-99887766-1',
      })
    ).rejects.toThrow(ProveedorDuplicadoError);
  });

  it('debe listar proveedores y filtrar por búsqueda', async () => {
    await registrarUseCase.execute({
      razonSocial: 'Bayer Crops',
      cuit: '30-11111111-1',
      contacto: 'Martín Bossi',
    });
    await registrarUseCase.execute({
      razonSocial: 'Syngenta Agro',
      cuit: '30-22222222-2',
      contacto: 'Roberto Gómez',
    });

    const todos = await listarUseCase.execute();
    expect(todos).toHaveLength(2);

    const filtrados = await listarUseCase.execute({ busqueda: 'Syngenta' });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].razonSocial).toBe('Syngenta Agro');
  });

  it('debe actualizar los datos de un proveedor y validar unicidad de CUIT', async () => {
    const prov = await registrarUseCase.execute({
      razonSocial: 'Semillas Cuyo',
      cuit: '30-33333333-3',
    });

    const actualizado = await actualizarUseCase.execute({
      id: prov.id,
      razonSocial: 'Semillas Cuyo S.R.L.',
      telefono: '+54 261 5556677',
      activo: false,
    });

    expect(actualizado.razonSocial).toBe('Semillas Cuyo S.R.L.');
    expect(actualizado.telefono).toBe('+54 261 5556677');
    expect(actualizado.activo).toBe(false);
  });

  it('debe arrojar EntidadNoEncontradaError si el proveedor a obtener o actualizar no existe', async () => {
    await expect(obtenerUseCase.execute('prov-no-existe')).rejects.toThrow(EntidadNoEncontradaError);
    await expect(
      actualizarUseCase.execute({ id: 'prov-no-existe', razonSocial: 'No existe' })
    ).rejects.toThrow(EntidadNoEncontradaError);
  });
});
