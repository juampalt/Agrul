import { DomainError } from '../errors/domain.error.js';
import { validarFechaCiclo } from '../value-objects/planificacion-ciclo.vo.js';

export interface DatosMonitoreo {
  cicloId: string;
  responsableId: string;
  fechaInspeccion: string;
  sectorObservado?: string | null;
  etapaFenologica: string;
  estadoGeneralCultivo: string;
  tipoObservacion: string;
  problemaDetectado?: string | null;
  descripcionHallazgos: string;
  accionRecomendada?: string | null;
}

export interface ContextoMonitoreo {
  ciclo: { id: string; loteId: string; estado: string; fechaInicio: string; fechaFin: string };
  responsableActivo: boolean;
}

export interface MonitoreoProps extends DatosMonitoreo {
  id: string;
  loteId: string;
  sectorObservado: string | null;
  problemaDetectado: string | null;
  accionRecomendada: string | null;
}

export class MonitoreoInvalidoError extends DomainError {
  readonly code = 'MONITOREO_INVALIDO';
}

export class Monitoreo {
  private constructor(private readonly props: MonitoreoProps) {}

  static registrar(id: string, datos: DatosMonitoreo, contexto: ContextoMonitoreo, hoy = new Date()): Monitoreo {
    const { ciclo } = contexto;
    if (!id || datos.cicloId !== ciclo.id || !ciclo.loteId || ciclo.estado !== 'ACTIVO' || !datos.responsableId || !contexto.responsableActivo) {
      throw new MonitoreoInvalidoError('El monitoreo requiere ciclo ACTIVO vinculado al lote y responsable activo.');
    }
    validarFechaCiclo(datos.fechaInspeccion, true, hoy);
    if (datos.fechaInspeccion < ciclo.fechaInicio || datos.fechaInspeccion > ciclo.fechaFin) {
      throw new MonitoreoInvalidoError('La inspección debe estar comprendida en el ciclo.');
    }
    for (const campo of ['etapaFenologica', 'estadoGeneralCultivo', 'tipoObservacion'] as const) {
      if (!datos[campo].trim() || datos[campo].trim().length > 100) throw new MonitoreoInvalidoError(`${campo} debe contener entre 1 y 100 caracteres.`);
    }
    if (!datos.descripcionHallazgos.trim()) throw new MonitoreoInvalidoError('Los hallazgos son obligatorios.');
    if ((datos.sectorObservado?.trim().length ?? 0) > 120) throw new MonitoreoInvalidoError('El sector admite hasta 120 caracteres.');
    // RN-13: la recomendación se conserva como texto; registrar no emite órdenes.
    return new Monitoreo({ ...datos, id, loteId: ciclo.loteId,
      etapaFenologica: datos.etapaFenologica.trim(), estadoGeneralCultivo: datos.estadoGeneralCultivo.trim(),
      tipoObservacion: datos.tipoObservacion.trim(), descripcionHallazgos: datos.descripcionHallazgos.trim(),
      sectorObservado: datos.sectorObservado?.trim() || null, problemaDetectado: datos.problemaDetectado?.trim() || null,
      accionRecomendada: datos.accionRecomendada?.trim() || null });
  }

  static reconstituir(props: MonitoreoProps): Monitoreo { return new Monitoreo({ ...props }); }
  toJSON(): MonitoreoProps { return { ...this.props }; }
}
