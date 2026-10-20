import { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrarProveedorUseCase,
  ListarProveedoresUseCase,
  ObtenerProveedorPorIdUseCase,
  ActualizarProveedorUseCase,
} from '../../../application/use-cases/proveedores.use-cases.js';
import {
  RegistrarProveedorBodySchema,
  ActualizarProveedorBodySchema,
  ListarProveedoresQuerySchema,
  ProveedorIdParamSchema,
} from '../schemas/proveedores.schema.js';

export class ProveedoresController {
  constructor(
    private readonly registrarUseCase: RegistrarProveedorUseCase,
    private readonly listarUseCase: ListarProveedoresUseCase,
    private readonly obtenerPorIdUseCase: ObtenerProveedorPorIdUseCase,
    private readonly actualizarUseCase: ActualizarProveedorUseCase
  ) {}

  public async registrar(req: FastifyRequest, reply: FastifyReply) {
    const body = RegistrarProveedorBodySchema.parse(req.body);
    const result = await this.registrarUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarProveedoresQuerySchema.parse(req.query ?? {});
    const result = await this.listarUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = ProveedorIdParamSchema.parse(req.params);
    const result = await this.obtenerPorIdUseCase.execute(id);

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async actualizar(req: FastifyRequest, reply: FastifyReply) {
    const { id } = ProveedorIdParamSchema.parse(req.params);
    const body = ActualizarProveedorBodySchema.parse(req.body);
    const result = await this.actualizarUseCase.execute({ id, ...body });

    return reply.status(200).send({
      success: true,
      data: result,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
