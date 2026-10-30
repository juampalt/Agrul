import { FastifyInstance } from 'fastify';
import {
  ConsultarVariedadesUseCase, DesactivarVariedadUseCase, ModificarVariedadUseCase, RegistrarVariedadUseCase,
} from '../../../application/use-cases/variedades.use-cases.js';
import { CultivosRepositoryPort } from '../../../core/ports/cultivos-repository.port.js';
import { VariedadesRepositoryPort } from '../../../core/ports/variedades-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  ConsultarVariedadesSchema, DatosVariedadSchema, RegistrarVariedadSchema, SolicitudVaciaVariedadSchema, VariedadIdSchema,
} from '../schemas/variedades.schema.js';

export function registrarRutasVariedades(app: FastifyInstance, repo: VariedadesRepositoryPort, cultivos: CultivosRepositoryPort) {
  const registrar = new RegistrarVariedadUseCase(repo, cultivos);
  const consultar = new ConsultarVariedadesUseCase(repo, cultivos);
  const modificar = new ModificarVariedadUseCase(repo);
  const desactivar = new DesactivarVariedadUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  app.post('/api/v1/variedades', permisos, async (req, reply) => {
    SolicitudVaciaVariedadSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarVariedadSchema.parse(req.body))));
  });
  app.get('/api/v1/variedades', permisos, async (req) => {
    return respuesta(await consultar.execute(ConsultarVariedadesSchema.parse(req.query)));
  });
  app.get('/api/v1/variedades/:id', permisos, async (req) => {
    const { id } = VariedadIdSchema.parse(req.params);
    SolicitudVaciaVariedadSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(id));
  });
  app.put('/api/v1/variedades/:id', permisos, async (req) => {
    const { id } = VariedadIdSchema.parse(req.params);
    SolicitudVaciaVariedadSchema.parse(req.query);
    return respuesta(await modificar.execute(id, DatosVariedadSchema.parse(req.body)));
  });
  app.patch('/api/v1/variedades/:id/desactivar', permisos, async (req) => {
    const { id } = VariedadIdSchema.parse(req.params);
    SolicitudVaciaVariedadSchema.parse(req.query);
    SolicitudVaciaVariedadSchema.parse(req.body ?? {});
    return respuesta(await desactivar.execute(id));
  });
}
