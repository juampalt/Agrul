import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../../../src/infrastructure/http/app.js';
import { CryptoAuthService } from '../../../src/infrastructure/services/crypto-auth.service.js';
import { SessionInactivityService } from '../../../src/infrastructure/services/session-inactivity.service.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../../mocks/in-memory-genealogia.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { ProduccionesController } from '../../../src/infrastructure/http/controllers/producciones.controller.js';
import { ProduccionesService } from '../../../src/infrastructure/database/producciones.service.js';

function crearToken(perfil: 'ADMINISTRADOR' | 'ENCARGADO_CAMPO' | 'ADMIN_SISTEMA') {
  const jti = `test-jti-${perfil}`;
  const sub = `00000000-0000-4000-8000-000000000001`;
  SessionInactivityService.registrarActividad(`${sub}:${jti}`, Date.now());
  return CryptoAuthService.generateToken({
    sub,
    email: `${perfil.toLowerCase()}@agrul.local`,
    nombre: perfil,
    apellido: 'Test',
    perfil,
    fincas: [],
    debeCambiarPassword: false,
    versionSesion: 1,
    jti,
  });
}

describe('RBAC de Módulos Consolidados (/api/v1/producciones y endpoints bloqueados)', () => {
  const mockService = {
    obtenerFincaResumen: vi.fn(async () => ({ id: 'f1', nombre: 'La Esperanza', hectareasTotales: 100, hectareasAsignadas: 20, hectareasDisponibles: 80, produccionesActivas: 1 })),
    listarProducciones: vi.fn(async () => []),
    selectorInsumosMinimo: vi.fn(async () => [{ id: 'i1', codigo: 'INS-1', nombre: 'Fungicida', categoria: 'FITOSANITARIO', unidadMedida: 'L', stockDisponible: 50, nivelMinimo: 10 }]),
    obtenerResumenInsumosUnificado: vi.fn(async () => ({ insumos: [], alertas: [], egresos: [] })),
  } as unknown as ProduccionesService;

  const app = buildApp({
    lotesRepo: new InMemoryLotesRepository(),
    eventosRepo: new InMemoryEventosRepository(),
    genealogiaRepo: new InMemoryGenealogiaRepository(),
    insumosRepo: new InMemoryInsumosCatalogoRepository(),
    produccionesController: new ProduccionesController(mockService),
    logger: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloquea con 403 a ENCARGADO_CAMPO en Finca, Creación/Cierre de Producción, Insumos Gestión y Dashboard', async () => {
    const token = crearToken('ENCARGADO_CAMPO');
    const headers = { Authorization: `Bearer ${token}` };

    const r1 = await app.inject({ method: 'GET', url: '/api/v1/finca-resumen', headers });
    expect(r1.statusCode).toBe(403);

    const r2 = await app.inject({ method: 'POST', url: '/api/v1/producciones', headers, payload: {} });
    expect(r2.statusCode).toBe(403);

    const r3 = await app.inject({ method: 'POST', url: '/api/v1/producciones/00000000-0000-4000-8000-000000000001/finalizar', headers, payload: {} });
    expect(r3.statusCode).toBe(403);

    const r4 = await app.inject({ method: 'GET', url: '/api/v1/insumos/resumen-unificado', headers });
    expect(r4.statusCode).toBe(403);

    const r5 = await app.inject({ method: 'GET', url: '/api/v1/insumos', headers });
    expect(r5.statusCode).toBe(403);
  });

  it('permite a ENCARGADO_CAMPO consultar /producciones y /insumos/selector para Fumigación', async () => {
    const token = crearToken('ENCARGADO_CAMPO');
    const headers = { Authorization: `Bearer ${token}` };

    const r1 = await app.inject({ method: 'GET', url: '/api/v1/producciones', headers });
    expect(r1.statusCode).toBe(200);

    const r2 = await app.inject({ method: 'GET', url: '/api/v1/insumos/selector', headers });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().data).toHaveLength(1);
  });

  it('mantiene a ADMIN_SISTEMA bloqueado en Finca, Producción e Insumos', async () => {
    const token = crearToken('ADMIN_SISTEMA');
    const headers = { Authorization: `Bearer ${token}` };

    expect((await app.inject({ method: 'GET', url: '/api/v1/finca-resumen', headers })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/v1/producciones', headers })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/v1/insumos/selector', headers })).statusCode).toBe(403);
  });
});
