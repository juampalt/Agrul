import { TraceEvent } from '../domain/entities/trace-event.entity.js';
import { Lote } from '../domain/entities/lote.entity.js';

export interface EventosRepositoryPort {
  /**
   * Guarda un evento de trazabilidad y actualiza el read model del lote
   * de forma indivisible dentro de una misma transacción ACID.
   */
  guardarConTransaccion(evento: TraceEvent, loteActualizado: Lote): Promise<void>;
  
  buscarPorId(id: string): Promise<TraceEvent | null>;
  listarPorLote(loteId: string): Promise<TraceEvent[]>;
  guardarBatchOffline(eventos: TraceEvent[]): Promise<{ insertados: number; fallidos: string[] }>;
}
