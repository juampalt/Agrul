import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ConsultarMonitoreosUseCase, RegistrarMonitoreoUseCase } from '../../../application/use-cases/monitoreos-agricolas.use-cases.js';
import { MonitoreosRepositoryPort } from '../../../core/ports/monitoreos-repository.port.js';
import { esFechaProgramadaValida } from '../../../core/domain/entities/actividad-programada.entity.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AccesoRecursosAgricolasPort } from '../../../core/ports/acceso-recursos-agricolas.port.js';
import { AutorizarRecursoAgricolaUseCase, fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';

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

export function registrarRutasMonitoreos(app: FastifyInstance, repo: MonitoreosRepositoryPort, accesoRepo?: AccesoRecursosAgricolasPort) {
  if (!accesoRepo) throw new Error('Las rutas agrícolas requieren autorización persistente por finca.');
  const autorizar = new AutorizarRecursoAgricolaUseCase(accesoRepo);
  const registrar = new RegistrarMonitoreoUseCase(repo);
  const consultar = new ConsultarMonitoreosUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] };
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/monitoreos', permisos, async (req, reply) => {
    z.object({}).strict().parse(req.query);
    const datos = RegistrarMonitoreoSchema.parse(req.body);
    await autorizar.execute(req.usuario, 'ciclo', datos.cicloId);
    return reply.status(201).send(respuesta(await registrar.execute(datos)));
  });
  app.get('/api/v1/monitoreos', permisos, async req => {
    const filtros = ConsultarMonitoreosSchema.parse(req.query);
    return respuesta(await consultar.execute({ ...filtros, fincaIds: fincasVisiblesAgricolas(req.usuario) }));
  });
  app.get('/api/v1/monitoreos/:id', permisos, async req => {
    z.object({}).strict().parse(req.query);
    const { id } = z.object({ id: z.string().uuid() }).strict().parse(req.params);
    await autorizar.execute(req.usuario, 'monitoreo', id);
    return respuesta(await consultar.obtenerPorId(id));
  });
}
