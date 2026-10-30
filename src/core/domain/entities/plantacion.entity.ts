import { DomainError, InvalidStateTransitionError } from '../errors/domain.error.js';
import { LocalizacionTucumanService } from '../services/localizacion-tucuman.service.js';

export type EstadoPlantacion = 'ACTIVA' | 'FINALIZADA';
export interface DatosPlantacion {
  loteId: string;
  cultivoId: string;
  variedadId: string;
  fechaPlantacion: string;
  superficieHa: number;
  cantidadInicialPlantas: number;
  procedencia: string | null;
  observaciones?: string | null;
}
export interface PlantacionProps extends DatosPlantacion {
  observaciones: string | null;
  id: string;
  estado: EstadoPlantacion;
  fechaFinalizacion: string | null;
}
export interface AsignacionPlantacion {
  loteActivo: boolean;
  superficieLoteHa: number;
  superficieOcupadaHa: number;
  cultivoActivo: boolean;
  variedadActiva: boolean;
  cultivoDeVariedadId: string;
}
export class PlantacionInvalidaError extends DomainError {
  readonly code = 'PLANTACION_INVALIDA';
}

export class Plantacion {
  private constructor(private readonly props: PlantacionProps) {}

  static crear(datos: DatosPlantacion & { id: string }, hoy = new Date()): Plantacion {
    Plantacion.validarFecha(datos.fechaPlantacion, hoy);
    if (!Number.isFinite(datos.superficieHa) || datos.superficieHa <= 0 || datos.superficieHa > 999999.99
      || Number(datos.superficieHa.toFixed(2)) !== datos.superficieHa) {
      throw new PlantacionInvalidaError('La superficie debe ser positiva, con hasta dos decimales y un máximo de 999999.99 ha.');
    }
    if (!Number.isInteger(datos.cantidadInicialPlantas) || datos.cantidadInicialPlantas <= 0
      || datos.cantidadInicialPlantas > 2147483647) {
      throw new PlantacionInvalidaError('La cantidad inicial de plantas debe ser un entero positivo válido.');
    }
    return new Plantacion({ ...datos, observaciones: datos.observaciones?.trim() || null, estado: 'ACTIVA', fechaFinalizacion: null });
  }

  static reconstituir(props: PlantacionProps): Plantacion { return new Plantacion({ ...props }); }

  static validarCapacidad(superficieLoteHa: number, superficieOcupadaHa: number, nuevaSuperficieHa = 0): void {
    if (Math.round(superficieOcupadaHa * 100) + Math.round(nuevaSuperficieHa * 100) > Math.round(superficieLoteHa * 100)) {
      throw new PlantacionInvalidaError('La superficie de las plantaciones activas supera la superficie disponible del lote.');
    }
  }

  validarAsignacion(contexto: AsignacionPlantacion): void {
    if (!contexto.loteActivo || contexto.superficieLoteHa <= 0) {
      throw new PlantacionInvalidaError('La plantación requiere un lote territorial no inactivo con superficie válida.');
    }
    if (!contexto.cultivoActivo || !contexto.variedadActiva) {
      throw new PlantacionInvalidaError('La plantación requiere un cultivo y una variedad activos (RN-06).');
    }
    if (contexto.cultivoDeVariedadId !== this.props.cultivoId) {
      throw new PlantacionInvalidaError('La variedad no pertenece al cultivo seleccionado.');
    }
    Plantacion.validarCapacidad(contexto.superficieLoteHa, contexto.superficieOcupadaHa, this.props.superficieHa);
  }

  finalizar(fecha: string, hoy = new Date()): Plantacion {
    if (this.props.estado !== 'ACTIVA') throw new InvalidStateTransitionError(this.props.estado, 'FINALIZADA');
    Plantacion.validarFecha(fecha, hoy);
    if (fecha < this.props.fechaPlantacion) {
      throw new PlantacionInvalidaError('La finalización no puede ser anterior a la plantación.');
    }
    return new Plantacion({ ...this.props, estado: 'FINALIZADA', fechaFinalizacion: fecha });
  }

  private static validarFecha(fecha: string, hoy: Date): void {
    const fechaUtc = new Date(`${fecha}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(fechaUtc.getTime())
      || fechaUtc.toISOString().slice(0, 10) !== fecha) {
      throw new PlantacionInvalidaError('La fecha debe ser una fecha de calendario válida (YYYY-MM-DD).');
    }
    if (fecha > LocalizacionTucumanService.extraerFechaLocal(hoy)) {
      throw new PlantacionInvalidaError('La fecha de una operación efectiva no puede ser futura.');
    }
  }

  toJSON(): PlantacionProps { return { ...this.props }; }
}
