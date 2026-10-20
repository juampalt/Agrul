import { DomainError } from '../errors/domain.error.js';

export class InformeTrazabilidadInvalidoError extends DomainError {
  public readonly code = 'INFORME_TRAZABILIDAD_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export type TipoFormatoInforme = 'PDF' | 'CSV' | 'EXCEL';

export interface FiltrosInformeTrazabilidad {
  incluirDatosSensibles: boolean;
  incluirCostos: boolean;
  [key: string]: unknown;
}

export interface InformeTrazabilidadLogProps {
  id: string;
  codigoInforme: string;
  cosechaId: string;
  loteId: string;
  codigoTrazabilidad: string;
  tipoFormato: TipoFormatoInforme;
  usuarioEmisor: string;
  rolEmisor?: string | null;
  filtrosAplicados: FiltrosInformeTrazabilidad;
  emitidoEn?: string;
  hashContenido?: string | null;
}

export class InformeTrazabilidadLog {
  private constructor(private readonly props: InformeTrazabilidadLogProps) {}

  public static crear(props: InformeTrazabilidadLogProps): InformeTrazabilidadLog {
    if (!props.id || props.id.trim() === '') {
      throw new InformeTrazabilidadInvalidoError('El id del informe de trazabilidad es obligatorio.');
    }
    if (!props.codigoInforme || props.codigoInforme.trim() === '') {
      throw new InformeTrazabilidadInvalidoError('El código de informe de trazabilidad es obligatorio.');
    }
    if (!props.cosechaId || props.cosechaId.trim() === '') {
      throw new InformeTrazabilidadInvalidoError('El cosechaId es obligatorio.');
    }
    if (!props.loteId || props.loteId.trim() === '') {
      throw new InformeTrazabilidadInvalidoError('El loteId es obligatorio.');
    }
    if (!props.codigoTrazabilidad || props.codigoTrazabilidad.trim() === '') {
      throw new InformeTrazabilidadInvalidoError('El código de trazabilidad de cosecha es obligatorio.');
    }
    if (!['PDF', 'CSV', 'EXCEL'].includes(props.tipoFormato)) {
      throw new InformeTrazabilidadInvalidoError(
        `Formato '${props.tipoFormato}' no válido. Formatos soportados: PDF, CSV, EXCEL.`
      );
    }
    if (!props.usuarioEmisor || props.usuarioEmisor.trim() === '') {
      throw new InformeTrazabilidadInvalidoError('El usuario emisor del informe es obligatorio para auditoría (RF-M6-13).');
    }

    return new InformeTrazabilidadLog({
      ...props,
      id: props.id.trim(),
      codigoInforme: props.codigoInforme.trim(),
      cosechaId: props.cosechaId.trim(),
      loteId: props.loteId.trim(),
      codigoTrazabilidad: props.codigoTrazabilidad.trim(),
      usuarioEmisor: props.usuarioEmisor.trim(),
      rolEmisor: props.rolEmisor ? props.rolEmisor.trim() : null,
      filtrosAplicados: props.filtrosAplicados ?? { incluirDatosSensibles: false, incluirCostos: false },
      emitidoEn: props.emitidoEn ?? new Date().toISOString(),
      hashContenido: props.hashContenido ?? null,
    });
  }

  public get id(): string {
    return this.props.id;
  }

  public get codigoInforme(): string {
    return this.props.codigoInforme;
  }

  public get cosechaId(): string {
    return this.props.cosechaId;
  }

  public get loteId(): string {
    return this.props.loteId;
  }

  public get codigoTrazabilidad(): string {
    return this.props.codigoTrazabilidad;
  }

  public get tipoFormato(): TipoFormatoInforme {
    return this.props.tipoFormato;
  }

  public get usuarioEmisor(): string {
    return this.props.usuarioEmisor;
  }

  public get rolEmisor(): string | null | undefined {
    return this.props.rolEmisor;
  }

  public get filtrosAplicados(): FiltrosInformeTrazabilidad {
    return this.props.filtrosAplicados;
  }

  public get emitidoEn(): string {
    return this.props.emitidoEn!;
  }

  public get hashContenido(): string | null | undefined {
    return this.props.hashContenido;
  }

  public toJSON(): InformeTrazabilidadLogProps {
    return {
      id: this.id,
      codigoInforme: this.codigoInforme,
      cosechaId: this.cosechaId,
      loteId: this.loteId,
      codigoTrazabilidad: this.codigoTrazabilidad,
      tipoFormato: this.tipoFormato,
      usuarioEmisor: this.usuarioEmisor,
      rolEmisor: this.rolEmisor,
      filtrosAplicados: this.filtrosAplicados,
      emitidoEn: this.emitidoEn,
      hashContenido: this.hashContenido,
    };
  }
}
