import { buildApp } from './infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../tests/mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../tests/mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../tests/mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../tests/mocks/in-memory-fincas.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../tests/mocks/in-memory-catalogos-actividades.repository.js';
import { InMemoryActividadesRepository } from '../tests/mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../tests/mocks/in-memory-ciclos.repository.js';
import { InMemoryObservacionesMonitoreoRepository } from '../tests/mocks/in-memory-observaciones-monitoreo.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../tests/mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../tests/mocks/in-memory-aplicaciones.repository.js';
import { InMemoryCosechasRepository } from '../tests/mocks/in-memory-cosechas.repository.js';
import { InMemoryDestinatariosRepository } from '../tests/mocks/in-memory-destinatarios.repository.js';
import { InMemoryDespachosRepository } from '../tests/mocks/in-memory-despachos.repository.js';
import { InMemoryPerdidasCosechaRepository } from '../tests/mocks/in-memory-perdidas-cosecha.repository.js';
import { InMemoryUsuariosRepository } from '../tests/mocks/in-memory-usuarios.repository.js';
import { InMemoryUsuarioFincasRepository } from '../tests/mocks/in-memory-usuario-fincas.repository.js';
import { InMemoryAuditoriaSeguridadRepository } from '../tests/mocks/in-memory-auditoria-seguridad.repository.js';
import { InMemorySesionesRepository } from '../tests/mocks/in-memory-sesiones.repository.js';
import { InMemoryMeteorologiaRepository } from '../tests/mocks/in-memory-meteorologia.repository.js';
import { InMemoryEventosClimaticosRepository } from '../tests/mocks/in-memory-eventos-climaticos.repository.js';
import { InMemoryInformesTrazabilidadRepository } from '../tests/mocks/in-memory-informes-trazabilidad.repository.js';
import { Usuario } from './core/domain/entities/usuario.entity.js';
import { Finca } from './core/domain/entities/finca.entity.js';
import { Lote } from './core/domain/entities/lote.entity.js';
import { CryptoAuthService } from './infrastructure/services/crypto-auth.service.js';

export async function crearServidorDemo(options: { logger?: boolean } = {}) {
  const lotesRepo = new InMemoryLotesRepository();
  const eventosRepo = new InMemoryEventosRepository(lotesRepo);
  const genealogiaRepo = new InMemoryGenealogiaRepository();
  const fincasRepo = new InMemoryFincasRepository();
  const catalogosRepo = new InMemoryCatalogosActividadesRepository();
  const actividadesRepo = new InMemoryActividadesRepository();
  const ciclosRepo = new InMemoryCiclosRepository();
  const observacionesRepo = new InMemoryObservacionesMonitoreoRepository();
  const insumosRepo = new InMemoryInsumosCatalogoRepository();
  const aplicacionesRepo = new InMemoryAplicacionesRepository();
  const cosechasRepo = new InMemoryCosechasRepository();
  const destinatariosRepo = new InMemoryDestinatariosRepository();
  const despachosRepo = new InMemoryDespachosRepository();
  const perdidasRepo = new InMemoryPerdidasCosechaRepository();
  const usuariosRepo = new InMemoryUsuariosRepository();
  const usuarioFincasRepo = new InMemoryUsuarioFincasRepository();
  const auditoriaRepo = new InMemoryAuditoriaSeguridadRepository();
  const sesionesRepo = new InMemorySesionesRepository();
  const meteorologiaRepo = new InMemoryMeteorologiaRepository();
  const eventosClimaticosRepo = new InMemoryEventosClimaticosRepository();
  const informesRepo = new InMemoryInformesTrazabilidadRepository();

  // Semilla de usuarios demo
  const { hash: hashAdmin, salt: saltAdmin } = CryptoAuthService.hashPassword('admin123');
  const usuarioAdmin = Usuario.crear({
    id: 'a0000000-0000-4000-8000-000000000001',
    nombre: 'Administrador',
    apellido: 'Sistema',
    nombreUsuario: 'admin',
    email: 'admin@agrul.local',
    passwordHash: hashAdmin,
    salt: saltAdmin,
    perfil: 'ADMIN_SISTEMA',
    estado: 'ACTIVO',
    debeCambiarPassword: false,
  });
  await usuariosRepo.guardar(usuarioAdmin);

  const { hash: hashCampo, salt: saltCampo } = CryptoAuthService.hashPassword('campo123');
  const usuarioCampo = Usuario.crear({
    id: 'a0000000-0000-4000-8000-000000000002',
    nombre: 'Carlos',
    apellido: 'Gómez',
    nombreUsuario: 'encargado',
    email: 'encargado@agrul.local',
    passwordHash: hashCampo,
    salt: saltCampo,
    perfil: 'ENCARGADO_CAMPO',
    estado: 'ACTIVO',
    debeCambiarPassword: false,
  });
  await usuariosRepo.guardar(usuarioCampo);

  // Semilla de Finca Demo
  const fincaId = 'f0000000-0000-4000-8000-000000000001';
  const fincaDemo = Finca.crear({
    id: fincaId,
    nombre: 'Finca La Esperanza',
    localidad: 'Tupungato',
    departamento: 'Tupungato',
    provincia: 'Mendoza',
    superficieTotalHa: 150,
    renspa: '12.345.6.78901/22',
  });
  await fincasRepo.guardar(fincaDemo);

  // Asignar finca al encargado y al admin
  await usuarioFincasRepo.asignarFincas(usuarioAdmin.id, [fincaId]);
  await usuarioFincasRepo.asignarFincas(usuarioCampo.id, [fincaId]);

  // Semilla de Lotes Demo
  const lote1 = Lote.crear({
    id: 'l0000000-0000-4000-8000-000000000001',
    codigoLote: 'LOT-2026-00001',
    producto: 'Cereza Lapins',
    variedad: 'Lapins',
    cantidadInicial: 5000,
    unidadMedida: 'KG',
    fincaId: fincaDemo.id,
    superficieHa: 30,
    nombreTerritorial: 'Cuadro Norte',
    estadoTerritorial: 'DISPONIBLE',
  });
  const lote2 = Lote.crear({
    id: 'l0000000-0000-4000-8000-000000000002',
    codigoLote: 'LOT-2026-00002',
    producto: 'Vid Malbec',
    variedad: 'Malbec',
    cantidadInicial: 12000,
    unidadMedida: 'KG',
    fincaId: fincaDemo.id,
    superficieHa: 45,
    nombreTerritorial: 'Cuadro Sur',
    estadoTerritorial: 'DISPONIBLE',
  });
  await lotesRepo.guardar(lote1);
  await lotesRepo.guardar(lote2);

  const app = buildApp({
    lotesRepo,
    eventosRepo,
    genealogiaRepo,
    fincasRepo,
    catalogosRepo,
    actividadesRepo,
    ciclosRepo,
    observacionesRepo,
    insumosRepo,
    aplicacionesRepo,
    cosechasRepo,
    destinatariosRepo,
    despachosRepo,
    perdidasRepo,
    usuariosRepo,
    usuarioFincasRepo,
    auditoriaRepo,
    sesionesRepo,
    revalidarSesiones: true,
    meteorologiaRepo,
    eventosClimaticosRepo,
    informesRepo,
    logger: options.logger ?? false,
  });

  return { app, usuariosRepo, fincasRepo, lotesRepo };
}
