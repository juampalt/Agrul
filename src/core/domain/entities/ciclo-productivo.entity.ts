export type EstadoCiclo = 'PLANIFICADO' | 'ABIERTO' | 'CERRADO';

export interface CicloProductivoProps {
  id: string;
  codigoCiclo: string;
  loteId: string;
  cultivo: string;
  variedad?: string | null;
  estado: EstadoCiclo;
  superficieCultivadaHa: number;
  fechaInicio: string;
  fechaFin?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearCicloProductivoParams {
  id: string;
  codigoCiclo: string;
  loteId: string;
  cultivo: string;
  variedad?: string | null;
  estado?: EstadoCiclo;
  superficieCultivadaHa: number;
  fechaInicio: string;
  fechaFin?: string | null;
}

/**
 * Entidad de dominio que representa un ciclo productivo agrícola asociado a un lote (Módulo 2).
 */
export class CicloProductivo {
  private constructor(private props: CicloProductivoProps) {}

  public static crear(params: CrearCicloProductivoParams): CicloProductivo {
    if (!params.id) {
      throw new Error('El id del ciclo productivo es obligatorio.');
    }
    if (!params.codigoCiclo || params.codigoCiclo.trim().length === 0) {
      throw new Error('El código del ciclo productivo es obligatorio.');
    }
    if (!params.loteId) {
      throw new Error('El loteId es obligatorio para un ciclo productivo.');
    }
    if (!params.cultivo || params.cultivo.trim().length === 0) {
      throw new Error('El cultivo es obligatorio.');
    }
    if (params.superficieCultivadaHa <= 0) {
      throw new Error('La superficie cultivada en hectáreas debe ser un valor positivo mayor a cero.');
    }

    const ahora = new Date().toISOString();

    return new CicloProductivo({
      id: params.id,
      codigoCiclo: params.codigoCiclo.trim(),
      loteId: params.loteId,
      cultivo: params.cultivo.trim(),
      variedad: params.variedad?.trim() ?? null,
      estado: params.estado ?? 'ABIERTO',
      superficieCultivadaHa: params.superficieCultivadaHa,
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin ?? null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: CicloProductivoProps): CicloProductivo {
    return new CicloProductivo({ ...props });
  }

  public get id(): string { return this.props.id; }
  public get codigoCiclo(): string { return this.props.codigoCiclo; }
  public get loteId(): string { return this.props.loteId; }
  public get cultivo(): string { return this.props.cultivo; }
  public get variedad(): string | null | undefined { return this.props.variedad; }
  public get estado(): EstadoCiclo { return this.props.estado; }
  public get superficieCultivadaHa(): number { return this.props.superficieCultivadaHa; }
  public get fechaInicio(): string { return this.props.fechaInicio; }
  public get fechaFin(): string | null | undefined { return this.props.fechaFin; }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public estaAbierto(): boolean {
    return this.props.estado === 'ABIERTO';
  }

  public cerrar(fechaFin: string): void {
    this.props.estado = 'CERRADO';
    this.props.fechaFin = fechaFin;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): CicloProductivoProps {
    return { ...this.props };
  }
}
