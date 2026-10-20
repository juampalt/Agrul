import { RecorridoTrazabilidadOutputDto, HitoTimelineBaseDto } from '../dtos/recorrido-trazabilidad.dto.js';

export interface OpcionesFiltroPrivacidad {
  incluirDatosSensibles?: boolean;
  incluirCostos?: boolean;
}

/**
 * Servicio de Filtro de Privacidad (RF-M6-11 / RNF-14).
 * Por defecto, en la emisión de informes hacia compradores u organismos externos
 * se omiten o censuran costos comerciales y datos de contacto de operarios/choferes.
 */
export class FiltroPrivacidadTrazabilidadService {
  public static aplicar(
    recorrido: RecorridoTrazabilidadOutputDto,
    opciones?: OpcionesFiltroPrivacidad
  ): RecorridoTrazabilidadOutputDto {
    const incluirSensibles = opciones?.incluirDatosSensibles ?? false;
    const incluirCostos = opciones?.incluirCostos ?? false;

    // Si ambos permisos están habilitados, devolver copia sin alterar
    if (incluirSensibles && incluirCostos) {
      return JSON.parse(JSON.stringify(recorrido));
    }

    const copia: RecorridoTrazabilidadOutputDto = JSON.parse(JSON.stringify(recorrido));

    copia.timeline = copia.timeline.map((hito: HitoTimelineBaseDto) => {
      const hitoFiltrado: HitoTimelineBaseDto = { ...hito };

      if (!incluirSensibles) {
        // En despachos, sanitizar datos personales o sensibles de contacto de chofer
        if (hitoFiltrado.tipo === 'DESPACHO' && hitoFiltrado.detalles) {
          if (hitoFiltrado.detalles.telefonoChofer) {
            hitoFiltrado.detalles.telefonoChofer = '[CONFIDENCIAL / RNF-14]';
          }
          if (hitoFiltrado.detalles.contactoDestinatario) {
            hitoFiltrado.detalles.contactoDestinatario = '[CONFIDENCIAL / RNF-14]';
          }
        }

        // En labores, sanitizar contacto personal de cuadrilla
        if (hitoFiltrado.tipo === 'LABOR_CULTURAL' && hitoFiltrado.detalles?.manoDeObra) {
          if (Array.isArray(hitoFiltrado.detalles.manoDeObra)) {
            hitoFiltrado.detalles.manoDeObra = hitoFiltrado.detalles.manoDeObra.map((mo: any) => {
              const { telefono, email, dni, ...resto } = mo;
              return resto;
            });
          }
        }
      }

      if (!incluirCostos && hitoFiltrado.detalles) {
        // Eliminar campos de costos o precios si estuvieran presentes
        delete hitoFiltrado.detalles.costoTotal;
        delete hitoFiltrado.detalles.precioUnitario;
        delete hitoFiltrado.detalles.valorMonetario;
        delete hitoFiltrado.detalles.tarifaManoDeObra;
      }

      return hitoFiltrado;
    });

    return copia;
  }
}
