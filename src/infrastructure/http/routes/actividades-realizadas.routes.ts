import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EjecutarActividadProgramadaUseCase } from '../../../application/use-cases/ejecutar-actividad-programada.use-case.js';
import { ActividadesRealizadasGestionPort } from '../../../core/ports/actividades-realizadas-repository.port.js';
import { ConsultarActividadesRealizadasUseCase, RegistrarActividadDirectaUseCase } from '../../../application/use-cases/actividades-realizadas.use-cases.js';
import { esFechaProgramadaValida } from '../../../core/domain/entities/actividad-programada.entity.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AccesoRecursosAgricolasPort } from '../../../core/ports/acceso-recursos-agricolas.port.js';
import { AutorizarRecursoAgricolaUseCase, fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';

export const EjecutarProgramadaSchema = z.object({
  actividadProgramadaId: z.string().uuid(),
  responsableId: z.string().uuid(),
  fechaEjecucion: z.string().refine(esFechaProgramadaValida, 'La fecha debe existir y tener formato YYYY-MM-DD.'),
  superficieTrabajadaHa: z.number().finite().positive().max(999999.99),
  duracionHoras: z.number().finite().positive().max(999.99).nullable().optional(),
  descripcionTrabajo: z.string().trim().min(1, 'La descripción del trabajo realizado es obligatoria.'),
  datosEspecificos: z.record(z.unknown()).optional(),
}).strict();

export const RegistrarDirectaSchema = EjecutarProgramadaSchema.omit({ actividadProgramadaId: true }).extend({
  origen: z.literal('NO_PROGRAMADA'), cicloId: z.string().uuid(), tipoActividadId: z.string().uuid(),
}).strict();

export const ConsultarRealizadasSchema = z.object({
  cicloId: z.string().uuid().optional(), loteId: z.string().uuid().optional(),
  tipoActividadId: z.string().uuid().optional(), responsableId: z.string().uuid().optional(),
  origen: z.enum(['PROGRAMADA', 'NO_PROGRAMADA']).optional(),
  desde: z.string().refine(esFechaProgramadaValida, 'Fecha inexistente.').optional(),
  hasta: z.string().refine(esFechaProgramadaValida, 'Fecha inexistente.').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).strict().refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, { path: ['hasta'], message: 'Hasta debe ser igual o posterior a desde.' });

export function registrarRutasActividadesRealizadas(app: FastifyInstance, repo: ActividadesRealizadasGestionPort, accesoRepo?: AccesoRecursosAgricolasPort) {
  if (!accesoRepo) throw new Error('Las rutas agrícolas requieren autorización persistente por finca.');
  const autorizar = new AutorizarRecursoAgricolaUseCase(accesoRepo);
  const ejecutar = new EjecutarActividadProgramadaUseCase(repo);
  const directa = new RegistrarActividadDirectaUseCase(repo);
  const consultar = new ConsultarActividadesRealizadasUseCase(repo);
  const permisos = {
    preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial],
  };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/actividades-realizadas', permisos, async (req, reply) => {
    z.object({}).strict().parse(req.query);
    const datos = z.union([EjecutarProgramadaSchema, RegistrarDirectaSchema]).parse(req.body);
    if ('actividadProgramadaId' in datos) await autorizar.execute(req.usuario, 'programada', datos.actividadProgramadaId);
    else await autorizar.execute(req.usuario, 'ciclo', datos.cicloId);
    const data = 'actividadProgramadaId' in datos ? await ejecutar.execute(datos) : await directa.execute(datos);
    return reply.status(201).send(respuesta(data));
  });
  app.get('/api/v1/actividades-realizadas', permisos, async (req) => {
    const filtros = ConsultarRealizadasSchema.parse(req.query);
    return respuesta(await consultar.execute({ ...filtros, fincaIds: fincasVisiblesAgricolas(req.usuario) }));
  });
  app.get('/api/v1/actividades-realizadas/:id', permisos, async (req) => {
    z.object({}).strict().parse(req.query);
    const { id } = z.object({ id: z.string().uuid() }).strict().parse(req.params);
    await autorizar.execute(req.usuario, 'realizada', id);
    return respuesta(await consultar.obtenerPorId(id));
  });
}
