import { and, eq, ilike, ne, sql } from 'drizzle-orm';
import { Lote } from '../../../core/domain/entities/lote.entity.js';
import { Plantacion } from '../../../core/domain/entities/plantacion.entity.js';
import { CodigoLote } from '../../../core/domain/value-objects/codigo-lote.vo.js';
import { ListarLotesFiltros, LotesRepositoryPort } from '../../../core/ports/lotes-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { lotesTable, plantacionesTable } from '../schema/tables.js';

export class DrizzleLotesTerritorialesRepository implements LotesRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(lote: Lote): Promise<void> { await this.db.insert(lotesTable).values(this.valores(lote)); }
  async actualizar(lote: Lote): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.select({ id: lotesTable.id }).from(lotesTable).where(eq(lotesTable.id, lote.id)).for('update');
      const [ocupacion] = await tx.select({ total: sql<string>`coalesce(sum(${plantacionesTable.superficieHa}), 0)` })
        .from(plantacionesTable).where(and(eq(plantacionesTable.loteId, lote.id), eq(plantacionesTable.estado, 'ACTIVA')));
      Plantacion.validarCapacidad(lote.superficieHa ?? 0, Number(ocupacion?.total ?? 0));
      await tx.update(lotesTable).set(this.valores(lote)).where(eq(lotesTable.id, lote.id));
    });
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
