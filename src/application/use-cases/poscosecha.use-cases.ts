import { ActorCosechas } from '../../core/domain/entities/cosecha-registrada.js';
import { RegistrarAcondicionamiento, RegistrarClasificacion, validarAcondicionamiento, validarClasificacion } from '../../core/domain/entities/poscosecha.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { ClasificacionesRepositoryPort, FiltrosPoscosecha } from '../../core/ports/clasificaciones-repository.port.js';
import { PoscosechaAlmacenamientoRepositoryPort } from '../../core/ports/poscosecha-almacenamiento-repository.port.js';

export class RegistrarClasificacionUseCase {
  constructor(private readonly repo: ClasificacionesRepositoryPort) {}
  execute(datos: RegistrarClasificacion, actor: ActorCosechas) { return this.repo.registrarClasificacion(validarClasificacion(datos), actor); }
}
export class RegistrarAcondicionamientoUseCase {
  constructor(private readonly repo: PoscosechaAlmacenamientoRepositoryPort) {}
  execute(datos: RegistrarAcondicionamiento, actor: ActorCosechas) { return this.repo.registrarAcondicionamiento(validarAcondicionamiento(datos), actor); }
}
export class ConsultarPoscosechaUseCase {
  constructor(private readonly clasificaciones: ClasificacionesRepositoryPort, private readonly poscosecha: PoscosechaAlmacenamientoRepositoryPort) {}
  listarClasificaciones(f: FiltrosPoscosecha, actor: ActorCosechas) { return this.clasificaciones.listarClasificaciones(f, actor); }
  /** CU48: totales del período filtrado y acumulado sin fechas, con los demás criterios. */
  async totalesClasificaciones(f: FiltrosPoscosecha, actor: ActorCosechas) {
    const periodo = await this.clasificaciones.totalesClasificaciones(f, actor);
    const { desde: _desde, hasta: _hasta, ...sinPeriodo } = f;
    const acumulado = f.desde || f.hasta ? await this.clasificaciones.totalesClasificaciones(sinPeriodo, actor) : periodo;
    return { ...periodo, periodo: { desde: f.desde ?? null, hasta: f.hasta ?? null }, acumulado };
  }
  listarAcondicionamientos(f: FiltrosPoscosecha, actor: ActorCosechas) { return this.poscosecha.listarAcondicionamientos(f, actor); }
  listarPartidas(f: FiltrosPoscosecha, actor: ActorCosechas) { return this.poscosecha.listarPartidas(f, actor); }
  obtenerClasificacion(id: string, actor: ActorCosechas) { return this.exigir(this.clasificaciones.obtenerClasificacion(id, actor), 'Clasificación', id); }
  obtenerAcondicionamiento(id: string, actor: ActorCosechas) { return this.exigir(this.poscosecha.obtenerAcondicionamiento(id, actor), 'Acondicionamiento', id); }
  obtenerPartida(id: string, actor: ActorCosechas) { return this.exigir(this.poscosecha.obtenerPartida(id, actor), 'Partida de producción', id); }
  private async exigir<T>(resultado: Promise<T | null>, tipo: string, id: string): Promise<T> {
    const registro = await resultado;
    if (!registro) throw new EntidadNoEncontradaError(tipo, id);
    return registro;
  }
}
