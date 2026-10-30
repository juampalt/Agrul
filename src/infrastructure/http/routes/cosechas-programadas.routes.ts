import { FastifyInstance, FastifyRequest } from 'fastify';
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
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
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
  app.post(ruta, permisos, async (req, reply) => {
    SolicitudVaciaJornadaSchema.parse(req.query);
    const { operacionId, ...datos } = ProgramarCosechaSchema.parse(req.body);
    await autorizar.execute(req.usuario, 'ciclo', datos.cicloId);
    return reply.status(201).send(respuesta(await programar.execute(operacionId, datos, actorId(req))));
  });
  app.get(ruta, permisos, async req => respuesta(await consultar.listar({
    ...ConsultarJornadasSchema.parse(req.query), fincaIds: fincasVisiblesAgricolas(req.usuario),
  })));
  app.get(`${ruta}/:id`, permisos, async req => {
    SolicitudVaciaJornadaSchema.parse(req.query);
    return respuesta(await autorizarJornada(req, JornadaIdSchema.parse(req.params).id));
  });
  app.get(`${ruta}/:id/historial`, permisos, async req => {
    const { id } = JornadaIdSchema.parse(req.params);
    const { limit, offset } = PaginaHistorialJornadaSchema.parse(req.query);
    await autorizarJornada(req, id);
    return respuesta(await consultar.historial(id, limit, offset));
  });
  app.patch(`${ruta}/:id/reprogramar`, permisos, async req => {
    SolicitudVaciaJornadaSchema.parse(req.query);
    const { id } = JornadaIdSchema.parse(req.params);
    const { version, ...datos } = ReprogramarCosechaSchema.parse(req.body);
    await autorizarJornada(req, id);
    return respuesta(await reprogramar.execute(id, version, datos, actorId(req)));
  });
  app.patch(`${ruta}/:id/cancelar`, permisos, async req => {
    SolicitudVaciaJornadaSchema.parse(req.query);
    const { id } = JornadaIdSchema.parse(req.params);
    const { version, motivoCancelacion } = CancelarJornadaSchema.parse(req.body);
    await autorizarJornada(req, id);
    return respuesta(await cancelar.execute(id, version, motivoCancelacion, actorId(req)));
  });
}
