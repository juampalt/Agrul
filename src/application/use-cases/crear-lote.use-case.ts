import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { Lote } from '../../core/domain/entities/lote.entity.js';
import { CodigoLote } from '../../core/domain/value-objects/codigo-lote.vo.js';
import { DomainError } from '../../core/domain/errors/domain.error.js';
import { CrearLoteInputDTO, LoteResponseDTO } from '../dtos/lote.dto.js';

export class CodigoLoteDuplicadoError extends DomainError {
  public readonly code = 'DUPLICATE_BATCH_CODE';
  constructor(codigo: string) {
    super(`Ya existe un lote registrado con el código '${codigo}'.`);
  }
}

export class CrearLoteUseCase {
  constructor(private readonly lotesRepo: LotesRepositoryPort) {}

  async execute(dto: CrearLoteInputDTO): Promise<LoteResponseDTO> {
    let codigoLote: CodigoLote;

    if (dto.codigoLote) {
      codigoLote = CodigoLote.crear(dto.codigoLote);
      const existe = await this.lotesRepo.existeCodigo(codigoLote.value);
      if (existe) {
        throw new CodigoLoteDuplicadoError(codigoLote.value);
      }
    } else {
      // Si no se especifica código, autogenerar uno único basado en timestamp
      const sec = Math.floor(10000 + Math.random() * 90000);
      codigoLote = CodigoLote.generar('LOT', sec);
    }

    const nuevoLote = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote,
      producto: dto.producto,
      variedad: dto.variedad,
      cantidadInicial: dto.cantidadInicial,
      unidadMedida: dto.unidadMedida,
      fincaId: dto.fincaId,
      superficieHa: dto.superficieHa,
      geometria: dto.geometria,
    });

    await this.lotesRepo.guardar(nuevoLote);

    return {
      id: nuevoLote.id,
      codigoLote: nuevoLote.codigoLote.value,
      producto: nuevoLote.producto,
      variedad: nuevoLote.variedad,
      estadoActual: nuevoLote.estadoActual,
      cantidadActual: nuevoLote.cantidadActual,
      unidadMedida: nuevoLote.unidadMedida,
      fincaId: nuevoLote.fincaId,
      superficieHa: nuevoLote.superficieHa,
      geometria: nuevoLote.geometria,
      creadoEn: nuevoLote.creadoEn,
      actualizadoEn: nuevoLote.actualizadoEn,
    };
  }
}
