import {
  MedicionClimatica,
  FuenteDatoClima,
} from '../../core/domain/entities/medicion-climatica.entity.js';
import {
  MedicionesClimaticasRepositoryPort,
} from '../../core/ports/mediciones-climaticas-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import {
  MedicionClimaticaInvalidaError,
  MedicionClimaticaNoEncontradaError,
  ImportacionCsvClimaInvalidaError,
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
} from '../dtos/clima.dto.js';

export class ClimaBaseUseCase {
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
