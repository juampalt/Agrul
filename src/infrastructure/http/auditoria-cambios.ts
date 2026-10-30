import { FastifyInstance, FastifyRequest } from 'fastify';
import { RegistroCambiosPort } from '../../core/ports/registro-cambios.port.js';

interface Recurso { metodo: string; ruta: string; entidad: string; accion: string }

/** Operaciones de escritura que deben conservar fecha, responsable y valores anteriores/nuevos. */
const RECURSOS: Recurso[] = [
  { metodo: 'PUT', ruta: '/api/v1/finca', entidad: 'FINCA', accion: 'MODIFICAR' },
  { metodo: 'POST', ruta: '/api/v1/lotes-territorio', entidad: 'LOTE', accion: 'REGISTRAR' },
  { metodo: 'PUT', ruta: '/api/v1/lotes-territorio/:id', entidad: 'LOTE', accion: 'MODIFICAR' },
  { metodo: 'PATCH', ruta: '/api/v1/lotes-territorio/:id/desactivar', entidad: 'LOTE', accion: 'DESACTIVAR' },
  { metodo: 'POST', ruta: '/api/v1/cultivos', entidad: 'CULTIVO', accion: 'REGISTRAR' },
  { metodo: 'PUT', ruta: '/api/v1/cultivos/:id', entidad: 'CULTIVO', accion: 'MODIFICAR' },
  { metodo: 'PATCH', ruta: '/api/v1/cultivos/:id/desactivar', entidad: 'CULTIVO', accion: 'DESACTIVAR' },
  { metodo: 'POST', ruta: '/api/v1/variedades', entidad: 'VARIEDAD', accion: 'REGISTRAR' },
  { metodo: 'PUT', ruta: '/api/v1/variedades/:id', entidad: 'VARIEDAD', accion: 'MODIFICAR' },
  { metodo: 'PATCH', ruta: '/api/v1/variedades/:id/desactivar', entidad: 'VARIEDAD', accion: 'DESACTIVAR' },
  { metodo: 'POST', ruta: '/api/v1/plantaciones', entidad: 'PLANTACION', accion: 'REGISTRAR' },
  { metodo: 'PATCH', ruta: '/api/v1/plantaciones/:id/finalizar', entidad: 'PLANTACION', accion: 'FINALIZAR' },
  { metodo: 'POST', ruta: '/api/v1/tipos-actividad', entidad: 'TIPO_ACTIVIDAD', accion: 'REGISTRAR' },
  { metodo: 'PUT', ruta: '/api/v1/tipos-actividad/:id', entidad: 'TIPO_ACTIVIDAD', accion: 'MODIFICAR' },
  { metodo: 'PATCH', ruta: '/api/v1/tipos-actividad/:id/desactivar', entidad: 'TIPO_ACTIVIDAD', accion: 'DESACTIVAR' },
  { metodo: 'POST', ruta: '/api/v1/ciclos-productivos', entidad: 'CICLO_PRODUCTIVO', accion: 'REGISTRAR' },
  { metodo: 'PATCH', ruta: '/api/v1/ciclos-productivos/:id/iniciar', entidad: 'CICLO_PRODUCTIVO', accion: 'INICIAR' },
  { metodo: 'PATCH', ruta: '/api/v1/ciclos-productivos/:id/finalizar', entidad: 'CICLO_PRODUCTIVO', accion: 'FINALIZAR' },
];

const previos = new WeakMap<FastifyRequest, { id: string; valor: unknown } | null>();

function recursoDe(req: FastifyRequest) {
  const ruta = req.routeOptions?.url;
  return ruta ? RECURSOS.find(r => r.metodo === req.method && r.ruta === ruta) : undefined;
}

/**
 * Registra, para cada operación exitosa sobre los recursos listados, el responsable, la fecha y los valores
 * anteriores y nuevos. Un fallo del registro se informa en el log sin alterar la respuesta ya calculada.
 */
export function registrarAuditoriaCambios(app: FastifyInstance, registro: RegistroCambiosPort) {
  app.addHook('preHandler', async (req) => {
    const recurso = recursoDe(req);
    if (!recurso || recurso.accion === 'REGISTRAR' || !req.headers.authorization) return;
    const id = (req.params as { id?: string } | undefined)?.id;
    try { previos.set(req, await registro.capturar(recurso.entidad, id)); }
    catch (error) { req.log.error({ err: error }, 'No se pudo capturar el valor previo del recurso'); }
  });
  app.addHook('onSend', async (req, reply, payload) => {
    const recurso = recursoDe(req);
    if (!recurso || reply.statusCode < 200 || reply.statusCode >= 300) return payload;
    try {
      const cuerpo = JSON.parse(String(payload)) as { data?: { id?: string } & Record<string, unknown> };
      const previo = previos.get(req) ?? null;
      const entidadId = cuerpo.data?.id ?? previo?.id ?? null;
      await registro.registrar({ entidad: recurso.entidad, entidadId, accion: recurso.accion,
        usuarioId: req.usuario?.sub ?? null, valorPrevio: previo?.valor ?? null, valorNuevo: cuerpo.data ?? null });
    } catch (error) { req.log.error({ err: error }, 'No se pudo registrar el cambio auditado'); }
    return payload;
  });
}
