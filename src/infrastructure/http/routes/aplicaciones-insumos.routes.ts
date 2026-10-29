import { FastifyInstance, FastifyRequest } from 'fastify';
import { ConsultarAplicacionesInsumosUseCase, RegistrarAplicacionInsumosUseCase } from '../../../application/use-cases/aplicaciones-insumos.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { AplicacionesInsumosRepositoryPort } from '../../../core/ports/aplicaciones-insumos-repository.port.js';
import { ActorInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AplicacionInsumosIdSchema, AplicacionInsumosVacioSchema, ConsultarAplicacionesInsumosSchema, RegistrarAplicacionInsumosSchema } from '../schemas/aplicaciones-insumos.schema.js';

export function registrarRutasAplicacionesInsumos(app: FastifyInstance, repo: AplicacionesInsumosRepositoryPort) {
  const registrar = new RegistrarAplicacionInsumosUseCase(repo);
  const consultar = new ConsultarAplicacionesInsumosUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const actor = (req: FastifyRequest): ActorInventario => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/aplicaciones-insumos', permisos, async (req, reply) => {
    AplicacionInsumosVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarAplicacionInsumosSchema.parse(req.body), actor(req))));
  });
  app.get('/api/v1/aplicaciones-insumos', permisos, async req => respuesta(await consultar.listar(ConsultarAplicacionesInsumosSchema.parse(req.query), actor(req))));
  app.get('/api/v1/aplicaciones-insumos/:id', permisos, async req => {
    AplicacionInsumosVacioSchema.parse(req.query);
    return respuesta(await consultar.obtener(AplicacionInsumosIdSchema.parse(req.params).id, actor(req)));
  });
}
