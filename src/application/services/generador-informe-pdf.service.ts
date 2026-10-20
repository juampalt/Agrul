import { RecorridoTrazabilidadOutputDto } from '../dtos/recorrido-trazabilidad.dto.js';

export interface ParametrosInformePdf {
  codigoInforme: string;
  usuarioEmisor: string;
  fechaEmision: string;
  rolEmisor?: string | null;
}

/**
 * Helper para construir documentos PDF 1.4 binarios estructurados en memoria
 * sin dependencias nativas externas, garantizando generación en < 100ms (RNF-03).
 */
class PdfDocumentBuilder {
  private pages: string[] = [];
  private currentPageContent: string[] = [];
  private readonly pageWidth = 595.28; // A4 pt
  private readonly pageHeight = 841.89; // A4 pt
  private readonly marginLeft = 36;
  private readonly marginRight = 36;
  private readonly marginTop = 36;
  private readonly marginBottom = 36;
  private currentY = 36;

  constructor() {}

  public get printableWidth(): number {
    return this.pageWidth - this.marginLeft - this.marginRight;
  }

  public get y(): number {
    return this.currentY;
  }

  public set y(val: number) {
    this.currentY = val;
  }

  public newPage(): void {
    if (this.currentPageContent.length > 0) {
      this.pages.push(this.currentPageContent.join('\n'));
      this.currentPageContent = [];
    }
    this.currentY = this.marginTop;
  }

  public checkPageBreak(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.pageHeight - this.marginBottom) {
      this.newPage();
    }
  }

  // Coordenada top-down a PDF (bottom-left)
  private toPdfY(yTop: number): number {
    return Number((this.pageHeight - yTop).toFixed(2));
  }

  public drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fillRgb?: [number, number, number],
    strokeRgb?: [number, number, number],
    lineWidth: number = 1
  ): void {
    const pdfY = this.toPdfY(y + h);
    const commands: string[] = ['q'];
    commands.push(`${lineWidth} w`);

    if (strokeRgb) {
      commands.push(`${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG`);
    }
    if (fillRgb) {
      commands.push(`${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg`);
    }

    commands.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);

    if (fillRgb && strokeRgb) {
      commands.push('B');
    } else if (fillRgb) {
      commands.push('f');
    } else if (strokeRgb) {
      commands.push('S');
    }

    commands.push('Q');
    this.currentPageContent.push(commands.join(' '));
  }

  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeRgb: [number, number, number] = [0.8, 0.8, 0.8],
    lineWidth: number = 0.5
  ): void {
    const py1 = this.toPdfY(y1);
    const py2 = this.toPdfY(y2);
    const cmd = `q ${lineWidth} w ${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG ${x1.toFixed(2)} ${py1.toFixed(2)} m ${x2.toFixed(2)} ${py2.toFixed(2)} l S Q`;
    this.currentPageContent.push(cmd);
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    fontSize: number = 10,
    isBold: boolean = false,
    colorRgb: [number, number, number] = [0.1, 0.1, 0.1]
  ): void {
    const font = isBold ? '/F2' : '/F1';
    const pdfY = this.toPdfY(y);
    const escaped = this.escapeWinAnsi(text);

    const cmd = `BT ${font} ${fontSize} Tf ${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} rg 1 0 0 1 ${x.toFixed(2)} ${pdfY.toFixed(2)} Tm (${escaped}) Tj ET`;
    this.currentPageContent.push(cmd);
  }

  /**
   * Convierte caracteres unicode (incluyendo tildes, ñ, °, etc.)
   * al juego WinAnsiEncoding estándar soportado por Adobe y visores PDF.
   */
  private escapeWinAnsi(str: string): string {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      const ch = str.charAt(i);

      if (ch === '\\') {
        out += '\\\\';
      } else if (ch === '(') {
        out += '\\(';
      } else if (ch === ')') {
        out += '\\)';
      } else if (code >= 32 && code <= 126) {
        out += ch;
      } else {
        // Caracteres especiales en español
        switch (ch) {
          case 'á': out += '\\341'; break;
          case 'é': out += '\\351'; break;
          case 'í': out += '\\355'; break;
          case 'ó': out += '\\363'; break;
          case 'ú': out += '\\372'; break;
          case 'Á': out += '\\301'; break;
          case 'É': out += '\\311'; break;
          case 'Í': out += '\\315'; break;
          case 'Ó': out += '\\323'; break;
          case 'Ú': out += '\\332'; break;
          case 'ñ': out += '\\361'; break;
          case 'Ñ': out += '\\321'; break;
          case 'ü': out += '\\374'; break;
          case 'Ü': out += '\\334'; break;
          case '°': out += '\\260'; break;
          case '—': out += '-'; break;
          case '•': out += '*'; break;
          default:
            if (code <= 255) {
              out += '\\' + code.toString(8).padStart(3, '0');
            } else {
              out += '?';
            }
        }
      }
    }
    return out;
  }

  public build(): Buffer {
    if (this.currentPageContent.length > 0) {
      this.pages.push(this.currentPageContent.join('\n'));
    }
    if (this.pages.length === 0) {
      this.pages.push('');
    }

    const totalPages = this.pages.length;
    const objects: string[] = [];

    // Objeto 1: Catalog
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

    // Objeto 3: Font Helvetica
    objects.push(
      '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj'
    );

    // Objeto 4: Font Helvetica-Bold
    objects.push(
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj'
    );

    // Generar Kids para Pages
    const pageObjStart = 5;
    const pageRefs: string[] = [];
    const pageObjects: string[] = [];
    const contentObjects: string[] = [];

    for (let i = 0; i < totalPages; i++) {
      const pageObjNum = pageObjStart + i * 2;
      const contentObjNum = pageObjNum + 1;
      pageRefs.push(`${pageObjNum} 0 R`);

      // Agregar pie de página a cada página
      const footerText = `Página ${i + 1} de ${totalPages}`;
      const footerY = this.toPdfY(this.pageHeight - 20);
      const footerCmd = `BT /F1 8 Tf 0.4 0.4 0.4 rg 1 0 0 1 500 ${footerY} Tm (${this.escapeWinAnsi(footerText)}) Tj ET`;

      const fullContent = this.pages[i] + '\n' + footerCmd;
      const contentBuffer = Buffer.from(fullContent, 'latin1');

      pageObjects.push(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`
      );

      contentObjects.push(
        `${contentObjNum} 0 obj\n<< /Length ${contentBuffer.length} >>\nstream\n${fullContent}\nendstream\nendobj`
      );
    }

    // Objeto 2: Pages
    objects.splice(
      1,
      0,
      `2 0 obj\n<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${totalPages} >>\nendobj`
    );

    // Unir todos los objetos
    const allObjects = [...objects, ...pageObjects, ...contentObjects];

    // Construir PDF con tabla XREF precisa
    let pdfHeader = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    let currentOffset = Buffer.byteLength(pdfHeader, 'latin1');
    const offsets: number[] = [0];

    const bodyParts: string[] = [];
    for (const obj of allObjects) {
      offsets.push(currentOffset);
      const objStr = obj + '\n';
      bodyParts.push(objStr);
      currentOffset += Buffer.byteLength(objStr, 'latin1');
    }

    const startXref = currentOffset;
    let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i++) {
      xref += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
    }

    const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    const fullPdf = pdfHeader + bodyParts.join('') + xref + trailer;
    return Buffer.from(fullPdf, 'latin1');
  }
}

/**
 * Generador de Informes de Trazabilidad Oficiales en formato PDF (RF-M6-08 / RF-M6-09 / RN-06).
 */
export class GeneradorInformePdfService {
  public static generar(
    recorrido: RecorridoTrazabilidadOutputDto,
    params: ParametrosInformePdf
  ): Buffer {
    const doc = new PdfDocumentBuilder();
    doc.newPage();

    const startX = 36;
    const width = doc.printableWidth;

    // 1. ENCABEZADO OFICIAL (RF-M6-08)
    doc.drawRect(startX, doc.y, width, 52, [0.11, 0.28, 0.18], [0.08, 0.22, 0.14]);
    doc.drawText('AGRUL — SISTEMA INTEGRAL DE TRAZABILIDAD AGROINDUSTRIAL', startX + 12, doc.y + 16, 12, true, [1, 1, 1]);
    doc.drawText('CERTIFICADO OFICIAL DE TRAZABILIDAD Y CADENA DE CUSTODIA (BPA / SENASA / GlobalG.A.P.)', startX + 12, doc.y + 32, 8, false, [0.85, 0.95, 0.88]);
    doc.drawText(`INFORME AUDITADO: ${params.codigoInforme}`, startX + 12, doc.y + 44, 8, true, [0.95, 0.85, 0.4]);
    doc.y += 58;

    // 2. METADATOS DE EMISIÓN (RF-M6-08)
    doc.drawRect(startX, doc.y, width, 40, [0.97, 0.98, 0.99], [0.88, 0.91, 0.94]);
    doc.drawText(`Identificador Consultado: ${recorrido.identificadorConsultado}`, startX + 10, doc.y + 13, 9, true, [0.1, 0.15, 0.2]);
    doc.drawText(`Fecha y Hora de Emisión: ${params.fechaEmision}`, startX + 10, doc.y + 26, 8, false, [0.3, 0.35, 0.4]);
    doc.drawText(`Usuario Emisor: ${params.usuarioEmisor}${params.rolEmisor ? ' (' + params.rolEmisor + ')' : ''}`, startX + 270, doc.y + 13, 8.5, false, [0.1, 0.15, 0.2]);
    doc.drawText('Validez: Documento inmutable emitido según RN-06', startX + 270, doc.y + 26, 8, false, [0.3, 0.35, 0.4]);
    doc.y += 46;

    // 3. SELLO / ALERTA DE RECTIFICACIÓN O ANULACIÓN (RF-M6-09 / RN-06)
    if (recorrido.cosecha.estado === 'ANULADA') {
      doc.drawRect(startX, doc.y, width, 36, [0.99, 0.88, 0.88], [0.86, 0.15, 0.15], 1.5);
      doc.drawText('⚠️  DOCUMENTO DE TRAZABILIDAD RECTIFICADO — COSECHA ANULADA (RN-06)', startX + 10, doc.y + 14, 9.5, true, [0.65, 0.1, 0.1]);
      doc.drawText(
        `Motivo de anulación: ${recorrido.cosecha.motivoAnulacion ?? 'No especificado'} | Fecha anulación: ${recorrido.cosecha.anuladoEn ?? 'N/D'}`,
        startX + 10,
        doc.y + 26,
        8,
        false,
        [0.5, 0.1, 0.1]
      );
      doc.y += 42;
    } else if (recorrido.cosecha.historialModificaciones && recorrido.cosecha.historialModificaciones.length > 0) {
      doc.drawRect(startX, doc.y, width, 32, [0.99, 0.95, 0.78], [0.85, 0.47, 0.02], 1.2);
      doc.drawText(
        `ℹ️  REGISTRO CON RECTIFICACIONES HISTÓRICAS AUDITADAS: ${recorrido.cosecha.historialModificaciones.length} MODIFICACIÓN(ES) (RN-06)`,
        startX + 10,
        doc.y + 13,
        9,
        true,
        [0.55, 0.25, 0.05]
      );
      doc.drawText('Los valores originales y deltas de rectificación se encuentran preservados en el log histórico.', startX + 10, doc.y + 24, 7.5, false, [0.45, 0.25, 0.05]);
      doc.y += 38;
    } else {
      doc.drawRect(startX, doc.y, width, 22, [0.91, 0.96, 0.92], [0.15, 0.55, 0.25]);
      doc.drawText('✓  ESTADO OFICIAL: COSECHA VIGENTE Y CONFORME (CADENA DE CUSTODIA ÍNTEGRA)', startX + 10, doc.y + 14, 8.5, true, [0.08, 0.35, 0.15]);
      doc.y += 28;
    }

    // 4. FICHA TÉCNICA PRINCIPAL (LOTE, FINCA, CICLO, COSECHA)
    doc.drawText('1. DATOS DEL ORIGEN Y COSECHA', startX, doc.y + 10, 10, true, [0.1, 0.25, 0.15]);
    doc.drawLine(startX, doc.y + 14, startX + width, doc.y + 14, [0.75, 0.85, 0.8]);
    doc.y += 20;

    const colW = (width - 15) / 2;
    doc.drawRect(startX, doc.y, colW, 60, [0.98, 0.99, 1.0], [0.85, 0.9, 0.95]);
    doc.drawText('Lote & Establecimiento:', startX + 8, doc.y + 13, 8.5, true, [0.15, 0.2, 0.3]);
    doc.drawText(`Lote: ${recorrido.lote.codigoLote} (${recorrido.lote.producto}${recorrido.lote.variedad ? ' var. ' + recorrido.lote.variedad : ''})`, startX + 8, doc.y + 26, 8, false);
    doc.drawText(`Finca: ${recorrido.lote.fincaNombre ?? 'Finca sin asignar'}`, startX + 8, doc.y + 38, 8, false);
    doc.drawText(`Superficie Lote: ${recorrido.lote.superficieHa ?? 'N/D'} ha`, startX + 8, doc.y + 50, 8, false);

    doc.drawRect(startX + colW + 15, doc.y, colW, 60, [0.98, 0.99, 1.0], [0.85, 0.9, 0.95]);
    doc.drawText('Cosecha & Campaña:', startX + colW + 23, doc.y + 13, 8.5, true, [0.15, 0.2, 0.3]);
    doc.drawText(`Cód. Trazabilidad: ${recorrido.cosecha.codigoTrazabilidad}`, startX + colW + 23, doc.y + 26, 8, true);
    doc.drawText(`Fecha de Cosecha: ${recorrido.cosecha.fecha}`, startX + colW + 23, doc.y + 38, 8, false);
    doc.drawText(`Ciclo Productivo: ${recorrido.ciclo.codigoCiclo} (${recorrido.ciclo.cultivo})`, startX + colW + 23, doc.y + 50, 8, false);
    doc.y += 68;

    // 5. BALANCE DE MASA (kg)
    doc.drawText('2. BALANCE DE MASA DE COSECHA (RF-M5-09)', startX, doc.y + 10, 10, true, [0.1, 0.25, 0.15]);
    doc.drawLine(startX, doc.y + 14, startX + width, doc.y + 14, [0.75, 0.85, 0.8]);
    doc.y += 20;

    const b = recorrido.balanceMasa;
    const cardW = (width - 24) / 4;

    const cards = [
      { label: 'Total Cosechado', val: `${b.totalCosechadoKg} kg`, bg: [0.95, 0.97, 1.0], st: [0.7, 0.8, 0.9] },
      { label: 'Comercializable', val: `${b.comercializableKg} kg`, bg: [0.92, 0.97, 0.92], st: [0.5, 0.8, 0.5] },
      { label: 'Despachado', val: `${b.despachadoKg} kg`, bg: [0.98, 0.95, 0.92], st: [0.9, 0.7, 0.5] },
      { label: 'Saldo Remanente', val: `${b.saldoRemanenteKg} kg`, bg: [0.95, 0.95, 0.98], st: [0.7, 0.7, 0.9] },
    ];

    cards.forEach((c, idx) => {
      const cx = startX + idx * (cardW + 8);
      doc.drawRect(cx, doc.y, cardW, 36, c.bg as any, c.st as any);
      doc.drawText(c.label, cx + 6, doc.y + 12, 7.5, false, [0.3, 0.35, 0.4]);
      doc.drawText(c.val, cx + 6, doc.y + 27, 9.5, true, [0.1, 0.15, 0.2]);
    });
    doc.y += 44;

    // 6. RESUMEN METEOROLÓGICO Y AUDITORÍA DE CALIDAD
    doc.checkPageBreak(70);
    doc.drawText('3. PARÁMETROS METEOROLÓGICOS Y AUDITORÍA DE CALIDAD (RF-M6-06 / RF-M6-07)', startX, doc.y + 10, 10, true, [0.1, 0.25, 0.15]);
    doc.drawLine(startX, doc.y + 14, startX + width, doc.y + 14, [0.75, 0.85, 0.8]);
    doc.y += 20;

    const clima = recorrido.resumenMeteorologico;
    const climaTxt = clima
      ? `Temp. Promedio: ${clima.temperaturaPromedioC ?? 'N/D'} °C | Lluvia Acumulada: ${clima.lluviaAcumuladaMm ?? 0} mm | Viento Promedio: ${clima.vientoPromedioKmH ?? 'N/D'} km/h`
      : 'Sin registros climáticos en ciclo.';

    doc.drawRect(startX, doc.y, width, 42, [0.97, 0.98, 0.99], [0.88, 0.91, 0.94]);
    doc.drawText(`Meteorología: ${climaTxt}`, startX + 8, doc.y + 14, 8, false);

    const audit = recorrido.auditoriaCalidad;
    if (audit.tieneLagunas) {
      doc.drawText(
        `Auditoría de Calidad: ATENCIÓN — Se detectaron ${audit.totalLagunas} lagunas de datos en el recorrido.`,
        startX + 8,
        doc.y + 28,
        8,
        true,
        [0.75, 0.35, 0.05]
      );
    } else {
      doc.drawText('Auditoría de Calidad: 100% CONFORME (Sin lagunas de información en el recorrido).', startX + 8, doc.y + 28, 8, true, [0.1, 0.5, 0.2]);
    }
    doc.y += 50;

    // 7. CRONOGRAMA DE HITOS Y TRAZABILIDAD ASCENDENTE (RF-M6-08)
    doc.checkPageBreak(120);
    doc.drawText('4. HISTORIAL CRONOLÓGICO Y CADENA DE CUSTODIA (TIMELINE)', startX, doc.y + 10, 10, true, [0.1, 0.25, 0.15]);
    doc.drawLine(startX, doc.y + 14, startX + width, doc.y + 14, [0.75, 0.85, 0.8]);
    doc.y += 22;

    // Tabla de hitos
    recorrido.timeline.forEach((hito, index) => {
      doc.checkPageBreak(38);

      const isEven = index % 2 === 0;
      const bg: [number, number, number] = isEven ? [0.98, 0.99, 1.0] : [1.0, 1.0, 1.0];
      doc.drawRect(startX, doc.y, width, 32, bg, [0.88, 0.9, 0.93]);

      doc.drawText(`${hito.fecha}`, startX + 6, doc.y + 12, 8, true, [0.15, 0.25, 0.35]);
      doc.drawText(`[${hito.tipo}]`, startX + 65, doc.y + 12, 7.5, true, [0.2, 0.45, 0.25]);

      // Título truncado para caber
      const tit = hito.titulo.length > 55 ? hito.titulo.substring(0, 52) + '...' : hito.titulo;
      doc.drawText(tit, startX + 155, doc.y + 12, 8, true, [0.1, 0.12, 0.15]);

      // Responsable
      const resp = hito.responsable ? `Resp: ${hito.responsable}` : 'Resp: N/D';
      doc.drawText(resp.substring(0, 25), startX + 390, doc.y + 12, 7.5, false, [0.4, 0.45, 0.5]);

      // Descripción / Detalles
      const desc = hito.descripcion.length > 95 ? hito.descripcion.substring(0, 92) + '...' : hito.descripcion;
      doc.drawText(desc, startX + 6, doc.y + 24, 7.5, false, [0.35, 0.38, 0.42]);

      doc.y += 34;
    });

    return doc.build();
  }
}
