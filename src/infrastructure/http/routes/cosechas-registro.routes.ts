import { FastifyInstance, FastifyRequest } from 'fastify';
import { RegistrarPesajeCosechaUseCase, ConsultarCosechasRegistroUseCase } from '../../../application/use-cases/cosechas-registro.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { ActorCosechas } from '../../../core/domain/entities/cosecha-registrada.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { CosechasRegistroRepositoryPort } from '../../../core/ports/cosechas-registro-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { ConsultarCosechasVigentesSchema, CosechaRegistroIdSchema, CosechaRegistroVacioSchema, RegistrarCosechaVigenteSchema } from '../schemas/cosechas-registro.schema.js';

export function registrarRutasCosechasRegistro(app: FastifyInstance, repo: CosechasRegistroRepositoryPort) {
  const registrar = new RegistrarPesajeCosechaUseCase(repo), consultar = new ConsultarCosechasRegistroUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const actor = (req: FastifyRequest): ActorCosechas => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/cosechas', permisos, async (req, reply) => {
    CosechaRegistroVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarCosechaVigenteSchema.parse(req.body), actor(req))));
  });
  app.get('/api/v1/cosechas', permisos, async req =>
    respuesta(await consultar.listar(ConsultarCosechasVigentesSchema.parse(req.query), actor(req))));
  app.get('/api/v1/cosechas/:id', permisos, async req => {
    CosechaRegistroVacioSchema.parse(req.query);
    return respuesta(await consultar.obtener(CosechaRegistroIdSchema.parse(req.params).id, actor(req)));
  });
}
