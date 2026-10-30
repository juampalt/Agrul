import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
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
  const rutas = app.withTypeProvider<ZodTypeProvider>();
  const permisos = { attachValidation: true, preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial,
    async (req: FastifyRequest) => { if (req.validationError) throw req.validationError; }] };
  const actor = (req: FastifyRequest): ActorCosechas => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  rutas.post('/api/v1/clasificaciones', { ...permisos, schema: { body: ClasificarProduccionSchema, querystring: PoscosechaVacioSchema } }, async (req, reply) => {
    return reply.status(201).send(respuesta(await clasificar.execute(req.body, actor(req))));
  });
  rutas.post('/api/v1/acondicionamientos', { ...permisos, schema: { body: AcondicionarProduccionSchema, querystring: PoscosechaVacioSchema } }, async (req, reply) => {
    return reply.status(201).send(respuesta(await acondicionar.execute(req.body, actor(req))));
  });
  rutas.get('/api/v1/clasificaciones', { ...permisos, schema: { querystring: ConsultarClasificacionesSchema } }, async req => respuesta(await consultar.listarClasificaciones(req.query, actor(req))));
  rutas.get('/api/v1/acondicionamientos', { ...permisos, schema: { querystring: ConsultarAcondicionamientosSchema } }, async req => respuesta(await consultar.listarAcondicionamientos(req.query, actor(req))));
  rutas.get('/api/v1/partidas-produccion', { ...permisos, schema: { querystring: ConsultarPartidasProduccionSchema } }, async req => respuesta(await consultar.listarPartidas(req.query, actor(req))));
  rutas.get('/api/v1/clasificaciones/totales', { ...permisos, schema: { querystring: ConsultarClasificacionesSchema } }, async req => respuesta(await consultar.totalesClasificaciones(req.query, actor(req))));
  rutas.get('/api/v1/clasificaciones/:id', { ...permisos, schema: { params: PoscosechaIdSchema, querystring: PoscosechaVacioSchema } }, async req => {
    return respuesta(await consultar.obtenerClasificacion(req.params.id, actor(req)));
  });
  rutas.get('/api/v1/acondicionamientos/:id', { ...permisos, schema: { params: PoscosechaIdSchema, querystring: PoscosechaVacioSchema } }, async req => {
    return respuesta(await consultar.obtenerAcondicionamiento(req.params.id, actor(req)));
  });
  rutas.get('/api/v1/partidas-produccion/:id', { ...permisos, schema: { params: PoscosechaIdSchema, querystring: PoscosechaVacioSchema } }, async req => {
    return respuesta(await consultar.obtenerPartida(req.params.id, actor(req)));
  });
}
