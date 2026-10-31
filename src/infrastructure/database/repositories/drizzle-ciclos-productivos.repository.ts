import { randomUUID } from 'node:crypto';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { CicloProductivo } from '../../../core/domain/entities/ciclo-productivo.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { CicloProductivoInvalidoError, CodigoCicloDuplicadoError, DatosPlanificacionCiclo } from '../../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { ConsultarCiclosFiltros, CiclosProductivosRepositoryPort } from '../../../core/ports/ciclos-productivos-repository.port.js';
import { ListarCiclosFiltros } from '../../../core/ports/ciclos-repository.port.js';
import { alcanceFincasPorLote } from '../alcance-fincas-agricolas.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { DrizzleCierreCicloGuard } from '../cierre-ciclo.guard.js';
import { ciclosProductivosTable as ciclos, cultivosTable, lotesTable, plantacionesTable, usuariosTable, variedadesTable } from '../schema/tables.js';
import { consultaCiclos, mapearCiclo } from './ciclos-productivos.mapping.js';

/**
 * CU18/CU20: dos ciclos de la misma plantación no pueden superponerse. Se compara el período vigente de cada ciclo:
 * fechas efectivas cuando existen y, si no, las previstas.
 */
async function validarSinSuperposicion(tx: AgrulTransaction, plantacionId: string, inicio: string, fin: string, excluirId?: string) {
  const condiciones = [eq(ciclos.plantacionId, plantacionId),
    sql`coalesce(${ciclos.fechaInicioEfectiva}, ${ciclos.fechaInicioPrevista}) <= ${fin}::date`,
    sql`coalesce(${ciclos.fechaFinEfectiva}, ${ciclos.fechaFinPrevista}) >= ${inicio}::date`];
  if (excluirId) condiciones.push(ne(ciclos.id, excluirId));
  const [conflicto] = await tx.select({ nombre: ciclos.nombreCodigo }).from(ciclos).where(and(...condiciones)).limit(1);
  if (conflicto) {
    throw new CicloProductivoInvalidoError(`El período se superpone con el ciclo '${conflicto.nombre}' de la misma plantación.`);
  }
}

export class DrizzleCiclosProductivosRepository implements CiclosProductivosRepositoryPort {
  constructor(private readonly db: AgrulDatabase, private readonly cierre: DrizzleCierreCicloGuard) {}

  async registrar(datos: DatosPlanificacionCiclo & { id: string }): Promise<CicloProductivo> {
    try {
      return await this.db.transaction(async (tx) => {
        const [responsable] = await tx.select({ estado: usuariosTable.estado }).from(usuariosTable)
          .where(eq(usuariosTable.id, datos.responsableSeguimientoId)).for('share');
        if (!responsable) throw new EntidadNoEncontradaError('Responsable del ciclo', datos.responsableSeguimientoId);
        if (responsable.estado !== 'ACTIVO') throw new CicloProductivoInvalidoError('El responsable del ciclo debe ser un usuario activo.');
        const [origen] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, datos.plantacionId));
        if (!origen) throw new EntidadNoEncontradaError('Plantación', datos.plantacionId);
        const [lote] = await tx.select().from(lotesTable).where(eq(lotesTable.id, origen.loteId)).for('update');
        const [plantacion] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, origen.id)).for('update');
        if (!plantacion || plantacion.estado !== 'ACTIVA' || !lote || lote.estadoTerritorial === 'INACTIVO') {
          throw new CicloProductivoInvalidoError('El ciclo requiere una plantación activa en un lote no inactivo.');
        }
        const [cultivo] = await tx.select().from(cultivosTable).where(eq(cultivosTable.id, plantacion.cultivoId)).for('share');
        const [variedad] = await tx.select().from(variedadesTable).where(eq(variedadesTable.id, plantacion.variedadId)).for('share');
        const [repetido] = await tx.select({ id: ciclos.id }).from(ciclos).where(and(eq(ciclos.plantacionId, plantacion.id),
          sql`lower(${ciclos.nombreCodigo}) = lower(${datos.nombreCodigo.trim()})`)).limit(1);
        if (repetido) throw new CodigoCicloDuplicadoError();
        await validarSinSuperposicion(tx, plantacion.id, datos.fechaInicioPrevista, datos.fechaFinPrevista);
        const ciclo = CicloProductivo.planificar(datos, { loteId: lote.id, cultivo: cultivo.nombre, variedad: variedad.nombre,
          superficieHa: Number(plantacion.superficieHa), fechaPlantacion: plantacion.fechaPlantacion,
          cantidadInicialPlantas: plantacion.cantidadInicialPlantas });
        await tx.insert(ciclos).values({ ...ciclo.toPlanificacionJSON(), creadoEn: ciclo.creadoEn, actualizadoEn: ciclo.actualizadoEn });
        return ciclo;
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && ['ciclos_productivos_nombre_codigo_unique', 'ciclos_plantacion_codigo_ci_unique'].includes(String(error.constraint))) throw new CodigoCicloDuplicadoError();
      throw error;
    }
  }

  async resumen(id: string) {
    const [ciclo] = await this.db.select({ estado: ciclos.estado }).from(ciclos).where(eq(ciclos.id, id));
    if (!ciclo) return null;
    const una = async <T extends Record<string, unknown>>(consulta: ReturnType<typeof sql>) => (await this.db.execute<T>(consulta)).rows;
    const [labores] = await una<{ cantidad: string; superficie: string | null }>(sql`SELECT count(*) AS cantidad, sum(superficie_trabajada)::text AS superficie
      FROM actividades_realizadas WHERE ciclo_id = ${id}::uuid`);
    const [monitoreos] = await una<{ cantidad: string }>(sql`SELECT count(*) AS cantidad FROM monitoreos WHERE ciclo_id = ${id}::uuid`);
    // Una corrección (CU40) reemplaza la aplicación anterior: solo cuentan las versiones vigentes.
    const vigentes = sql`FROM aplicaciones_insumo a JOIN actividades_realizadas r ON r.id = a.actividad_realizada_id
      WHERE r.ciclo_id = ${id}::uuid AND NOT EXISTS (SELECT 1 FROM correcciones_aplicaciones_insumo c WHERE c.aplicacion_anterior_id = a.id)`;
    const [aplicaciones] = await una<{ cantidad: string }>(sql`SELECT count(*) AS cantidad ${vigentes}`);
    const insumos = await una<{ insumo_id: string; codigo: string; nombre: string; unidad: string; total: string }>(sql`
      SELECT i.id AS insumo_id, i.codigo, i.nombre, i.unidad_medida AS unidad, sum(it.cantidad_aplicada)::text AS total
      FROM aplicaciones_insumo_items it JOIN insumos i ON i.id = it.insumo_id
      WHERE it.aplicacion_id IN (SELECT a.id ${vigentes}) GROUP BY i.id, i.codigo, i.nombre, i.unidad_medida ORDER BY i.codigo`);
    const [cosechas] = await una<{ cantidad: string; total: string | null }>(sql`SELECT count(*) AS cantidad, sum(cantidad_cosechada_kg)::text AS total
      FROM cosechas WHERE ciclo_id = ${id}::uuid`);
    const cantidadLabores = Number(labores?.cantidad ?? 0);
    const cantidadCosechas = Number(cosechas?.cantidad ?? 0);
    return { cicloId: id, estado: ciclo.estado,
      actividadesRealizadas: { cantidad: cantidadLabores, superficieTrabajadaHa: labores?.superficie == null ? null : Number(labores.superficie) },
      monitoreos: { cantidad: Number(monitoreos?.cantidad ?? 0) },
      aplicacionesInsumos: { cantidad: Number(aplicaciones?.cantidad ?? 0), insumos: insumos.map(x => ({
        insumoId: x.insumo_id, codigo: x.codigo, nombre: x.nombre, unidadMedida: x.unidad, cantidadTotal: Number(x.total) })) },
      cosechas: { cantidad: cantidadCosechas, totalCosechadoKg: cantidadCosechas ? Number(cosechas?.total) : null } };
  }

  async guardar(ciclo: CicloProductivo): Promise<void> {
    const dto = ciclo.toPlanificacionJSON();
    if (dto.estado !== 'PLANIFICADO') throw new CicloProductivoInvalidoError('Las transiciones requieren iniciar/finalizar con sus validaciones transaccionales.');
    await this.registrar({ id: dto.id, plantacionId: dto.plantacionId, nombreCodigo: dto.nombreCodigo,
      fechaInicioPrevista: dto.fechaInicioPrevista, fechaFinPrevista: dto.fechaFinPrevista,
      responsableSeguimientoId: dto.responsableSeguimientoId, observaciones: dto.observaciones });
  }

  async buscarPorId(id: string): Promise<CicloProductivo | null> {
    const [fila] = await consultaCiclos(this.db).where(eq(ciclos.id, id));
    return fila ? mapearCiclo(fila) : null;
  }
  async buscarPorCodigo(codigo: string): Promise<CicloProductivo | null> {
    const [fila] = await consultaCiclos(this.db).where(eq(ciclos.nombreCodigo, codigo));
    return fila ? mapearCiclo(fila) : null;
  }
  async buscarPorLote(loteId: string) { return this.listar({ loteId }); }
  async buscarCicloAbiertoPorLote(loteId: string): Promise<CicloProductivo | null> {
    const [fila] = await consultaCiclos(this.db).where(and(eq(plantacionesTable.loteId, loteId), eq(ciclos.estado, 'ACTIVO'))).limit(1);
    return fila ? mapearCiclo(fila) : null;
  }
  async siguienteCodigo() { return `CICLO-${randomUUID().replaceAll('-', '').slice(0, 24)}`; }

  async consultar(filtros: ConsultarCiclosFiltros): Promise<CicloProductivo[]> {
    const condiciones = [];
    if (filtros.plantacionId) condiciones.push(eq(ciclos.plantacionId, filtros.plantacionId));
    if (filtros.loteId) condiciones.push(eq(plantacionesTable.loteId, filtros.loteId));
    if (filtros.estado) condiciones.push(eq(ciclos.estado, filtros.estado));
    const alcance = alcanceFincasPorLote(this.db, plantacionesTable.loteId, filtros.fincaIds);
    if (alcance) condiciones.push(alcance);
    return (await consultaCiclos(this.db).where(and(...condiciones)).orderBy(asc(ciclos.nombreCodigo), asc(ciclos.id))
      .limit(filtros.limit).offset(filtros.offset)).map(mapearCiclo);
  }
  async listar(filtros: ListarCiclosFiltros = {}): Promise<CicloProductivo[]> {
    const condiciones = [];
    if (filtros.loteId) condiciones.push(eq(plantacionesTable.loteId, filtros.loteId));
    if (filtros.cultivo) condiciones.push(sql`lower(${cultivosTable.nombre}) = lower(${filtros.cultivo})`);
    if (filtros.variedad) condiciones.push(sql`lower(${variedadesTable.nombre}) = lower(${filtros.variedad})`);
    if (filtros.estado) condiciones.push(eq(ciclos.estado, filtros.estado === 'ABIERTO' ? 'ACTIVO' : filtros.estado === 'CERRADO' ? 'FINALIZADO' : filtros.estado));
    const resultado = (await consultaCiclos(this.db).where(and(...condiciones))).map(mapearCiclo);
    return filtros.temporada ? resultado.filter((c) => c.temporada === filtros.temporada) : resultado;
  }

  async iniciar(id: string, fecha: string) {
    return this.db.transaction((tx) => this.transicionar(tx, id, fecha, true));
  }
  async finalizar(id: string, fecha: string) {
    return this.cierre.ejecutar(id, (tx) => this.transicionar(tx, id, fecha, false));
  }

  private async transicionar(tx: AgrulTransaction, id: string, fecha: string, iniciar: boolean): Promise<CicloProductivo | null> {
    const [referencia] = await consultaCiclos(tx).where(eq(ciclos.id, id));
    if (!referencia) return null;
    const [lote] = await tx.select().from(lotesTable).where(eq(lotesTable.id, referencia.plantacion.loteId)).for('update');
    const [plantacion] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, referencia.plantacion.id)).for('update');
    await tx.select({ id: ciclos.id }).from(ciclos).where(eq(ciclos.id, id)).for('update');
    const [fila] = await consultaCiclos(tx).where(eq(ciclos.id, id));
    const ciclo = mapearCiclo(fila);
    if (iniciar) {
      if (plantacion.estado !== 'ACTIVA' || lote.estadoTerritorial === 'INACTIVO') {
        throw new CicloProductivoInvalidoError('El inicio requiere plantación activa y lote no inactivo.');
      }
      const [activo] = await tx.select({ nombre: ciclos.nombreCodigo }).from(ciclos)
        .where(and(eq(ciclos.plantacionId, plantacion.id), eq(ciclos.estado, 'ACTIVO'), ne(ciclos.id, id))).limit(1);
      if (activo) {
        throw new CicloProductivoInvalidoError(`La plantación ya tiene un ciclo activo ('${activo.nombre}'); debe finalizarse antes de iniciar otro.`);
      }
      ciclo.iniciar(fecha, plantacion.fechaPlantacion);
      const finPrevisto = ciclo.toPlanificacionJSON().fechaFinPrevista;
      await validarSinSuperposicion(tx, plantacion.id, fecha, finPrevisto > fecha ? finPrevisto : fecha, id);
    } else ciclo.finalizar(fecha);
    const dto = ciclo.toPlanificacionJSON();
    await tx.update(ciclos).set({ estado: dto.estado, fechaInicioEfectiva: dto.fechaInicioEfectiva,
      fechaFinEfectiva: dto.fechaFinEfectiva, actualizadoEn: ciclo.actualizadoEn }).where(eq(ciclos.id, id));
    const [otroActivo] = await tx.select({ id: ciclos.id }).from(ciclos)
      .innerJoin(plantacionesTable, eq(ciclos.plantacionId, plantacionesTable.id))
      .where(and(eq(plantacionesTable.loteId, lote.id), eq(ciclos.estado, 'ACTIVO'), ne(ciclos.id, id))).limit(1);
    await tx.update(lotesTable).set({ estadoTerritorial: iniciar || otroActivo ? 'EN_PRODUCCION' : 'DISPONIBLE', actualizadoEn: ciclo.actualizadoEn })
      .where(eq(lotesTable.id, lote.id));
    return ciclo;
  }
}
