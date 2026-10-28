import { FastifyInstance } from 'fastify';
import {
  ProgramarActividadUseCase,
  ConsultarActividadesProgramadasUseCase,
  ReprogramarActividadUseCase,
  CancelarActividadUseCase,
} from '../../../application/use-cases/actividades-programadas.use-cases.js';
import { ActividadesProgramadasRepositoryPort } from '../../../core/ports/actividades-programadas-repository.port.js';
import { CiclosProductivosRepositoryPort } from '../../../core/ports/ciclos-productivos-repository.port.js';
import { TiposActividadRepositoryPort } from '../../../core/ports/tipos-actividad-repository.port.js';
import { UsuariosRepositoryPort } from '../../../core/ports/usuarios-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  ProgramarActividadSchema,
  ActividadProgramadaIdSchema,
  ReprogramarActividadSchema,
  CancelarActividadSchema,
  ConsultarActividadesProgramadasSchema,
  SolicitudVaciaActividadProgramadaSchema,
} from '../schemas/actividades-programadas.schema.js';

export function registrarRutasActividadesProgramadas(
  app: FastifyInstance,
  repo: ActividadesProgramadasRepositoryPort,
  ciclosRepo: CiclosProductivosRepositoryPort,
  tiposRepo: TiposActividadRepositoryPort,
  usuariosRepo: UsuariosRepositoryPort,
) {
  const programar = new ProgramarActividadUseCase(repo, ciclosRepo, tiposRepo, usuariosRepo);
  const consultar = new ConsultarActividadesProgramadasUseCase(repo);
  const reprogramar = new ReprogramarActividadUseCase(repo, usuariosRepo);
  const cancelar = new CancelarActividadUseCase(repo);

  const permisosOperacion = {
    preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial],
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  // CU26: Programar actividad agrícola
  app.post('/api/v1/actividades-programadas', permisosOperacion, async (req, reply) => {
    SolicitudVaciaActividadProgramadaSchema.parse(req.query);
    const datos = ProgramarActividadSchema.parse(req.body);
    return reply.status(201).send(respuesta(await programar.execute(datos)));
  });

  // CU27: Consultar y listar actividades programadas
  app.get('/api/v1/actividades-programadas', permisosOperacion, async (req) => {
    const filtros = ConsultarActividadesProgramadasSchema.parse(req.query);
    return respuesta(await consultar.execute(filtros));
  });

  // CU27: Obtener actividad programada por ID
  app.get('/api/v1/actividades-programadas/:id', permisosOperacion, async (req) => {
    const { id } = ActividadProgramadaIdSchema.parse(req.params);
    SolicitudVaciaActividadProgramadaSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(id));
  });

  // CU28: Reprogramar actividad agrícola
  app.patch('/api/v1/actividades-programadas/:id/reprogramar', permisosOperacion, async (req) => {
    const { id } = ActividadProgramadaIdSchema.parse(req.params);
    SolicitudVaciaActividadProgramadaSchema.parse(req.query);
    const params = ReprogramarActividadSchema.parse(req.body);
    return respuesta(await reprogramar.execute(id, params));
  });

  // CU29: Cancelar actividad agrícola justificada (RN-12)
  app.patch('/api/v1/actividades-programadas/:id/cancelar', permisosOperacion, async (req) => {
    const { id } = ActividadProgramadaIdSchema.parse(req.params);
    SolicitudVaciaActividadProgramadaSchema.parse(req.query);
    const { motivoCancelacion } = CancelarActividadSchema.parse(req.body);
    return respuesta(await cancelar.execute(id, motivoCancelacion));
  });
}
