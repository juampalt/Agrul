import { z } from 'zod';
import { NuevaVersionAplicacionSchema } from './aplicaciones-insumos.schema.js';

export const CorregirAplicacionInsumosSchema = z.object({
  operacionId: z.string().uuid().transform(id => id.toLowerCase()),
  motivoCorreccion: z.string().trim().min(1).max(2000),
  nuevaAplicacion: NuevaVersionAplicacionSchema,
}).strict();
