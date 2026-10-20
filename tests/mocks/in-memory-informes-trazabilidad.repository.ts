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
    const list = Array.from(this.items.values());
    let result = list.map((item, index) => ({ item, index }));

    if (filtros?.cosechaId) {
      result = result.filter(r => r.item.cosechaId === filtros.cosechaId);
    }
    if (filtros?.loteId) {
      result = result.filter(r => r.item.loteId === filtros.loteId);
    }
    if (filtros?.codigoTrazabilidad) {
      result = result.filter(r => r.item.codigoTrazabilidad === filtros.codigoTrazabilidad);
    }
    if (filtros?.usuarioEmisor) {
      result = result.filter(r => r.item.usuarioEmisor.toLowerCase().includes(filtros.usuarioEmisor!.toLowerCase()));
    }
    if (filtros?.tipoFormato) {
      result = result.filter(r => r.item.tipoFormato === filtros.tipoFormato);
    }

    // Ordenar descendente por emitidoEn y desempatar por inserción más reciente
    result.sort((a, b) => {
      const cmp = b.item.emitidoEn.localeCompare(a.item.emitidoEn);
      return cmp !== 0 ? cmp : b.index - a.index;
    });

    return result.map(r => InformeTrazabilidadLog.crear(r.item.toJSON()));
  }
}
