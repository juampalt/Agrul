import { MedicionClimatica } from '../../src/core/domain/entities/medicion-climatica.entity.js';
import {
  MedicionesClimaticasRepositoryPort,
  FiltrosListadoClima,
} from '../../src/core/ports/mediciones-climaticas-repository.port.js';

export class InMemoryMedicionesClimaticasRepository implements MedicionesClimaticasRepositoryPort {
  private mediciones: MedicionClimatica[] = [];

  public async guardar(medicion: MedicionClimatica): Promise<void> {
    this.mediciones.push(medicion);
  }

  public async guardarBatch(mediciones: MedicionClimatica[]): Promise<void> {
    this.mediciones.push(...mediciones);
  }

  public async obtenerPorId(id: string): Promise<MedicionClimatica | null> {
    const encontrada = this.mediciones.find(m => m.id === id);
    return encontrada ?? null;
  }

  public async obtenerVigentePorFechaYFinca(
    fincaId: string,
    fecha: string
  ): Promise<MedicionClimatica | null> {
    const fechaNorm = fecha.slice(0, 10);
    const coincidentes = this.mediciones.filter(
      m => m.fincaId === fincaId && m.fecha === fechaNorm
    );

    if (coincidentes.length === 0) {
      return null;
    }

    // Si existen correcciones, la versión vigente es la última creada
    coincidentes.sort((a, b) => {
      if (a.creadoEn !== b.creadoEn) {
        return a.creadoEn > b.creadoEn ? -1 : 1;
      }
      return this.mediciones.indexOf(b) - this.mediciones.indexOf(a);
    });
    return coincidentes[0];
  }

  public async listarPorFinca(
    fincaId: string,
    filtros?: FiltrosListadoClima
  ): Promise<MedicionClimatica[]> {
    let filtradas = this.mediciones.filter(m => m.fincaId === fincaId);

    if (filtros?.fechaDesde) {
      filtradas = filtradas.filter(m => m.fecha >= filtros.fechaDesde!);
    }

    if (filtros?.fechaHasta) {
      filtradas = filtradas.filter(m => m.fecha <= filtros.fechaHasta!);
    }

    if (filtros?.soloVigentes) {
      // Agrupar por fecha y quedarse con la última creada (considerando orden de inserción)
      const porFecha = new Map<string, MedicionClimatica>();
      for (const m of filtradas) {
        const existente = porFecha.get(m.fecha);
        if (!existente || m.creadoEn > existente.creadoEn || (m.creadoEn === existente.creadoEn && this.mediciones.indexOf(m) > this.mediciones.indexOf(existente))) {
          porFecha.set(m.fecha, m);
        }
      }
      filtradas = Array.from(porFecha.values());
    }

    // Ordenar cronológicamente por fecha descendente
    return filtradas.sort((a, b) => (a.fecha > b.fecha ? -1 : a.fecha < b.fecha ? 1 : 0));
  }

  public async obtenerHistorialCorrecciones(
    medicionOriginalId: string
  ): Promise<MedicionClimatica[]> {
    const raiz = this.mediciones.find(m => m.id === medicionOriginalId);
    const targetId = raiz ? (raiz.medicionOriginalId ?? raiz.id) : medicionOriginalId;

    return this.mediciones
      .filter(m => m.id === targetId || m.medicionOriginalId === targetId)
      .sort((a, b) => (a.creadoEn < b.creadoEn ? -1 : 1));
  }

  // Helpers para pruebas
  public obtenerTodas(): MedicionClimatica[] {
    return [...this.mediciones];
  }

  public limpiar(): void {
    this.mediciones = [];
  }
}
