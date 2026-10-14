import { FastifyReply, FastifyRequest } from 'fastify';
import {
  CrearTipoActividadUseCase,
  ListarTiposActividadUseCase,
  CrearPersonalCuadrillaUseCase,
  ListarPersonalCuadrillaUseCase,
  CrearMaquinariaUseCase,
  ListarMaquinariaUseCase,
} from '../../../application/use-cases/catalogos-actividades.use-cases.js';
import { CatalogosActividadesRepositoryPort } from '../../../core/ports/catalogos-actividades-repository.port.js';
import {
  CrearTipoActividadBodySchema,
  ListarTiposActividadQuerySchema,
  CrearPersonalBodySchema,
  ListarPersonalQuerySchema,
  CrearMaquinariaBodySchema,
  ListarMaquinariaQuerySchema,
  CatalogoIdParamSchema,
} from '../schemas/catalogos.schema.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';

export class CatalogosController {
  constructor(
    private readonly crearTipoActividadUseCase: CrearTipoActividadUseCase,
    private readonly listarTiposActividadUseCase: ListarTiposActividadUseCase,
    private readonly crearPersonalUseCase: CrearPersonalCuadrillaUseCase,
    private readonly listarPersonalUseCase: ListarPersonalCuadrillaUseCase,
    private readonly crearMaquinariaUseCase: CrearMaquinariaUseCase,
    private readonly listarMaquinariaUseCase: ListarMaquinariaUseCase,
    private readonly repo: CatalogosActividadesRepositoryPort
  ) {}

  // --- Tipos de Actividad ---
  async crearTipoActividad(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearTipoActividadBodySchema.parse(req.body);
    const tipo = await this.crearTipoActividadUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: tipo,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarTiposActividad(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarTiposActividadQuerySchema.parse(req.query ?? {});
    const tipos = await this.listarTiposActividadUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: tipos,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerTipoActividadPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = CatalogoIdParamSchema.parse(req.params);
    const tipo = await this.repo.buscarTipoActividadPorId(id);

    if (!tipo) {
      throw new EntidadNoEncontradaError('Tipo de Actividad', id);
    }

    return reply.status(200).send({
      success: true,
      data: tipo.toJSON(),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  // --- Personal y Cuadrillas ---
  async crearPersonal(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearPersonalBodySchema.parse(req.body);
    const personal = await this.crearPersonalUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: personal,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarPersonal(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarPersonalQuerySchema.parse(req.query ?? {});
    const items = await this.listarPersonalUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: items,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerPersonalPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = CatalogoIdParamSchema.parse(req.params);
    const item = await this.repo.buscarPersonalPorId(id);

    if (!item) {
      throw new EntidadNoEncontradaError('Personal/Cuadrilla', id);
    }

    return reply.status(200).send({
      success: true,
      data: item.toJSON(),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  // --- Maquinaria ---
  async crearMaquinaria(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearMaquinariaBodySchema.parse(req.body);
    const maquinaria = await this.crearMaquinariaUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: maquinaria,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listarMaquinaria(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarMaquinariaQuerySchema.parse(req.query ?? {});
    const items = await this.listarMaquinariaUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: items,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerMaquinariaPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = CatalogoIdParamSchema.parse(req.params);
    const item = await this.repo.buscarMaquinariaPorId(id);

    if (!item) {
      throw new EntidadNoEncontradaError('Maquinaria', id);
    }

    return reply.status(200).send({
      success: true,
      data: item.toJSON(),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
