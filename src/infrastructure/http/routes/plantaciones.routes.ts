import { FastifyInstance } from 'fastify';
import {
  ConsultarPlantacionesUseCase, FinalizarPlantacionUseCase, RegistrarPlantacionUseCase,
} from '../../../application/use-cases/plantaciones.use-cases.js';
import { PlantacionesRepositoryPort } from '../../../core/ports/plantaciones-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import {
  ConsultarPlantacionesSchema, FinalizarPlantacionSchema, PlantacionIdSchema,
  RegistrarPlantacionSchema, SolicitudVaciaPlantacionSchema,
} from '../schemas/plantaciones.schema.js';

export function registrarRutasPlantaciones(app: FastifyInstance, repo: PlantacionesRepositoryPort) {
  const registrar = new RegistrarPlantacionUseCase(repo);
  const consultar = new ConsultarPlantacionesUseCase(repo);
  const finalizar = new FinalizarPlantacionUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  app.post('/api/v1/plantaciones', permisos, async (req, reply) => {
    SolicitudVaciaPlantacionSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarPlantacionSchema.parse(req.body))));
  });
  app.get('/api/v1/plantaciones', permisos, async (req) => {
    return respuesta(await consultar.execute(ConsultarPlantacionesSchema.parse(req.query)));
  });
  app.get('/api/v1/plantaciones/:id', permisos, async (req) => {
    const { id } = PlantacionIdSchema.parse(req.params);
    SolicitudVaciaPlantacionSchema.parse(req.query);
    return respuesta(await consultar.obtenerPorId(id));
  });
  app.patch('/api/v1/plantaciones/:id/finalizar', permisos, async (req) => {
    const { id } = PlantacionIdSchema.parse(req.params);
    SolicitudVaciaPlantacionSchema.parse(req.query);
    const { fechaFinalizacion } = FinalizarPlantacionSchema.parse(req.body);
    return respuesta(await finalizar.execute(id, fechaFinalizacion));
  });
}
