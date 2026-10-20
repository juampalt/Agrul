import { randomUUID } from 'node:crypto';
import { InformesTrazabilidadRepositoryPort } from '../../core/ports/informes-trazabilidad-repository.port.js';
import { InformeTrazabilidadLog } from '../../core/domain/entities/informe-trazabilidad-log.entity.js';
import { ObtenerRecorridoTrazabilidadUseCase } from './recorrido-trazabilidad.use-case.js';
import {
  EmitirInformeTrazabilidadInputDto,
  EmitirInformeTrazabilidadOutputDto,
} from '../dtos/informe-trazabilidad.dto.js';
import { FiltroPrivacidadTrazabilidadService } from '../services/filtro-privacidad-trazabilidad.service.js';
import { GeneradorExportacionCsvService } from '../services/generador-exportacion-csv.service.js';
import { GeneradorInformePdfService } from '../services/generador-informe-pdf.service.js';

export interface EmitirInformeTrazabilidadDependencies {
  obtenerRecorridoUseCase: ObtenerRecorridoTrazabilidadUseCase;
  informesRepo: InformesTrazabilidadRepositoryPort;
}

/**
 * Caso de Uso: EmitirInformeTrazabilidadUseCase (AGRUL-033).
 * Orquesta la generación oficial de informes en PDF y CSV/Excel,
 * aplicando filtros de privacidad (RF-M6-11), marcado de rectificaciones (RF-M6-09)
 * y registrando cada emisión en la bitácora inmutable (RF-M6-13).
 */
export class EmitirInformeTrazabilidadUseCase {
  constructor(private readonly deps: EmitirInformeTrazabilidadDependencies) {}

  public async execute(input: EmitirInformeTrazabilidadInputDto): Promise<EmitirInformeTrazabilidadOutputDto> {
    const { identificador } = input;
    const formato = input.formato ?? 'PDF';
    const usuarioEmisor = input.usuarioEmisor && input.usuarioEmisor.trim() !== ''
      ? input.usuarioEmisor.trim()
      : 'Auditor Oficial / Sistema Agrul';
    const rolEmisor = input.rolEmisor ?? 'Auditor de Calidad';
    const incluirDatosSensibles = input.incluirDatosSensibles ?? false;
    const incluirCostos = input.incluirCostos ?? false;

    // 1. Obtener recorrido integral de trazabilidad (AGRUL-032)
    const recorridoRaw = await this.deps.obtenerRecorridoUseCase.execute({ identificador });

    // 2. Aplicar filtro de privacidad (RF-M6-11 / RNF-14)
    const recorridoFiltrado = FiltroPrivacidadTrazabilidadService.aplicar(recorridoRaw, {
      incluirDatosSensibles,
      incluirCostos,
    });

    // 3. Generar metadatos e ID único de emisión (RF-M6-08 / RF-M6-13)
    const timestampEmision = new Date().toISOString();
    const codigoInforme = `INF-TRZ-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const codigoLimpio = recorridoFiltrado.cosecha.codigoTrazabilidad.replace(/[^a-zA-Z0-9-_]/g, '_');

    // 4. Generar documento en el formato solicitado
    let contenido: Buffer;
    let mimeType: string;
    let nombreArchivo: string;

    if (formato === 'CSV' || formato === 'EXCEL') {
      contenido = GeneradorExportacionCsvService.generar(recorridoFiltrado, {
        codigoInforme,
        usuarioEmisor,
        fechaEmision: timestampEmision,
      });
      mimeType = 'text/csv; charset=utf-8';
      nombreArchivo = `trazabilidad-${codigoLimpio}-${Date.now()}.csv`;
    } else {
      // PDF por defecto (RF-M6-08)
      contenido = GeneradorInformePdfService.generar(recorridoFiltrado, {
        codigoInforme,
        usuarioEmisor,
        fechaEmision: timestampEmision,
        rolEmisor,
      });
      mimeType = 'application/pdf';
      nombreArchivo = `informe-trazabilidad-${codigoLimpio}-${Date.now()}.pdf`;
    }

    // 5. Asentar en la bitácora inmutable informe_trazabilidad_log (RF-M6-13)
    const log = InformeTrazabilidadLog.crear({
      id: randomUUID(),
      codigoInforme,
      cosechaId: recorridoFiltrado.cosecha.id,
      loteId: recorridoFiltrado.lote.id,
      codigoTrazabilidad: recorridoFiltrado.cosecha.codigoTrazabilidad,
      tipoFormato: formato,
      usuarioEmisor,
      rolEmisor,
      filtrosAplicados: {
        incluirDatosSensibles,
        incluirCostos,
      },
      emitidoEn: timestampEmision,
      hashContenido: null,
    });

    await this.deps.informesRepo.guardar(log);

    return {
      codigoInforme,
      tipoFormato: formato,
      nombreArchivo,
      mimeType,
      contenido,
      tamanoBytes: contenido.length,
      log: log.toJSON(),
      recorrido: recorridoFiltrado,
    };
  }
}
