import { and, eq, ilike, ne, sql } from 'drizzle-orm';
import { Lote } from '../../../core/domain/entities/lote.entity.js';
import { Plantacion } from '../../../core/domain/entities/plantacion.entity.js';
import { CicloProductivoInvalidoError } from '../../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { CodigoLote } from '../../../core/domain/value-objects/codigo-lote.vo.js';
import { ListarLotesFiltros, LotesRepositoryPort } from '../../../core/ports/lotes-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { ciclosProductivosTable, fincasTable, lotesTable, plantacionesTable } from '../schema/tables.js';
import { ConflictoModificacionError, UbicacionLoteSuperpuestaError } from '../../../core/domain/errors/domain.error.js';
import { SuperficieLoteExcedidaError } from '../../../application/use-cases/lotes-territoriales.use-cases.js';
import { AgrulTransaction } from '../connection.js';

export class DrizzleLotesTerritorialesRepository implements LotesRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  /** Bloquea la finca: serializa altas y cambios de superficie para no superar su total (CU03/CU05). */
  private async validarSuperficieDisponible(tx: AgrulTransaction, lote: Lote, excluirId?: string) {
    if (!lote.fincaId || lote.superficieHa == null) return;
    const [finca] = await tx.select({ total: fincasTable.superficieTotalHa }).from(fincasTable)
      .where(eq(fincasTable.id, lote.fincaId)).for('update');
    if (!finca) return;
    const condiciones = [eq(lotesTable.fincaId, lote.fincaId), ne(lotesTable.estadoTerritorial, 'INACTIVO')];
    if (excluirId) condiciones.push(ne(lotesTable.id, excluirId));
    const [asignada] = await tx.select({ total: sql<string>`coalesce(sum(${lotesTable.superficieHa}), 0)` }).from(lotesTable).where(and(...condiciones));
    const disponible = Number(finca.total) - Number(asignada?.total ?? 0);
    if (lote.superficieHa > disponible) throw new SuperficieLoteExcedidaError(lote.superficieHa, disponible);
  }

  private async conUbicacionUnica<T>(lote: Lote, operacion: () => Promise<T>): Promise<T> {
    try { return await operacion(); } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505' && 'constraint' in error
        && error.constraint === 'lotes_sector_activo_unique') throw new UbicacionLoteSuperpuestaError(lote.ubicacionSector ?? '');
      throw error;
    }
  }

  async guardar(lote: Lote): Promise<void> {
    await this.conUbicacionUnica(lote, () => this.db.transaction(async (tx) => {
      await this.validarSuperficieDisponible(tx, lote);
      await tx.insert(lotesTable).values(this.valores(lote));
    }));
  }
  async actualizar(lote: Lote, versionEsperada?: string): Promise<void> {
    await this.conUbicacionUnica(lote, () => this.db.transaction(async (tx) => {
      const [actual] = await tx.select({ id: lotesTable.id, estado: lotesTable.estadoTerritorial,
        igual: versionEsperada ? sql<boolean>`${lotesTable.actualizadoEn} = ${versionEsperada}::timestamptz` : sql<boolean>`true` })
        .from(lotesTable).where(eq(lotesTable.id, lote.id)).for('update');
      if (actual && !actual.igual) throw new ConflictoModificacionError();
      if (lote.estadoTerritorial !== 'INACTIVO') await this.validarSuperficieDisponible(tx, lote, lote.id);
      const [activo] = await tx.select({ id: ciclosProductivosTable.id }).from(ciclosProductivosTable)
        .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
        .where(and(eq(plantacionesTable.loteId, lote.id), eq(ciclosProductivosTable.estado, 'ACTIVO'))).limit(1);
      if (activo && lote.estadoTerritorial !== 'EN_PRODUCCION') {
        throw new CicloProductivoInvalidoError('El lote debe permanecer EN_PRODUCCION mientras tenga ciclos activos.');
      }
      const [ocupacion] = await tx.select({ total: sql<string>`coalesce(sum(${plantacionesTable.superficieHa}), 0)` })
        .from(plantacionesTable).where(and(eq(plantacionesTable.loteId, lote.id), eq(plantacionesTable.estado, 'ACTIVA')));
      Plantacion.validarCapacidad(lote.superficieHa ?? 0, Number(ocupacion?.total ?? 0));
      await tx.update(lotesTable).set(this.valores(lote)).where(eq(lotesTable.id, lote.id));
    }));
  }
  async buscarPorId(id: string) {
    const [fila] = await this.db.select().from(lotesTable).where(eq(lotesTable.id, id)).limit(1);
    return fila ? this.mapear(fila) : null;
  }
  async buscarPorCodigo(codigo: CodigoLote | string) {
    const valor = typeof codigo === 'string' ? codigo.toUpperCase() : codigo.value;
    const [fila] = await this.db.select().from(lotesTable).where(eq(lotesTable.codigoLote, valor)).limit(1);
    return fila ? this.mapear(fila) : null;
  }
  async existeCodigo(codigo: string) { return Boolean(await this.buscarPorCodigo(codigo)); }

  async listarTodos(filtro?: ListarLotesFiltros) {
    const condiciones = [];
    if (filtro?.fincaId) condiciones.push(eq(lotesTable.fincaId, filtro.fincaId));
    if (filtro?.estado) condiciones.push(eq(lotesTable.estadoActual, filtro.estado));
    if (filtro?.estadoTerritorial) condiciones.push(eq(lotesTable.estadoTerritorial, filtro.estadoTerritorial));
    if (filtro?.codigo) condiciones.push(ilike(lotesTable.codigoLote, `%${filtro.codigo}%`));
    if (filtro?.nombre) condiciones.push(ilike(lotesTable.nombreTerritorial, `%${filtro.nombre}%`));
    if (filtro?.sector) condiciones.push(ilike(lotesTable.ubicacionSector, `%${filtro.sector}%`));
    if (filtro?.producto) condiciones.push(ilike(lotesTable.producto, `%${filtro.producto}%`));
    if (filtro?.superficieMinHa !== undefined) condiciones.push(sql`${lotesTable.superficieHa} >= ${filtro.superficieMinHa}`);
    if (filtro?.superficieMaxHa !== undefined) condiciones.push(sql`${lotesTable.superficieHa} <= ${filtro.superficieMaxHa}`);
    const filas = await this.db.select().from(lotesTable).where(condiciones.length ? and(...condiciones) : undefined)
      .limit(filtro?.limit ?? 500).offset(filtro?.offset ?? 0);
    return filas.map((fila) => this.mapear(fila));
  }

  async sumarSuperficieActiva(fincaId: string, excluirLoteId?: string): Promise<number> {
    const condiciones = [eq(lotesTable.fincaId, fincaId), ne(lotesTable.estadoTerritorial, 'INACTIVO')];
    if (excluirLoteId) condiciones.push(ne(lotesTable.id, excluirLoteId));
    const [fila] = await this.db.select({ total: sql<string>`coalesce(sum(${lotesTable.superficieHa}), 0)` })
      .from(lotesTable).where(and(...condiciones));
    return Number(fila?.total ?? 0);
  }

  private valores(lote: Lote) {
    const j = lote.toJSON();
    return {
      id: j.id, codigoLote: j.codigoLote, producto: j.producto, variedad: j.variedad,
      estadoActual: j.estadoActual, cantidadActual: String(j.cantidadActual), unidadMedida: j.unidadMedida,
      fincaId: j.fincaId, superficieHa: j.superficieHa == null ? null : String(j.superficieHa),
      geometria: j.geometria, nombreTerritorial: j.nombreTerritorial,
      ubicacionSector: j.ubicacionSector, tipoSuelo: j.tipoSuelo, sistemaRiego: j.sistemaRiego,
      estadoTerritorial: j.estadoTerritorial, fechaRegistro: j.fechaRegistro, actualizadoEn: j.actualizadoEn,
    };
  }

  private mapear(f: typeof lotesTable.$inferSelect): Lote {
    return Lote.reconstituir({
      id: f.id, codigoLote: CodigoLote.crear(f.codigoLote), producto: f.producto,
      variedad: f.variedad, estadoActual: f.estadoActual as Lote['estadoActual'],
      cantidadActual: Number(f.cantidadActual), unidadMedida: f.unidadMedida, fincaId: f.fincaId,
      superficieHa: f.superficieHa == null ? null : Number(f.superficieHa),
      geometria: f.geometria as ReturnType<Lote['toJSON']>['geometria'],
      nombreTerritorial: f.nombreTerritorial, ubicacionSector: f.ubicacionSector,
      tipoSuelo: f.tipoSuelo, sistemaRiego: f.sistemaRiego,
      estadoTerritorial: f.estadoTerritorial as Lote['estadoTerritorial'], fechaRegistro: f.fechaRegistro,
      creadoEn: f.creadoEn, actualizadoEn: f.actualizadoEn,
    });
  }
}
