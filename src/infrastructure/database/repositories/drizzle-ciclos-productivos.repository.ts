import { randomUUID } from 'node:crypto';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { CicloProductivo } from '../../../core/domain/entities/ciclo-productivo.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { CicloProductivoInvalidoError, CodigoCicloDuplicadoError, DatosPlanificacionCiclo } from '../../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { ConsultarCiclosFiltros, CiclosProductivosRepositoryPort } from '../../../core/ports/ciclos-productivos-repository.port.js';
import { ListarCiclosFiltros } from '../../../core/ports/ciclos-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { DrizzleCierreCicloGuard } from '../cierre-ciclo.guard.js';
import { ciclosProductivosTable as ciclos, cultivosTable, lotesTable, plantacionesTable, variedadesTable } from '../schema/tables.js';
import { consultaCiclos, mapearCiclo } from './ciclos-productivos.mapping.js';

export class DrizzleCiclosProductivosRepository implements CiclosProductivosRepositoryPort {
  constructor(private readonly db: AgrulDatabase, private readonly cierre: DrizzleCierreCicloGuard) {}

  async registrar(datos: DatosPlanificacionCiclo & { id: string }): Promise<CicloProductivo> {
    try {
      return await this.db.transaction(async (tx) => {
        const [origen] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, datos.plantacionId));
        if (!origen) throw new EntidadNoEncontradaError('Plantación', datos.plantacionId);
        const [lote] = await tx.select().from(lotesTable).where(eq(lotesTable.id, origen.loteId)).for('update');
        const [plantacion] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, origen.id)).for('update');
        if (!plantacion || plantacion.estado !== 'ACTIVA' || !lote || lote.estadoTerritorial === 'INACTIVO') {
          throw new CicloProductivoInvalidoError('El ciclo requiere una plantación activa en un lote no inactivo.');
        }
        const [cultivo] = await tx.select().from(cultivosTable).where(eq(cultivosTable.id, plantacion.cultivoId));
        const [variedad] = await tx.select().from(variedadesTable).where(eq(variedadesTable.id, plantacion.variedadId));
        const ciclo = CicloProductivo.planificar(datos, { loteId: lote.id, cultivo: cultivo.nombre, variedad: variedad.nombre,
          superficieHa: Number(plantacion.superficieHa), fechaPlantacion: plantacion.fechaPlantacion,
          cantidadInicialPlantas: plantacion.cantidadInicialPlantas });
        await tx.insert(ciclos).values({ ...ciclo.toPlanificacionJSON(), creadoEn: ciclo.creadoEn, actualizadoEn: ciclo.actualizadoEn });
        return ciclo;
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && error.constraint === 'ciclos_productivos_nombre_codigo_unique') throw new CodigoCicloDuplicadoError();
      throw error;
    }
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
      ciclo.iniciar(fecha, plantacion.fechaPlantacion);
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
