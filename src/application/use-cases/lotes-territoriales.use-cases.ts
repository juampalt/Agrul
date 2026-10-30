import { randomUUID } from 'node:crypto';
import { Lote } from '../../core/domain/entities/lote.entity.js';
import { DomainError, EntidadNoEncontradaError, ProduccionEnCursoError, UbicacionLoteSuperpuestaError } from '../../core/domain/errors/domain.error.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { LotesRepositoryPort, ListarLotesFiltros } from '../../core/ports/lotes-repository.port.js';
import { CodigoLote } from '../../core/domain/value-objects/codigo-lote.vo.js';
import { CodigoLoteDuplicadoError } from './crear-lote.use-case.js';
import { ModificarLoteTerritorialDTO, RegistrarLoteTerritorialDTO } from '../dtos/lote.dto.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';

export class SuperficieLoteExcedidaError extends DomainError {
  readonly code = 'SUPERFICIE_LOTE_EXCEDIDA';
  constructor(solicitada: number, disponible: number) {
    super(`La superficie solicitada (${solicitada} ha) excede la superficie disponible de la finca (${disponible} ha).`);
  }
}

export class DesactivacionLoteNoPermitidaError extends DomainError {
  readonly code = 'DESACTIVACION_LOTE_NO_PERMITIDA';
  constructor(motivo: string) { super(`El lote no puede desactivarse: ${motivo}.`); }
}

async function superficieAsignada(repo: LotesRepositoryPort, fincaId: string, excluir?: string) {
  if (repo.sumarSuperficieActiva) return repo.sumarSuperficieActiva(fincaId, excluir);
  return (await repo.listarTodos({ fincaId }))
    .filter((l) => l.id !== excluir && l.estadoTerritorial !== 'INACTIVO')
    .reduce((total, lote) => total + (lote.superficieHa ?? 0), 0);
}

const normalizarSector = (valor?: string | null) => (valor ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** CU03/CU05: coincidencia de ubicación o sector con otro lote no inactivo, según los datos registrados. */
async function validarUbicacionLibre(repo: LotesRepositoryPort, fincaId: string, sector: string | null | undefined, excluir?: string) {
  const buscado = normalizarSector(sector);
  if (!buscado) return;
  const coincide = (await repo.listarTodos({ fincaId })).some((l) => l.id !== excluir
    && l.estadoTerritorial !== 'INACTIVO' && normalizarSector(l.ubicacionSector) === buscado);
  if (coincide) throw new UbicacionLoteSuperpuestaError((sector ?? '').trim());
}

async function obtenerFinca(repo: FincasRepositoryPort, fincaId?: string) {
  const finca = fincaId ? await repo.buscarPorId(fincaId) : (await repo.listarTodas({ limit: 1 }))[0];
  if (!finca) throw new EntidadNoEncontradaError('Finca', fincaId ?? 'configurada');
  return finca;
}

export class RegistrarLoteTerritorialUseCase {
  constructor(private lotes: LotesRepositoryPort, private fincas: FincasRepositoryPort) {}
  async execute(dto: RegistrarLoteTerritorialDTO) {
    const finca = await obtenerFinca(this.fincas, dto.fincaId);
    const codigo = CodigoLote.crear(dto.codigo);
    if (await this.lotes.existeCodigo(codigo.value)) throw new CodigoLoteDuplicadoError(codigo.value);
    const disponible = finca.superficieTotalHa - await superficieAsignada(this.lotes, finca.id);
    if (dto.superficieHa > disponible) throw new SuperficieLoteExcedidaError(dto.superficieHa, disponible);
    await validarUbicacionLibre(this.lotes, finca.id, dto.ubicacionSector);
    // CU03: todo lote nuevo queda «Disponible»; pasa a «En producción» solo al iniciar un ciclo (CU20).
    const lote = Lote.crear({
      id: randomUUID(), codigoLote: codigo, producto: dto.nombre, cantidadInicial: 0,
      unidadMedida: 'HA', fincaId: finca.id, superficieHa: dto.superficieHa,
      nombreTerritorial: dto.nombre, ubicacionSector: dto.ubicacionSector,
      tipoSuelo: dto.tipoSuelo, sistemaRiego: dto.sistemaRiego,
      estadoTerritorial: 'DISPONIBLE', fechaRegistro: dto.fechaRegistro,
    });
    await this.lotes.guardar(lote);
    return lote.toJSON();
  }
}

export class ConsultarLotesTerritorialesUseCase {
  constructor(private lotes: LotesRepositoryPort) {}
  async execute(filtros: ListarLotesFiltros) {
    return (await this.lotes.listarTodos(filtros)).map((l) => l.toJSON());
  }
}

export class ModificarLoteTerritorialUseCase {
  constructor(private lotes: LotesRepositoryPort, private fincas: FincasRepositoryPort) {}
  async execute(id: string, dto: ModificarLoteTerritorialDTO, versionEsperada?: string) {
    const lote = await this.lotes.buscarPorId(id);
    if (!lote) throw new EntidadNoEncontradaError('Lote', id);
    if (!lote.fincaId) throw new EntidadNoEncontradaError('Finca del lote', id);
    const finca = await obtenerFinca(this.fincas, lote.fincaId);
    const disponible = finca.superficieTotalHa - await superficieAsignada(this.lotes, finca.id, lote.id);
    if (dto.superficieHa > disponible) throw new SuperficieLoteExcedidaError(dto.superficieHa, disponible);
    // CU05 7b: con producción en curso no pueden cambiar la superficie ni la ubicación que la identifican.
    const cambiaSuperficie = Number(dto.superficieHa) !== Number(lote.superficieHa);
    const cambiaSector = normalizarSector(dto.ubicacionSector) !== normalizarSector(lote.ubicacionSector);
    if (lote.estadoTerritorial === 'EN_PRODUCCION' && (cambiaSuperficie || cambiaSector)) throw new ProduccionEnCursoError();
    if (cambiaSector) await validarUbicacionLibre(this.lotes, finca.id, dto.ubicacionSector, lote.id);
    lote.modificarTerritorio({
      nombreTerritorial: dto.nombre,
      superficieHa: dto.superficieHa,
      ubicacionSector: dto.ubicacionSector,
      tipoSuelo: dto.tipoSuelo,
      sistemaRiego: dto.sistemaRiego,
    });
    await this.lotes.actualizar(lote, versionEsperada);
    return lote.toJSON();
  }
}

export class DesactivarLoteTerritorialUseCase {
  constructor(private lotes: LotesRepositoryPort, private ciclos?: CiclosRepositoryPort) {}
  async execute(id: string) {
    const lote = await this.lotes.buscarPorId(id);
    if (!lote) throw new EntidadNoEncontradaError('Lote', id);
    if (lote.estadoTerritorial !== 'DISPONIBLE') {
      throw new DesactivacionLoteNoPermitidaError(`su estado es ${lote.estadoTerritorial} y debe ser DISPONIBLE`);
    }
    if (this.ciclos && await this.ciclos.buscarCicloAbiertoPorLote(id)) {
      throw new DesactivacionLoteNoPermitidaError('posee un ciclo productivo activo');
    }
    lote.desactivarTerritorialmente();
    await this.lotes.actualizar(lote);
    return lote.toJSON();
  }
}
