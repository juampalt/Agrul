import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CancelarJornadaCosechaUseCase, ConsultarCosechasProgramadasUseCase,
  ProgramarCosechaUseCase, ReprogramarCosechaUseCase,
} from '../../../application/use-cases/cosechas-programadas.use-cases.js';
import { AutorizarRecursoAgricolaUseCase, fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { AccesoRecursosAgricolasPort } from '../../../core/ports/acceso-recursos-agricolas.port.js';
import { CosechasProgramadasRepositoryPort } from '../../../core/ports/cosechas-programadas-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  CancelarJornadaSchema, ConsultarJornadasSchema, JornadaIdSchema, PaginaHistorialJornadaSchema,
  ProgramarCosechaSchema, ReprogramarCosechaSchema, SolicitudVaciaJornadaSchema,
} from '../schemas/cosechas-programadas.schema.js';

export function registrarRutasCosechasProgramadas(app: FastifyInstance, repo: CosechasProgramadasRepositoryPort,
  accesoRepo?: AccesoRecursosAgricolasPort) {
  if (!accesoRepo) throw new Error('Las jornadas requieren autorización persistente por finca.');
  const autorizar = new AutorizarRecursoAgricolaUseCase(accesoRepo);
  const programar = new ProgramarCosechaUseCase(repo);
  const consultar = new ConsultarCosechasProgramadasUseCase(repo);
  const reprogramar = new ReprogramarCosechaUseCase(repo);
  const cancelar = new CancelarJornadaCosechaUseCase(repo);
  const rutas = app.withTypeProvider<ZodTypeProvider>();
  const permisos = { attachValidation: true, preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial,
    async (req: FastifyRequest) => { if (req.validationError) throw req.validationError; }] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  const actorId = (req: FastifyRequest) => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return req.usuario.sub;
  };
  const autorizarJornada = async (req: FastifyRequest, id: string) => {
    const jornada = await consultar.obtener(id);
    // El ciclo es inmutable en la jornada; la finca se resuelve siempre desde
    // la relación persistida ciclo -> plantación -> lote, nunca desde el body.
    await autorizar.execute(req.usuario, 'ciclo', jornada.cicloId);
    return jornada;
  };
  const ruta = '/api/v1/cosechas-programadas';
  rutas.post(ruta, { ...permisos, schema: { body: ProgramarCosechaSchema, querystring: SolicitudVaciaJornadaSchema } }, async (req, reply) => {
    const { operacionId, ...datos } = req.body;
    await autorizar.execute(req.usuario, 'ciclo', datos.cicloId);
    return reply.status(201).send(respuesta(await programar.execute(operacionId, datos, actorId(req))));
  });
  rutas.get(ruta, { ...permisos, schema: { querystring: ConsultarJornadasSchema } }, async req => respuesta(await consultar.listar({
    ...req.query, fincaIds: fincasVisiblesAgricolas(req.usuario),
  })));
  rutas.get(`${ruta}/:id`, { ...permisos, schema: { params: JornadaIdSchema, querystring: SolicitudVaciaJornadaSchema } }, async req => {
    return respuesta(await autorizarJornada(req, req.params.id));
  });
  rutas.get(`${ruta}/:id/historial`, { ...permisos, schema: { params: JornadaIdSchema, querystring: PaginaHistorialJornadaSchema } }, async req => {
    const { id } = req.params;
    const { limit, offset } = req.query;
    await autorizarJornada(req, id);
    return respuesta(await consultar.historial(id, limit, offset));
  });
  rutas.patch(`${ruta}/:id/reprogramar`, { ...permisos, schema: { params: JornadaIdSchema, body: ReprogramarCosechaSchema, querystring: SolicitudVaciaJornadaSchema } }, async req => {
    const { id } = req.params;
    const { version, ...datos } = req.body;
    await autorizarJornada(req, id);
    return respuesta(await reprogramar.execute(id, version, datos, actorId(req)));
  });
  rutas.patch(`${ruta}/:id/cancelar`, { ...permisos, schema: { params: JornadaIdSchema, body: CancelarJornadaSchema, querystring: SolicitudVaciaJornadaSchema } }, async req => {
    const { id } = req.params;
    const { version, motivoCancelacion } = req.body;
    await autorizarJornada(req, id);
    return respuesta(await cancelar.execute(id, version, motivoCancelacion, actorId(req)));
  });
}
