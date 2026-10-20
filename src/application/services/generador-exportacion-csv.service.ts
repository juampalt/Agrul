import { RecorridoTrazabilidadOutputDto } from '../dtos/recorrido-trazabilidad.dto.js';

export interface ParametrosExportacionCsv {
  codigoInforme: string;
  usuarioEmisor: string;
  fechaEmision: string;
}

/**
 * Generador de Exportación CSV/Excel para Informes de Trazabilidad (RF-M6-10 / RNF-11).
 * Aplica:
 * - Codificación UTF-8 con BOM (\uFEFF) para apertura sin errores de acentos en Microsoft Excel.
 * - Encabezados normalizados con unidades de medida explícitas (kg, ha, °C, mm, km/h, días).
 * - Marcado explícito de rectificaciones y eventos compensatorios (RN-06 / RF-M6-09).
 */
export class GeneradorExportacionCsvService {
  public static generar(
    recorrido: RecorridoTrazabilidadOutputDto,
    params: ParametrosExportacionCsv
  ): Buffer {
    const BOM = '\uFEFF';
    const lineas: string[] = [];

    // Encabezado de metadatos del informe
    lineas.push(`# INFORME OFICIAL DE TRAZABILIDAD Y CADENA DE CUSTODIA — AGRUL`);
    lineas.push(`# Código de Informe: ${params.codigoInforme} | Emisión: ${params.fechaEmision} | Usuario Emisor: ${this.escapar(params.usuarioEmisor)}`);
    const fincaUbicacion = [
      recorrido.lote.fincaNombre ?? 'Finca sin asignar',
      recorrido.lote.fincaLocalidad,
      recorrido.lote.fincaProvincia,
    ].filter(Boolean).join(', ');
    lineas.push(
      `# Lote: ${this.escapar(recorrido.lote.codigoLote)} | Producto: ${this.escapar(recorrido.lote.producto)}${recorrido.lote.variedad ? ' (' + this.escapar(recorrido.lote.variedad) + ')' : ''} | Finca: ${this.escapar(fincaUbicacion)}`
    );
    lineas.push(
      `# Cosecha: ${this.escapar(recorrido.cosecha.codigoTrazabilidad)} | Estado: ${this.escapar(recorrido.cosecha.estado)}${recorrido.cosecha.estado === 'ANULADA' ? ' [ANULADA: ' + this.escapar(recorrido.cosecha.motivoAnulacion ?? 'Sin motivo') + ']' : ''}`
    );
    lineas.push(
      `# Balance de Masa (kg): Cosechado=${recorrido.balanceMasa.totalCosechadoKg} kg | Comercializable=${recorrido.balanceMasa.comercializableKg} kg | Descarte=${recorrido.balanceMasa.descarteKg} kg | Despachado=${recorrido.balanceMasa.despachadoKg} kg | Remanente=${recorrido.balanceMasa.saldoRemanenteKg} kg`
    );
    if (recorrido.resumenMeteorologico) {
      lineas.push(
        `# Clima Ciclo: Temp Promedio=${recorrido.resumenMeteorologico.temperaturaPromedioC ?? 'N/D'} °C | Lluvia Acumulada=${recorrido.resumenMeteorologico.lluviaAcumuladaMm ?? '0'} mm | Viento Promedio=${recorrido.resumenMeteorologico.vientoPromedioKmH ?? 'N/D'} km/h`
      );
    }
    lineas.push(''); // Línea en blanco

    // Encabezados de columnas con unidades de medida (RNF-11)
    const headers = [
      'Nro Hito',
      'Fecha (YYYY-MM-DD)',
      'Tipo de Hito',
      'Título / Identificador',
      'Descripción / Detalle',
      'Responsable / Operario',
      'Superficie (ha)',
      'Cosechado Total (kg)',
      'Comercializable (kg)',
      'Descarte (kg)',
      'Despachado (kg)',
      'Temperatura (°C)',
      'Lluvia Acumulada (mm)',
      'Viento (km/h)',
      'Estado / Rectificación (RN-06)',
      'Insumos / Dosis / Carencia (días)',
      'BPA / Remito / Destino',
      'Auditoría Calidad (Lagunas)',
    ];
    lineas.push(headers.map(h => this.escapar(h)).join(','));

    // Filas del timeline cronológico
    recorrido.timeline.forEach((hito, index) => {
      const nro = index + 1;
      const fecha = hito.fecha;
      const tipo = hito.tipo;
      const titulo = hito.titulo;
      const descripcion = hito.descripcion;
      const responsable = hito.responsable ?? 'No consignado';

      // Magnitudes numéricas
      let superficieHa: number | string = '';
      let cosechadoKg: number | string = '';
      let comercializableKg: number | string = '';
      let descarteKg: number | string = '';
      let despachadoKg: number | string = '';
      let tempC: number | string = '';
      let lluviaMm: number | string = '';
      let vientoKm: number | string = '';
      let estadoRectificacion = 'CONFORME';
      let insumosDetalle = '';
      let bpaDetalle = '';

      if (hito.detalles) {
        if (hito.detalles.superficieCultivadaHa !== undefined) {
          superficieHa = hito.detalles.superficieCultivadaHa;
        } else if (hito.detalles.superficieTrabajadaHa !== undefined) {
          superficieHa = hito.detalles.superficieTrabajadaHa;
        } else if (hito.detalles.superficieCosechadaHa !== undefined) {
          superficieHa = hito.detalles.superficieCosechadaHa;
        }

        if (hito.detalles.cantidadCosechadaKg !== undefined) {
          cosechadoKg = hito.detalles.cantidadCosechadaKg;
        }
        if (hito.detalles.cantidadComercializableKg !== undefined) {
          comercializableKg = hito.detalles.cantidadComercializableKg;
        }
        if (hito.detalles.cantidadDescarteKg !== undefined) {
          descarteKg = hito.detalles.cantidadDescarteKg;
        }
        if (hito.detalles.cantidadEnviadaKg !== undefined) {
          despachadoKg = hito.detalles.cantidadEnviadaKg;
        }

        if (hito.detalles.condicionesClima) {
          tempC = hito.detalles.condicionesClima.tempC ?? '';
          lluviaMm = hito.detalles.condicionesClima.lluviaMm ?? '';
          vientoKm = hito.detalles.condicionesClima.vientoKmH ?? '';
        }

        // Marcar claramente rectificaciones o eventos compensatorios históricos (RF-M6-09 / RN-06)
        if (hito.detalles.estado === 'ANULADA') {
          estadoRectificacion = `ANULADA${recorrido.cosecha.motivoAnulacion ? ' (' + recorrido.cosecha.motivoAnulacion + ')' : ''}`;
        } else if (recorrido.cosecha.historialModificaciones && recorrido.cosecha.historialModificaciones.length > 0 && hito.tipo === 'COSECHA') {
          estadoRectificacion = `RECTIFICADA (${recorrido.cosecha.historialModificaciones.length} modificación/es)`;
        }

        // Detalle de insumos en aplicaciones
        if (Array.isArray(hito.detalles.lineas) && hito.detalles.lineas.length > 0) {
          insumosDetalle = hito.detalles.lineas
            .map(
              (l: any) =>
                `${l.nombreComercial}: ${l.cantidadTotal} ${l.unidadMedidaId} (Carencia: ${l.periodoCarenciaDias ?? 0} días, SENASA: ${l.nroRegistroSenasa ?? 'N/A'})`
            )
            .join(' | ');
        }

        // Detalle de BPA en despachos
        if (hito.tipo === 'DESPACHO') {
          const partesBpa = [
            `Remito: ${hito.detalles.nroGuiaRemito ?? 'N/D'}`,
            `RENSPA: ${hito.detalles.renspaFinca ?? 'N/D'}`,
            hito.detalles.chofer ? `Chofer: ${hito.detalles.chofer}` : null,
            hito.detalles.patenteCamion ? `Patente: ${hito.detalles.patenteCamion}` : null,
            `Destino: ${hito.detalles.destinatarioNombre ?? 'N/D'} (${hito.detalles.tipoDestino ?? ''})`,
          ].filter(Boolean);
          bpaDetalle = partesBpa.join(' | ');
        }
      }

      // Lagunas de auditoría en el hito
      const lagunasTexto = hito.tieneLagunas
        ? hito.lagunasHito.map(l => `[${l.severidad}] ${l.campo}: ${l.mensaje}`).join(' | ')
        : 'SIN LAGUNAS';

      const fila = [
        nro,
        this.escapar(fecha),
        this.escapar(tipo),
        this.escapar(titulo),
        this.escapar(descripcion),
        this.escapar(responsable),
        superficieHa,
        cosechadoKg,
        comercializableKg,
        descarteKg,
        despachadoKg,
        tempC,
        lluviaMm,
        vientoKm,
        this.escapar(estadoRectificacion),
        this.escapar(insumosDetalle),
        this.escapar(bpaDetalle),
        this.escapar(lagunasTexto),
      ];

      lineas.push(fila.join(','));
    });

    const contenidoUtf8 = BOM + lineas.join('\r\n');
    return Buffer.from(contenidoUtf8, 'utf-8');
  }

  private static escapar(valor: string | null | undefined): string {
    if (valor === null || valor === undefined) return '""';
    const str = String(valor).replace(/"/g, '""');
    return `"${str}"`;
  }
}
