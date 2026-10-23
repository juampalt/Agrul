import {
  MedicionClimatica,
  FuenteDatoClima,
} from '../../core/domain/entities/medicion-climatica.entity.js';
import {
  EventoClimaticoAdverso,
  TipoSiniestroClimatico,
} from '../../core/domain/entities/evento-climatico-adverso.entity.js';
import {
  MedicionesClimaticasRepositoryPort,
} from '../../core/ports/mediciones-climaticas-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { EventosClimaticosAdversosRepositoryPort } from '../../core/ports/eventos-climaticos-adversos-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import {
  MedicionClimaticaInvalidaError,
  MedicionClimaticaNoEncontradaError,
  ImportacionCsvClimaInvalidaError,
  EventoClimaticoAdversoInvalidoError,
  EventoClimaticoNoEncontradoError,
  EntidadNoEncontradaError,
} from '../../core/domain/errors/domain.error.js';
import {
  RegistrarMedicionClimaticaInputDto,
  CorregirMedicionClimaticaInputDto,
  ImportarMedicionesCsvInputDto,
  ListarMedicionesClimaticasInputDto,
  MedicionClimaticaOutputDto,
  ResultadoImportacionCsvDto,
  ErrorFilaCsvDto,
  ContextoClimaticoLaborDto,
  EstadoAptitudPulverizacion,
  RegistrarEventoAdversoInputDto,
  EventoClimaticoAdversoOutputDto,
  ListarEventosAdversosInputDto,
  ResumenClimaticoCicloDto,
  SerieHistoricaClimaticaLoteDto,
  DiaSerieClimaticaDto,
  HitoLaborClimaDto,
} from '../dtos/clima.dto.js';

export class ClimaBaseUseCase {
  protected restarDias(fechaIso: string, dias: number): string {
    const d = new Date(`${fechaIso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dias);
    return d.toISOString().split('T')[0];
  }

  protected sumarDias(fechaIso: string, dias: number): string {
    const d = new Date(`${fechaIso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().split('T')[0];
  }

  protected mapToOutput(m: MedicionClimatica): MedicionClimaticaOutputDto {
    return {
      id: m.id,
      fincaId: m.fincaId,
      fecha: m.fecha,
      tempMinC: m.tempMinC,
      tempMaxC: m.tempMaxC,
      tempMediaC: m.tempMediaC,
      precipitacionMm: m.precipitacionMm,
      humedadRelativaPct: m.humedadRelativaPct,
      vientoKmH: m.vientoKmH,
      huboHelada: m.huboHelada,
      huboGranizo: m.huboGranizo,
      fuenteDato: m.fuenteDato,
      observaciones: m.observaciones,
      esCorreccion: m.esCorreccion,
      medicionOriginalId: m.medicionOriginalId,
      motivoCorreccion: m.motivoCorreccion,
      usuarioCargaId: m.usuarioCargaId,
      creadoEn: m.creadoEn,
      actualizadoEn: m.actualizadoEn,
    };
  }

  protected mapEventoToOutput(e: EventoClimaticoAdverso): EventoClimaticoAdversoOutputDto {
    return {
      id: e.id,
      fincaId: e.fincaId,
      loteId: e.loteId,
      fecha: e.fecha,
      tipoSiniestro: e.tipoSiniestro,
      danoEstimadoPct: e.danoEstimadoPct,
      superficieAfectadaHa: e.superficieAfectadaHa,
      fotosUrls: e.fotosUrls,
      descripcion: e.descripcion,
      usuarioId: e.usuarioId,
      creadoEn: e.creadoEn,
      actualizadoEn: e.actualizadoEn,
    };
  }
}


/**
 * Caso de Uso: Carga Manual Diaria de Datos Meteorológicos (RF-M10-01, RF-M10-02, RF-M10-05, RN-04).
 */
export class RegistrarMedicionClimaticaUseCase extends ClimaBaseUseCase {
  constructor(
    private readonly climaRepo: MedicionesClimaticasRepositoryPort,
    private readonly fincasRepo?: FincasRepositoryPort
  ) {
    super();
  }

  public async execute(
    input: RegistrarMedicionClimaticaInputDto
  ): Promise<MedicionClimaticaOutputDto> {
    if (this.fincasRepo) {
      const finca = await this.fincasRepo.buscarPorId(input.fincaId);
      if (!finca) {
        throw new EntidadNoEncontradaError('Finca', input.fincaId);
      }
    }

    // Regla de Inmutabilidad histórica (RF-M10-06): si ya existe registro en esa fecha, no se sobreescribe
    const existente = await this.climaRepo.obtenerVigentePorFechaYFinca(
      input.fincaId,
      input.fecha
    );
    if (existente) {
      throw new MedicionClimaticaInvalidaError(
        `Ya existe un registro meteorológico para la finca en la fecha '${input.fecha}'. Para rectificar un dato utilice el caso de uso de corrección (RF-M10-06 / RN-06).`
      );
    }

    const medicion = MedicionClimatica.crear({
      fincaId: input.fincaId,
      fecha: input.fecha,
      tempMinC: input.tempMinC,
      tempMaxC: input.tempMaxC,
      tempMediaC: input.tempMediaC,
      precipitacionMm: input.precipitacionMm,
      humedadRelativaPct: input.humedadRelativaPct,
      vientoKmH: input.vientoKmH,
      huboHelada: input.huboHelada,
      huboGranizo: input.huboGranizo,
      fuenteDato: input.fuenteDato,
      observaciones: input.observaciones,
      usuarioCargaId: input.usuarioCargaId,
      fechaReferenciaHoy: input.fechaReferenciaHoy,
    });

    await this.climaRepo.guardar(medicion);
    return this.mapToOutput(medicion);
  }
}

/**
 * Caso de Uso: Corrección Inmutable de Datos Meteorológicos (RF-M10-06 / RN-06).
 * No sobreescribe el registro existente, sino que genera una nueva versión auditada con motivo explícito.
 */
export class CorregirMedicionClimaticaUseCase extends ClimaBaseUseCase {
  constructor(private readonly climaRepo: MedicionesClimaticasRepositoryPort) {
    super();
  }

  public async execute(
    input: CorregirMedicionClimaticaInputDto
  ): Promise<MedicionClimaticaOutputDto> {
    const original = await this.climaRepo.obtenerPorId(input.id);
    if (!original) {
      throw new MedicionClimaticaNoEncontradaError(input.id);
    }

    const correccion = original.corregir({
      motivoCorreccion: input.motivoCorreccion,
      usuarioCargaId: input.usuarioCargaId,
      tempMinC: input.tempMinC,
      tempMaxC: input.tempMaxC,
      tempMediaC: input.tempMediaC,
      precipitacionMm: input.precipitacionMm,
      humedadRelativaPct: input.humedadRelativaPct,
      vientoKmH: input.vientoKmH,
      huboHelada: input.huboHelada,
      huboGranizo: input.huboGranizo,
      fuenteDato: input.fuenteDato,
      observaciones: input.observaciones,
      fechaReferenciaHoy: input.fechaReferenciaHoy,
    });

    await this.climaRepo.guardar(correccion);
    return this.mapToOutput(correccion);
  }
}

/**
 * Caso de Uso: Parser e Importador Batch de Archivos CSV de Estaciones Meteorológicas (RF-M10-04, RF-M10-05, RF-M10-06).
 */
export class ImportarMedicionesCsvUseCase extends ClimaBaseUseCase {
  constructor(
    private readonly climaRepo: MedicionesClimaticasRepositoryPort,
    private readonly fincasRepo?: FincasRepositoryPort
  ) {
    super();
  }

  public async execute(
    input: ImportarMedicionesCsvInputDto
  ): Promise<ResultadoImportacionCsvDto> {
    if (!input.contenidoCsv || input.contenidoCsv.trim().length === 0) {
      throw new ImportacionCsvClimaInvalidaError('El contenido del archivo CSV es obligatorio y no puede estar vacío.');
    }

    if (this.fincasRepo) {
      const finca = await this.fincasRepo.buscarPorId(input.fincaId);
      if (!finca) {
        throw new EntidadNoEncontradaError('Finca', input.fincaId);
      }
    }

    // Limpieza de BOM (\uFEFF) y normalización de saltos de línea
    const contenidoLimpio = input.contenidoCsv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lineas = contenidoLimpio.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));

    if (lineas.length < 2) {
      throw new ImportacionCsvClimaInvalidaError(
        'El archivo CSV debe contener al menos la fila de encabezados y una fila con datos meteorológicos.'
      );
    }

    // Detección de delimitador: coma (,) o punto y coma (;)
    const primerLinea = lineas[0];
    const cuentaComas = (primerLinea.match(/,/g) || []).length;
    const cuentaPuntoComa = (primerLinea.match(/;/g) || []).length;
    const delimitador = cuentaPuntoComa > cuentaComas ? ';' : ',';

    const encabezados = primerLinea
      .split(delimitador)
      .map(h => h.trim().toLowerCase().replace(/["']/g, ''));

    const mapeoColumnas = this.detectarColumnas(encabezados);

    if (mapeoColumnas.fecha === -1) {
      throw new ImportacionCsvClimaInvalidaError(
        'El archivo CSV no contiene una columna identificable para la fecha (ej: fecha, date, dia).'
      );
    }
    if (mapeoColumnas.precipitacion === -1) {
      throw new ImportacionCsvClimaInvalidaError(
        'El archivo CSV no contiene una columna identificable para la precipitación (ej: precipitacion, lluvia, mm).'
      );
    }

    const medicionesValidas: MedicionClimatica[] = [];
    const errores: ErrorFilaCsvDto[] = [];
    const fechasProcesadasEnBatch = new Set<string>();

    for (let i = 1; i < lineas.length; i++) {
      const nroFila = i + 1;
      const linea = lineas[i];
      const valores = this.separarValoresCsv(linea, delimitador);

      const filaObj: Record<string, string> = {};
      encabezados.forEach((h, idx) => {
        filaObj[h] = valores[idx] ?? '';
      });

      try {
        const fechaVal = this.obtenerValorColumna(valores, mapeoColumnas.fecha);
        if (!fechaVal) {
          throw new Error('La fecha es obligatoria en la fila.');
        }

        const fechaNormalizada = this.normalizarFecha(fechaVal);

        if (fechasProcesadasEnBatch.has(fechaNormalizada)) {
          throw new Error(`La fecha '${fechaNormalizada}' se encuentra repetida en el mismo archivo CSV.`);
        }

        // Regla de Inmutabilidad histórica (RF-M10-06): no sobreescribir datos existentes
        const yaExiste = await this.climaRepo.obtenerVigentePorFechaYFinca(
          input.fincaId,
          fechaNormalizada
        );
        if (yaExiste) {
          throw new Error(
            `Ya existe un registro meteorológico previo para la fecha '${fechaNormalizada}'. No se sobreescribe por inmutabilidad histórica (RF-M10-06).`
          );
        }

        const precipitacionVal = this.obtenerValorColumna(valores, mapeoColumnas.precipitacion);
        if (precipitacionVal === null || precipitacionVal === '') {
          throw new Error('La precipitación es obligatoria.');
        }
        const precipitacionMm = this.parsearNumero(precipitacionVal);
        if (precipitacionMm === null || isNaN(precipitacionMm)) {
          throw new Error(`El valor de precipitación '${precipitacionVal}' no es un número válido.`);
        }

        const tempMinVal = this.obtenerValorColumna(valores, mapeoColumnas.tempMin);
        const tempMinC = tempMinVal !== null && tempMinVal !== '' ? this.parsearNumero(tempMinVal) : null;

        const tempMaxVal = this.obtenerValorColumna(valores, mapeoColumnas.tempMax);
        const tempMaxC = tempMaxVal !== null && tempMaxVal !== '' ? this.parsearNumero(tempMaxVal) : null;

        const tempMediaVal = this.obtenerValorColumna(valores, mapeoColumnas.tempMedia);
        const tempMediaC = tempMediaVal !== null && tempMediaVal !== '' ? this.parsearNumero(tempMediaVal) : null;

        const humedadVal = this.obtenerValorColumna(valores, mapeoColumnas.humedad);
        const humedadRelativaPct = humedadVal !== null && humedadVal !== '' ? this.parsearNumero(humedadVal) : null;

        const vientoVal = this.obtenerValorColumna(valores, mapeoColumnas.viento);
        const vientoKmH = vientoVal !== null && vientoVal !== '' ? this.parsearNumero(vientoVal) : null;

        const heladaVal = this.obtenerValorColumna(valores, mapeoColumnas.helada);
        const huboHelada = heladaVal !== null && heladaVal !== '' ? this.parsearBooleano(heladaVal) : undefined;

        const granizoVal = this.obtenerValorColumna(valores, mapeoColumnas.granizo);
        const huboGranizo = granizoVal !== null && granizoVal !== '' ? this.parsearBooleano(granizoVal) : false;

        const fuenteVal = this.obtenerValorColumna(valores, mapeoColumnas.fuente);
        const fuenteDato: FuenteDatoClima =
          (fuenteVal?.toUpperCase() as FuenteDatoClima) ||
          input.fuenteDatoPorDefecto ||
          'ESTACION_PROPIA';

        const obsVal = this.obtenerValorColumna(valores, mapeoColumnas.observaciones);

        const medicion = MedicionClimatica.crear({
          fincaId: input.fincaId,
          fecha: fechaNormalizada,
          tempMinC,
          tempMaxC,
          tempMediaC,
          precipitacionMm,
          humedadRelativaPct,
          vientoKmH,
          huboHelada,
          huboGranizo,
          fuenteDato,
          observaciones: obsVal,
          usuarioCargaId: input.usuarioCargaId,
          fechaReferenciaHoy: input.fechaReferenciaHoy,
        });

        medicionesValidas.push(medicion);
        fechasProcesadasEnBatch.add(fechaNormalizada);
      } catch (err: any) {
        errores.push({
          fila: nroFila,
          error: err.message || 'Error desconocido al procesar la fila.',
          datos: filaObj,
        });
      }
    }

    if (medicionesValidas.length > 0) {
      await this.climaRepo.guardarBatch(medicionesValidas);
    }

    return {
      totalFilas: lineas.length - 1,
      filasImportadas: medicionesValidas.length,
      filasFallidas: errores.length,
      mediciones: medicionesValidas.map(m => this.mapToOutput(m)),
      errores,
    };
  }

  private separarValoresCsv(linea: string, delimitador: string): string[] {
    const valores: string[] = [];
    let valorActual = '';
    let dentroDeComillas = false;

    for (let j = 0; j < linea.length; j++) {
      const char = linea[j];
      if (char === '"' || char === "'") {
        dentroDeComillas = !dentroDeComillas;
      } else if (char === delimitador && !dentroDeComillas) {
        valores.push(valorActual.trim().replace(/^["']|["']$/g, ''));
        valorActual = '';
      } else {
        valorActual += char;
      }
    }
    valores.push(valorActual.trim().replace(/^["']|["']$/g, ''));
    return valores;
  }

  private detectarColumnas(headers: string[]): {
    fecha: number;
    precipitacion: number;
    tempMin: number;
    tempMax: number;
    tempMedia: number;
    humedad: number;
    viento: number;
    helada: number;
    granizo: number;
    fuente: number;
    observaciones: number;
  } {
    const findIndex = (keywords: string[]) =>
      headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));

    return {
      fecha: findIndex(['fecha', 'date', 'dia', 'timestamp']),
      precipitacion: findIndex(['precipitacion', 'lluvia', 'rain', 'precip', 'precipitacion_mm', 'mm']),
      tempMin: findIndex(['temp_min', 'tempmin', 'tmin', 'min_temp', 'temperatura_minima']),
      tempMax: findIndex(['temp_max', 'tempmax', 'tmax', 'max_temp', 'temperatura_maxima']),
      tempMedia: findIndex(['temp_media', 'tempmedia', 'tmedia', 'avg_temp', 'temperatura_media']),
      humedad: findIndex(['humedad', 'humidity', 'hr', 'humedad_relativa', 'humedad_pct']),
      viento: findIndex(['viento', 'wind', 'velocidad_viento', 'viento_kmh']),
      helada: findIndex(['helada', 'frost', 'hubo_helada', 'is_frost']),
      granizo: findIndex(['granizo', 'hail', 'hubo_granizo']),
      fuente: findIndex(['fuente', 'fuente_dato', 'source']),
      observaciones: findIndex(['observaciones', 'obs', 'comentarios', 'notes']),
    };
  }

  private obtenerValorColumna(valores: string[], index: number): string | null {
    if (index === -1 || index >= valores.length) return null;
    const v = valores[index].trim();
    return v.length > 0 ? v : null;
  }

  private parsearNumero(val: string): number | null {
    if (!val) return null;
    const normalizado = val.replace(',', '.');
    const n = Number(normalizado);
    return isNaN(n) ? null : n;
  }

  private parsearBooleano(val: string): boolean {
    const v = val.toLowerCase().trim();
    return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 's' || v === 'yes';
  }

  private normalizarFecha(val: string): string {
    const v = val.trim();
    // Soporte para DD/MM/YYYY o DD-MM-YYYY
    const matchLatino = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(v);
    if (matchLatino) {
      const dia = matchLatino[1].padStart(2, '0');
      const mes = matchLatino[2].padStart(2, '0');
      const anio = matchLatino[3];
      return `${anio}-${mes}-${dia}`;
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return v;
    }

    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(v)) {
      return v.replace(/\//g, '-');
    }

    return v.slice(0, 10);
  }
}

/**
 * Caso de Uso: Consultar Mediciones Meteorológicas por Finca y Rango de Fechas.
 */
export class ConsultarMedicionesClimaticasUseCase extends ClimaBaseUseCase {
  constructor(private readonly climaRepo: MedicionesClimaticasRepositoryPort) {
    super();
  }

  public async execute(
    input: ListarMedicionesClimaticasInputDto
  ): Promise<MedicionClimaticaOutputDto[]> {
    const mediciones = await this.climaRepo.listarPorFinca(input.fincaId, {
      fechaDesde: input.fechaDesde,
      fechaHasta: input.fechaHasta,
      soloVigentes: input.soloVigentes ?? true,
    });

    return mediciones.map(m => this.mapToOutput(m));
  }
}

/**
 * Caso de Uso: Obtener Medición Meteorológica por ID.
 */
export class ObtenerMedicionClimaticaPorIdUseCase extends ClimaBaseUseCase {
  constructor(private readonly climaRepo: MedicionesClimaticasRepositoryPort) {
    super();
  }

  public async execute(id: string): Promise<MedicionClimaticaOutputDto> {
    const medicion = await this.climaRepo.obtenerPorId(id);
    if (!medicion) {
      throw new MedicionClimaticaNoEncontradaError(id);
    }

    return this.mapToOutput(medicion);
  }
}

/**
 * Caso de Uso: Consultar Historial de Correcciones Auditadas (RF-M10-06 / RN-06).
 */
export class ObtenerHistorialCorreccionesClimaUseCase extends ClimaBaseUseCase {
  constructor(private readonly climaRepo: MedicionesClimaticasRepositoryPort) {
    super();
  }

  public async execute(
    medicionId: string
  ): Promise<MedicionClimaticaOutputDto[]> {
    const medicion = await this.climaRepo.obtenerPorId(medicionId);
    if (!medicion) {
      throw new MedicionClimaticaNoEncontradaError(medicionId);
    }

    const historial = await this.climaRepo.obtenerHistorialCorrecciones(medicionId);
    return historial.map(m => this.mapToOutput(m));
  }
}

/**
 * Caso de Uso: Contexto Climático en Labores Agrícolas y Pulverización (RF-M10-10).
 */
export class ObtenerContextoClimaticoLaborUseCase extends ClimaBaseUseCase {
  constructor(
    private readonly climaRepo: MedicionesClimaticasRepositoryPort,
    private readonly fincasRepo: FincasRepositoryPort,
    private readonly lotesRepo?: LotesRepositoryPort
  ) {
    super();
  }

  public async execute(params: {
    fincaId?: string;
    loteId?: string;
    fecha?: string;
  }): Promise<ContextoClimaticoLaborDto> {
    let targetFincaId = params.fincaId;

    if (params.loteId) {
      if (!this.lotesRepo) {
        throw new Error('LotesRepositoryPort no inyectado en ObtenerContextoClimaticoLaborUseCase.');
      }
      const lote = await this.lotesRepo.buscarPorId(params.loteId);
      if (!lote) {
        throw new EntidadNoEncontradaError('Lote', params.loteId);
      }
      targetFincaId = lote.fincaId ?? undefined;
    }


    if (!targetFincaId) {
      throw new MedicionClimaticaInvalidaError('Se requiere fincaId o loteId para obtener el contexto climático.');
    }

    const finca = await this.fincasRepo.buscarPorId(targetFincaId);
    if (!finca) {
      throw new EntidadNoEncontradaError('Finca', targetFincaId);
    }

    const fecha = params.fecha ?? new Date().toISOString().split('T')[0];
    const fechaAyer = this.restarDias(fecha, 1);
    const fechaAnteayer = this.restarDias(fecha, 2);

    const [medicionHoy, medicionAyer, medicionAnteayer] = await Promise.all([
      this.climaRepo.obtenerVigentePorFechaYFinca(targetFincaId, fecha),
      this.climaRepo.obtenerVigentePorFechaYFinca(targetFincaId, fechaAyer),
      this.climaRepo.obtenerVigentePorFechaYFinca(targetFincaId, fechaAnteayer),
    ]);

    const lluviaHoy = medicionHoy?.precipitacionMm ?? 0;
    const lluviaAyer = medicionAyer?.precipitacionMm ?? 0;
    const lluviaAnteayer = medicionAnteayer?.precipitacionMm ?? 0;

    const lluviaUltimas24hMm = Number((lluviaAyer + lluviaHoy).toFixed(2));
    const lluviaUltimas48hMm = Number((lluviaAnteayer + lluviaUltimas24hMm).toFixed(2));

    const tempMax = medicionHoy?.tempMaxC ?? null;
    const tempMedia = medicionHoy?.tempMediaC ?? tempMax ?? null;
    const viento = medicionHoy?.vientoKmH ?? null;
    const humedad = medicionHoy?.humedadRelativaPct ?? null;

    const advertencias: string[] = [];
    let severeIssues = 0;
    let moderateIssues = 0;

    // Viento (deriva e inversión térmica)
    if (viento !== null && viento !== undefined) {
      if (viento > 20) {
        advertencias.push(`Viento fuerte (${viento} km/h > 20 km/h): riesgo crítico de deriva de fitosanitarios.`);
        severeIssues++;
      } else if (viento > 15) {
        advertencias.push(`Viento moderado a elevado (${viento} km/h): operar con precaución y pastillas antideriva.`);
        moderateIssues++;
      } else if (viento < 2) {
        advertencias.push(`Viento calmo (< 2 km/h): riesgo de inversión térmica, suspensión de gotas.`);
        moderateIssues++;
      }
    }

    // Temperatura (evaporación y fitotoxicidad)
    if (tempMax !== null && tempMax !== undefined) {
      if (tempMax > 32) {
        advertencias.push(`Temperatura elevada (${tempMax}°C > 32°C): riesgo de fitotoxicidad y evaporación acelerada.`);
        severeIssues++;
      } else if (tempMax > 30) {
        advertencias.push(`Temperatura cálida (${tempMax}°C): aplicar temprano en la mañana o al atardecer.`);
        moderateIssues++;
      }
    }

    // Humedad relativa
    if (humedad !== null && humedad !== undefined) {
      if (humedad < 35) {
        advertencias.push(`Baja humedad relativa (${humedad}% < 35%): riesgo de evaporación rápida de gotas.`);
        severeIssues++;
      } else if (humedad < 45) {
        advertencias.push(`Humedad relativa límite (${humedad}%): verificar uso de coadyuvantes.`);
        moderateIssues++;
      } else if (humedad > 90) {
        advertencias.push(`Humedad relativa muy alta (${humedad}% > 90%): riesgo de condensación y escurrimiento del caldo.`);
        moderateIssues++;
      }
    }

    // Precipitaciones y suelo
    if (lluviaHoy > 5) {
      advertencias.push(`Lluvia registrada hoy (${lluviaHoy} mm): suelo sin piso y riesgo de lavado inmediato del producto.`);
      severeIssues++;
    } else if (lluviaUltimas24hMm > 15) {
      advertencias.push(`Lluvia abundante en últimas 24h (${lluviaUltimas24hMm} mm): riesgo de suelo anegado y lavado.`);
      severeIssues++;
    } else if (lluviaUltimas24hMm > 5) {
      advertencias.push(`Lluvia reciente en 24h (${lluviaUltimas24hMm} mm): verificar transitabilidad del lote antes de ingresar maquinarias.`);
      moderateIssues++;
    }

    // Helada y Granizo
    if (medicionHoy?.huboHelada || (medicionHoy?.tempMinC !== null && medicionHoy?.tempMinC !== undefined && medicionHoy.tempMinC <= 0)) {
      advertencias.push(`Se registró helada (${medicionHoy?.tempMinC ?? 0}°C): cultivo bajo estrés fisiológico.`);
      severeIssues++;
    }
    if (medicionHoy?.huboGranizo) {
      advertencias.push('Se registró granizo: evaluar posibles daños mecánicos en el follaje y frutos.');
      moderateIssues++;
    }

    const aptoPulverizacion = severeIssues === 0;
    const estadoPulverizacion: EstadoAptitudPulverizacion =
      severeIssues > 0 ? 'DESFAVORABLE' : moderateIssues > 0 ? 'PRECAUCION' : 'OPTIMO';

    let sugerenciaRiego = '';
    if (lluviaUltimas24hMm >= 15) {
      sugerenciaRiego = `Lluvia abundante en últimas 24h (${lluviaUltimas24hMm} mm): suspender el riego programado para evitar asfixia radicular.`;
    } else if (lluviaUltimas24hMm >= 5) {
      sugerenciaRiego = `Lluvia moderada en últimas 24h (${lluviaUltimas24hMm} mm): reducir lámina o tiempo de riego programado.`;
    } else {
      sugerenciaRiego = `Sin precipitaciones significativas en 24h (${lluviaUltimas24hMm} mm): continuar con el plan de riego previsto.`;
    }

    return {
      fincaId: targetFincaId,
      loteId: params.loteId ?? null,
      fecha,
      medicionDelDia: medicionHoy ? this.mapToOutput(medicionHoy) : null,
      lluviaUltimas24hMm,
      lluviaUltimas48hMm,
      temperaturaC: tempMedia,
      vientoKmH: viento,
      humedadRelativaPct: humedad,
      aptoPulverizacion,
      estadoPulverizacion,
      advertencias,
      sugerenciaRiego,
    };
  }
}

/**
 * Caso de Uso: Registro de Eventos Climáticos Adversos y Siniestros (RF-M10-11).
 */
export class RegistrarEventoClimaticoAdversoUseCase extends ClimaBaseUseCase {
  constructor(
    private readonly eventosRepo: EventosClimaticosAdversosRepositoryPort,
    private readonly fincasRepo: FincasRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort
  ) {
    super();
  }

  public async execute(input: RegistrarEventoAdversoInputDto): Promise<EventoClimaticoAdversoOutputDto> {
    const finca = await this.fincasRepo.buscarPorId(input.fincaId);
    if (!finca) {
      throw new EntidadNoEncontradaError('Finca', input.fincaId);
    }

    const lote = await this.lotesRepo.buscarPorId(input.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', input.loteId);
    }

    if (lote.fincaId !== input.fincaId) {
      throw new EventoClimaticoAdversoInvalidoError(
        `El lote '${lote.codigoLote.value}' no pertenece a la finca seleccionada (fincaId: ${input.fincaId}).`
      );
    }

    const id = crypto.randomUUID();
    const evento = EventoClimaticoAdverso.crear(
      {
        id,
        fincaId: input.fincaId,
        loteId: input.loteId,
        fecha: input.fecha,
        tipoSiniestro: input.tipoSiniestro,
        danoEstimadoPct: input.danoEstimadoPct,
        superficieAfectadaHa: input.superficieAfectadaHa,
        fotosUrls: input.fotosUrls,
        descripcion: input.descripcion,
        usuarioId: input.usuarioId,
      },
      input.fechaReferenciaHoy
    );

    await this.eventosRepo.guardar(evento);

    return this.mapEventoToOutput(evento);
  }
}

/**
 * Caso de Uso: Listar Eventos Climáticos Adversos con Filtros.
 */
export class ListarEventosClimaticosAdversosUseCase extends ClimaBaseUseCase {
  constructor(private readonly eventosRepo: EventosClimaticosAdversosRepositoryPort) {
    super();
  }

  public async execute(input?: ListarEventosAdversosInputDto): Promise<EventoClimaticoAdversoOutputDto[]> {
    const eventos = await this.eventosRepo.listar(input);
    return eventos.map(e => this.mapEventoToOutput(e));
  }
}

/**
 * Caso de Uso: Obtener Evento Climático Adverso por ID.
 */
export class ObtenerEventoClimaticoAdversoPorIdUseCase extends ClimaBaseUseCase {
  constructor(private readonly eventosRepo: EventosClimaticosAdversosRepositoryPort) {
    super();
  }

  public async execute(id: string): Promise<EventoClimaticoAdversoOutputDto> {
    const evento = await this.eventosRepo.obtenerPorId(id);
    if (!evento) {
      throw new EventoClimaticoNoEncontradoError(id);
    }
    return this.mapEventoToOutput(evento);
  }
}

/**
 * Caso de Uso: Calcular Resumen Climático del Ciclo/Campaña (RF-M10-12).
 */
export class CalcularResumenClimaticoCicloUseCase extends ClimaBaseUseCase {
  constructor(
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly climaRepo: MedicionesClimaticasRepositoryPort,
    private readonly eventosRepo: EventosClimaticosAdversosRepositoryPort,
    private readonly ciclosRepo?: CiclosRepositoryPort
  ) {
    super();
  }

  public async execute(params: {
    loteId: string;
    cicloId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<ResumenClimaticoCicloDto> {
    const lote = await this.lotesRepo.buscarPorId(params.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', params.loteId);
    }

    let desde = params.fechaDesde;
    let hasta = params.fechaHasta;
    let cicloId = params.cicloId ?? null;

    if (!desde || !hasta) {
      if (cicloId && this.ciclosRepo) {
        const ciclo = await this.ciclosRepo.buscarPorId(cicloId);
        if (ciclo) {
          desde = desde ?? ciclo.fechaInicio;
          hasta = hasta ?? ciclo.fechaFin ?? new Date().toISOString().split('T')[0];
        }
      } else if (this.ciclosRepo) {
        const cicloAbierto = await this.ciclosRepo.buscarCicloAbiertoPorLote(params.loteId);
        if (cicloAbierto) {
          cicloId = cicloAbierto.id;
          desde = desde ?? cicloAbierto.fechaInicio;
          hasta = hasta ?? new Date().toISOString().split('T')[0];
        }
      }
    }

    if (!hasta) {
      hasta = new Date().toISOString().split('T')[0];
    }
    if (!desde) {
      desde = this.restarDias(hasta, 90);
    }

    const fincaId = lote.fincaId ?? '';

    const [mediciones, siniestros] = await Promise.all([
      this.climaRepo.listarPorFinca(fincaId, {
        fechaDesde: desde,
        fechaHasta: hasta,
        soloVigentes: true,
      }),
      this.eventosRepo.listar({
        loteId: params.loteId,
        fechaDesde: desde,
        fechaHasta: hasta,
      }),
    ]);


    let lluviaAcumuladaMm = 0;
    let diasConLluvia = 0;
    let diasHelada = 0;
    let diasCalorExtremo = 0;
    let tempMinimaAbsoluta: number | null = null;
    let tempMaximaAbsoluta: number | null = null;
    let sumaTempMedia = 0;
    let cantidadTempMedia = 0;

    for (const m of mediciones) {
      lluviaAcumuladaMm += m.precipitacionMm;
      if (m.precipitacionMm > 0) diasConLluvia++;
      if (m.huboHelada || (m.tempMinC !== null && m.tempMinC !== undefined && m.tempMinC <= 0)) {
        diasHelada++;
      }
      if (m.tempMaxC !== null && m.tempMaxC !== undefined && m.tempMaxC >= 35) {
        diasCalorExtremo++;
      }

      if (m.tempMinC !== null && m.tempMinC !== undefined) {
        if (tempMinimaAbsoluta === null || m.tempMinC < tempMinimaAbsoluta) {
          tempMinimaAbsoluta = m.tempMinC;
        }
      }
      if (m.tempMaxC !== null && m.tempMaxC !== undefined) {
        if (tempMaximaAbsoluta === null || m.tempMaxC > tempMaximaAbsoluta) {
          tempMaximaAbsoluta = m.tempMaxC;
        }
      }
      if (m.tempMediaC !== null && m.tempMediaC !== undefined) {
        sumaTempMedia += m.tempMediaC;
        cantidadTempMedia++;
      }
    }

    const tempPromedioGeneral =
      cantidadTempMedia > 0 ? Number((sumaTempMedia / cantidadTempMedia).toFixed(2)) : null;

    const sumaDano = siniestros.reduce((acc, s) => acc + s.danoEstimadoPct, 0);
    const danoAcumuladoPromedioPct =
      siniestros.length > 0 ? Number((sumaDano / siniestros.length).toFixed(2)) : 0;

    return {
      loteId: params.loteId,
      fincaId,
      cicloId,

      periodo: { desde, hasta },
      lluviaAcumuladaMm: Number(lluviaAcumuladaMm.toFixed(2)),
      diasConLluvia,
      diasHelada,
      diasCalorExtremo,
      tempMinimaAbsoluta,
      tempMaximaAbsoluta,
      tempPromedioGeneral,
      totalSiniestros: siniestros.length,
      danoAcumuladoPromedioPct,
      siniestros: siniestros.map(s => this.mapEventoToOutput(s)),
    };
  }
}

/**
 * Caso de Uso: Serie Temporal Integrada de Clima + Hitos de Labores del Lote (RF-M10-07 / RF-M10-13).
 */
export class ObtenerSerieHistoricaClimaticaLoteUseCase extends ClimaBaseUseCase {
  constructor(
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly climaRepo: MedicionesClimaticasRepositoryPort,
    private readonly eventosRepo: EventosClimaticosAdversosRepositoryPort,
    private readonly actividadesRepo?: ActividadesRepositoryPort,
    private readonly aplicacionesRepo?: AplicacionesRepositoryPort,
    private readonly cosechasRepo?: CosechasRepositoryPort
  ) {
    super();
  }

  public async execute(params: {
    loteId: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<SerieHistoricaClimaticaLoteDto> {
    const lote = await this.lotesRepo.buscarPorId(params.loteId);
    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', params.loteId);
    }

    const hasta = params.fechaHasta ?? new Date().toISOString().split('T')[0];
    const desde = params.fechaDesde ?? this.restarDias(hasta, 30);

    if (desde > hasta) {
      throw new MedicionClimaticaInvalidaError(
        `La fecha inicial '${desde}' no puede ser posterior a la fecha final '${hasta}'.`
      );
    }

    const fincaId = lote.fincaId ?? '';

    const [mediciones, siniestros, actividades, aplicaciones, cosechas] = await Promise.all([
      this.climaRepo.listarPorFinca(fincaId, {
        fechaDesde: desde,
        fechaHasta: hasta,
        soloVigentes: true,
      }),

      this.eventosRepo.listar({
        loteId: params.loteId,
        fechaDesde: desde,
        fechaHasta: hasta,
      }),
      this.actividadesRepo
        ? this.actividadesRepo.listar({ loteId: params.loteId, desde, hasta })
        : Promise.resolve([]),
      this.aplicacionesRepo
        ? this.aplicacionesRepo.listar({ loteId: params.loteId, fechaDesde: desde, fechaHasta: hasta })
        : Promise.resolve([]),
      this.cosechasRepo
        ? this.cosechasRepo.listar({ loteId: params.loteId, fechaDesde: desde, fechaHasta: hasta })
        : Promise.resolve([]),
    ]);

    // Mapas por fecha
    const medMap = new Map<string, MedicionClimatica>();
    for (const m of mediciones) {
      medMap.set(m.fecha, m);
    }

    const sinMap = new Map<string, EventoClimaticoAdverso[]>();
    for (const s of siniestros) {
      const list = sinMap.get(s.fecha) ?? [];
      list.push(s);
      sinMap.set(s.fecha, list);
    }

    const actMap = new Map<string, any[]>();
    for (const a of actividades) {
      const f = a.fechaHecho?.split('T')[0];
      if (f) {
        const list = actMap.get(f) ?? [];
        list.push(a);
        actMap.set(f, list);
      }
    }

    const aplMap = new Map<string, any[]>();
    for (const ap of aplicaciones) {
      const f = ap.fecha?.split('T')[0];
      if (f) {
        const list = aplMap.get(f) ?? [];
        list.push(ap);
        aplMap.set(f, list);
      }
    }

    const cosMap = new Map<string, any[]>();
    for (const c of cosechas) {
      const f = c.fecha?.split('T')[0];
      if (f) {
        const list = cosMap.get(f) ?? [];
        list.push(c);
        cosMap.set(f, list);
      }
    }

    const serieDiaria: DiaSerieClimaticaDto[] = [];
    let lluviaAcumulada = 0;
    let diasConLluvia = 0;
    let diasHelada = 0;
    let tempMinimaAbsoluta: number | null = null;
    let tempMaximaAbsoluta: number | null = null;
    let sumaTempMedia = 0;
    let countTempMedia = 0;
    let totalHitos = 0;

    let fechaActual = desde;
    while (fechaActual <= hasta) {
      const m = medMap.get(fechaActual);
      const prec = m?.precipitacionMm ?? 0;
      lluviaAcumulada = Number((lluviaAcumulada + prec).toFixed(2));

      if (prec > 0) diasConLluvia++;
      if (m?.huboHelada || (m?.tempMinC !== null && m?.tempMinC !== undefined && m.tempMinC <= 0)) {
        diasHelada++;
      }

      if (m?.tempMinC !== null && m?.tempMinC !== undefined) {
        if (tempMinimaAbsoluta === null || m.tempMinC < tempMinimaAbsoluta) {
          tempMinimaAbsoluta = m.tempMinC;
        }
      }
      if (m?.tempMaxC !== null && m?.tempMaxC !== undefined) {
        if (tempMaximaAbsoluta === null || m.tempMaxC > tempMaximaAbsoluta) {
          tempMaximaAbsoluta = m.tempMaxC;
        }
      }
      if (m?.tempMediaC !== null && m?.tempMediaC !== undefined) {
        sumaTempMedia += m.tempMediaC;
        countTempMedia++;
      }

      // Hitos del día
      const hitos: HitoLaborClimaDto[] = [];

      // Siniestros
      const sins = sinMap.get(fechaActual) ?? [];
      for (const s of sins) {
        hitos.push({
          tipo: 'SINIESTRO',
          id: s.id,
          titulo: `Siniestro: ${s.tipoSiniestro}`,
          descripcion: s.descripcion,
          detalles: {
            danoEstimadoPct: s.danoEstimadoPct,
            superficieAfectadaHa: s.superficieAfectadaHa,
            fotos: s.fotosUrls,
          },
        });
      }

      // Actividades
      const acts = actMap.get(fechaActual) ?? [];
      for (const a of acts) {
        hitos.push({
          tipo: 'ACTIVIDAD',
          id: a.id,
          titulo: `Actividad: ${a.codigoActividad ?? 'Agrícola'}`,
          descripcion: a.observaciones ?? 'Labor agronómica registrada',
          detalles: {
            estado: a.estado,
            superficieTrabajadaHa: a.superficieTrabajadaHa,
          },
        });
      }

      // Aplicaciones
      const apls = aplMap.get(fechaActual) ?? [];
      for (const ap of apls) {
        hitos.push({
          tipo: 'APLICACION',
          id: ap.id,
          titulo: `Aplicación: ${ap.metodo ?? 'Fitosanitaria'}`,
          descripcion: ap.motivo ?? 'Aplicación de productos químicos o fertilizantes',
          detalles: {
            equipoAplicacion: ap.equipoAplicacion,
            lineasCount: ap.lineas?.length ?? 0,
          },
        });
      }

      // Cosechas
      const coss = cosMap.get(fechaActual) ?? [];
      for (const c of coss) {
        hitos.push({
          tipo: 'COSECHA',
          id: c.id,
          titulo: `Cosecha: ${c.codigoCosecha ?? 'Recolección'}`,
          descripcion: `Cosecha de ${c.cantidadTotalKg ?? 0} kg`,
          detalles: {
            calidad: c.calidad,
            cantidadKg: c.cantidadTotalKg,
          },
        });
      }

      totalHitos += hitos.length;

      serieDiaria.push({
        fecha: fechaActual,
        tempMinC: m?.tempMinC ?? null,
        tempMaxC: m?.tempMaxC ?? null,
        tempMediaC: m?.tempMediaC ?? null,
        precipitacionMm: prec,
        lluviaAcumuladaMm: lluviaAcumulada,
        humedadRelativaPct: m?.humedadRelativaPct ?? null,
        vientoKmH: m?.vientoKmH ?? null,
        huboHelada: m?.huboHelada ?? false,
        huboGranizo: m?.huboGranizo ?? false,
        hitos,
      });

      fechaActual = this.sumarDias(fechaActual, 1);
    }

    const tempPromedioGeneral =
      countTempMedia > 0 ? Number((sumaTempMedia / countTempMedia).toFixed(2)) : null;

    return {
      loteId: params.loteId,
      fincaId,
      periodo: { desde, hasta },

      resumen: {
        lluviaAcumuladaMm: lluviaAcumulada,
        diasConLluvia,
        diasHelada,
        tempMinimaAbsoluta,
        tempMaximaAbsoluta,
        tempPromedioGeneral,
        totalHitos,
      },
      serieDiaria,
    };
  }
}

