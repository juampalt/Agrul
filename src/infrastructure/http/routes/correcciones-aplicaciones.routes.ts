import { FastifyInstance, FastifyRequest } from 'fastify';
import { CorregirAplicacionInsumosUseCase, ConsultarCorreccionesAplicacionesUseCase } from '../../../application/use-cases/correcciones-aplicaciones.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { ActorInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { CorreccionesAplicacionesRepositoryPort } from '../../../core/ports/correcciones-aplicaciones-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AplicacionInsumosIdSchema, AplicacionInsumosVacioSchema } from '../schemas/aplicaciones-insumos.schema.js';
import { CorregirAplicacionInsumosSchema } from '../schemas/correcciones-aplicaciones.schema.js';

export function registrarRutasCorreccionesAplicaciones(app: FastifyInstance, repo: CorreccionesAplicacionesRepositoryPort) {
  const corregir = new CorregirAplicacionInsumosUseCase(repo);
  const consultar = new ConsultarCorreccionesAplicacionesUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const actor = (req: FastifyRequest): ActorInventario => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/aplicaciones-insumos/:id/correcciones', permisos, async (req, reply) => {
    AplicacionInsumosVacioSchema.parse(req.query);
    const { id } = AplicacionInsumosIdSchema.parse(req.params);
    return reply.status(201).send(respuesta(await corregir.execute(id, CorregirAplicacionInsumosSchema.parse(req.body), actor(req))));
  });
  app.get('/api/v1/aplicaciones-insumos/:id/correcciones', permisos, async req => {
    AplicacionInsumosVacioSchema.parse(req.query);
    return respuesta(await consultar.execute(AplicacionInsumosIdSchema.parse(req.params).id, actor(req)));
  });
}
