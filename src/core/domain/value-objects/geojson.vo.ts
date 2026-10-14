import { DomainError } from '../errors/domain.error.js';

export class GeoJSONInvalidoError extends DomainError {
  public readonly code = 'INVALID_GEOJSON_GEOMETRY';

  constructor(mensaje: string) {
    super(`Geometría GeoJSON inválida: ${mensaje}`);
  }
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitud, latitud]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // Anillos lineales
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon;

export class GeoJSONValidator {
  public static validar(geom: unknown): GeoJSONGeometry {
    if (!geom || typeof geom !== 'object') {
      throw new GeoJSONInvalidoError('El objeto de geometría no puede ser nulo ni vacío.');
    }

    const obj = geom as { type?: unknown; coordinates?: unknown };

    if (obj.type !== 'Point' && obj.type !== 'Polygon') {
      throw new GeoJSONInvalidoError("El tipo de geometría debe ser 'Point' o 'Polygon'.");
    }

    if (!Array.isArray(obj.coordinates)) {
      throw new GeoJSONInvalidoError('Las coordenadas deben ser un arreglo.');
    }

    if (obj.type === 'Point') {
      if (obj.coordinates.length < 2 || typeof obj.coordinates[0] !== 'number' || typeof obj.coordinates[1] !== 'number') {
        throw new GeoJSONInvalidoError("Un punto Point requiere coordenadas [longitud, latitud] numéricas.");
      }
      const [lng, lat] = obj.coordinates;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new GeoJSONInvalidoError("Coordenadas fuera de rango: longitud [-180, 180], latitud [-90, 90].");
      }
      return {
        type: 'Point',
        coordinates: [lng, lat],
      };
    }

    if (obj.type === 'Polygon') {
      if (obj.coordinates.length === 0 || !Array.isArray(obj.coordinates[0])) {
        throw new GeoJSONInvalidoError('Un polígono debe contener al menos un anillo lineal de coordenadas.');
      }

      for (const ring of obj.coordinates as number[][][]) {
        if (!Array.isArray(ring) || ring.length < 4) {
          throw new GeoJSONInvalidoError('Cada anillo de polígono debe contener al menos 4 posiciones (cerrado).');
        }
        for (const coord of ring) {
          if (!Array.isArray(coord) || coord.length < 2 || typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
            throw new GeoJSONInvalidoError('Cada posición debe ser un par numérico [longitud, latitud].');
          }
        }
      }

      return {
        type: 'Polygon',
        coordinates: obj.coordinates as number[][][],
      };
    }

    throw new GeoJSONInvalidoError('Tipo de geometría no soportado.');
  }
}
