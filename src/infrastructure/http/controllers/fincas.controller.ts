import { FastifyReply, FastifyRequest } from 'fastify';
import { RegistrarFincaUseCase } from '../../../application/use-cases/registrar-finca.use-case.js';
import { ListarFincasUseCase } from '../../../application/use-cases/listar-fincas.use-case.js';
import { FincasRepositoryPort } from '../../../core/ports/fincas-repository.port.js';
import { CrearFincaBodySchema, FincaIdParamSchema, ListarFincasQuerySchema } from '../schemas/fincas.schema.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';

export class FincasController {
  constructor(
    private readonly registrarFincaUseCase: RegistrarFincaUseCase,
    private readonly listarFincasUseCase: ListarFincasUseCase,
    private readonly fincasRepo: FincasRepositoryPort
  ) {}

  async crear(req: FastifyRequest, reply: FastifyReply) {
    const body = CrearFincaBodySchema.parse(req.body);
    const resultado = await this.registrarFincaUseCase.execute(body);

    return reply.status(201).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async listar(req: FastifyRequest, reply: FastifyReply) {
    const query = ListarFincasQuerySchema.parse(req.query ?? {});
    const fincas = await this.listarFincasUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: fincas,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  async obtenerPorId(req: FastifyRequest, reply: FastifyReply) {
    const { id } = FincaIdParamSchema.parse(req.params);
    const finca = await this.fincasRepo.buscarPorId(id);

    if (!finca) {
      throw new EntidadNoEncontradaError('Finca', id);
    }

    return reply.status(200).send({
      success: true,
      data: finca.toJSON(),
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
