import { describe, it, expect } from 'vitest';
import {
  RecomendacionTecnica,
  RecomendacionTecnicaInvalidaError,
} from '../../../src/core/domain/entities/recomendacion-tecnica.entity.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';

describe('Entidad de Dominio: RecomendacionTecnica (RF-M4-08)', () => {
  it('debe crear una recomendación técnica con agrónomo emisor y firma o documento PDF opcional', () => {
    const recomendacion = RecomendacionTecnica.crear({
      agronomoEmisor: 'Ing. Agr. Esteban Morales',
      nroMatricula: 'MP-8921-CPIA',
      documentoUrl: 'https://cdn.agrul.internal/docs/rec-8921-lote4.pdf',
      firmaDigital: 'sha256-abc123def456',
      fechaEmision: '2026-10-01',
      observaciones: 'Aplicar al atardecer para evitar volatilización por alta temperatura.',
    });

    expect(recomendacion.agronomoEmisor).toBe('Ing. Agr. Esteban Morales');
    expect(recomendacion.nroMatricula).toBe('MP-8921-CPIA');
    expect(recomendacion.documentoUrl).toBe('https://cdn.agrul.internal/docs/rec-8921-lote4.pdf');
    expect(recomendacion.firmaDigital).toBe('sha256-abc123def456');
    expect(recomendacion.observaciones).toBe('Aplicar al atardecer para evitar volatilización por alta temperatura.');
  });

  it('debe rechazar recomendación técnica si el agrónomo emisor está vacío o tiene menos de 2 caracteres', () => {
    expect(() => {
      RecomendacionTecnica.crear({
        agronomoEmisor: ' ',
      });
    }).toThrow(RecomendacionTecnicaInvalidaError);

    expect(() => {
      RecomendacionTecnica.crear({
        agronomoEmisor: 'A',
      });
    }).toThrow(RecomendacionTecnicaInvalidaError);
  });

  it('debe vincular la recomendación técnica a una aplicación de campo (RF-M4-08)', () => {
    const aplicacion = AplicacionAgricola.crear({
      id: crypto.randomUUID(),
      actividadId: crypto.randomUUID(),
      loteId: crypto.randomUUID(),
      cicloId: crypto.randomUUID(),
      fecha: '2026-10-01',
      metodo: 'FOLIAR',
      motivo: 'Control de botrytis',
      equipoAplicacion: 'Pulverizador Martignani 2000L',
      lineas: [
        {
          insumoId: crypto.randomUUID(),
          cantidadTotal: 5,
          unidadMedidaId: 'KG',
          dosisPorSuperficie: 2.5,
        },
      ],
      recomendacionTecnica: {
        agronomoEmisor: 'Ing. Laura Benítez',
        nroMatricula: 'MP-5542',
        documentoUrl: 'https://storage.agrul.app/rec-tecnica-botrytis.pdf',
      },
      fechaReferenciaHoy: new Date('2026-10-10'),
    });

    expect(aplicacion.recomendacionTecnica).toBeDefined();
    expect(aplicacion.recomendacionTecnica?.agronomoEmisor).toBe('Ing. Laura Benítez');
    expect(aplicacion.recomendacionTecnica?.nroMatricula).toBe('MP-5542');
    expect(aplicacion.recomendacionTecnica?.documentoUrl).toBe('https://storage.agrul.app/rec-tecnica-botrytis.pdf');

    const json = aplicacion.toJSON();
    expect(json.recomendacionTecnica?.agronomoEmisor).toBe('Ing. Laura Benítez');
  });
});
