import QRCode from 'qrcode';

export interface QROptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  width?: number;
}

export class QRService {
  /**
   * Genera una imagen QR codificada en Base64 Data URL (image/png).
   */
  static async generarDataUrl(texto: string, options?: QROptions): Promise<string> {
    return QRCode.toDataURL(texto, {
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
      margin: options?.margin ?? 2,
      width: options?.width ?? 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  /**
   * Genera el código QR en formato vectorial SVG nativo.
   */
  static async generarSvg(texto: string, options?: QROptions): Promise<string> {
    return QRCode.toString(texto, {
      type: 'svg',
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
      margin: options?.margin ?? 2,
      width: options?.width ?? 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }
}
