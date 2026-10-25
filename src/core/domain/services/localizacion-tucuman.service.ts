/**
 * Servicio de Dominio: Localización Oficial Tucumán y Sistema de Unidades Métricas (RNF-12)
 *
 * Configuración estricta de localización para el sistema Agrul:
 * - Zona horaria legal obligatoria: America/Argentina/Tucuman (UTC-3).
 * - Formato visual canónico de fechas: DD/MM/AAAA (dd/mm/aaaa).
 * - Sistema métrico legal argentino y BPA: kg, L, ha, °C, mm, km/h.
 * - Invariante RNF-12: El registro de operaciones agrícolas a las 23:30 hs no debe sufrir
 *   desplazamiento al día siguiente por conversiones UTC desfasadas.
 */

export interface UnidadesMetricasOficiales {
  masa: 'kg';
  volumen: 'L';
  superficie: 'ha';
  temperatura: '°C';
  precipitacion: 'mm';
  velocidadViento: 'km/h';
}

export interface FechaHoraTucumanInfo {
  fechaLocal: string; // Formato ISO fecha: YYYY-MM-DD
  horaLocal: string;  // Formato 24h: HH:mm:ss
  fechaVisual: string; // Formato oficial argentino: DD/MM/AAAA
  fechaHoraVisual: string; // DD/MM/AAAA HH:mm:ss
  timestampUtc: Date;
  isoConOffset: string; // YYYY-MM-DDTHH:mm:ss-03:00
}

export class LocalizacionTucumanService {
  public static readonly ZONA_HORARIA = 'America/Argentina/Tucuman';
  public static readonly OFFSET_HORAS = -3;
  public static readonly OFFSET_MINUTOS = -180;
  public static readonly OFFSET_STRING = '-03:00';
  public static readonly FORMATO_FECHA_VISUAL = 'DD/MM/YYYY';

  public static readonly UNIDADES_OFICIALES: UnidadesMetricasOficiales = {
    masa: 'kg',
    volumen: 'L',
    superficie: 'ha',
    temperatura: '°C',
    precipitacion: 'mm',
    velocidadViento: 'km/h',
  };

  /**
   * Extrae la fecha del calendario local en Tucumán (YYYY-MM-DD).
   * Garantiza que eventos a las 23:30 hs preserven el día local correcto.
   */
  public static extraerFechaLocal(dateOrIso: Date | string | number): string {
    const d = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
      ? new Date(dateOrIso)
      : dateOrIso;

    if (isNaN(d.getTime())) {
      throw new Error(`Fecha inválida suministrada a LocalizacionTucumanService: ${dateOrIso}`);
    }

    // Usar 'en-CA' produce determinísticamente 'YYYY-MM-DD' en la zona horaria indicada
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.ZONA_HORARIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(d);
  }

  /**
   * Extrae la hora local en formato 24h (HH:mm:ss) en la zona horaria de Tucumán.
   */
  public static extraerHoraLocal(dateOrIso: Date | string | number): string {
    const d = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
      ? new Date(dateOrIso)
      : dateOrIso;

    if (isNaN(d.getTime())) {
      throw new Error(`Fecha inválida suministrada a LocalizacionTucumanService: ${dateOrIso}`);
    }

    const formatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: this.ZONA_HORARIA,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return formatter.format(d);
  }

  /**
   * Formatea una fecha en formato visual argentino DD/MM/AAAA (dd/mm/aaaa).
   */
  public static formatearFechaVisual(dateOrIso: Date | string | number): string {
    const isoDate = this.extraerFechaLocal(dateOrIso);
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Formatea fecha y hora visual en Tucumán (DD/MM/AAAA HH:mm:ss).
   */
  public static formatearFechaHoraVisual(dateOrIso: Date | string | number): string {
    const fecha = this.formatearFechaVisual(dateOrIso);
    const hora = this.extraerHoraLocal(dateOrIso);
    return `${fecha} ${hora}`;
  }

  /**
   * Descompone un timestamp o Date en su información completa de localización Tucumán.
   */
  public static descomponer(dateOrIso: Date | string | number = new Date()): FechaHoraTucumanInfo {
    const d = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
      ? new Date(dateOrIso)
      : dateOrIso;

    if (isNaN(d.getTime())) {
      throw new Error(`Fecha inválida suministrada a LocalizacionTucumanService: ${dateOrIso}`);
    }

    const fechaLocal = this.extraerFechaLocal(d);
    const horaLocal = this.extraerHoraLocal(d);
    const fechaVisual = this.formatearFechaVisual(d);
    const fechaHoraVisual = `${fechaVisual} ${horaLocal}`;

    const isoConOffset = `${fechaLocal}T${horaLocal}${this.OFFSET_STRING}`;

    return {
      fechaLocal,
      horaLocal,
      fechaVisual,
      fechaHoraVisual,
      timestampUtc: d,
      isoConOffset,
    };
  }

  /**
   * Construye un Date a partir de componentes locales en Tucumán (UTC-3).
   * Ejemplo: crearTimestampTucuman(2026, 10, 24, 23, 30, 0)
   * representará exactamente las 23:30 hs en Tucumán (02:30:00Z del 25/10/2026 en UTC).
   */
  public static crearTimestampTucuman(
    anio: number,
    mes: number, // 1 a 12
    dia: number,
    hora = 0,
    minuto = 0,
    segundo = 0
  ): Date {
    const mm = String(mes).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    const hh = String(hora).padStart(2, '0');
    const min = String(minuto).padStart(2, '0');
    const ss = String(segundo).padStart(2, '0');

    const isoString = `${anio}-${mm}-${dd}T${hh}:${min}:${ss}${this.OFFSET_STRING}`;
    return new Date(isoString);
  }

  /**
   * Parseador estricto de fechas y cadenas provenientes de clientes.
   * Si la cadena es 'YYYY-MM-DD', asume inicio del día en Tucumán (00:00:00-03:00).
   * Si la cadena incluye hora pero no offset, asume zona horaria Tucumán.
   */
  public static parsearCadenaEntrada(cadena: string): Date {
    const limpia = cadena.trim();

    // Formato fecha simple YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
      return new Date(`${limpia}T00:00:00${this.OFFSET_STRING}`);
    }

    // Formato visual DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpia)) {
      const [dd, mm, yyyy] = limpia.split('/');
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00${this.OFFSET_STRING}`);
    }

    // Formato ISO con fecha y hora pero sin offset ni Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(limpia)) {
      return new Date(`${limpia}${this.OFFSET_STRING}`);
    }

    // Formato estándar ya con offset o UTC 'Z'
    const d = new Date(limpia);
    if (isNaN(d.getTime())) {
      throw new Error(`Cadena de fecha con formato irreconocible: '${cadena}'`);
    }
    return d;
  }

  /**
   * Validador de invariante RNF-12:
   * Verifica matemáticamente que registrar a las 23:30 hs no altere el día natural.
   */
  public static verificarPreservacionFecha2330(fechaBase: string = '2026-10-24'): boolean {
    const [anio, mes, dia] = fechaBase.split('-').map(Number);
    const d2330 = this.crearTimestampTucuman(anio, mes, dia, 23, 30, 0);
    const fechaExtraida = this.extraerFechaLocal(d2330);
    return fechaExtraida === fechaBase;
  }
}
