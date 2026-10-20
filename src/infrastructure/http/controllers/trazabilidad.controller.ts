import { FastifyReply, FastifyRequest } from 'fastify';
import { ObtenerRecorridoTrazabilidadUseCase } from '../../../application/use-cases/recorrido-trazabilidad.use-case.js';
import { EmitirInformeTrazabilidadUseCase } from '../../../application/use-cases/emitir-informe-trazabilidad.use-case.js';
import { ListarInformesTrazabilidadLogUseCase } from '../../../application/use-cases/listar-informes-trazabilidad-log.use-case.js';
import { ConsultaInversaInsumoUseCase } from '../../../application/use-cases/consulta-inversa-insumo.use-case.js';
import { RecorridoTrazabilidadParamSchema } from '../schemas/recorrido-trazabilidad.schema.js';
import { ConsultaInversaQuerySchema } from '../schemas/consulta-inversa.schema.js';
import {
  EmitirInformeParamSchema,
  EmitirInformeQuerySchema,
  ListarInformesLogQuerySchema,
} from '../schemas/informe-trazabilidad.schema.js';

export class TrazabilidadController {
  constructor(
    private readonly obtenerRecorridoUseCase: ObtenerRecorridoTrazabilidadUseCase,
    private readonly emitirInformeUseCase?: EmitirInformeTrazabilidadUseCase,
    private readonly listarLogsUseCase?: ListarInformesTrazabilidadLogUseCase,
    private readonly consultaInversaUseCase?: ConsultaInversaInsumoUseCase
  ) {}

  public async obtenerRecorrido(req: FastifyRequest, reply: FastifyReply) {
    const { identificador } = RecorridoTrazabilidadParamSchema.parse(req.params);
    const resultado = await this.obtenerRecorridoUseCase.execute({ identificador });

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async descargarPdf(req: FastifyRequest, reply: FastifyReply) {
    if (!this.emitirInformeUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Servicio de emisión de informes no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const { identificador } = EmitirInformeParamSchema.parse(req.params);
    const query = EmitirInformeQuerySchema.parse(req.query);

    const resultado = await this.emitirInformeUseCase.execute({
      identificador,
      formato: 'PDF',
      usuarioEmisor: query.usuarioEmisor,
      rolEmisor: query.rolEmisor,
      incluirDatosSensibles: query.incluirDatosSensibles,
      incluirCostos: query.incluirCostos,
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${resultado.nombreArchivo}"`);
    reply.header('X-Report-Id', resultado.codigoInforme);

    return reply.status(200).send(resultado.contenido);
  }

  public async descargarCsv(req: FastifyRequest, reply: FastifyReply) {
    if (!this.emitirInformeUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Servicio de emisión de informes no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const { identificador } = EmitirInformeParamSchema.parse(req.params);
    const query = EmitirInformeQuerySchema.parse(req.query);

    const resultado = await this.emitirInformeUseCase.execute({
      identificador,
      formato: 'CSV',
      usuarioEmisor: query.usuarioEmisor,
      rolEmisor: query.rolEmisor,
      incluirDatosSensibles: query.incluirDatosSensibles,
      incluirCostos: query.incluirCostos,
    });

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${resultado.nombreArchivo}"`);
    reply.header('X-Report-Id', resultado.codigoInforme);

    return reply.status(200).send(resultado.contenido);
  }

  public async emitirInforme(req: FastifyRequest, reply: FastifyReply) {
    if (!this.emitirInformeUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Servicio de emisión de informes no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const { identificador } = EmitirInformeParamSchema.parse(req.params);
    const query = EmitirInformeQuerySchema.parse(req.query);

    const resultado = await this.emitirInformeUseCase.execute({
      identificador,
      formato: query.formato,
      usuarioEmisor: query.usuarioEmisor,
      rolEmisor: query.rolEmisor,
      incluirDatosSensibles: query.incluirDatosSensibles,
      incluirCostos: query.incluirCostos,
    });

    // Si se solicita descarga directa o formato de archivo
    const accept = req.headers['accept'] ?? '';
    if (query.formato === 'PDF' && (accept.includes('application/pdf') || !accept.includes('application/json'))) {
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${resultado.nombreArchivo}"`);
      reply.header('X-Report-Id', resultado.codigoInforme);
      return reply.status(200).send(resultado.contenido);
    }

    if ((query.formato === 'CSV' || query.formato === 'EXCEL') && (accept.includes('text/csv') || !accept.includes('application/json'))) {
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${resultado.nombreArchivo}"`);
      reply.header('X-Report-Id', resultado.codigoInforme);
      return reply.status(200).send(resultado.contenido);
    }

    // Respuesta JSON envelope estándar
    return reply.status(200).send({
      success: true,
      data: {
        codigoInforme: resultado.codigoInforme,
        tipoFormato: resultado.tipoFormato,
        nombreArchivo: resultado.nombreArchivo,
        mimeType: resultado.mimeType,
        tamanoBytes: resultado.tamanoBytes,
        contenidoBase64: resultado.contenido.toString('base64'),
        log: resultado.log,
        recorrido: resultado.recorrido,
      },
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async listarLogs(req: FastifyRequest, reply: FastifyReply) {
    if (!this.listarLogsUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Servicio de consulta de bitácora no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const query = ListarInformesLogQuerySchema.parse(req.query);
    const logs = await this.listarLogsUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: logs,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }

  public async consultaInversa(req: FastifyRequest, reply: FastifyReply) {
    if (!this.consultaInversaUseCase) {
      return reply.status(501).send({
        success: false,
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Servicio de consulta inversa no configurado.' },
        timestamp: new Date().toISOString(),
      });
    }

    const query = ConsultaInversaQuerySchema.parse(req.query);
    const resultado = await this.consultaInversaUseCase.execute(query);

    return reply.status(200).send({
      success: true,
      data: resultado,
      error: null,
      timestamp: new Date().toISOString(),
    });
  }
}
