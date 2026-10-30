import { eq, ilike, and, ne, sql } from 'drizzle-orm';
import { Finca } from '../../../core/domain/entities/finca.entity.js';
import { FincasRepositoryPort, ListarFincasFiltros } from '../../../core/ports/fincas-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { fincasTable, lotesTable } from '../schema/tables.js';
import { ConflictoModificacionError } from '../../../core/domain/errors/domain.error.js';
import { SuperficieFincaInsuficienteError } from '../../../application/use-cases/finca-territorial.use-cases.js';

export class DrizzleFincasRepository implements FincasRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(finca: Finca): Promise<void> {
    await this.db.insert(fincasTable).values(this.valores(finca));
  }

  /** CU02: bajo bloqueo de la finca, valida la versión leída y que la superficie cubra los lotes no inactivos. */
  async actualizar(finca: Finca, versionEsperada?: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [actual] = await tx.select({ id: fincasTable.id,
        igual: versionEsperada ? sql<boolean>`${fincasTable.actualizadoEn} = ${versionEsperada}::timestamptz` : sql<boolean>`true` })
        .from(fincasTable).where(eq(fincasTable.id, finca.id)).for('update');
      if (actual && !actual.igual) throw new ConflictoModificacionError();
      const [asignada] = await tx.select({ total: sql<string>`coalesce(sum(${lotesTable.superficieHa}), 0)` }).from(lotesTable)
        .where(and(eq(lotesTable.fincaId, finca.id), ne(lotesTable.estadoTerritorial, 'INACTIVO')));
      const total = Number(asignada?.total ?? 0);
      if (finca.superficieTotalHa < total) throw new SuperficieFincaInsuficienteError(finca.superficieTotalHa, total);
      await tx.update(fincasTable).set(this.valores(finca)).where(eq(fincasTable.id, finca.id));
    });
  }

  async buscarPorId(id: string): Promise<Finca | null> {
    const [fila] = await this.db.select().from(fincasTable).where(eq(fincasTable.id, id)).limit(1);
    return fila ? this.mapear(fila) : null;
  }

  async listarTodas(filtro?: ListarFincasFiltros): Promise<Finca[]> {
    const condiciones = [];
    if (filtro?.provincia) condiciones.push(ilike(fincasTable.provincia, `%${filtro.provincia}%`));
    if (filtro?.departamento) condiciones.push(ilike(fincasTable.departamento, `%${filtro.departamento}%`));
    if (filtro?.nombre) condiciones.push(ilike(fincasTable.nombre, `%${filtro.nombre}%`));
    const consulta = this.db.select().from(fincasTable).where(condiciones.length ? and(...condiciones) : undefined)
      .limit(filtro?.limit ?? 100).offset(filtro?.offset ?? 0);
    return (await consulta).map((fila) => this.mapear(fila));
  }

  async existeNombre(nombre: string): Promise<boolean> {
    const [fila] = await this.db.select({ id: fincasTable.id }).from(fincasTable)
      .where(ilike(fincasTable.nombre, nombre.trim())).limit(1);
    return Boolean(fila);
  }

  private valores(finca: Finca) {
    const json = finca.toJSON();
    return {
      id: json.id, nombre: json.nombre, localidad: json.ubicacion.localidad,
      departamento: json.ubicacion.departamento, provincia: json.ubicacion.provincia,
      superficieTotalHa: String(json.superficieTotalHa), responsableId: json.responsableId,
      renspa: json.renspa, geometria: json.geometria, propietario: json.propietario,
      telefono: json.telefono, observaciones: json.observaciones, actualizadoEn: json.actualizadoEn,
    };
  }

  private mapear(fila: typeof fincasTable.$inferSelect): Finca {
    return Finca.reconstituir({
      id: fila.id, nombre: fila.nombre,
      ubicacion: { localidad: fila.localidad, departamento: fila.departamento, provincia: fila.provincia },
      superficieTotalHa: Number(fila.superficieTotalHa), responsableId: fila.responsableId,
      renspa: fila.renspa, geometria: fila.geometria as ReturnType<Finca['toJSON']>['geometria'],
      propietario: fila.propietario, telefono: fila.telefono, observaciones: fila.observaciones,
      creadoEn: fila.creadoEn, actualizadoEn: fila.actualizadoEn,
    });
  }
}
