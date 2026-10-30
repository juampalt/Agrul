import { FastifyInstance } from 'fastify';
import { ConsultarInsumosUseCase, DesactivarInsumoUseCase, ModificarInsumoUseCase, RegistrarInsumoUseCase } from '../../../application/use-cases/insumos.use-cases.js';
import { InsumosRepositoryPort } from '../../../core/ports/insumos-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { ConsultarInsumosSchema, DatosInsumoSchema, InsumoCanonicoIdSchema, SolicitudVaciaInsumoSchema } from '../schemas/insumos-canonicos.schema.js';

/** Catálogo maestro de la instalación, sin existencias ni datos de fincas. */
export function registrarRutasInsumos(app: FastifyInstance, repo: InsumosRepositoryPort) {
  const registrar = new RegistrarInsumoUseCase(repo);
  const consultar = new ConsultarInsumosUseCase(repo);
  const modificar = new ModificarInsumoUseCase(repo);
  const desactivar = new DesactivarInsumoUseCase(repo);
  const admin = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  const lectura = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  app.post('/api/v1/insumos', admin, async (req, reply) => {
    SolicitudVaciaInsumoSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(DatosInsumoSchema.parse(req.body))));
  });
  app.get('/api/v1/insumos', lectura, async req =>
    respuesta(await consultar.execute(ConsultarInsumosSchema.parse(req.query))));
  app.get('/api/v1/insumos/:id', lectura, async req => {
    SolicitudVaciaInsumoSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(InsumoCanonicoIdSchema.parse(req.params).id));
  });
  app.put('/api/v1/insumos/:id', admin, async req => {
    SolicitudVaciaInsumoSchema.parse(req.query);
    return respuesta(await modificar.execute(InsumoCanonicoIdSchema.parse(req.params).id, DatosInsumoSchema.parse(req.body)));
  });
  app.patch('/api/v1/insumos/:id/desactivar', admin, async req => {
    SolicitudVaciaInsumoSchema.parse(req.query);
    SolicitudVaciaInsumoSchema.parse(req.body ?? {});
    return respuesta(await desactivar.execute(InsumoCanonicoIdSchema.parse(req.params).id));
  });
}
