import { FastifyInstance, FastifyRequest } from 'fastify';
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
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const actor = (req: FastifyRequest): ActorCosechas => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/almacenamiento/camaras', permisos, async (req, reply) => {
    AlmacenamientoVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await crearCamara.execute(RegistrarCamaraSchema.parse(req.body), actor(req))));
  });
  app.post('/api/v1/almacenamiento/movimientos', permisos, async (req, reply) => {
    AlmacenamientoVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await mover.execute(RegistrarMovimientoAlmacenamientoSchema.parse(req.body), actor(req))));
  });
  app.post('/api/v1/destinos-produccion', permisos, async (req, reply) => {
    AlmacenamientoVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await destinar.execute(RegistrarDestinoProduccionSchema.parse(req.body), actor(req))));
  });
  app.get('/api/v1/almacenamiento/camaras', permisos, async req => respuesta(await consultar.listarCamaras(ConsultarCamarasSchema.parse(req.query), actor(req))));
  app.get('/api/v1/almacenamiento/movimientos', permisos, async req => respuesta(await consultar.listarMovimientos(ConsultarMovimientosAlmacenamientoSchema.parse(req.query), actor(req))));
  app.get('/api/v1/almacenamiento/saldos', permisos, async req => respuesta(await consultar.consultarSaldos(ConsultarSaldosCamaraSchema.parse(req.query), actor(req))));
  app.get('/api/v1/destinos-produccion', permisos, async req => respuesta(await consultar.listarDestinos(ConsultarDestinosProduccionSchema.parse(req.query), actor(req))));
  app.get('/api/v1/almacenamiento/camaras/:id', permisos, async req => {
    AlmacenamientoVacioSchema.parse(req.query); return respuesta(await consultar.obtenerCamara(AlmacenamientoIdSchema.parse(req.params).id, actor(req)));
  });
  app.get('/api/v1/almacenamiento/movimientos/:id', permisos, async req => {
    AlmacenamientoVacioSchema.parse(req.query); return respuesta(await consultar.obtenerMovimiento(AlmacenamientoIdSchema.parse(req.params).id, actor(req)));
  });
  app.get('/api/v1/destinos-produccion/:id', permisos, async req => {
    AlmacenamientoVacioSchema.parse(req.query); return respuesta(await consultar.obtenerDestino(AlmacenamientoIdSchema.parse(req.params).id, actor(req)));
  });
}
