import { and, desc, eq, ilike } from 'drizzle-orm';
import { InformeTrazabilidadLog } from '../../../core/domain/entities/informe-trazabilidad-log.entity.js';
import {
  FiltrosListarInformesLog,
  InformesTrazabilidadRepositoryPort,
} from '../../../core/ports/informes-trazabilidad-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { informeTrazabilidadLogTable } from '../schema/tables.js';

export class DrizzleInformesTrazabilidadRepository implements InformesTrazabilidadRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  public async guardar(log: InformeTrazabilidadLog): Promise<InformeTrazabilidadLog> {
    const json = log.toJSON();
    await this.db.insert(informeTrazabilidadLogTable).values({
      id: json.id,
      codigoInforme: json.codigoInforme,
      cosechaId: json.cosechaId,
      loteId: json.loteId,
      codigoTrazabilidad: json.codigoTrazabilidad,
      tipoFormato: json.tipoFormato,
      usuarioEmisor: json.usuarioEmisor,
      rolEmisor: json.rolEmisor,
      filtrosAplicados: json.filtrosAplicados as Record<string, unknown>,
      emitidoEn: json.emitidoEn,
      hashContenido: json.hashContenido,
    });
    return log;
  }

  public async buscarPorId(id: string): Promise<InformeTrazabilidadLog | null> {
    const [fila] = await this.db
      .select()
      .from(informeTrazabilidadLogTable)
      .where(eq(informeTrazabilidadLogTable.id, id));
    if (!fila) return null;
    return InformeTrazabilidadLog.crear({
      id: fila.id,
      codigoInforme: fila.codigoInforme,
      cosechaId: fila.cosechaId,
      loteId: fila.loteId,
      codigoTrazabilidad: fila.codigoTrazabilidad,
      tipoFormato: fila.tipoFormato as any,
      usuarioEmisor: fila.usuarioEmisor,
      rolEmisor: fila.rolEmisor,
      filtrosAplicados: fila.filtrosAplicados as any,
      emitidoEn: fila.emitidoEn,
      hashContenido: fila.hashContenido,
    });
  }

  public async buscarPorCodigo(codigoInforme: string): Promise<InformeTrazabilidadLog | null> {
    const [fila] = await this.db
      .select()
      .from(informeTrazabilidadLogTable)
      .where(eq(informeTrazabilidadLogTable.codigoInforme, codigoInforme));
    if (!fila) return null;
    return InformeTrazabilidadLog.crear({
      id: fila.id,
      codigoInforme: fila.codigoInforme,
      cosechaId: fila.cosechaId,
      loteId: fila.loteId,
      codigoTrazabilidad: fila.codigoTrazabilidad,
      tipoFormato: fila.tipoFormato as any,
      usuarioEmisor: fila.usuarioEmisor,
      rolEmisor: fila.rolEmisor,
      filtrosAplicados: fila.filtrosAplicados as any,
      emitidoEn: fila.emitidoEn,
      hashContenido: fila.hashContenido,
    });
  }

  public async listar(filtros?: FiltrosListarInformesLog): Promise<InformeTrazabilidadLog[]> {
    const condiciones = [];
    if (filtros?.cosechaId) condiciones.push(eq(informeTrazabilidadLogTable.cosechaId, filtros.cosechaId));
    if (filtros?.loteId) condiciones.push(eq(informeTrazabilidadLogTable.loteId, filtros.loteId));
    if (filtros?.codigoTrazabilidad) condiciones.push(eq(informeTrazabilidadLogTable.codigoTrazabilidad, filtros.codigoTrazabilidad));
    if (filtros?.usuarioEmisor) condiciones.push(ilike(informeTrazabilidadLogTable.usuarioEmisor, `%${filtros.usuarioEmisor}%`));
    if (filtros?.tipoFormato) condiciones.push(eq(informeTrazabilidadLogTable.tipoFormato, filtros.tipoFormato));

    const filas = await this.db
      .select()
      .from(informeTrazabilidadLogTable)
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(informeTrazabilidadLogTable.emitidoEn));

    return filas.map(fila =>
      InformeTrazabilidadLog.crear({
        id: fila.id,
        codigoInforme: fila.codigoInforme,
        cosechaId: fila.cosechaId,
        loteId: fila.loteId,
        codigoTrazabilidad: fila.codigoTrazabilidad,
        tipoFormato: fila.tipoFormato as any,
        usuarioEmisor: fila.usuarioEmisor,
        rolEmisor: fila.rolEmisor,
        filtrosAplicados: fila.filtrosAplicados as any,
        emitidoEn: fila.emitidoEn,
        hashContenido: fila.hashContenido,
      })
    );
  }
}
