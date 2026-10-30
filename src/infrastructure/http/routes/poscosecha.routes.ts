import { FastifyInstance, FastifyRequest } from 'fastify';
import { RegistrarClasificacionUseCase, RegistrarAcondicionamientoUseCase, ConsultarPoscosechaUseCase } from '../../../application/use-cases/poscosecha.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { ActorCosechas } from '../../../core/domain/entities/cosecha-registrada.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { ClasificacionesRepositoryPort } from '../../../core/ports/clasificaciones-repository.port.js';
import { PoscosechaAlmacenamientoRepositoryPort } from '../../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AcondicionarProduccionSchema, ClasificarProduccionSchema, ConsultarAcondicionamientosSchema,
  ConsultarClasificacionesSchema, ConsultarPartidasProduccionSchema, PoscosechaIdSchema, PoscosechaVacioSchema } from '../schemas/poscosecha.schema.js';

export function registrarRutasPoscosecha(app: FastifyInstance, clasificaciones: ClasificacionesRepositoryPort, poscosecha: PoscosechaAlmacenamientoRepositoryPort) {
  const clasificar = new RegistrarClasificacionUseCase(clasificaciones), acondicionar = new RegistrarAcondicionamientoUseCase(poscosecha);
  const consultar = new ConsultarPoscosechaUseCase(clasificaciones, poscosecha);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const actor = (req: FastifyRequest): ActorCosechas => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/clasificaciones', permisos, async (req, reply) => {
    PoscosechaVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await clasificar.execute(ClasificarProduccionSchema.parse(req.body), actor(req))));
  });
  app.post('/api/v1/acondicionamientos', permisos, async (req, reply) => {
    PoscosechaVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await acondicionar.execute(AcondicionarProduccionSchema.parse(req.body), actor(req))));
  });
  app.get('/api/v1/clasificaciones', permisos, async req => respuesta(await consultar.listarClasificaciones(ConsultarClasificacionesSchema.parse(req.query), actor(req))));
  app.get('/api/v1/acondicionamientos', permisos, async req => respuesta(await consultar.listarAcondicionamientos(ConsultarAcondicionamientosSchema.parse(req.query), actor(req))));
  app.get('/api/v1/partidas-produccion', permisos, async req => respuesta(await consultar.listarPartidas(ConsultarPartidasProduccionSchema.parse(req.query), actor(req))));
  app.get('/api/v1/clasificaciones/:id', permisos, async req => {
    PoscosechaVacioSchema.parse(req.query);
    return respuesta(await consultar.obtenerClasificacion(PoscosechaIdSchema.parse(req.params).id, actor(req)));
  });
  app.get('/api/v1/acondicionamientos/:id', permisos, async req => {
    PoscosechaVacioSchema.parse(req.query);
    return respuesta(await consultar.obtenerAcondicionamiento(PoscosechaIdSchema.parse(req.params).id, actor(req)));
  });
  app.get('/api/v1/partidas-produccion/:id', permisos, async req => {
    PoscosechaVacioSchema.parse(req.query);
    return respuesta(await consultar.obtenerPartida(PoscosechaIdSchema.parse(req.params).id, actor(req)));
  });
}
