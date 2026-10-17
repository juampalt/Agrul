import { z } from 'zod';

export const RecorridoTrazabilidadParamSchema = z.object({
  identificador: z.string().trim().min(1, 'El identificador o código de trazabilidad es obligatorio (RF-M6-01)'),
}).strict();
