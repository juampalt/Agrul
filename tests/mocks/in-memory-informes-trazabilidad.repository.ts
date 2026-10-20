import { InformeTrazabilidadLog } from '../../src/core/domain/entities/informe-trazabilidad-log.entity.js';
import {
  FiltrosListarInformesLog,
  InformesTrazabilidadRepositoryPort,
} from '../../src/core/ports/informes-trazabilidad-repository.port.js';

export class InMemoryInformesTrazabilidadRepository implements InformesTrazabilidadRepositoryPort {
  private items: Map<string, InformeTrazabilidadLog> = new Map();

  public async guardar(log: InformeTrazabilidadLog): Promise<InformeTrazabilidadLog> {
    this.items.set(log.id, log);
    return log;
  }

  public async buscarPorId(id: string): Promise<InformeTrazabilidadLog | null> {
    const item = this.items.get(id);
    return item ? InformeTrazabilidadLog.crear(item.toJSON()) : null;
  }

  public async buscarPorCodigo(codigoInforme: string): Promise<InformeTrazabilidadLog | null> {
    for (const item of this.items.values()) {
      if (item.codigoInforme === codigoInforme) {
        return InformeTrazabilidadLog.crear(item.toJSON());
      }
    }
    return null;
  }

  public async listar(filtros?: FiltrosListarInformesLog): Promise<InformeTrazabilidadLog[]> {
    let result = Array.from(this.items.values());

    if (filtros?.cosechaId) {
      result = result.filter(i => i.cosechaId === filtros.cosechaId);
    }
    if (filtros?.loteId) {
      result = result.filter(i => i.loteId === filtros.loteId);
    }
    if (filtros?.codigoTrazabilidad) {
      result = result.filter(i => i.codigoTrazabilidad === filtros.codigoTrazabilidad);
    }
    if (filtros?.usuarioEmisor) {
      result = result.filter(i => i.usuarioEmisor.toLowerCase().includes(filtros.usuarioEmisor!.toLowerCase()));
    }
    if (filtros?.tipoFormato) {
      result = result.filter(i => i.tipoFormato === filtros.tipoFormato);
    }

    // Ordenar descendente por emitidoEn
    result.sort((a, b) => b.emitidoEn.localeCompare(a.emitidoEn));

    return result.map(i => InformeTrazabilidadLog.crear(i.toJSON()));
  }
}
