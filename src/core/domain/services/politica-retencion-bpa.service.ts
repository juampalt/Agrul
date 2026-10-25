/**
 * Servicio de Dominio: Política de Retención Legal y BPA (3 Años) y Bloqueo de DELETE Físico (RNF-06 / RN-05)
 *
 * Conforme a las Buenas Prácticas Agrícolas (BPA) y normativas oficiales (RN-05, RNF-06):
 * - Ningún dato productivo histórico puede ser eliminado físicamente antes de cumplir 3 años.
 * - Toda corrección o baja operativa debe realizarse mediante anulación lógica auditada (RN-05).
 * - Todo endpoint de usuario debe rechazar sentencias HTTP DELETE sobre entidades productivas.
 */

export interface ResultadoValidacionRetencion {
  permitido: boolean;
  anosTranscurridos: number;
  diasTranscurridos: number;
  fechaRegistro: Date;
  fechaFinRetencion: Date;
  motivoRechazo?: string;
}

export class PoliticaRetencionBpaService {
  public static readonly ANOS_RETENCION_MINIMA = 3;
  public static readonly DIAS_POR_ANO = 365.25; // Promedio considerando bisiestos
  public static readonly MS_RETENCION_MINIMA =
    this.ANOS_RETENCION_MINIMA * this.DIAS_POR_ANO * 24 * 60 * 60 * 1000;

  /**
   * Colección de nombres de entidades y prefijos de rutas que constituyen datos productivos
   * históricos amparados por la regla de retención de 3 años BPA.
   */
  public static readonly ENTIDADES_PRODUCTIVAS_PROTEGIDAS = [
    'lotes',
    'eventos',
    'eventos_trazabilidad',
    'ciclos',
    'ciclos_productivos',
    'actividades',
    'actividades_agricolas',
    'monitoreo',
    'observaciones_monitoreo',
    'aplicaciones',
    'aplicaciones_agricolas',
    'cosechas',
    'despachos',
    'despacho_destino',
    'perdidas',
    'perdidas_cosecha',
    'informes',
    'informe_trazabilidad_log',
    'stock',
    'stock_movimientos',
    'inventarios_fisicos',
    'ingresos_compra',
    'clima',
    'mediciones_meteorologicas',
    'eventos_climaticos_adversos',
    'fincas',
  ] as const;

  /**
   * Determina si una ruta URL o nombre de recurso corresponde a una entidad productiva histórica protegida.
   */
  public static esRutaProductivaProtegida(url: string): boolean {
    const limpia = url.split('?')[0].toLowerCase();
    return this.ENTIDADES_PRODUCTIVAS_PROTEGIDAS.some((entidad) =>
      limpia.includes(`/${entidad}`) || limpia.endsWith(`/${entidad}`)
    );
  }

  /**
   * Evalúa si un registro específico con una fecha de creación/ocurrencia puede ser eliminado físicamente.
   * Por regla estricta de BPA (RNF-06 / RN-05), si tiene menos de 3 años de antigüedad,
   * la eliminación física está terminantemente prohibida.
   */
  public static validarRetencionMinima(
    fechaRegistroInput: Date | string | number,
    fechaActualInput: Date | string | number = new Date()
  ): ResultadoValidacionRetencion {
    const fechaRegistro = typeof fechaRegistroInput === 'object'
      ? fechaRegistroInput
      : new Date(fechaRegistroInput);

    const fechaActual = typeof fechaActualInput === 'object'
      ? fechaActualInput
      : new Date(fechaActualInput);

    if (isNaN(fechaRegistro.getTime())) {
      throw new Error(`Fecha de registro inválida: ${fechaRegistroInput}`);
    }

    const fechaFinRetencion = new Date(fechaRegistro.getTime() + this.MS_RETENCION_MINIMA);
    const msTranscurridos = fechaActual.getTime() - fechaRegistro.getTime();
    const diasTranscurridos = Math.floor(msTranscurridos / (24 * 60 * 60 * 1000));
    const anosTranscurridos = +(diasTranscurridos / 365.25).toFixed(2);

    if (msTranscurridos < this.MS_RETENCION_MINIMA) {
      return {
        permitido: false,
        anosTranscurridos: Math.max(0, anosTranscurridos),
        diasTranscurridos: Math.max(0, diasTranscurridos),
        fechaRegistro,
        fechaFinRetencion,
        motivoRechazo: `No se puede eliminar físicamente el registro productivo: tiene ${anosTranscurridos} años y la normativa BPA exige una retención mínima inmutable de ${this.ANOS_RETENCION_MINIMA} años (hasta el ${fechaFinRetencion.toISOString().slice(0, 10)}) (RNF-06 / RN-05).`,
      };
    }

    return {
      permitido: true,
      anosTranscurridos,
      diasTranscurridos,
      fechaRegistro,
      fechaFinRetencion,
    };
  }

  /**
   * Retorna el objeto estandarizado de error de API ante un intento de HTTP DELETE sobre datos productivos.
   */
  public static construirErrorBorradoProhibido(url?: string): {
    code: 'DELETE_FISICO_PROHIBIDO_BPA';
    message: string;
    details: { retencionMinimaAnos: number; recurso?: string };
  } {
    return {
      code: 'DELETE_FISICO_PROHIBIDO_BPA',
      message:
        'La eliminación física (DELETE) de registros productivos está prohibida por normativa BPA (retención mínima de 3 años obligatoria, RNF-06 / RN-05). Utilice la anulación lógica auditada con motivo.',
      details: {
        retencionMinimaAnos: this.ANOS_RETENCION_MINIMA,
        recurso: url,
      },
    };
  }
}
