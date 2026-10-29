import { FastifyInstance } from 'fastify';
import {
  ConsultarTiposActividadUseCase,
  DesactivarTipoActividadUseCase,
  ModificarTipoActividadUseCase,
  RegistrarTipoActividadUseCase,
} from '../../../application/use-cases/tipos-actividad.use-cases.js';
import { TiposActividadRepositoryPort } from '../../../core/ports/tipos-actividad-repository.port.js';
import { CultivosRepositoryPort } from '../../../core/ports/cultivos-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  ConsultarTiposActividadSchema,
  DatosTipoActividadSchema,
  SolicitudVaciaTipoActividadSchema,
  TipoActividadIdSchema,
} from '../schemas/tipos-actividad.schema.js';

export function registrarRutasTiposActividad(
  app: FastifyInstance,
  repo: TiposActividadRepositoryPort,
  cultivosRepo?: CultivosRepositoryPort,
) {
  const registrar = new RegistrarTipoActividadUseCase(repo, cultivosRepo);
  const consultar = new ConsultarTiposActividadUseCase(repo);
  const modificar = new ModificarTipoActividadUseCase(repo, cultivosRepo);
  const desactivar = new DesactivarTipoActividadUseCase(repo);

  const permisosAdmin = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  const permisosConsulta = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  // CU22: Registrar Tipo de Actividad
  app.post('/api/v1/tipos-actividad', permisosAdmin, async (req, reply) => {
    SolicitudVaciaTipoActividadSchema.parse(req.query);
    const datos = DatosTipoActividadSchema.parse(req.body);
    return reply.status(201).send(respuesta(await registrar.execute(datos)));
  });

  // CU23: Consultar y listar Tipos de Actividad
  app.get('/api/v1/tipos-actividad', permisosConsulta, async (req) => {
    return respuesta(await consultar.execute(ConsultarTiposActividadSchema.parse(req.query)));
  });

  // CU23: Obtener Tipo de Actividad por ID
  app.get('/api/v1/tipos-actividad/:id', permisosConsulta, async (req) => {
    const { id } = TipoActividadIdSchema.parse(req.params);
    SolicitudVaciaTipoActividadSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(id));
  });

  // CU24: Modificar Tipo de Actividad
  app.put('/api/v1/tipos-actividad/:id', permisosAdmin, async (req) => {
    const { id } = TipoActividadIdSchema.parse(req.params);
    SolicitudVaciaTipoActividadSchema.parse(req.query);
    return respuesta(await modificar.execute(id, DatosTipoActividadSchema.parse(req.body)));
  });

  // CU25: Desactivar Tipo de Actividad (preservación histórica RN-26)
  app.patch('/api/v1/tipos-actividad/:id/desactivar', permisosAdmin, async (req) => {
    const { id } = TipoActividadIdSchema.parse(req.params);
    SolicitudVaciaTipoActividadSchema.parse(req.query);
    SolicitudVaciaTipoActividadSchema.parse(req.body ?? {});
    return respuesta(await desactivar.execute(id));
  });
}
