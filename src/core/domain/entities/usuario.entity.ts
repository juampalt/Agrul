import { DomainError, PasswordInseguraError } from '../errors/domain.error.js';

export type PerfilUsuario = 'ADMINISTRADOR' | 'ENCARGADO' | 'OPERARIO' | 'ASESOR_AGRONOMO';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export class UsuarioInvalidoError extends DomainError {
  public readonly code = 'USUARIO_INVALIDO';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

export interface UsuarioProps {
  nombreUsuario?: string | null;
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  passwordHash: string;
  salt: string;
  perfil: PerfilUsuario;
  estado: EstadoUsuario;
  intentosFallidos: number;
  debeCambiarPassword: boolean;
  bloqueadoHasta?: string | null;
  ultimoAcceso?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearUsuarioParams {
  nombreUsuario?: string;
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  passwordHash: string;
  salt: string;
  perfil: PerfilUsuario;
  estado?: EstadoUsuario;
  debeCambiarPassword?: boolean;
}

export class Usuario {
  private constructor(private props: UsuarioProps) {}

  public static readonly PERFILES_VALIDOS: PerfilUsuario[] = [
    'ADMINISTRADOR',
    'ENCARGADO',
    'OPERARIO',
    'ASESOR_AGRONOMO',
  ];

  public static readonly ESTADOS_VALIDOS: EstadoUsuario[] = [
    'ACTIVO',
    'INACTIVO',
    'BLOQUEADO',
  ];

  public static readonly MAX_INTENTOS_FALLIDOS = 5;

  public static crear(params: CrearUsuarioParams): Usuario {
    if (params.nombreUsuario !== undefined && !/^[a-zA-Z0-9._-]{1,100}$/.test(params.nombreUsuario.trim())) {
      throw new UsuarioInvalidoError('El nombre de usuario debe contener entre 1 y 100 letras, números, puntos, guiones o guiones bajos.');
    }
    if (!params.nombre || params.nombre.trim().length === 0) {
      throw new UsuarioInvalidoError('El nombre del usuario es obligatorio.');
    }

    if (!params.apellido || params.apellido.trim().length === 0) {
      throw new UsuarioInvalidoError('El apellido del usuario es obligatorio.');
    }

    if (!params.email || !Usuario.validarEmail(params.email)) {
      throw new UsuarioInvalidoError(`El email '${params.email}' no posee un formato válido.`);
    }

    if (!Usuario.PERFILES_VALIDOS.includes(params.perfil)) {
      throw new UsuarioInvalidoError(`El perfil '${params.perfil}' no es válido.`);
    }

    if (!params.passwordHash || !params.salt) {
      throw new PasswordInseguraError('El hash y salt de la contraseña son obligatorios.');
    }

    const ahora = new Date().toISOString();

    return new Usuario({
      nombreUsuario: params.nombreUsuario?.trim().toLowerCase(),
      id: params.id,
      nombre: params.nombre.trim(),
      apellido: params.apellido.trim(),
      email: params.email.trim().toLowerCase(),
      passwordHash: params.passwordHash,
      salt: params.salt,
      perfil: params.perfil,
      estado: params.estado ?? 'ACTIVO',
      intentosFallidos: 0,
      debeCambiarPassword: params.debeCambiarPassword ?? false,
      bloqueadoHasta: null,
      ultimoAcceso: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: UsuarioProps): Usuario {
    return new Usuario({
      ...props,
      debeCambiarPassword: props.debeCambiarPassword ?? false,
    });
  }

  public static validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  public get id(): string {
    return this.props.id;
  }

  public get nombreUsuario(): string | null | undefined {
    return this.props.nombreUsuario;
  }

  public get nombre(): string {
    return this.props.nombre;
  }

  public get apellido(): string {
    return this.props.apellido;
  }

  public get nombreCompleto(): string {
    return `${this.props.nombre} ${this.props.apellido}`;
  }

  public get email(): string {
    return this.props.email;
  }

  public get passwordHash(): string {
    return this.props.passwordHash;
  }

  public get salt(): string {
    return this.props.salt;
  }

  public get perfil(): PerfilUsuario {
    return this.props.perfil;
  }

  public get estado(): EstadoUsuario {
    return this.props.estado;
  }

  public get intentosFallidos(): number {
    return this.props.intentosFallidos;
  }

  public get debeCambiarPassword(): boolean {
    return this.props.debeCambiarPassword;
  }

  public get bloqueadoHasta(): string | null | undefined {
    return this.props.bloqueadoHasta;
  }

  public get ultimoAcceso(): string | null | undefined {
    return this.props.ultimoAcceso;
  }

  public get creadoEn(): string {
    return this.props.creadoEn;
  }

  public get actualizadoEn(): string {
    return this.props.actualizadoEn;
  }

  public get estaActivo(): boolean {
    return this.props.estado === 'ACTIVO';
  }

  public get estaBloqueado(): boolean {
    return this.props.estado === 'BLOQUEADO';
  }

  public registrarIntentoFallido(maxIntentos: number = Usuario.MAX_INTENTOS_FALLIDOS): { bloqueado: boolean; intentosActuales: number } {
    this.props.intentosFallidos += 1;
    this.props.actualizadoEn = new Date().toISOString();

    if (this.props.intentosFallidos >= maxIntentos) {
      this.props.estado = 'BLOQUEADO';
      return { bloqueado: true, intentosActuales: this.props.intentosFallidos };
    }

    return { bloqueado: false, intentosActuales: this.props.intentosFallidos };
  }

  public reiniciarIntentosFallidos(): void {
    this.props.intentosFallidos = 0;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public registrarAccesoExitoso(): void {
    this.props.intentosFallidos = 0;
    this.props.ultimoAcceso = new Date().toISOString();
    this.props.actualizadoEn = new Date().toISOString();
  }

  public bloquear(motivo?: string): void {
    this.props.estado = 'BLOQUEADO';
    this.props.actualizadoEn = new Date().toISOString();
  }

  public desbloquear(): void {
    this.props.estado = 'ACTIVO';
    this.props.intentosFallidos = 0;
    this.props.bloqueadoHasta = null;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public activar(): void {
    this.props.estado = 'ACTIVO';
    this.props.actualizadoEn = new Date().toISOString();
  }

  public desactivar(): void {
    this.props.estado = 'INACTIVO';
    this.props.actualizadoEn = new Date().toISOString();
  }

  public actualizarPerfil(nuevoPerfil: PerfilUsuario): void {
    if (!Usuario.PERFILES_VALIDOS.includes(nuevoPerfil)) {
      throw new UsuarioInvalidoError(`El perfil '${nuevoPerfil}' no es válido.`);
    }
    this.props.perfil = nuevoPerfil;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public actualizarDatos(datos: { nombre?: string; apellido?: string; email?: string }): void {
    if (datos.nombre !== undefined) {
      if (!datos.nombre || datos.nombre.trim().length === 0) {
        throw new UsuarioInvalidoError('El nombre no puede ser vacío.');
      }
      this.props.nombre = datos.nombre.trim();
    }

    if (datos.apellido !== undefined) {
      if (!datos.apellido || datos.apellido.trim().length === 0) {
        throw new UsuarioInvalidoError('El apellido no puede ser vacío.');
      }
      this.props.apellido = datos.apellido.trim();
    }

    if (datos.email !== undefined) {
      if (!datos.email || !Usuario.validarEmail(datos.email)) {
        throw new UsuarioInvalidoError(`El email '${datos.email}' no posee un formato válido.`);
      }
      this.props.email = datos.email.trim().toLowerCase();
    }

    this.props.actualizadoEn = new Date().toISOString();
  }

  public cambiarPassword(nuevoHash: string, nuevoSalt: string): void {
    if (!nuevoHash || !nuevoSalt) {
      throw new PasswordInseguraError('El hash y salt son requeridos.');
    }
    this.props.passwordHash = nuevoHash;
    this.props.salt = nuevoSalt;
    this.props.debeCambiarPassword = false;
    this.props.actualizadoEn = new Date().toISOString();
  }

  public toJSON() {
    return {
      ...(this.props.nombreUsuario ? { nombreUsuario: this.props.nombreUsuario } : {}),
      id: this.props.id,
      nombre: this.props.nombre,
      apellido: this.props.apellido,
      nombreCompleto: this.nombreCompleto,
      email: this.props.email,
      perfil: this.props.perfil,
      estado: this.props.estado,
      intentosFallidos: this.props.intentosFallidos,
      debeCambiarPassword: this.props.debeCambiarPassword,
      bloqueadoHasta: this.props.bloqueadoHasta,
      ultimoAcceso: this.props.ultimoAcceso,
      creadoEn: this.props.creadoEn,
      actualizadoEn: this.props.actualizadoEn,
    };
  }
}
