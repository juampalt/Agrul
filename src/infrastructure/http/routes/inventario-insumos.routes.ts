import { FastifyInstance, FastifyRequest } from 'fastify';
import { ActorInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { InventarioInsumosRepositoryPort } from '../../../core/ports/inventario-insumos-repository.port.js';
import { ConsultarInventarioUseCase, RegistrarIngresoInsumosUseCase, RegistrarMovimientoInventarioUseCase } from '../../../application/use-cases/inventario-insumos.use-cases.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { CredencialesInvalidasError } from '../../../core/domain/errors/domain.error.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { ConsultarExistenciasSchema, ConsultarInventarioSchema, IngresoInsumosSchema, InventarioIdSchema, InventarioVacioSchema, MovimientoInventarioSchema } from '../schemas/inventario-insumos.schema.js';

export function registrarRutasInventarioInsumos(app: FastifyInstance, repo: InventarioInsumosRepositoryPort) {
  const ingreso = new RegistrarIngresoInsumosUseCase(repo);
  const mover = new RegistrarMovimientoInventarioUseCase(repo);
  const consultar = new ConsultarInventarioUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const actor = (req: FastifyRequest): ActorInventario => {
    if (!req.usuario) throw new CredencialesInvalidasError();
    return { usuarioId: req.usuario.sub, fincaIds: fincasVisiblesAgricolas(req.usuario) };
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/inventario/ingresos', permisos, async (req, reply) => {
    InventarioVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await ingreso.execute(IngresoInsumosSchema.parse(req.body), actor(req))));
  });
  app.post('/api/v1/inventario/movimientos', permisos, async (req, reply) => {
    InventarioVacioSchema.parse(req.query);
    return reply.status(201).send(respuesta(await mover.execute(MovimientoInventarioSchema.parse(req.body), actor(req))));
  });
  app.get('/api/v1/inventario/partidas', permisos, async req => respuesta(await consultar.partidas(ConsultarInventarioSchema.parse(req.query), actor(req))));
  app.get('/api/v1/inventario/partidas/:id', permisos, async req => {
    InventarioVacioSchema.parse(req.query);
    return respuesta(await consultar.partida(InventarioIdSchema.parse(req.params).id, actor(req)));
  });
  app.get('/api/v1/inventario/movimientos', permisos, async req => respuesta(await consultar.movimientos(ConsultarInventarioSchema.parse(req.query), actor(req))));
  app.get('/api/v1/inventario/movimientos/:id', permisos, async req => {
    InventarioVacioSchema.parse(req.query);
    return respuesta(await consultar.movimiento(InventarioIdSchema.parse(req.params).id, actor(req)));
  });
  app.get('/api/v1/inventario/existencias', permisos, async req => respuesta(await consultar.existencias(ConsultarExistenciasSchema.parse(req.query), actor(req))));
  app.get('/api/v1/inventario/alertas', permisos, async req => respuesta(await consultar.alertas(ConsultarExistenciasSchema.parse(req.query), actor(req))));
}
