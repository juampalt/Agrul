import { AplicacionInsumosInvalidaError, RegistrarAplicacionInsumos } from '../../../core/domain/entities/aplicacion-insumos.js';
import { ActorInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { AplicacionesInsumosRepositoryPort } from '../../../core/ports/aplicaciones-insumos-repository.port.js';
import { ConsultasAplicacionesInsumos } from '../aplicaciones-insumos-consultas.js';
import { registrarAplicacionEnTransaccion } from '../registrar-aplicacion-transaccion.js';

export class DrizzleAplicacionesInsumosRepository extends ConsultasAplicacionesInsumos implements AplicacionesInsumosRepositoryPort {
  async registrar(datos: RegistrarAplicacionInsumos, actor: ActorInventario) {
    try {
      return await this.db.transaction(tx => registrarAplicacionEnTransaccion(tx, datos, actor));
    } catch (error) {
      if (error instanceof Error && 'code' in error && ['23514', '22003', '23503'].includes(String(error.code))) {
        throw new AplicacionInsumosInvalidaError('Aplicación rechazada por stock, partida vencida o referencias incompatibles.');
      }
      throw error;
    }
  }
}
