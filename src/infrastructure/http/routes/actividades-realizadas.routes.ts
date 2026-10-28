import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EjecutarActividadProgramadaUseCase } from '../../../application/use-cases/ejecutar-actividad-programada.use-case.js';
import { ActividadesRealizadasRepositoryPort } from '../../../core/ports/actividades-realizadas-repository.port.js';
import { esFechaProgramadaValida } from '../../../core/domain/entities/actividad-programada.entity.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';

export const EjecutarProgramadaSchema = z.object({
  actividadProgramadaId: z.string().uuid(),
  responsableId: z.string().uuid(),
  fechaEjecucion: z.string().refine(esFechaProgramadaValida, 'La fecha debe existir y tener formato YYYY-MM-DD.'),
  superficieTrabajadaHa: z.number().finite().positive().max(999999.99),
  duracionHoras: z.number().finite().positive().max(999.99).nullable().optional(),
  descripcionTrabajo: z.string().trim().nullable().optional(),
  datosEspecificos: z.record(z.unknown()).optional(),
}).strict();

export function registrarRutasActividadesRealizadas(app: FastifyInstance, repo: ActividadesRealizadasRepositoryPort) {
  const ejecutar = new EjecutarActividadProgramadaUseCase(repo);
  app.post('/api/v1/actividades-realizadas', {
    preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial],
  }, async (req, reply) => {
    z.object({}).strict().parse(req.query);
    const data = await ejecutar.execute(EjecutarProgramadaSchema.parse(req.body));
    return reply.status(201).send({ success: true, data, error: null, timestamp: new Date().toISOString() });
  });
}
