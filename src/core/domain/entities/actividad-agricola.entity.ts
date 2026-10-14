import { FechaFuturaInvalidaError } from '../errors/domain.error.js';

export type EstadoActividad = 'REALIZADA' | 'PLANIFICADA' | 'VENCIDA' | 'CANCELADA';

export interface ActividadMaquinariaItem {
  id?: string;
  maquinariaId: string;
  horasUso: number;
}

export interface ActividadManoObraItem {
  id?: string;
  personalCuadrillaId: string;
  cantidadPersonas: number;
  horasTrabajadas: number;
  jornales: number;
}

export interface ActividadAgricolaProps {
  id: string;
  codigoActividad: string;
  tipoActividadId: string;
  loteId: string;
  cicloId: string;
  fechaHecho: string;
  hora?: string | null;
  usuarioCargaId: string;
  trabajadorResponsableId?: string | null;
  superficieTrabajadaHa: number;
  observaciones?: string | null;
  estado: EstadoActividad;
  maquinarias: ActividadMaquinariaItem[];
  manoDeObra: ActividadManoObraItem[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface RegistrarActividadParams {
  id: string;
  codigoActividad: string;
  tipoActividadId: string;
  loteId: string;
  cicloId: string;
  fechaHecho: string;
  hora?: string | null;
  usuarioCargaId: string;
  trabajadorResponsableId?: string | null;
  superficieTrabajadaHa: number;
  observaciones?: string | null;
  estado?: EstadoActividad;
  maquinarias?: ActividadMaquinariaItem[];
  manoDeObra?: ActividadManoObraItem[];
  /** Permite inyectar la fecha de referencia para pruebas temporales deterministas */
  fechaReferenciaHoy?: Date;
}

/**
 * Entidad de dominio que representa una actividad agrícola (labor de campo) ejecutada o planificada.
 * Modela RF-M3-02, RF-M3-04, RF-M3-05, RF-M3-15 y valida RN-04.
 */
export class ActividadAgricola {
  private constructor(private props: ActividadAgricolaProps) {}

  public static registrar(params: RegistrarActividadParams): ActividadAgricola {
    if (!params.id) {
      throw new Error('El id de la actividad es obligatorio.');
    }
    if (!params.codigoActividad || params.codigoActividad.trim().length === 0) {
      throw new Error('El código de la actividad es obligatorio.');
    }
    if (!params.tipoActividadId) {
      throw new Error('El tipoActividadId es obligatorio.');
    }
    if (!params.loteId) {
      throw new Error('El loteId es obligatorio.');
    }
    if (!params.cicloId) {
      throw new Error('El cicloId es obligatorio.');
    }
    if (!params.usuarioCargaId) {
      throw new Error('El usuarioCargaId es obligatorio.');
    }
    if (params.superficieTrabajadaHa <= 0) {
      throw new Error('La superficie trabajada en hectáreas debe ser mayor a cero.');
    }

    const estado: EstadoActividad = params.estado ?? 'REALIZADA';

    // Regla de Negocio RN-04: Para actividades realizadas, la fecha del hecho no puede ser futura.
    if (estado === 'REALIZADA') {
      const hoyRef = params.fechaReferenciaHoy ?? new Date();
      // Normalizar a fecha YYYY-MM-DD
      const fechaHoyStr = hoyRef.toISOString().split('T')[0];
      const fechaHechoStr = params.fechaHecho.includes('T')
        ? params.fechaHecho.split('T')[0]
        : params.fechaHecho;

      if (fechaHechoStr > fechaHoyStr) {
        throw new FechaFuturaInvalidaError(params.fechaHecho);
      }
    }

    // Validar ítems de maquinaria si existen
    const maquinariasValidadas: ActividadMaquinariaItem[] = (params.maquinarias ?? []).map(m => {
      if (!m.maquinariaId) {
        throw new Error('maquinariaId es obligatorio en cada registro de maquinaria.');
      }
      if (m.horasUso <= 0) {
        throw new Error(`Las horas de uso de la maquinaria '${m.maquinariaId}' deben ser mayores a cero.`);
      }
      return {
        id: m.id ?? crypto.randomUUID(),
        maquinariaId: m.maquinariaId,
        horasUso: Number(m.horasUso),
      };
    });

    // Validar ítems de mano de obra si existen
    const manoDeObraValidada: ActividadManoObraItem[] = (params.manoDeObra ?? []).map(mo => {
      if (!mo.personalCuadrillaId) {
        throw new Error('personalCuadrillaId es obligatorio en cada registro de mano de obra.');
      }
      if (mo.cantidadPersonas <= 0) {
        throw new Error('La cantidad de personas en mano de obra debe ser mayor a cero.');
      }
      if (mo.horasTrabajadas <= 0) {
        throw new Error('Las horas trabajadas en mano de obra deben ser mayores a cero.');
      }
      if (mo.jornales <= 0) {
        throw new Error('Los jornales calculados deben ser mayores a cero.');
      }
      return {
        id: mo.id ?? crypto.randomUUID(),
        personalCuadrillaId: mo.personalCuadrillaId,
        cantidadPersonas: Number(mo.cantidadPersonas),
        horasTrabajadas: Number(mo.horasTrabajadas),
        jornales: Number(mo.jornales),
      };
    });

    const ahora = new Date().toISOString();

    return new ActividadAgricola({
      id: params.id,
      codigoActividad: params.codigoActividad.trim().toUpperCase(),
      tipoActividadId: params.tipoActividadId,
      loteId: params.loteId,
      cicloId: params.cicloId,
      fechaHecho: params.fechaHecho,
      hora: params.hora ?? null,
      usuarioCargaId: params.usuarioCargaId,
      trabajadorResponsableId: params.trabajadorResponsableId ?? null,
      superficieTrabajadaHa: params.superficieTrabajadaHa,
      observaciones: params.observaciones ?? null,
      estado,
      maquinarias: maquinariasValidadas,
      manoDeObra: manoDeObraValidada,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: ActividadAgricolaProps): ActividadAgricola {
    return new ActividadAgricola({ ...props });
  }

  public get id(): string { return this.props.id; }
  public get codigoActividad(): string { return this.props.codigoActividad; }
  public get tipoActividadId(): string { return this.props.tipoActividadId; }
  public get loteId(): string { return this.props.loteId; }
  public get cicloId(): string { return this.props.cicloId; }
  public get fechaHecho(): string { return this.props.fechaHecho; }
  public get hora(): string | null | undefined { return this.props.hora; }
  public get usuarioCargaId(): string { return this.props.usuarioCargaId; }
  public get trabajadorResponsableId(): string | null | undefined { return this.props.trabajadorResponsableId; }
  public get superficieTrabajadaHa(): number { return this.props.superficieTrabajadaHa; }
  public get observaciones(): string | null | undefined { return this.props.observaciones; }
  public get estado(): EstadoActividad { return this.props.estado; }
  public get maquinarias(): ActividadMaquinariaItem[] { return [...this.props.maquinarias]; }
  public get manoDeObra(): ActividadManoObraItem[] { return [...this.props.manoDeObra]; }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public toJSON(): ActividadAgricolaProps {
    return {
      ...this.props,
      maquinarias: [...this.props.maquinarias],
      manoDeObra: [...this.props.manoDeObra],
    };
  }
}
