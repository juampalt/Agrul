import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RegistrarPesajeCosechaUseCase, ConsultarCosechasRegistroUseCase } from '../../../application/use-cases/cosechas-registro.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { ActorCosechas } from '../../../core/domain/entities/cosecha-registrada.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { CosechasRegistroRepositoryPort } from '../../../core/ports/cosechas-registro-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { ConsultarCosechasVigentesSchema, CosechaRegistroIdSchema, CosechaRegistroVacioSchema, RegistrarCosechaVigenteSchema } from '../schemas/cosechas-registro.schema.js';

export function registrarRutasCosechasRegistro(app: FastifyInstance, repo: CosechasRegistroRepositoryPort) {
  const registrar = new RegistrarPesajeCosechaUseCase(repo), consultar = new ConsultarCosechasRegistroUseCase(repo);
  const rutas = app.withTypeProvider<ZodTypeProvider>();
  const permisos = { attachValidation: true, preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial,
    async (req: FastifyRequest) => { if (req.validationError) throw req.validationError; }] };
  const actor = (req: FastifyRequest): ActorCosechas => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  rutas.post('/api/v1/cosechas', { ...permisos, schema: { body: RegistrarCosechaVigenteSchema, querystring: CosechaRegistroVacioSchema } }, async (req, reply) => {
    return reply.status(201).send(respuesta(await registrar.execute(req.body, actor(req))));
  });
  rutas.get('/api/v1/cosechas', { ...permisos, schema: { querystring: ConsultarCosechasVigentesSchema } }, async req =>
    respuesta(await consultar.listar(req.query, actor(req))));
  rutas.get('/api/v1/cosechas/:id', { ...permisos, schema: { params: CosechaRegistroIdSchema, querystring: CosechaRegistroVacioSchema } }, async req => {
    return respuesta(await consultar.obtener(req.params.id, actor(req)));
  });
}
