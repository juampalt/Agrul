import { ObservacionMeteorologica } from '../../src/core/domain/entities/observacion-meteorologica.entity.js';
import {
  MeteorologiaRepositoryPort,
  FiltrosListadoMeteorologia,
} from '../../src/core/ports/meteorologia-repository.port.js';

export class InMemoryMeteorologiaRepository implements MeteorologiaRepositoryPort {
  private observaciones: ObservacionMeteorologica[] = [];

  public async guardar(observacion: ObservacionMeteorologica): Promise<void> {
    this.observaciones.push(observacion);
  }

  public async obtenerPorId(id: string): Promise<ObservacionMeteorologica | null> {
    const found = this.observaciones.find(o => o.id === id);
    return found ?? null;
  }

  public async obtenerPorFincaYFechaHora(
    fincaId: string,
    fechaHoraObservacion: string
  ): Promise<ObservacionMeteorologica | null> {
    const timestampBuscado = new Date(fechaHoraObservacion).getTime();
    const found = this.observaciones.find(
      o => o.fincaId === fincaId && new Date(o.fechaHoraObservacion).getTime() === timestampBuscado
    );
    return found ?? null;
  }

  public async listarPorFinca(
    fincaId: string,
    filtros?: FiltrosListadoMeteorologia
  ): Promise<ObservacionMeteorologica[]> {
    let result = this.observaciones.filter(o => o.fincaId === fincaId);

    if (filtros?.fechaDesde) {
      const desdeMs = new Date(filtros.fechaDesde).getTime();
      result = result.filter(o => new Date(o.fechaHoraObservacion).getTime() >= desdeMs);
    }

    if (filtros?.fechaHasta) {
      const hastaMs = new Date(filtros.fechaHasta).getTime();
      result = result.filter(o => new Date(o.fechaHoraObservacion).getTime() <= hastaMs);
    }

    return result.sort(
      (a, b) => new Date(b.fechaHoraObservacion).getTime() - new Date(a.fechaHoraObservacion).getTime()
    );
  }
}
