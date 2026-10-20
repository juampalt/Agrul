import crypto from 'node:crypto';
import { Proveedor } from '../../core/domain/entities/proveedor.entity.js';
import {
  EntidadNoEncontradaError,
  ProveedorDuplicadoError,
} from '../../core/domain/errors/domain.error.js';
import { ProveedoresRepositoryPort } from '../../core/ports/proveedores-repository.port.js';
import {
  RegistrarProveedorInputDTO,
  ActualizarProveedorInputDTO,
  ProveedorOutputDTO,
  ListarProveedoresQueryDTO,
} from '../dtos/proveedores.dto.js';

function toOutputDTO(proveedor: Proveedor): ProveedorOutputDTO {
  return {
    id: proveedor.id,
    razonSocial: proveedor.razonSocial,
    cuit: proveedor.cuit,
    contacto: proveedor.contacto,
    telefono: proveedor.telefono,
    email: proveedor.email,
    direccion: proveedor.direccion,
    activo: proveedor.activo,
    creadoEn: proveedor.creadoEn,
    actualizadoEn: proveedor.actualizadoEn,
  };
}

export class RegistrarProveedorUseCase {
  constructor(private readonly proveedoresRepo: ProveedoresRepositoryPort) {}

  async execute(input: RegistrarProveedorInputDTO): Promise<ProveedorOutputDTO> {
    if (input.cuit && input.cuit.trim().length > 0) {
      const existe = await this.proveedoresRepo.existePorCuit(input.cuit);
      if (existe) {
        throw new ProveedorDuplicadoError(input.cuit.trim());
      }
    }

    const proveedor = Proveedor.crear({
      id: input.id ?? crypto.randomUUID(),
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      contacto: input.contacto,
      telefono: input.telefono,
      email: input.email,
      direccion: input.direccion,
    });

    await this.proveedoresRepo.guardar(proveedor);

    return toOutputDTO(proveedor);
  }
}

export class ListarProveedoresUseCase {
  constructor(private readonly proveedoresRepo: ProveedoresRepositoryPort) {}

  async execute(filtros?: ListarProveedoresQueryDTO): Promise<ProveedorOutputDTO[]> {
    const proveedores = await this.proveedoresRepo.listar(filtros);
    return proveedores.map(toOutputDTO);
  }
}

export class ObtenerProveedorPorIdUseCase {
  constructor(private readonly proveedoresRepo: ProveedoresRepositoryPort) {}

  async execute(id: string): Promise<ProveedorOutputDTO> {
    const proveedor = await this.proveedoresRepo.buscarPorId(id);
    if (!proveedor) {
      throw new EntidadNoEncontradaError('Proveedor', id);
    }
    return toOutputDTO(proveedor);
  }
}

export class ActualizarProveedorUseCase {
  constructor(private readonly proveedoresRepo: ProveedoresRepositoryPort) {}

  async execute(input: ActualizarProveedorInputDTO): Promise<ProveedorOutputDTO> {
    const proveedor = await this.proveedoresRepo.buscarPorId(input.id);
    if (!proveedor) {
      throw new EntidadNoEncontradaError('Proveedor', input.id);
    }

    if (input.cuit && input.cuit.trim().length > 0) {
      const existe = await this.proveedoresRepo.existePorCuit(input.cuit, input.id);
      if (existe) {
        throw new ProveedorDuplicadoError(input.cuit.trim());
      }
    }

    proveedor.actualizarDatos({
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      contacto: input.contacto,
      telefono: input.telefono,
      email: input.email,
      direccion: input.direccion,
    });

    if (input.activo !== undefined) {
      if (input.activo) {
        proveedor.activar();
      } else {
        proveedor.desactivar();
      }
    }

    await this.proveedoresRepo.guardar(proveedor);

    return toOutputDTO(proveedor);
  }
}
