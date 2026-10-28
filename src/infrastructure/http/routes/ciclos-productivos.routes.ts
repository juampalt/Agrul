import { FastifyInstance } from 'fastify';
import {
  ConsultarCiclosProductivosUseCase, FinalizarCicloProductivoUseCase, IniciarCicloProductivoUseCase, RegistrarCicloProductivoUseCase,
} from '../../../application/use-cases/ciclos-productivos.use-cases.js';
import { CiclosProductivosRepositoryPort } from '../../../core/ports/ciclos-productivos-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  CicloProductivoIdSchema, ConsultarCiclosProductivosSchema, FinalizarCicloProductivoSchema,
  IniciarCicloProductivoSchema, RegistrarCicloProductivoSchema, SolicitudVaciaCicloSchema,
} from '../schemas/ciclos-productivos.schema.js';

export function registrarRutasCiclosProductivos(app: FastifyInstance, repo: CiclosProductivosRepositoryPort) {
  const registrar = new RegistrarCicloProductivoUseCase(repo);
  const consultar = new ConsultarCiclosProductivosUseCase(repo);
  const iniciar = new IniciarCicloProductivoUseCase(repo);
  const finalizar = new FinalizarCicloProductivoUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/ciclos-productivos', permisos, async (req, reply) => {
    SolicitudVaciaCicloSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarCicloProductivoSchema.parse(req.body))));
  });
  app.get('/api/v1/ciclos-productivos', permisos, async (req) => {
    return respuesta(await consultar.execute(ConsultarCiclosProductivosSchema.parse(req.query)));
  });
  app.get('/api/v1/ciclos-productivos/:id', permisos, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(id));
  });
  app.patch('/api/v1/ciclos-productivos/:id/iniciar', permisos, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    return respuesta(await iniciar.execute(id, IniciarCicloProductivoSchema.parse(req.body).fechaInicioEfectiva));
  });
  app.patch('/api/v1/ciclos-productivos/:id/finalizar', permisos, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    return respuesta(await finalizar.execute(id, FinalizarCicloProductivoSchema.parse(req.body).fechaFinEfectiva));
  });
}
