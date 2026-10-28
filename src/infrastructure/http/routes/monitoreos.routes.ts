import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ConsultarMonitoreosUseCase, RegistrarMonitoreoUseCase } from '../../../application/use-cases/monitoreos-agricolas.use-cases.js';
import { MonitoreosRepositoryPort } from '../../../core/ports/monitoreos-repository.port.js';
import { esFechaProgramadaValida } from '../../../core/domain/entities/actividad-programada.entity.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';

const texto = z.string().trim().min(1).max(100);
const fecha = z.string().refine(esFechaProgramadaValida, 'La fecha debe existir y tener formato YYYY-MM-DD.');
export const RegistrarMonitoreoSchema = z.object({
  cicloId: z.string().uuid(), responsableId: z.string().uuid(), fechaInspeccion: fecha,
  sectorObservado: z.string().trim().max(120).nullable().optional(), etapaFenologica: texto,
  estadoGeneralCultivo: texto, tipoObservacion: texto,
  problemaDetectado: z.string().trim().nullable().optional(), descripcionHallazgos: z.string().trim().min(1),
  accionRecomendada: z.string().trim().nullable().optional(),
}).strict();
export const ConsultarMonitoreosSchema = z.object({
  cicloId: z.string().uuid().optional(), loteId: z.string().uuid().optional(), responsableId: z.string().uuid().optional(),
  etapaFenologica: texto.optional(), estadoGeneralCultivo: texto.optional(), tipoObservacion: texto.optional(),
  desde: fecha.optional(), hasta: fecha.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100), offset: z.coerce.number().int().min(0).default(0),
}).strict().refine(f => !f.desde || !f.hasta || f.desde <= f.hasta, { path: ['hasta'], message: 'El rango de fechas está invertido.' });

export function registrarRutasMonitoreos(app: FastifyInstance, repo: MonitoreosRepositoryPort) {
  const registrar = new RegistrarMonitoreoUseCase(repo);
  const consultar = new ConsultarMonitoreosUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/monitoreos', permisos, async (req, reply) => {
    z.object({}).strict().parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarMonitoreoSchema.parse(req.body))));
  });
  app.get('/api/v1/monitoreos', permisos, async req => respuesta(await consultar.execute(ConsultarMonitoreosSchema.parse(req.query))));
  app.get('/api/v1/monitoreos/:id', permisos, async req => {
    z.object({}).strict().parse(req.query);
    const { id } = z.object({ id: z.string().uuid() }).strict().parse(req.params);
    return respuesta(await consultar.obtenerPorId(id));
  });
}
