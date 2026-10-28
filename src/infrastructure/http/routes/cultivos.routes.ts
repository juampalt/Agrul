import { FastifyInstance } from 'fastify';
import {
  ConsultarCultivosUseCase, DesactivarCultivoUseCase, ModificarCultivoUseCase, RegistrarCultivoUseCase,
} from '../../../application/use-cases/cultivos.use-cases.js';
import { CultivosRepositoryPort } from '../../../core/ports/cultivos-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  ConsultarCultivosSchema, CultivoIdSchema, DatosCultivoSchema, SolicitudVaciaCultivoSchema,
} from '../schemas/cultivos.schema.js';

export function registrarRutasCultivos(app: FastifyInstance, repo: CultivosRepositoryPort) {
  const registrar = new RegistrarCultivoUseCase(repo);
  const consultar = new ConsultarCultivosUseCase(repo);
  const modificar = new ModificarCultivoUseCase(repo);
  const desactivar = new DesactivarCultivoUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  app.post('/api/v1/cultivos', permisos, async (req, reply) => {
    SolicitudVaciaCultivoSchema.parse(req.query);
    const datos = DatosCultivoSchema.parse(req.body);
    return reply.status(201).send(respuesta(await registrar.execute(datos)));
  });
  app.get('/api/v1/cultivos', permisos, async (req) => {
    return respuesta(await consultar.execute(ConsultarCultivosSchema.parse(req.query)));
  });
  app.get('/api/v1/cultivos/:id', permisos, async (req) => {
    const { id } = CultivoIdSchema.parse(req.params);
    SolicitudVaciaCultivoSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(id));
  });
  app.put('/api/v1/cultivos/:id', permisos, async (req) => {
    const { id } = CultivoIdSchema.parse(req.params);
    SolicitudVaciaCultivoSchema.parse(req.query);
    return respuesta(await modificar.execute(id, DatosCultivoSchema.parse(req.body)));
  });
  app.patch('/api/v1/cultivos/:id/desactivar', permisos, async (req) => {
    const { id } = CultivoIdSchema.parse(req.params);
    SolicitudVaciaCultivoSchema.parse(req.query);
    SolicitudVaciaCultivoSchema.parse(req.body ?? {});
    return respuesta(await desactivar.execute(id));
  });
}
