import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ConsultarAlmacenamientoProduccionUseCase, RegistrarCamaraUseCase, RegistrarDestinoProduccionUseCase, RegistrarMovimientoAlmacenamientoUseCase } from '../../../application/use-cases/almacenamiento-produccion.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { ActorCosechas } from '../../../core/domain/entities/cosecha-registrada.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { AlmacenamientoProduccionRepositoryPort } from '../../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { DestinosRepositoryPort } from '../../../core/ports/destinos-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AlmacenamientoIdSchema, AlmacenamientoVacioSchema, ConsultarCamarasSchema, ConsultarDestinosProduccionSchema,
  ConsultarMovimientosAlmacenamientoSchema, ConsultarSaldosCamaraSchema, RegistrarCamaraSchema,
  RegistrarDestinoProduccionSchema, RegistrarMovimientoAlmacenamientoSchema } from '../schemas/almacenamiento-produccion.schema.js';

export function registrarRutasAlmacenamientoProduccion(app: FastifyInstance, almacen: AlmacenamientoProduccionRepositoryPort, destinos: DestinosRepositoryPort) {
  const crearCamara = new RegistrarCamaraUseCase(almacen), mover = new RegistrarMovimientoAlmacenamientoUseCase(almacen);
  const destinar = new RegistrarDestinoProduccionUseCase(destinos), consultar = new ConsultarAlmacenamientoProduccionUseCase(almacen, destinos);
  const rutas = app.withTypeProvider<ZodTypeProvider>();
  const permisos = { attachValidation: true, preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial,
    async (req: FastifyRequest) => { if (req.validationError) throw req.validationError; }] };
  const actor = (req: FastifyRequest): ActorCosechas => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  rutas.post('/api/v1/almacenamiento/camaras', { ...permisos, schema: { body: RegistrarCamaraSchema, querystring: AlmacenamientoVacioSchema } }, async (req, reply) => {
    return reply.status(201).send(respuesta(await crearCamara.execute(req.body, actor(req))));
  });
  rutas.post('/api/v1/almacenamiento/movimientos', { ...permisos, schema: { body: RegistrarMovimientoAlmacenamientoSchema, querystring: AlmacenamientoVacioSchema } }, async (req, reply) => {
    return reply.status(201).send(respuesta(await mover.execute(req.body, actor(req))));
  });
  rutas.post('/api/v1/destinos-produccion', { ...permisos, schema: { body: RegistrarDestinoProduccionSchema, querystring: AlmacenamientoVacioSchema } }, async (req, reply) => {
    return reply.status(201).send(respuesta(await destinar.execute(req.body, actor(req))));
  });
  rutas.get('/api/v1/almacenamiento/camaras', { ...permisos, schema: { querystring: ConsultarCamarasSchema } }, async req => respuesta(await consultar.listarCamaras(req.query, actor(req))));
  rutas.get('/api/v1/almacenamiento/movimientos', { ...permisos, schema: { querystring: ConsultarMovimientosAlmacenamientoSchema } }, async req => respuesta(await consultar.listarMovimientos(req.query, actor(req))));
  rutas.get('/api/v1/almacenamiento/saldos', { ...permisos, schema: { querystring: ConsultarSaldosCamaraSchema } }, async req => respuesta(await consultar.consultarSaldos(req.query, actor(req))));
  rutas.get('/api/v1/destinos-produccion', { ...permisos, schema: { querystring: ConsultarDestinosProduccionSchema } }, async req => respuesta(await consultar.listarDestinos(req.query, actor(req))));
  rutas.get('/api/v1/almacenamiento/camaras/:id', { ...permisos, schema: { params: AlmacenamientoIdSchema, querystring: AlmacenamientoVacioSchema } }, async req => {
    return respuesta(await consultar.obtenerCamara(req.params.id, actor(req)));
  });
  rutas.get('/api/v1/almacenamiento/movimientos/:id', { ...permisos, schema: { params: AlmacenamientoIdSchema, querystring: AlmacenamientoVacioSchema } }, async req => {
    return respuesta(await consultar.obtenerMovimiento(req.params.id, actor(req)));
  });
  rutas.get('/api/v1/destinos-produccion/:id', { ...permisos, schema: { params: AlmacenamientoIdSchema, querystring: AlmacenamientoVacioSchema } }, async req => {
    return respuesta(await consultar.obtenerDestino(req.params.id, actor(req)));
  });
}
