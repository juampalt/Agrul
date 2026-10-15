import { RecomendacionTecnicaProps } from '../entities/recomendacion-tecnica.entity.js';

export interface DatosFichaFitosanitaria {
  principioActivo: string;
  periodoCarenciaDias: number;
  periodoReingresoHoras: number;
  nroRegistroSenasa: string;
  toxicologia?: string | null;
}

export interface DatosInsumoEvaluado {
  id: string;
  nombreComercial: string;
  categoria: string;
  fichaFitosanitaria?: DatosFichaFitosanitaria | null;
}

export interface LineaAplicadaAEvaluar {
  insumoId: string;
  insumo?: DatosInsumoEvaluado | null;
  cantidadTotal: number;
  unidadMedidaId: string;
}

export interface AplicacionAEvaluar {
  id: string;
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  recomendacionTecnica?: RecomendacionTecnicaProps | null;
  lineas: LineaAplicadaAEvaluar[];
}

export interface AlertaCarencia {
  aplicacionId: string;
  fechaAplicacion: string;
  insumoId: string;
  nombreComercial: string;
  principioActivo: string;
  nroRegistroSenasa: string;
  periodoCarenciaDias: number;
  fechaFinCarencia: string;
  diasRestantes: number;
  fechaEvaluacion: string;
  mensajeAdvertencia: string;
}

export interface AlertaReingreso {
  aplicacionId: string;
  fechaAplicacion: string;
  insumoId: string;
  nombreComercial: string;
  periodoReingresoHoras: number;
  fechaFinReingreso: string;
  horasRestantes: number;
  fechaEvaluacion: string;
  mensajeAdvertencia: string;
}

export interface ResultadoVerificacionCarencia {
  loteId: string;
  fechaEvaluacion: string;
  aptoParaCosecha: boolean;
  aptoParaReingreso: boolean;
  fechaSeguraCosecha: string | null;
  totalAplicacionesEvaluadas: number;
  totalAlertasCarencia: number;
  alertasCarencia: AlertaCarencia[];
  alertasReingreso: AlertaReingreso[];
  advertencias: string[];
}

/**
 * Servicio de Dominio puro: Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas.
 * Modela RF-M4-08, RF-M4-09, RF-M5-11 y la regla de negocio RN-14.
 */
export class ServicioVerificacionCarencia {
  /**
   * Calcula la fecha de fin de carencia sumando los días estipulados en el rótulo (RN-14).
   * fechaFinCarencia = fechaAplicacion + periodoCarenciaDias
   */
  public static calcularFechaFinCarencia(fechaAplicacionStr: string, diasCarencia: number): string {
    const fechaBase = this.normalizarFecha(fechaAplicacionStr);
    const fechaFin = new Date(fechaBase.getTime());
    fechaFin.setUTCDate(fechaFin.getUTCDate() + diasCarencia);
    return fechaFin.toISOString().split('T')[0];
  }

  /**
   * Calcula la fecha/hora de fin de reingreso sumando las horas estipuladas en el rótulo (RN-14).
   */
  public static calcularFechaFinReingreso(fechaAplicacionStr: string, horasReingreso: number): string {
    const fechaBase = this.normalizarFecha(fechaAplicacionStr);
    const fechaFin = new Date(fechaBase.getTime() + horasReingreso * 3600 * 1000);
    return fechaFin.toISOString();
  }

  /**
   * Evalúa las aplicaciones registradas en un lote contra una fecha objetivo (ej. fecha de cosecha o labor de campo).
   * Emite alertas no bloqueantes si la fecha está dentro de la ventana de carencia o reingreso.
   */
  public static evaluarLote(params: {
    loteId: string;
    aplicaciones: AplicacionAEvaluar[];
    fechaEvaluacion: string;
  }): ResultadoVerificacionCarencia {
    const { loteId, aplicaciones, fechaEvaluacion } = params;
    const fechaEvalNorm = this.normalizarFecha(fechaEvaluacion);
    const fechaEvalStr = fechaEvalNorm.toISOString().split('T')[0];

    const alertasCarencia: AlertaCarencia[] = [];
    const alertasReingreso: AlertaReingreso[] = [];
    const advertencias: string[] = [];
    let fechaSeguraTimestamp = 0;

    for (const aplicacion of aplicaciones) {
      const fechaAplNorm = this.normalizarFecha(aplicacion.fecha);
      const fechaAplStr = fechaAplNorm.toISOString().split('T')[0];

      // Una labor no puede ser anterior a la aplicación para generar carencia futura
      if (fechaEvalNorm < fechaAplNorm) {
        continue;
      }

      for (const linea of aplicacion.lineas) {
        const ficha = linea.insumo?.fichaFitosanitaria;
        if (!ficha) {
          continue; // Insumos no fitosanitarios (ej. fertilizantes o enmiendas) no tienen carencia SENASA
        }

        const nombreComercial = linea.insumo?.nombreComercial ?? 'Producto Fitosanitario';
        const diasCarencia = ficha.periodoCarenciaDias;
        const horasReingreso = ficha.periodoReingresoHoras;

        // 1. Evaluación de Carencia (RF-M4-09 / RN-14)
        const fechaFinCarenciaStr = this.calcularFechaFinCarencia(fechaAplStr, diasCarencia);
        const fechaFinCarenciaDate = this.normalizarFecha(fechaFinCarenciaStr);

        if (fechaEvalNorm < fechaFinCarenciaDate) {
          const diffMs = fechaFinCarenciaDate.getTime() - fechaEvalNorm.getTime();
          const diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          if (fechaFinCarenciaDate.getTime() > fechaSeguraTimestamp) {
            fechaSeguraTimestamp = fechaFinCarenciaDate.getTime();
          }

          const mensaje = `ADVERTENCIA DE SEGURIDAD ALIMENTARIA (RF-M4-09 / RN-14): El lote '${loteId}' registra aplicación de '${nombreComercial}' (Principio activo: ${ficha.principioActivo}, SENASA: ${ficha.nroRegistroSenasa}) el día ${fechaAplStr} con período de carencia de ${diasCarencia} días. La cosecha antes del ${fechaFinCarenciaStr} no es segura (restan ${diasRestantes} días de carencia).`;

          alertasCarencia.push({
            aplicacionId: aplicacion.id,
            fechaAplicacion: fechaAplStr,
            insumoId: linea.insumoId,
            nombreComercial,
            principioActivo: ficha.principioActivo,
            nroRegistroSenasa: ficha.nroRegistroSenasa,
            periodoCarenciaDias: diasCarencia,
            fechaFinCarencia: fechaFinCarenciaStr,
            diasRestantes,
            fechaEvaluacion: fechaEvalStr,
            mensajeAdvertencia: mensaje,
          });

          advertencias.push(mensaje);
        }

        // 2. Evaluación de Reingreso al lote en horas (RN-14)
        if (horasReingreso > 0) {
          const fechaFinReingresoIso = this.calcularFechaFinReingreso(aplicacion.fecha, horasReingreso);
          const fechaFinReingresoDate = new Date(fechaFinReingresoIso);

          if (fechaEvalNorm < fechaFinReingresoDate) {
            const diffMs = fechaFinReingresoDate.getTime() - fechaEvalNorm.getTime();
            const horasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 3600)));

            const mensaje = `ADVERTENCIA DE REINGRESO (RN-14): El producto '${nombreComercial}' aplicado en la fecha ${fechaAplStr} requiere un período de reingreso restringido de ${horasReingreso} horas (reingreso seguro a partir de ${fechaFinReingresoIso}). Restan aproximadamente ${horasRestantes} horas.`;

            alertasReingreso.push({
              aplicacionId: aplicacion.id,
              fechaAplicacion: fechaAplStr,
              insumoId: linea.insumoId,
              nombreComercial,
              periodoReingresoHoras: horasReingreso,
              fechaFinReingreso: fechaFinReingresoIso,
              horasRestantes,
              fechaEvaluacion: fechaEvalStr,
              mensajeAdvertencia: mensaje,
            });

            advertencias.push(mensaje);
          }
        }
      }
    }

    const aptoParaCosecha = alertasCarencia.length === 0;
    const aptoParaReingreso = alertasReingreso.length === 0;
    const fechaSeguraCosecha = fechaSeguraTimestamp > 0
      ? new Date(fechaSeguraTimestamp).toISOString().split('T')[0]
      : null;

    return {
      loteId,
      fechaEvaluacion: fechaEvalStr,
      aptoParaCosecha,
      aptoParaReingreso,
      fechaSeguraCosecha,
      totalAplicacionesEvaluadas: aplicaciones.length,
      totalAlertasCarencia: alertasCarencia.length,
      alertasCarencia,
      alertasReingreso,
      advertencias,
    };
  }

  private static normalizarFecha(fechaStr: string): Date {
    if (!fechaStr) {
      return new Date();
    }
    if (fechaStr.includes('T')) {
      return new Date(fechaStr);
    }
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0));
  }
}
