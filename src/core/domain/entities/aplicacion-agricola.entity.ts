import { DomainError, FechaFuturaInvalidaError } from '../errors/domain.error.js';

export class AplicacionInvalidaError extends DomainError {
  public readonly code = 'INVALID_APPLICATION';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export type MetodoAplicacion = 'FOLIAR' | 'FERTIRRIEGO' | 'DRENCH' | 'ESPOLVOREO' | 'OTRO';

export const METODOS_APLICACION: MetodoAplicacion[] = [
  'FOLIAR',
  'FERTIRRIEGO',
  'DRENCH',
  'ESPOLVOREO',
  'OTRO',
];

export interface CondicionesClimaProps {
  vientoKmH?: number | null;
  tempC?: number | null;
  lluviaMm?: number | null;
  observaciones?: string | null;
}

export interface AplicacionLineaInsumoProps {
  id: string;
  insumoId: string;
  cantidadTotal: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null; // ej. l/ha, kg/ha (RF-M4-04)
  dosisPorPlanta?: number | null;     // ej. ml/planta (RF-M4-04)
  concentracion?: string | null;      // ej. "200 cc/100L" o "0.2%" (RF-M4-04)
}

export interface AplicacionAgricolaProps {
  id: string;
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  responsableId?: string | null;
  metodo: MetodoAplicacion | string;
  motivo: string;
  equipoAplicacion: string; // RF-M4-11
  condicionesClima?: CondicionesClimaProps | null; // RF-M4-12
  lineas: AplicacionLineaInsumoProps[]; // RF-M4-06 (mezclas / caldos)
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearAplicacionAgricolaParams {
  id: string;
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  responsableId?: string | null;
  metodo: MetodoAplicacion | string;
  motivo: string;
  equipoAplicacion: string;
  condicionesClima?: CondicionesClimaProps | null;
  lineas: Array<{
    id?: string;
    insumoId: string;
    cantidadTotal: number;
    unidadMedidaId: string;
    dosisPorSuperficie?: number | null;
    dosisPorPlanta?: number | null;
    concentracion?: string | number | null;
  }>;
  /** Permite inyectar la fecha de referencia hoy para pruebas temporales deterministas */
  fechaReferenciaHoy?: Date;
}

/**
 * Entidad de dominio que representa una Aplicación Agrícola de Insumos en Campo.
 * Modela RF-M4-03, RF-M4-04, RF-M4-05, RF-M4-06, RF-M4-11, RF-M4-12 y valida RN-01, RN-04.
 */
export class AplicacionAgricola {
  private constructor(private props: AplicacionAgricolaProps) {}

  public static crear(params: CrearAplicacionAgricolaParams): AplicacionAgricola {
    if (!params.id || params.id.trim().length === 0) {
      throw new AplicacionInvalidaError('El id de la aplicación es obligatorio.');
    }
    if (!params.actividadId || params.actividadId.trim().length === 0) {
      throw new AplicacionInvalidaError('La actividad agrícola vinculada es obligatoria (RF-M4-03).');
    }
    if (!params.loteId || params.loteId.trim().length === 0) {
      throw new AplicacionInvalidaError('El loteId es obligatorio (RF-M4-03 / RF-M4-05).');
    }
    if (!params.cicloId || params.cicloId.trim().length === 0) {
      throw new AplicacionInvalidaError('El cicloId es obligatorio (RF-M4-03 / RF-M4-05).');
    }
    if (!params.fecha || params.fecha.trim().length === 0) {
      throw new AplicacionInvalidaError('La fecha de la aplicación es obligatoria.');
    }
    if (!params.motivo || params.motivo.trim().length === 0) {
      throw new AplicacionInvalidaError('El motivo de la aplicación es obligatorio.');
    }
    if (!params.equipoAplicacion || params.equipoAplicacion.trim().length === 0) {
      throw new AplicacionInvalidaError('El equipo de aplicación utilizado es obligatorio (RF-M4-11).');
    }
    if (!params.metodo || params.metodo.trim().length === 0) {
      throw new AplicacionInvalidaError('El método de aplicación es obligatorio.');
    }
    if (!params.lineas || params.lineas.length === 0) {
      throw new AplicacionInvalidaError('La aplicación debe contener al menos una línea de insumo (RF-M4-06).');
    }

    // Regla de Negocio RN-04: La fecha de aplicación no puede ser futura.
    const hoyRef = params.fechaReferenciaHoy ?? new Date();
    const fechaHoyStr = hoyRef.toISOString().split('T')[0];
    const fechaAplicacionStr = params.fecha.includes('T')
      ? params.fecha.split('T')[0]
      : params.fecha;

    if (fechaAplicacionStr > fechaHoyStr) {
      throw new FechaFuturaInvalidaError(params.fecha);
    }

    // Validar líneas de insumos (RF-M4-04 y RF-M4-06)
    const lineasValidadas: AplicacionLineaInsumoProps[] = params.lineas.map((linea, index) => {
      if (!linea.insumoId || linea.insumoId.trim().length === 0) {
        throw new AplicacionInvalidaError(`El insumoId es obligatorio en la línea ${index + 1}.`);
      }
      if (linea.cantidadTotal === undefined || linea.cantidadTotal === null || Number(linea.cantidadTotal) <= 0) {
        throw new AplicacionInvalidaError(
          `La cantidad total del insumo en la línea ${index + 1} debe ser mayor a cero (RF-M4-04).`
        );
      }
      if (!linea.unidadMedidaId || linea.unidadMedidaId.trim().length === 0) {
        throw new AplicacionInvalidaError(`La unidad de medida es obligatoria en la línea ${index + 1}.`);
      }

      const dosisPorSuperficie = linea.dosisPorSuperficie !== undefined && linea.dosisPorSuperficie !== null
        ? Number(linea.dosisPorSuperficie)
        : null;
      if (dosisPorSuperficie !== null && dosisPorSuperficie < 0) {
        throw new AplicacionInvalidaError('La dosis por superficie no puede ser negativa.');
      }

      const dosisPorPlanta = linea.dosisPorPlanta !== undefined && linea.dosisPorPlanta !== null
        ? Number(linea.dosisPorPlanta)
        : null;
      if (dosisPorPlanta !== null && dosisPorPlanta < 0) {
        throw new AplicacionInvalidaError('La dosis por planta no puede ser negativa.');
      }

      const concentracion = linea.concentracion !== undefined && linea.concentracion !== null
        ? String(linea.concentracion).trim()
        : null;

      return {
        id: linea.id ?? crypto.randomUUID(),
        insumoId: linea.insumoId,
        cantidadTotal: Number(linea.cantidadTotal),
        unidadMedidaId: linea.unidadMedidaId.trim(),
        dosisPorSuperficie,
        dosisPorPlanta,
        concentracion,
      };
    });

    // Validar condiciones de clima si se especifican (RF-M4-12)
    let climaNormalizado: CondicionesClimaProps | null = null;
    if (params.condicionesClima) {
      const { vientoKmH, tempC, lluviaMm, observaciones } = params.condicionesClima;
      if (vientoKmH !== undefined && vientoKmH !== null && Number(vientoKmH) < 0) {
        throw new AplicacionInvalidaError('La velocidad del viento no puede ser negativa.');
      }
      if (lluviaMm !== undefined && lluviaMm !== null && Number(lluviaMm) < 0) {
        throw new AplicacionInvalidaError('La precipitación de lluvia no puede ser negativa.');
      }
      climaNormalizado = {
        vientoKmH: vientoKmH !== undefined && vientoKmH !== null ? Number(vientoKmH) : null,
        tempC: tempC !== undefined && tempC !== null ? Number(tempC) : null,
        lluviaMm: lluviaMm !== undefined && lluviaMm !== null ? Number(lluviaMm) : null,
        observaciones: observaciones?.trim() ?? null,
      };
    }

    const ahora = new Date().toISOString();

    return new AplicacionAgricola({
      id: params.id,
      actividadId: params.actividadId,
      loteId: params.loteId,
      cicloId: params.cicloId,
      fecha: params.fecha,
      responsableId: params.responsableId ?? null,
      metodo: params.metodo,
      motivo: params.motivo.trim(),
      equipoAplicacion: params.equipoAplicacion.trim(),
      condicionesClima: climaNormalizado,
      lineas: lineasValidadas,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: AplicacionAgricolaProps): AplicacionAgricola {
    return new AplicacionAgricola({
      ...props,
      lineas: props.lineas ? [...props.lineas] : [],
      condicionesClima: props.condicionesClima ? { ...props.condicionesClima } : null,
    });
  }

  public get id(): string { return this.props.id; }
  public get actividadId(): string { return this.props.actividadId; }
  public get loteId(): string { return this.props.loteId; }
  public get cicloId(): string { return this.props.cicloId; }
  public get fecha(): string { return this.props.fecha; }
  public get responsableId(): string | null | undefined { return this.props.responsableId; }
  public get metodo(): MetodoAplicacion | string { return this.props.metodo; }
  public get motivo(): string { return this.props.motivo; }
  public get equipoAplicacion(): string { return this.props.equipoAplicacion; }
  public get condicionesClima(): CondicionesClimaProps | null | undefined { return this.props.condicionesClima; }
  public get lineas(): AplicacionLineaInsumoProps[] { return [...this.props.lineas]; }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public esMezcla(): boolean {
    return this.props.lineas.length > 1;
  }

  public toJSON(): AplicacionAgricolaProps {
    return {
      ...this.props,
      condicionesClima: this.props.condicionesClima ? { ...this.props.condicionesClima } : null,
      lineas: this.props.lineas.map(l => ({ ...l })),
    };
  }
}
