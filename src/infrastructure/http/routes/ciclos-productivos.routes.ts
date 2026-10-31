import { FastifyInstance } from 'fastify';
import {
  ConsultarCiclosProductivosUseCase, FinalizarCicloProductivoUseCase, IniciarCicloProductivoUseCase, RegistrarCicloProductivoUseCase, ResumirCicloProductivoUseCase,
} from '../../../application/use-cases/ciclos-productivos.use-cases.js';
import { CiclosProductivosRepositoryPort } from '../../../core/ports/ciclos-productivos-repository.port.js';
import { requerirRol, verificarPasswordInicial } from '../middlewares/auth.middleware.js';
import { AccesoRecursosAgricolasPort } from '../../../core/ports/acceso-recursos-agricolas.port.js';
import { AutorizarRecursoAgricolaUseCase, fincasVisiblesAgricolas } from '../../../application/use-cases/autorizar-recurso-agricola.use-case.js';
import {
  CicloProductivoIdSchema, ConsultarCiclosProductivosSchema, FinalizarCicloProductivoSchema,
  IniciarCicloProductivoSchema, RegistrarCicloProductivoSchema, SolicitudVaciaCicloSchema,
} from '../schemas/ciclos-productivos.schema.js';

export function registrarRutasCiclosProductivos(app: FastifyInstance, repo: CiclosProductivosRepositoryPort, accesoRepo?: AccesoRecursosAgricolasPort) {
  const registrar = new RegistrarCicloProductivoUseCase(repo);
  const consultar = new ConsultarCiclosProductivosUseCase(repo);
  const resumir = new ResumirCicloProductivoUseCase(repo);
  const iniciar = new IniciarCicloProductivoUseCase(repo);
  const finalizar = new FinalizarCicloProductivoUseCase(repo);
  const permisos = { preHandler: [requerirRol('ADMINISTRADOR'), verificarPasswordInicial] };
  // CU33: el Encargado de campo consulta los ciclos de sus fincas; sin autorización por finca, solo el Administrador lee.
  const lectura = accesoRepo ? { preHandler: [requerirRol('ADMINISTRADOR', 'ENCARGADO_CAMPO'), verificarPasswordInicial] } : permisos;
  const autorizar = accesoRepo ? new AutorizarRecursoAgricolaUseCase(accesoRepo) : undefined;
  const respuesta = (data: unknown) => ({ success: true, data, error: null, timestamp: new Date().toISOString() });
  app.post('/api/v1/ciclos-productivos', permisos, async (req, reply) => {
    SolicitudVaciaCicloSchema.parse(req.query);
    return reply.status(201).send(respuesta(await registrar.execute(RegistrarCicloProductivoSchema.parse(req.body))));
  });
  app.get('/api/v1/ciclos-productivos', lectura, async (req) => {
    const filtros = ConsultarCiclosProductivosSchema.parse(req.query);
    return respuesta(await consultar.execute({ ...filtros, fincaIds: fincasVisiblesAgricolas(req.usuario) }));
  });
  app.get('/api/v1/ciclos-productivos/:id', lectura, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    await autorizar?.execute(req.usuario, 'ciclo', id);
    return respuesta(await consultar.obtenerPorId(id));
  });
  // CU19/CU21: resumen de actividades, monitoreos, aplicaciones de insumos y cosechas del ciclo.
  app.get('/api/v1/ciclos-productivos/:id/resumen', lectura, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    await autorizar?.execute(req.usuario, 'ciclo', id);
    return respuesta(await resumir.execute(id));
  });
  app.patch('/api/v1/ciclos-productivos/:id/iniciar', permisos, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    return respuesta(await iniciar.execute(id, IniciarCicloProductivoSchema.parse(req.body).fechaInicioEfectiva));
  });
  app.patch('/api/v1/ciclos-productivos/:id/finalizar', permisos, async (req) => {
    const { id } = CicloProductivoIdSchema.parse(req.params);
    SolicitudVaciaCicloSchema.parse(req.query);
    return respuesta(await finalizar.execute(id, FinalizarCicloProductivoSchema.parse(req.body).fechaFinEfectiva));
  });
}
