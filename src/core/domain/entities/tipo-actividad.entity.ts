import { DomainError } from '../errors/domain.error.js';

export class NombreTipoActividadInvalidoError extends DomainError {
  public readonly code = 'INVALID_ACTIVITY_TYPE_NAME';

  constructor(mensaje: string = 'El nombre del tipo de actividad es obligatorio.') {
    super(mensaje);
  }
}

export type CategoriaActividad =
  | 'SUELO'
  | 'SIEMBRA'
  | 'RIEGO'
  | 'NUTRICION'
  | 'SANIDAD'
  | 'MANEJO'
  | 'COSECHA'
  | 'MANTENIMIENTO'
  | 'OTRO';

export interface TipoActividadProps {
  id: string;
  nombre: string;
  categoria: CategoriaActividad;
  descripcion?: string | null;
  requiereMaquinaria: boolean;
  requiereInsumos: boolean;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearTipoActividadParams {
  id: string;
  nombre: string;
  categoria?: CategoriaActividad;
  descripcion?: string | null;
  requiereMaquinaria?: boolean;
  requiereInsumos?: boolean;
  activo?: boolean;
}

export class TipoActividad {
  private constructor(private props: TipoActividadProps) {}

  public static crear(params: CrearTipoActividadParams): TipoActividad {
    if (!params.nombre || params.nombre.trim().length === 0) {
      throw new NombreTipoActividadInvalidoError('El nombre del tipo de actividad es obligatorio.');
    }

    const ahora = new Date().toISOString();

    return new TipoActividad({
      id: params.id,
      nombre: params.nombre.trim(),
      categoria: params.categoria ?? 'MANEJO',
      descripcion: params.descripcion?.trim() ?? null,
      requiereMaquinaria: params.requiereMaquinaria ?? false,
      requiereInsumos: params.requiereInsumos ?? false,
      activo: params.activo ?? true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: TipoActividadProps): TipoActividad {
    return new TipoActividad({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get nombre(): string {
    return this.props.nombre;
  }

  public get categoria(): CategoriaActividad {
    return this.props.categoria;
  }

  public get descripcion(): string | null | undefined {
    return this.props.descripcion;
  }

  public get requiereMaquinaria(): boolean {
    return this.props.requiereMaquinaria;
  }

  public get requiereInsumos(): boolean {
    return this.props.requiereInsumos;
  }

  public get activo(): boolean {
    return this.props.activo;
  }

  public get creadoEn(): string {
    return this.props.creadoEn;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn;
  }

  public desactivar(): void {
    this.props.activo = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public activar(): void {
    this.props.activo = true;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON(): TipoActividadProps {
    return { ...this.props };
  }

  /**
   * Catálogo de tipos de labor agrícola estándar precargados (RF-M3-01 / RNF-13)
   */
  public static readonly TIPOS_ESTANDAR: ReadonlyArray<Omit<CrearTipoActividadParams, 'id'>> = [
    {
      nombre: 'Preparación de Suelo / Arado',
      categoria: 'SUELO',
      descripcion: 'Labores de arado, rastreo, nivelación y preparación de cama de siembra.',
      requiereMaquinaria: true,
      requiereInsumos: false,
    },
    {
      nombre: 'Siembra y Plantación',
      categoria: 'SIEMBRA',
      descripcion: 'Trasplante de plantines o siembra directa en bordos/surcos.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
    {
      nombre: 'Riego y Fertirriego',
      categoria: 'RIEGO',
      descripcion: 'Operación y mantenimiento de riego por goteo o surco con aplicación de sales solubles.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
    {
      nombre: 'Fertilización de Fondo / Foliar',
      categoria: 'NUTRICION',
      descripcion: 'Aporte de macro y micronutrientes orgánicos o minerales.',
      requiereMaquinaria: false,
      requiereInsumos: true,
    },
    {
      nombre: 'Control de Malezas / Deshierbe',
      categoria: 'MANEJO',
      descripcion: 'Carpida manual, motoguadaña o control químico en interfilas y bordos.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
    {
      nombre: 'Aplicación Fitosanitaria (Plagas y Enfermedades)',
      categoria: 'SANIDAD',
      descripcion: 'Pulverización terrestre de fungicidas, insecticidas o acaricidas registrados en SENASA.',
      requiereMaquinaria: true,
      requiereInsumos: true,
    },
    {
      nombre: 'Poda, Deshoje y Desbrote',
      categoria: 'MANEJO',
      descripcion: 'Limpieza de follaje seco, raleo de coronas o poda de formación.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
    {
      nombre: 'Monitoreo de Plagas y Enfermedades',
      categoria: 'SANIDAD',
      descripcion: 'Inspección técnica visual de lotes, conteo de trampas y registro de umbrales de daño.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
    {
      nombre: 'Cosecha Manual',
      categoria: 'COSECHA',
      descripcion: 'Recolección selectiva de frutos aptos según índices de madurez comercial.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
    {
      nombre: 'Mantenimiento de Bordos e Infraestructura',
      categoria: 'MANTENIMIENTO',
      descripcion: 'Reparación de microtúneles, plásticos mulch, cabezales de riego y cercos perimetrales.',
      requiereMaquinaria: false,
      requiereInsumos: false,
    },
  ];
}
