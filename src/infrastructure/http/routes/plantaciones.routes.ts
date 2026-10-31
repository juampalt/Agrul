import { FastifyInstance } from 'fastify';
import {
  ConsultarPlantacionesUseCase, FinalizarPlantacionUseCase, RegistrarPlantacionUseCase,
} from '../../../application/use-cases/plantaciones.use-cases.js';
import { PlantacionesRepositoryPort } from '../../../core/ports/plantaciones-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AccesoRecursosAgricolasPort } from '../../../core/ports/acceso-recursos-agricolas.port.js';
import { fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import { AccesoDenegadoFincaError } from '../../../core/domain/errors/domain.error.js';
import {
  ConsultarPlantacionesSchema, FinalizarPlantacionSchema, PlantacionIdSchema,
  RegistrarPlantacionSchema, SolicitudVaciaPlantacionSchema,
} from '../schemas/plantaciones.schema.js';

export function registrarRutasPlantaciones(app: FastifyInstance, repo: PlantacionesRepositoryPort, accesoRepo?: AccesoRecursosAgricolasPort) {
  const registrar = new RegistrarPlantacionUseCase(repo);
  const consultar = new ConsultarPlantacionesUseCase(repo);
  const finalizar = new FinalizarPlantacionUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  // CU16: el Encargado de campo consulta las plantaciones de sus fincas.
  const lectura = accesoRepo ? { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] } : permisos;
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });

  app.post('/api/v1/plantaciones', permisos, async (req, reply) => {
    SolicitudVaciaPlantacionSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarPlantacionSchema.parse(req.body))));
  });
  app.get('/api/v1/plantaciones', lectura, async (req) => {
    const filtros = ConsultarPlantacionesSchema.parse(req.query);
    return respuesta(await consultar.execute({ ...filtros, fincaIds: fincasVisiblesAgricolas(req.usuario) }));
  });
  app.get('/api/v1/plantaciones/:id', lectura, async (req) => {
    const { id } = PlantacionIdSchema.parse(req.params);
    SolicitudVaciaPlantacionSchema.parse(req.query);
    const detalle = await consultar.obtenerPorId(id);
    const fincas = fincasVisiblesAgricolas(req.usuario);
    if (fincas !== undefined && (!detalle.fincaId || !fincas.includes(detalle.fincaId))) throw new AccesoDenegadoFincaError(detalle.fincaId ?? 'sin finca asignada');
    return respuesta(detalle);
  });
  app.patch('/api/v1/plantaciones/:id/finalizar', permisos, async (req) => {
    const { id } = PlantacionIdSchema.parse(req.params);
    SolicitudVaciaPlantacionSchema.parse(req.query);
    const { fechaFinalizacion } = FinalizarPlantacionSchema.parse(req.body);
    return respuesta(await finalizar.execute(id, fechaFinalizacion));
  });
}
