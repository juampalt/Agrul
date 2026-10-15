import crypto from 'node:crypto';
import { Destinatario } from '../../core/domain/entities/destinatario.entity.js';
import { DespachoDestino } from '../../core/domain/entities/despacho-destino.entity.js';
import { TraceEvent } from '../../core/domain/entities/trace-event.entity.js';
import { TipoEventoEnum } from '../../core/domain/value-objects/tipo-evento.vo.js';
import {
  EntidadNoEncontradaError,
  SaldoComercializableExcedidoError,
  DespachoInvalidoError,
} from '../../core/domain/errors/domain.error.js';
import { DestinatariosRepositoryPort, DestinatariosFiltros } from '../../core/ports/destinatarios-repository.port.js';
import { DespachosRepositoryPort, DespachosFiltros } from '../../core/ports/despachos-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { EventosRepositoryPort } from '../../core/ports/eventos-repository.port.js';
import {
  CrearDestinatarioInputDto,
  DestinatarioOutputDto,
  RegistrarDespachoInputDto,
  DespachoOutputDto,
  SaldoCosechaOutputDto,
  DespachoConSaldoOutputDto,
  ListarDespachosFiltrosDto,
} from '../dtos/despachos.dto.js';

function mapearDestinatario(dest: Destinatario): DestinatarioOutputDto {
  return {
    id: dest.id,
    nombre: dest.nombre,
    tipo: dest.tipo,
    cuit: dest.cuit,
    direccion: dest.direccion,
    localidad: dest.localidad,
    provincia: dest.provincia,
    contacto: dest.contacto,
    telefono: dest.telefono,
    email: dest.email,
    activo: dest.activo,
    creadoEn: dest.creadoEn,
    actualizadoEn: dest.actualizadoEn,
  };
}

function mapearDespacho(despacho: DespachoDestino, destinatarioNombre?: string): DespachoOutputDto {
  return {
    id: despacho.id,
    cosechaId: despacho.cosechaId,
    destinatarioId: despacho.destinatarioId,
    destinatarioNombre,
    tipoDestino: despacho.tipoDestino,
    cantidadEnviadaKg: despacho.cantidadEnviadaKg,
    fecha: despacho.fecha,
    nroGuiaRemito: despacho.nroGuiaRemito,
    renspaFinca: despacho.renspaFinca,
    productor: despacho.productor,
    precinto: despacho.precinto,
    chofer: despacho.chofer,
    patenteCamion: despacho.patenteCamion,
    temperaturaTransporteC: despacho.temperaturaTransporteC,
    observaciones: despacho.observaciones,
    creadoEn: despacho.creadoEn,
  };
}

export class CrearDestinatarioUseCase {
  constructor(private readonly destinatariosRepo: DestinatariosRepositoryPort) {}

  async ejecutar(input: CrearDestinatarioInputDto): Promise<DestinatarioOutputDto> {
    const destinatario = Destinatario.crear({
      id: crypto.randomUUID(),
      nombre: input.nombre,
      tipo: input.tipo,
      cuit: input.cuit,
      direccion: input.direccion,
      localidad: input.localidad,
      provincia: input.provincia,
      contacto: input.contacto,
      telefono: input.telefono,
      email: input.email,
    });

    await this.destinatariosRepo.guardar(destinatario);
    return mapearDestinatario(destinatario);
  }
}

export class ListarDestinatariosUseCase {
  constructor(private readonly destinatariosRepo: DestinatariosRepositoryPort) {}

  async ejecutar(filtros?: DestinatariosFiltros): Promise<DestinatarioOutputDto[]> {
    const items = await this.destinatariosRepo.listar(filtros);
    return items.map(mapearDestinatario);
  }
}

export class ObtenerDestinatarioPorIdUseCase {
  constructor(private readonly destinatariosRepo: DestinatariosRepositoryPort) {}

  async ejecutar(id: string): Promise<DestinatarioOutputDto> {
    const item = await this.destinatariosRepo.buscarPorId(id);
    if (!item) {
      throw new EntidadNoEncontradaError('Destinatario', id);
    }
    return mapearDestinatario(item);
  }
}

export class RegistrarDespachoUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly destinatariosRepo: DestinatariosRepositoryPort,
    private readonly despachosRepo: DespachosRepositoryPort,
    private readonly lotesRepo: LotesRepositoryPort,
    private readonly eventosRepo: EventosRepositoryPort
  ) {}

  async ejecutar(input: RegistrarDespachoInputDto): Promise<DespachoConSaldoOutputDto> {
    // 1. Validar existencia de la Cosecha
    const cosecha = await this.cosechasRepo.buscarPorId(input.cosechaId);
    if (!cosecha) {
      throw new EntidadNoEncontradaError('Cosecha', input.cosechaId);
    }

    // 2. Validar existencia y estado del Destinatario (RF-M5-08)
    const destinatario = await this.destinatariosRepo.buscarPorId(input.destinatarioId);
    if (!destinatario) {
      throw new EntidadNoEncontradaError('Destinatario', input.destinatarioId);
    }
    if (!destinatario.activo) {
      throw new DespachoInvalidoError(`El destinatario '${destinatario.nombre}' se encuentra inactivo.`);
    }

    // 3. Control de saldo comercializable acumulado (RN-09 / RF-M5-09)
    const totalDespachadoPrevio = await this.despachosRepo.sumarCantidadPorCosecha(cosecha.id);
    const saldoDisponible = Number((cosecha.cantidadComercializableKg - totalDespachadoPrevio).toFixed(4));

    if (input.cantidadEnviadaKg > saldoDisponible) {
      throw new SaldoComercializableExcedidoError(saldoDisponible, input.cantidadEnviadaKg);
    }

    // 4. Crear entidad de Dominio DespachoDestino con datos de BPA (RF-M5-10)
    const despacho = DespachoDestino.crear({
      id: crypto.randomUUID(),
      cosechaId: input.cosechaId,
      destinatarioId: input.destinatarioId,
      tipoDestino: input.tipoDestino,
      cantidadEnviadaKg: input.cantidadEnviadaKg,
      fecha: input.fecha,
      nroGuiaRemito: input.nroGuiaRemito,
      renspaFinca: input.renspaFinca,
      productor: input.productor,
      precinto: input.precinto,
      chofer: input.chofer,
      patenteCamion: input.patenteCamion,
      temperaturaTransporteC: input.temperaturaTransporteC,
      observaciones: input.observaciones,
    });

    // 5. Persistir despacho
    await this.despachosRepo.guardar(despacho);

    // 6. Registrar evento inmutable de trazabilidad (DESPACHO) en el lote de la cosecha
    const lote = await this.lotesRepo.buscarPorId(cosecha.loteId);
    if (lote) {
      if (lote.cantidadActual >= despacho.cantidadEnviadaKg) {
        lote.descontarCantidad(despacho.cantidadEnviadaKg);
      }
      const eventoDespacho = TraceEvent.crear({
        id: crypto.randomUUID(),
        loteId: lote.id,
        actorId: input.destinatarioId,
        ubicacionId: lote.fincaId || lote.id,
        tipoEvento: TipoEventoEnum.DESPACHO,
        timestampCapturaLocal: `${despacho.fecha}T10:00:00.000Z`,
        payloadEspecifico: {
          despachoId: despacho.id,
          cosechaId: cosecha.id,
          codigoTrazabilidadCosecha: cosecha.codigoTrazabilidad.value,
          destinatarioId: destinatario.id,
          destinatarioNombre: destinatario.nombre,
          tipoDestino: despacho.tipoDestino,
          cantidadEnviadaKg: despacho.cantidadEnviadaKg,
          nroGuiaRemito: despacho.nroGuiaRemito,
          renspaFinca: despacho.renspaFinca,
          productor: despacho.productor,
          precinto: despacho.precinto,
          saldoRemanenteKg: Number((saldoDisponible - despacho.cantidadEnviadaKg).toFixed(4)),
        },
      });
      await this.eventosRepo.guardarConTransaccion(eventoDespacho, lote);
    }

    // 7. Calcular saldo remanente y métricas actualizadas en tiempo real (RF-M5-07 / RF-M5-09)
    const despachosActualizados = await this.despachosRepo.listarPorCosecha(cosecha.id);
    const totalDespachado = Number((totalDespachadoPrevio + despacho.cantidadEnviadaKg).toFixed(4));
    const saldoRemanente = Number((cosecha.cantidadComercializableKg - totalDespachado).toFixed(4));
    const porcentajeDespachado =
      cosecha.cantidadComercializableKg > 0
        ? Number(((totalDespachado / cosecha.cantidadComercializableKg) * 100).toFixed(2))
        : 0;

    const saldoDto: SaldoCosechaOutputDto = {
      cosechaId: cosecha.id,
      codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
      cantidadCosechadaKg: cosecha.cantidadCosechadaKg,
      cantidadComercializableKg: cosecha.cantidadComercializableKg,
      cantidadDescarteKg: cosecha.cantidadDescarteKg,
      totalDespachadoKg: totalDespachado,
      saldoRemanenteKg: saldoRemanente,
      porcentajeDespachado,
      despachos: despachosActualizados.map(d =>
        mapearDespacho(d, d.destinatarioId === destinatario.id ? destinatario.nombre : undefined)
      ),
    };

    return {
      despacho: mapearDespacho(despacho, destinatario.nombre),
      saldo: saldoDto,
    };
  }
}

export class ConsultarSaldoCosechaUseCase {
  constructor(
    private readonly cosechasRepo: CosechasRepositoryPort,
    private readonly despachosRepo: DespachosRepositoryPort,
    private readonly destinatariosRepo: DestinatariosRepositoryPort
  ) {}

  async ejecutar(cosechaId: string): Promise<SaldoCosechaOutputDto> {
    const cosecha = await this.cosechasRepo.buscarPorId(cosechaId);
    if (!cosecha) {
      throw new EntidadNoEncontradaError('Cosecha', cosechaId);
    }

    const despachos = await this.despachosRepo.listarPorCosecha(cosecha.id);
    const totalDespachado = despachos.reduce((sum, d) => sum + d.cantidadEnviadaKg, 0);
    const saldoRemanente = Number((cosecha.cantidadComercializableKg - totalDespachado).toFixed(4));
    const porcentajeDespachado =
      cosecha.cantidadComercializableKg > 0
        ? Number(((totalDespachado / cosecha.cantidadComercializableKg) * 100).toFixed(2))
        : 0;

    // Obtener nombres de destinatarios
    const despachosOutput: DespachoOutputDto[] = [];
    for (const d of despachos) {
      const dest = await this.destinatariosRepo.buscarPorId(d.destinatarioId);
      despachosOutput.push(mapearDespacho(d, dest?.nombre));
    }

    return {
      cosechaId: cosecha.id,
      codigoTrazabilidad: cosecha.codigoTrazabilidad.value,
      cantidadCosechadaKg: cosecha.cantidadCosechadaKg,
      cantidadComercializableKg: cosecha.cantidadComercializableKg,
      cantidadDescarteKg: cosecha.cantidadDescarteKg,
      totalDespachadoKg: totalDespachado,
      saldoRemanenteKg: saldoRemanente,
      porcentajeDespachado,
      despachos: despachosOutput,
    };
  }
}

export class ListarDespachosUseCase {
  constructor(
    private readonly despachosRepo: DespachosRepositoryPort,
    private readonly destinatariosRepo: DestinatariosRepositoryPort
  ) {}

  async ejecutar(filtros?: ListarDespachosFiltrosDto): Promise<DespachoOutputDto[]> {
    const despachos = await this.despachosRepo.listar(filtros);
    const results: DespachoOutputDto[] = [];
    for (const d of despachos) {
      const dest = await this.destinatariosRepo.buscarPorId(d.destinatarioId);
      results.push(mapearDespacho(d, dest?.nombre));
    }
    return results;
  }
}

export class ObtenerDespachoPorIdUseCase {
  constructor(
    private readonly despachosRepo: DespachosRepositoryPort,
    private readonly destinatariosRepo: DestinatariosRepositoryPort
  ) {}

  async ejecutar(id: string): Promise<DespachoOutputDto> {
    const despacho = await this.despachosRepo.buscarPorId(id);
    if (!despacho) {
      throw new EntidadNoEncontradaError('DespachoDestino', id);
    }
    const dest = await this.destinatariosRepo.buscarPorId(despacho.destinatarioId);
    return mapearDespacho(despacho, dest?.nombre);
  }
}
