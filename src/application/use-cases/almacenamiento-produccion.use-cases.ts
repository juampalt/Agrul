import { ActorCosechas } from '../../core/domain/entities/cosecha-registrada.js';
import { RegistrarCamara, RegistrarDestinoProduccion, RegistrarMovimientoAlmacenamiento,
  validarCamara, validarDestinoProduccion, validarMovimientoAlmacenamiento } from '../../core/domain/entities/almacenamiento-produccion.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { AlmacenamientoProduccionRepositoryPort, FiltrosAlmacenamiento } from '../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { DestinosRepositoryPort, FiltrosDestinosProduccion } from '../../core/ports/destinos-repository.port.js';

export class RegistrarCamaraUseCase {
  constructor(private readonly repo: AlmacenamientoProduccionRepositoryPort) {}
  execute(datos: RegistrarCamara, actor: ActorCosechas) { return this.repo.registrarCamara(validarCamara(datos), actor); }
}
export class RegistrarMovimientoAlmacenamientoUseCase {
  constructor(private readonly repo: AlmacenamientoProduccionRepositoryPort) {}
  execute(datos: RegistrarMovimientoAlmacenamiento, actor: ActorCosechas) { return this.repo.registrarMovimiento(validarMovimientoAlmacenamiento(datos), actor); }
}
export class RegistrarDestinoProduccionUseCase {
  constructor(private readonly repo: DestinosRepositoryPort) {}
  execute(datos: RegistrarDestinoProduccion, actor: ActorCosechas) { return this.repo.registrarDestino(validarDestinoProduccion(datos), actor); }
}
export class ConsultarAlmacenamientoProduccionUseCase {
  constructor(private readonly almacen: AlmacenamientoProduccionRepositoryPort, private readonly destinos: DestinosRepositoryPort) {}
  listarCamaras(f: FiltrosAlmacenamiento, actor: ActorCosechas) { return this.almacen.listarCamaras(f, actor); }
  listarMovimientos(f: FiltrosAlmacenamiento, actor: ActorCosechas) { return this.almacen.listarMovimientos(f, actor); }
  consultarSaldos(f: FiltrosAlmacenamiento, actor: ActorCosechas) { return this.almacen.consultarSaldos(f, actor); }
  listarDestinos(f: FiltrosDestinosProduccion, actor: ActorCosechas) { return this.destinos.listarDestinos(f, actor); }
  totalesDestinos(f: FiltrosDestinosProduccion, actor: ActorCosechas) { return this.destinos.totalesDestinos(f, actor); }
  obtenerCamara(id: string, actor: ActorCosechas) { return this.exigir(this.almacen.obtenerCamara(id, actor), 'Cámara', id); }
  obtenerMovimiento(id: string, actor: ActorCosechas) { return this.exigir(this.almacen.obtenerMovimiento(id, actor), 'Movimiento de almacenamiento', id); }
  obtenerDestino(id: string, actor: ActorCosechas) { return this.exigir(this.destinos.obtenerDestino(id, actor), 'Destino de producción', id); }
  private async exigir<T>(resultado: Promise<T | null>, tipo: string, id: string): Promise<T> {
    const registro = await resultado; if (!registro) throw new EntidadNoEncontradaError(tipo, id); return registro;
  }
}
