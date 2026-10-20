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
  plantasPlantadas?: number | null;
  plantasVivas?: number | null;
  plantasRepuestas?: number | null;
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
  plantasPlantadas?: number | null;
  plantasVivas?: number | null;
  plantasRepuestas?: number | null;
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
      plantasPlantadas: params.plantasPlantadas ?? null,
      plantasVivas: params.plantasVivas ?? (params.plantasPlantadas !== undefined && params.plantasPlantadas !== null ? params.plantasPlantadas : null),
      plantasRepuestas: params.plantasRepuestas ?? (params.plantasPlantadas !== undefined && params.plantasPlantadas !== null ? 0 : null),
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
  public get plantasPlantadas(): number | null | undefined { return this.props.plantasPlantadas; }
  public get plantasVivas(): number | null | undefined { return this.props.plantasVivas; }
  public get plantasRepuestas(): number | null | undefined { return this.props.plantasRepuestas; }
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

  public registrarPlantines(plantasPlantadas: number, plantasVivas?: number | null, plantasRepuestas?: number | null): void {
    if (plantasPlantadas <= 0) {
      throw new Error('La cantidad de plantas plantadas debe ser un valor positivo mayor a cero.');
    }
    this.props.plantasPlantadas = plantasPlantadas;
    this.props.plantasVivas = plantasVivas ?? plantasPlantadas;
    this.props.plantasRepuestas = plantasRepuestas ?? 0;
    this.props.actualizadoEn = new Date().toISOString();
  }

  /**
   * Calcula la tasa de prendimiento de plantas en porcentaje (RF-M7-09):
   * (plantasVivas / plantasPlantadas) * 100
   * Retorna null si no se registró conteo de plantas para el ciclo.
   */
  public calcularTasaPrendimiento(): number | null {
    if (this.props.plantasPlantadas === null || this.props.plantasPlantadas === undefined || this.props.plantasPlantadas <= 0) {
      return null;
    }
    const vivas = this.props.plantasVivas ?? this.props.plantasPlantadas;
    return Math.round((vivas / this.props.plantasPlantadas) * 10000) / 100;
  }

  public toJSON(): CicloProductivoProps {
    return { ...this.props };
  }
}
