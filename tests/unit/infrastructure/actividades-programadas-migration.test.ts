import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Revisión estática de migración 0015 (sin ejecutar SQL)', () => {
  it('difiere la validación histórica de motivos sin inventar ni borrar datos', () => {
    const sql = readFileSync(new URL('../../../drizzle/migrations/0015_ampliar_actividades_programadas.sql', import.meta.url), 'utf8')
      .replace(/--[^\n]*/g, '');
    const motivo = sql.split(';').find((s) => s.includes('ADD CONSTRAINT "actividades_programadas_motivo_cancelacion_check"'));
    expect(motivo).toMatch(/CHECK\s*\([\s\S]*"motivo_cancelacion" IS NOT NULL[\s\S]*\) NOT VALID\s*$/);
    expect(sql).not.toMatch(/(?:^|;)\s*(?:UPDATE|DELETE FROM)\b/i);
    expect(sql).not.toMatch(/\bVALIDATE CONSTRAINT\b/i);
  });
});
