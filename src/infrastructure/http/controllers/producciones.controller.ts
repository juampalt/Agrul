import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ProduccionesService, TipoRegistroUnificado } from '../../database/producciones.service.js';

const ActualizarFincaSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  hectareasTotales: z.coerce.number().positive(),
  localidad: z.string().trim().min(1).max(120),
  provincia: z.string().trim().min(1).max(120),
  departamento: z.string().trim().max(120).optional(),
  propietario: z.string().trim().max(150).nullable().optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
});

const CrearProduccionSchema = z.object({
  cultivoId: z.string().uuid(),
  variedadId: z.string().uuid(),
  fechaInicio: z.string().trim().min(10).max(30),
  hectareas: z.coerce.number().positive(),
  observaciones: z.string().trim().max(2000).optional(),
});

const FinalizarProduccionSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

const CorregirRegistroSchema = z.object({
  tipoOriginal: z.string().trim().min(1),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio para correcciones compensatorias.'),
  valorAnterior: z.string().trim().default(''),
  valorNuevo: z.string().trim().min(1),
});

const IngresoStockRapidoSchema = z.object({
  insumoId: z.string().uuid(),
  cantidad: z.coerce.number().positive(),
  proveedor: z.string().trim().max(150).optional(),
  fechaVencimiento: z.string().trim().nullable().optional(),
});

const CultivoRapidoSchema = z.object({
  nombre: z.string().trim().min(1).max(40),
  tipoCicloVida: z.enum(['ANUAL', 'PERENNE']).default('ANUAL'),
});

const VariedadRapidoSchema = z.object({
  cultivoId: z.string().uuid(),
  nombre: z.string().trim().min(1).max(40),
});

const CrearInsumoConStockSchema = z.object({
  codigo: z.string().trim().min(1).max(15),
  nombre: z.string().trim().min(1).max(200),
  unidadMedida: z.string().trim().min(1).max(30),
  marca: z.string().trim().max(150).nullable().optional(),
  categoria: z.enum(['FERTILIZANTE', 'FITOSANITARIO', 'ENMIENDA', 'OTRO']),
  cantidad: z.coerce.number().min(0),
});

function ok(reply: FastifyReply, data: unknown, status = 200) {
  return reply.status(status).send({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  });
}

export class ProduccionesController {
  constructor(private readonly service: ProduccionesService) {}

  async obtenerFincaResumen(_req: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.obtenerFincaResumen();
    return ok(reply, data);
  }

  async actualizarFincaConfig(req: FastifyRequest, reply: FastifyReply) {
    const body = ActualizarFincaSchema.parse(req.body);
    const data = await this.service.actualizarFincaConfig(body, req.usuario!.sub);
    return ok(reply, data);
  }

  async listarProducciones(req: FastifyRequest, reply: FastifyReply) {
    const query = req.query as { estado?: 'ACTIVA' | 'FINALIZADA' | 'TODAS' };
    const data = await this.service.listarProducciones(query.estado || 'TODAS');
    return ok(reply, data);
  }

  async crearProduccion(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearProduccionSchema.parse(req.body);
    const data = await this.service.crearProduccion(body, req.usuario!.sub);
    return ok(reply, data, 201);
  }

  async finalizarProduccion(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const body = FinalizarProduccionSchema.parse(req.body || {});
    const data = await this.service.finalizarProduccion(id, req.usuario!.sub, body.motivo);
    return ok(reply, data);
  }

  async obtenerDetalle(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const { tipo } = req.query as { tipo?: TipoRegistroUnificado | 'TODOS' };
    const data = await this.service.obtenerDetalleProduccion(id, tipo || 'TODOS');
    return ok(reply, data);
  }

  async registrarActualizacion(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as Record<string, unknown>;
    const data = await this.service.registrarActualizacion(id, body, {
      sub: req.usuario!.sub,
      perfil: req.usuario!.perfil,
    });
    return ok(reply, data, 201);
  }

  async corregirRegistro(req: FastifyRequest, reply: FastifyReply) {
    const { id, regId } = req.params as { id: string; regId: string };
    const body = CorregirRegistroSchema.parse(req.body);
    const data = await this.service.corregirRegistro(id, regId, body, req.usuario!.sub);
    return ok(reply, data, 201);
  }

  async selectorInsumos(_req: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.selectorInsumosMinimo();
    return ok(reply, data);
  }

  async resumenInsumos(_req: FastifyRequest, reply: FastifyReply) {
    const data = await this.service.obtenerResumenInsumosUnificado();
    return ok(reply, data);
  }

  async ingresoStockRapido(req: FastifyRequest, reply: FastifyReply) {
    const body = IngresoStockRapidoSchema.parse(req.body);
    const data = await this.service.registrarIngresoStockRapido(body, req.usuario!.sub);
    return ok(reply, data, 201);
  }

  async crearCultivoRapido(req: FastifyRequest, reply: FastifyReply) {
    const body = CultivoRapidoSchema.parse(req.body);
    const data = await this.service.crearCultivoRapido(body.nombre, body.tipoCicloVida);
    return ok(reply, data, 201);
  }

  async crearVariedadRapido(req: FastifyRequest, reply: FastifyReply) {
    const body = VariedadRapidoSchema.parse(req.body);
    const data = await this.service.crearVariedadRapido(body.cultivoId, body.nombre);
    return ok(reply, data, 201);
  }

  async crearInsumoConStock(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearInsumoConStockSchema.parse(req.body);
    const data = await this.service.crearInsumoConStock(body, req.usuario!.sub);
    return ok(reply, data, 201);
  }
}
