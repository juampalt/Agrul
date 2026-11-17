import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { AgrulDatabase, AgrulTransaction } from './connection.js';
import {
  fincasTable,
  lotesTable,
  eventosTrazabilidadTable,
  cosechasTable,
  usuariosTable,
  auditoriaSeguridadLogTable,
  eventosClimaticosTable,
  eventosClimaticosLotesTable,
} from './schema/tables.js';
import { cultivosTable } from './schema/cultivos.js';
import { variedadesTable } from './schema/variedades.js';
import { plantacionesTable } from './schema/plantaciones.js';
import { ciclosProductivosTable } from './schema/ciclos-productivos.js';
import { actividadesRealizadasTable } from './schema/actividades-realizadas.js';
import { tiposActividadTable, CategoriaTipoActividad } from './schema/tipos-actividad.js';
import { monitoreosTable } from './schema/monitoreos.js';
import {
  insumosTable,
  partidasInsumoTable,
  aplicacionesInsumoTable,
  aplicacionesInsumoItemsTable,
} from './schema/insumos.js';
import { DomainError, EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';

export type TipoRegistroUnificado = 'FUMIGACION' | 'COSECHA' | 'LABOR' | 'OBSERVACION' | 'EDICION';

class ProduccionDomainError extends DomainError {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface FincaResumenDto {
  id: string;
  nombre: string;
  propietario: string | null;
  localidad: string;
  departamento: string;
  provincia: string;
  observaciones: string | null;
  hectareasTotales: number;
  hectareasAsignadas: number;
  hectareasDisponibles: number;
  produccionesActivas: number;
}

export interface ProduccionResumenDto {
  id: string;
  codigo: string;
  loteId: string;
  plantacionId: string;
  fincaId: string;
  cultivoId: string;
  cultivoNombre: string;
  variedadId: string;
  variedadNombre: string;
  hectareas: number;
  fechaInicio: string;
  fechaFin: string | null;
  estado: 'ACTIVA' | 'FINALIZADA';
  ultimoRegistroEn: string;
  kgCosechados: number;
  kgComercializable: number;
  totalRegistros: number;
  carenciaActivaHasta: string | null;
}

export interface TimelineItemDto {
  id: string;
  tipo: TipoRegistroUnificado;
  fecha: string;
  titulo: string;
  detalle: string;
  usuarioNombre: string;
  datos: Record<string, unknown>;
}

function hoyIsoTucuman(): string {
  const ahora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return ahora.toISOString().slice(0, 10);
}

function sumarDiasIso(fechaIso: string, dias: number): string {
  const base = new Date(`${fechaIso.slice(0, 10)}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

export class ProduccionesService {
  constructor(private readonly db: AgrulDatabase) {}

  private async registrarAuditoria(
    tx: AgrulTransaction,
    usuarioId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    valorNuevoJson: Record<string, unknown>,
    valorPrevioJson?: Record<string, unknown>,
  ) {
    await tx.insert(auditoriaSeguridadLogTable).values({
      usuarioId,
      accion,
      entidad,
      entidadId,
      valorPrevioJson: valorPrevioJson ?? null,
      valorNuevoJson,
    });
  }

  private async obtenerFincaPrincipal(tx: AgrulDatabase | AgrulTransaction = this.db) {
    const fincas = await tx.select().from(fincasTable).orderBy(asc(fincasTable.creadoEn)).limit(1);
    if (fincas.length === 0) {
      throw new EntidadNoEncontradaError('Finca', 'principal');
    }
    return fincas[0];
  }

  private async calcularHectareasAsignadas(
    tx: AgrulDatabase | AgrulTransaction,
    fincaId: string,
  ): Promise<{ asignadas: number; activas: number }> {
    const rows = await tx
      .select({
        superficieHa: plantacionesTable.superficieHa,
      })
      .from(ciclosProductivosTable)
      .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
      .innerJoin(lotesTable, eq(plantacionesTable.loteId, lotesTable.id))
      .where(
        and(
          eq(lotesTable.fincaId, fincaId),
          inArray(ciclosProductivosTable.estado, ['ACTIVO', 'PLANIFICADO']),
        ),
      );

    let asignadas = 0;
    for (const r of rows) {
      asignadas += Number(r.superficieHa || 0);
    }
    return { asignadas: Number(asignadas.toFixed(2)), activas: rows.length };
  }

  async obtenerFincaResumen(txOpt?: AgrulDatabase | AgrulTransaction): Promise<FincaResumenDto> {
    const runner = txOpt ?? this.db;
    const finca = await this.obtenerFincaPrincipal(runner);
    const { asignadas, activas } = await this.calcularHectareasAsignadas(runner, finca.id);
    const totales = Number(finca.superficieTotalHa || 0);
    return {
      id: finca.id,
      nombre: finca.nombre,
      propietario: finca.propietario ?? null,
      localidad: finca.localidad,
      departamento: finca.departamento,
      provincia: finca.provincia,
      observaciones: finca.observaciones ?? null,
      hectareasTotales: totales,
      hectareasAsignadas: asignadas,
      hectareasDisponibles: Number(Math.max(0, totales - asignadas).toFixed(2)),
      produccionesActivas: activas,
    };
  }

  async actualizarFincaConfig(
    input: {
      nombre: string;
      hectareasTotales: number;
      localidad: string;
      provincia: string;
      departamento?: string;
      propietario?: string | null;
      observaciones?: string | null;
    },
    actorId: string,
  ): Promise<FincaResumenDto> {
    return this.db.transaction(async (tx) => {
      const finca = await this.obtenerFincaPrincipal(tx);
      const { asignadas } = await this.calcularHectareasAsignadas(tx, finca.id);
      if (input.hectareasTotales < asignadas) {
        throw new ProduccionDomainError(
          'SUPERFICIE_INSUFICIENTE',
          `Las hectáreas totales (${input.hectareasTotales} ha) no pueden ser menores a las asignadas a producciones activas (${asignadas} ha).`,
          422,
        );
      }

      await tx
        .update(fincasTable)
        .set({
          nombre: input.nombre.trim(),
          superficieTotalHa: input.hectareasTotales.toFixed(2),
          localidad: input.localidad.trim(),
          provincia: input.provincia.trim(),
          departamento: (input.departamento || input.localidad).trim(),
          propietario: input.propietario?.trim() || null,
          observaciones: input.observaciones?.trim() || null,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(fincasTable.id, finca.id));

      await this.registrarAuditoria(
        tx,
        actorId,
        'EDITAR',
        'FINCA',
        finca.id,
        { nombre: input.nombre, superficieTotalHa: input.hectareasTotales },
        { nombre: finca.nombre, superficieTotalHa: Number(finca.superficieTotalHa) },
      );

      return this.obtenerFincaResumen(tx);
    });
  }

  async listarProducciones(estadoFiltro?: 'ACTIVA' | 'FINALIZADA' | 'TODAS'): Promise<ProduccionResumenDto[]> {
    const ciclos = await this.db
      .select({
        id: ciclosProductivosTable.id,
        nombreCodigo: ciclosProductivosTable.nombreCodigo,
        estadoCiclo: ciclosProductivosTable.estado,
        fechaInicioEfectiva: ciclosProductivosTable.fechaInicioEfectiva,
        fechaInicioPrevista: ciclosProductivosTable.fechaInicioPrevista,
        fechaFinEfectiva: ciclosProductivosTable.fechaFinEfectiva,
        creadoEn: ciclosProductivosTable.creadoEn,
        actualizadoEn: ciclosProductivosTable.actualizadoEn,
        plantacionId: plantacionesTable.id,
        superficieHa: plantacionesTable.superficieHa,
        loteId: lotesTable.id,
        fincaId: lotesTable.fincaId,
        cultivoId: cultivosTable.id,
        cultivoNombre: cultivosTable.nombre,
        variedadId: variedadesTable.id,
        variedadNombre: variedadesTable.nombre,
      })
      .from(ciclosProductivosTable)
      .innerJoin(plantacionesTable, eq(ciclosProductivosTable.plantacionId, plantacionesTable.id))
      .innerJoin(lotesTable, eq(plantacionesTable.loteId, lotesTable.id))
      .innerJoin(cultivosTable, eq(plantacionesTable.cultivoId, cultivosTable.id))
      .innerJoin(variedadesTable, eq(plantacionesTable.variedadId, variedadesTable.id))
      .orderBy(desc(ciclosProductivosTable.creadoEn));

    if (ciclos.length === 0) return [];

    const cicloIds = ciclos.map((c) => c.id);
    const loteIds = [...new Set(ciclos.map((c) => c.loteId))];

    const [cosechasRows, actRows, monRows, evRows] = await Promise.all([
      this.db.select().from(cosechasTable).where(inArray(cosechasTable.cicloId, cicloIds)),
      this.db.select().from(actividadesRealizadasTable).where(inArray(actividadesRealizadasTable.cicloId, cicloIds)),
      this.db.select().from(monitoreosTable).where(inArray(monitoreosTable.cicloId, cicloIds)),
      this.db.select().from(eventosTrazabilidadTable).where(inArray(eventosTrazabilidadTable.loteId, loteIds)),
    ]);

    const hoy = hoyIsoTucuman();
    const resultado: ProduccionResumenDto[] = [];

    for (const c of ciclos) {
      const estado: 'ACTIVA' | 'FINALIZADA' = c.estadoCiclo === 'FINALIZADO' ? 'FINALIZADA' : 'ACTIVA';
      if (estadoFiltro && estadoFiltro !== 'TODAS' && estado !== estadoFiltro) continue;

      const cos = cosechasRows.filter((x) => x.cicloId === c.id && x.estado !== 'ANULADA');
      const acts = actRows.filter((x) => x.cicloId === c.id);
      const mons = monRows.filter((x) => x.cicloId === c.id);
      const evs = evRows.filter((x) => x.loteId === c.loteId);

      let kgCosechados = 0;
      let kgComercializable = 0;
      for (const item of cos) {
        kgCosechados += Number(item.cantidadCosechadaKg || 0);
        kgComercializable += Number(item.cantidadComercializableKg ?? item.cantidadCosechadaKg ?? 0);
      }

      const fechas: string[] = [c.creadoEn, c.actualizadoEn];
      for (const x of cos) fechas.push(x.creadoEn);
      for (const x of acts) fechas.push(x.creadoEn);
      for (const x of mons) fechas.push(x.creadoEn);
      for (const x of evs) fechas.push(x.timestampServidor);
      fechas.sort();
      const ultimoRegistroEn = fechas[fechas.length - 1] || c.creadoEn;

      let carenciaActivaHasta: string | null = null;
      for (const act of acts) {
        const dias = Number((act.datosEspecificos as Record<string, unknown>)?.diasCarencia ?? 0);
        if (dias > 0) {
          const hasta = sumarDiasIso(act.fechaEjecucion, dias);
          if (hasta > hoy && (!carenciaActivaHasta || hasta > carenciaActivaHasta)) {
            carenciaActivaHasta = hasta;
          }
        }
      }

      resultado.push({
        id: c.id,
        codigo: c.nombreCodigo,
        loteId: c.loteId,
        plantacionId: c.plantacionId,
        fincaId: c.fincaId || '',
        cultivoId: c.cultivoId,
        cultivoNombre: c.cultivoNombre,
        variedadId: c.variedadId,
        variedadNombre: c.variedadNombre,
        hectareas: Number(c.superficieHa),
        fechaInicio: c.fechaInicioEfectiva || c.fechaInicioPrevista,
        fechaFin: c.fechaFinEfectiva ?? null,
        estado,
        ultimoRegistroEn,
        kgCosechados: Number(kgCosechados.toFixed(2)),
        kgComercializable: Number(kgComercializable.toFixed(2)),
        totalRegistros: cos.length + acts.length + mons.length,
        carenciaActivaHasta,
      });
    }

    return resultado;
  }

  async crearProduccion(
    input: {
      cultivoId: string;
      variedadId: string;
      fechaInicio: string;
      hectareas: number;
      observaciones?: string;
    },
    actorId: string,
  ): Promise<ProduccionResumenDto> {
    if (!(input.hectareas > 0)) {
      throw new ProduccionDomainError('HECTAREAS_INVALIDAS', 'Las hectáreas destinadas deben ser mayores a 0.', 400);
    }

    return this.db.transaction(async (tx) => {
      const finca = await this.obtenerFincaPrincipal(tx);
      const { asignadas } = await this.calcularHectareasAsignadas(tx, finca.id);
      const disponibles = Number(finca.superficieTotalHa || 0) - asignadas;

      if (input.hectareas > disponibles + 0.0001) {
        throw new ProduccionDomainError(
          'SUPERFICIE_INSUFICIENTE',
          `Solo hay ${Math.max(0, disponibles).toFixed(2)} ha disponibles en la finca (solicitadas: ${input.hectareas} ha).`,
          422,
        );
      }

      const [cultivo] = await tx.select().from(cultivosTable).where(eq(cultivosTable.id, input.cultivoId));
      if (!cultivo) throw new EntidadNoEncontradaError('Cultivo', input.cultivoId);

      const [variedad] = await tx
        .select()
        .from(variedadesTable)
        .where(and(eq(variedadesTable.id, input.variedadId), eq(variedadesTable.cultivoId, input.cultivoId)));
      if (!variedad) throw new EntidadNoEncontradaError('Variedad', input.variedadId);

      const sufijo = Math.floor(1000 + Math.random() * 9000);
      const anio = input.fechaInicio.slice(0, 4);
      const codigo = `PROD-${anio}-${sufijo}`;

      const [lote] = await tx
        .insert(lotesTable)
        .values({
          codigoLote: codigo,
          producto: cultivo.nombre,
          variedad: variedad.nombre,
          estadoActual: 'EN_PROCESO',
          cantidadActual: '0',
          unidadMedida: 'kg',
          fincaId: finca.id,
          superficieHa: input.hectareas.toFixed(2),
          nombreTerritorial: `${cultivo.nombre} ${variedad.nombre}`,
          estadoTerritorial: 'OCUPADO',
          fechaRegistro: input.fechaInicio.slice(0, 10),
        })
        .returning();

      const [plantacion] = await tx
        .insert(plantacionesTable)
        .values({
          loteId: lote.id,
          cultivoId: cultivo.id,
          variedadId: variedad.id,
          fechaPlantacion: input.fechaInicio.slice(0, 10),
          superficieHa: input.hectareas.toFixed(2),
          cantidadInicialPlantas: Math.max(1, Math.round(input.hectareas * 400)),
          observaciones: input.observaciones?.trim() || null,
          estado: 'ACTIVA',
        })
        .returning();

      const fechaFinPrev = sumarDiasIso(input.fechaInicio.slice(0, 10), 180);
      const [ciclo] = await tx
        .insert(ciclosProductivosTable)
        .values({
          plantacionId: plantacion.id,
          nombreCodigo: codigo,
          fechaInicioPrevista: input.fechaInicio.slice(0, 10),
          fechaFinPrevista: fechaFinPrev,
          fechaInicioEfectiva: input.fechaInicio.slice(0, 10),
          responsableSeguimientoId: actorId,
          estado: 'ACTIVO',
          observaciones: input.observaciones?.trim() || null,
        })
        .returning();

      await tx.insert(eventosTrazabilidadTable).values({
        loteId: lote.id,
        actorId,
        ubicacionId: finca.id,
        tipoEvento: 'APERTURA_PRODUCCION',
        timestampCapturaLocal: new Date().toISOString(),
        payloadEspecifico: {
          cicloId: ciclo.id,
          cultivo: cultivo.nombre,
          variedad: variedad.nombre,
          hectareas: input.hectareas,
        },
      });

      await this.registrarAuditoria(tx, actorId, 'CREAR', 'PRODUCCION', ciclo.id, {
        codigo,
        cultivo: cultivo.nombre,
        variedad: variedad.nombre,
        hectareas: input.hectareas,
      });

      return {
        id: ciclo.id,
        codigo: ciclo.nombreCodigo,
        loteId: lote.id,
        plantacionId: plantacion.id,
        fincaId: finca.id,
        cultivoId: cultivo.id,
        cultivoNombre: cultivo.nombre,
        variedadId: variedad.id,
        variedadNombre: variedad.nombre,
        hectareas: input.hectareas,
        fechaInicio: input.fechaInicio.slice(0, 10),
        fechaFin: null,
        estado: 'ACTIVA',
        ultimoRegistroEn: ciclo.creadoEn,
        kgCosechados: 0,
        kgComercializable: 0,
        totalRegistros: 0,
        carenciaActivaHasta: null,
      };
    });
  }

  async finalizarProduccion(cicloId: string, actorId: string, motivo?: string): Promise<ProduccionResumenDto> {
    await this.db.transaction(async (tx) => {
      const [ciclo] = await tx.select().from(ciclosProductivosTable).where(eq(ciclosProductivosTable.id, cicloId));
      if (!ciclo) throw new EntidadNoEncontradaError('Producción', cicloId);
      if (ciclo.estado === 'FINALIZADO') {
        throw new ProduccionDomainError('PRODUCCION_YA_FINALIZADA', 'La producción ya se encuentra finalizada.', 409);
      }

      const [plantacion] = await tx
        .select()
        .from(plantacionesTable)
        .where(eq(plantacionesTable.id, ciclo.plantacionId));
      const [lote] = await tx.select().from(lotesTable).where(eq(lotesTable.id, plantacion.loteId));

      const hoy = hoyIsoTucuman();
      const inicio = ciclo.fechaInicioEfectiva || ciclo.fechaInicioPrevista;
      const fechaFin = hoy >= inicio ? hoy : inicio;

      await tx
        .update(ciclosProductivosTable)
        .set({
          estado: 'FINALIZADO',
          fechaInicioEfectiva: inicio,
          fechaFinEfectiva: fechaFin,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(ciclosProductivosTable.id, ciclo.id));

      await tx
        .update(plantacionesTable)
        .set({
          estado: 'FINALIZADA',
          fechaFinalizacion: fechaFin >= plantacion.fechaPlantacion ? fechaFin : plantacion.fechaPlantacion,
        })
        .where(eq(plantacionesTable.id, plantacion.id));

      await tx
        .update(lotesTable)
        .set({
          estadoActual: 'CERRADO',
          estadoTerritorial: 'DISPONIBLE',
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(lotesTable.id, lote.id));

      await tx.insert(eventosTrazabilidadTable).values({
        loteId: lote.id,
        actorId,
        ubicacionId: lote.fincaId || lote.id,
        tipoEvento: 'CIERRE_PRODUCCION',
        timestampCapturaLocal: new Date().toISOString(),
        payloadEspecifico: { cicloId: ciclo.id, motivo: motivo || 'Cierre de campaña' },
      });

      await this.registrarAuditoria(tx, actorId, 'FINALIZAR', 'PRODUCCION', ciclo.id, {
        codigo: ciclo.nombreCodigo,
        motivo: motivo || 'Cierre de campaña',
      });
    });

    const todas = await this.listarProducciones('TODAS');
    const encontrada = todas.find((p) => p.id === cicloId);
    if (!encontrada) throw new EntidadNoEncontradaError('Producción', cicloId);
    return encontrada;
  }

  async obtenerDetalleProduccion(
    cicloId: string,
    filtroTipo?: TipoRegistroUnificado | 'TODOS',
  ): Promise<{ produccion: ProduccionResumenDto; historial: TimelineItemDto[] }> {
    const todas = await this.listarProducciones('TODAS');
    const produccion = todas.find((p) => p.id === cicloId);
    if (!produccion) throw new EntidadNoEncontradaError('Producción', cicloId);

    const [usuariosRows, acts, apls, aplItems, insumosRows, cosechas, monitoreos, eventosComp] = await Promise.all([
      this.db.select({ id: usuariosTable.id, nombre: usuariosTable.nombre, apellido: usuariosTable.apellido }).from(usuariosTable),
      this.db.select().from(actividadesRealizadasTable).where(eq(actividadesRealizadasTable.cicloId, cicloId)),
      this.db.select().from(aplicacionesInsumoTable),
      this.db.select().from(aplicacionesInsumoItemsTable),
      this.db.select().from(insumosTable),
      this.db.select().from(cosechasTable).where(eq(cosechasTable.cicloId, cicloId)),
      this.db.select().from(monitoreosTable).where(eq(monitoreosTable.cicloId, cicloId)),
      this.db
        .select()
        .from(eventosTrazabilidadTable)
        .where(and(eq(eventosTrazabilidadTable.loteId, produccion.loteId), eq(eventosTrazabilidadTable.tipoEvento, 'COMPENSACION'))),
    ]);

    const tiposAct = await this.db.select().from(tiposActividadTable);
    const mapUsuario = new Map(usuariosRows.map((u) => [u.id, `${u.nombre} ${u.apellido}`.trim()]));
    const mapInsumo = new Map(insumosRows.map((i) => [i.id, i]));
    const mapTipoAct = new Map(tiposAct.map((t) => [t.id, t.nombre]));

    const historial: TimelineItemDto[] = [];

    for (const act of acts) {
      const apl = apls.find((a) => a.actividadRealizadaId === act.id);
      const usuarioNombre = mapUsuario.get(act.responsableId) || 'Operario';
      if (apl) {
        const items = aplItems.filter((it) => it.aplicacionId === apl.id);
        const nombresInsumos = items
          .map((it) => {
            const ins = mapInsumo.get(it.insumoId);
            return ins ? `${ins.nombre} (${it.cantidadAplicada} ${ins.unidadMedida})` : `${it.cantidadAplicada}`;
          })
          .join(', ');
        const diasCarencia = Number((act.datosEspecificos as Record<string, unknown>)?.diasCarencia ?? 0);
        historial.push({
          id: apl.id,
          tipo: 'FUMIGACION',
          fecha: act.creadoEn,
          titulo: `Fumigación / Aplicación: ${nombresInsumos || apl.metodoAplicacion}`,
          detalle: `Superficie: ${apl.superficieTratada} ha · Carencia: ${diasCarencia} días${apl.observaciones ? ` · ${apl.observaciones}` : ''}`,
          usuarioNombre,
          datos: {
            actividadId: act.id,
            superficieTratada: Number(apl.superficieTratada),
            diasCarencia,
            observaciones: apl.observaciones,
          },
        });
      } else {
        const tipoNombre = mapTipoAct.get(act.tipoActividadId) || 'Labor agrícola';
        historial.push({
          id: act.id,
          tipo: 'LABOR',
          fecha: act.creadoEn,
          titulo: `Labor: ${tipoNombre}`,
          detalle: `${act.descripcionTrabajo || act.observaciones || 'Ejecutada en campo'} (${act.fechaEjecucion})`,
          usuarioNombre,
          datos: {
            tipoActividad: tipoNombre,
            fechaEjecucion: act.fechaEjecucion,
            observaciones: act.observaciones,
          },
        });
      }
    }

    for (const cos of cosechas) {
      const usuarioNombre = (cos.responsableId && mapUsuario.get(cos.responsableId)) || 'Encargado';
      const com = Number(cos.cantidadComercializableKg ?? cos.cantidadCosechadaKg ?? 0);
      const descKg = Number(cos.cantidadDescarteKg ?? 0);
      historial.push({
        id: cos.id,
        tipo: 'COSECHA',
        fecha: cos.creadoEn,
        titulo: `Cosecha ${cos.codigoTrazabilidad}: ${Number(cos.cantidadCosechadaKg).toFixed(1)} kg`,
        detalle: `Comercializable: ${com} kg · Descarte: ${descKg} kg${cos.observaciones ? ` · ${cos.observaciones}` : ''}`,
        usuarioNombre,
        datos: {
          codigoTrazabilidad: cos.codigoTrazabilidad,
          kgTotales: Number(cos.cantidadCosechadaKg),
          kgComercializable: com,
          kgDescarte: descKg,
          observaciones: cos.observaciones,
        },
      });
    }

    for (const mon of monitoreos) {
      const usuarioNombre = mapUsuario.get(mon.responsableId) || 'Encargado';
      historial.push({
        id: mon.id,
        tipo: 'OBSERVACION',
        fecha: mon.creadoEn,
        titulo: `Observación (${mon.tipoObservacion})`,
        detalle: `${mon.descripcionHallazgos}${mon.problemaDetectado ? ` · Alerta: ${mon.problemaDetectado}` : ''}`,
        usuarioNombre,
        datos: {
          tipoObservacion: mon.tipoObservacion,
          estadoGeneralCultivo: mon.estadoGeneralCultivo,
          descripcionHallazgos: mon.descripcionHallazgos,
        },
      });
    }

    for (const ev of eventosComp) {
      const usuarioNombre = mapUsuario.get(ev.actorId) || 'Administrador';
      const det = (ev.payloadEspecifico || {}) as Record<string, unknown>;
      historial.push({
        id: ev.id,
        tipo: 'EDICION',
        fecha: ev.timestampServidor,
        titulo: `Edición compensatoria (${String(det.tipoOriginal || 'Registro')})`,
        detalle: `Motivo: ${String(det.motivo || 'Corrección administrativa')} · ${String(det.valorAnterior || '')} → ${String(det.valorNuevo || '')}`,
        usuarioNombre,
        datos: det,
      });
    }

    historial.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    const filtrado = filtroTipo && filtroTipo !== 'TODOS'
      ? historial.filter((h) => h.tipo === filtroTipo)
      : historial;

    return { produccion, historial: filtrado };
  }

  async registrarActualizacion(
    cicloId: string,
    payload: Record<string, unknown>,
    usuario: { sub: string; perfil: string },
  ): Promise<{ id: string; tipo: TipoRegistroUnificado; mensaje: string }> {
    const tipo = String(payload.tipo || '').toUpperCase() as TipoRegistroUnificado;
    const [ciclo] = await this.db.select().from(ciclosProductivosTable).where(eq(ciclosProductivosTable.id, cicloId));
    if (!ciclo) throw new EntidadNoEncontradaError('Producción', cicloId);
    if (ciclo.estado === 'FINALIZADO') {
      throw new ProduccionDomainError('PRODUCCION_FINALIZADA', 'No se pueden cargar registros en una producción finalizada.', 409);
    }

    const [plantacion] = await this.db.select().from(plantacionesTable).where(eq(plantacionesTable.id, ciclo.plantacionId));
    const [lote] = await this.db.select().from(lotesTable).where(eq(lotesTable.id, plantacion.loteId));
    const fecha = String(payload.fecha || hoyIsoTucuman()).slice(0, 10);

    if (tipo === 'FUMIGACION') {
      const insumoId = String(payload.insumoId || '');
      const cantidad = Number(payload.cantidad || 0);
      const superficie = Number(payload.superficie || plantacion.superficieHa || 1);
      const diasCarencia = Math.max(0, Math.round(Number(payload.diasCarencia || 0)));
      const observaciones = String(payload.observaciones || '').trim();

      if (!insumoId || !(cantidad > 0)) {
        throw new ProduccionDomainError('DATOS_INVALIDOS', 'Debe seleccionar un insumo y una cantidad mayor a 0.', 400);
      }

      return this.db.transaction(async (tx) => {
        const [insumo] = await tx.select().from(insumosTable).where(eq(insumosTable.id, insumoId));
        if (!insumo) throw new EntidadNoEncontradaError('Insumo', insumoId);

        const partidas = await tx
          .select()
          .from(partidasInsumoTable)
          .where(and(eq(partidasInsumoTable.insumoId, insumoId), sql`${partidasInsumoTable.cantidadDisponible} > 0`))
          .orderBy(asc(partidasInsumoTable.fechaVencimiento), asc(partidasInsumoTable.fechaIngreso));

        const stockTotal = partidas.reduce((acc, p) => acc + Number(p.cantidadDisponible), 0);
        if (cantidad > stockTotal + 0.0001) {
          throw new ProduccionDomainError(
            'STOCK_INSUFICIENTE',
            `Stock insuficiente de ${insumo.nombre}. Disponible: ${stockTotal.toFixed(2)} ${insumo.unidadMedida}, solicitado: ${cantidad}.`,
            422,
          );
        }

        const tipoAct = await this.resolverTipoActividad(tx, 'Fumigación / Aplicación', 'CONTROL_SANITARIO');
        const [act] = await tx
          .insert(actividadesRealizadasTable)
          .values({
            cicloId: ciclo.id,
            loteId: lote.id,
            tipoActividadId: tipoAct.id,
            fechaEjecucion: fecha,
            responsableId: usuario.sub,
            superficieTrabajadaHa: superficie.toFixed(2),
            observaciones: observaciones || null,
            datosEspecificos: { diasCarencia, insumoId, cantidad },
          })
          .returning();

        const [apl] = await tx
          .insert(aplicacionesInsumoTable)
          .values({
            actividadRealizadaId: act.id,
            superficieTratada: superficie.toFixed(2),
            metodoAplicacion: 'Pulverización foliar',
            motivoAplicacion: observaciones || 'Aplicación fitosanitaria en campo',
            responsableId: usuario.sub,
            observaciones: observaciones || null,
            registradoEn: new Date().toISOString(),
            solicitud: { diasCarencia, insumoId, cantidad },
          })
          .returning();

        let restante = cantidad;
        for (const p of partidas) {
          if (restante <= 0) break;
          const disp = Number(p.cantidadDisponible);
          const usar = Math.min(disp, restante);
          const nuevoDisp = Math.max(0, disp - usar);

          await tx
            .update(partidasInsumoTable)
            .set({ cantidadDisponible: nuevoDisp.toFixed(2) })
            .where(eq(partidasInsumoTable.id, p.id));

          await tx.insert(aplicacionesInsumoItemsTable).values({
            aplicacionId: apl.id,
            insumoId: insumo.id,
            partidaInsumoId: p.id,
            cantidadAplicada: usar.toFixed(2),
            dosis: (usar / Math.max(0.1, superficie)).toFixed(2),
          });

          restante = Number((restante - usar).toFixed(4));
        }

        await tx.insert(eventosTrazabilidadTable).values({
          loteId: lote.id,
          actorId: usuario.sub,
          ubicacionId: lote.fincaId || lote.id,
          tipoEvento: 'APLICACION_FITOSANITARIA',
          timestampCapturaLocal: new Date().toISOString(),
          payloadEspecifico: {
            aplicacionId: apl.id,
            insumo: insumo.nombre,
            cantidad,
            unidad: insumo.unidadMedida,
            diasCarencia,
          },
        });

        await this.registrarAuditoria(tx, usuario.sub, 'CREAR', 'FUMIGACION', apl.id, {
          produccion: ciclo.nombreCodigo,
          insumo: insumo.nombre,
          cantidad,
          diasCarencia,
        });

        return {
          id: apl.id,
          tipo: 'FUMIGACION',
          mensaje: `Fumigación registrada y ${cantidad} ${insumo.unidadMedida} descontados del stock.`,
        };
      });
    }

    if (tipo === 'COSECHA') {
      const comercializable = Number(payload.kgComercializable ?? payload.kilos ?? 0);
      const descarte = Math.max(0, Number(payload.kgDescarte ?? 0));
      const total = Number((comercializable + descarte).toFixed(2));
      const destino = String(payload.destino || '').trim();
      const observaciones = String(payload.observaciones || '').trim();

      if (!(total > 0)) {
        throw new ProduccionDomainError('DATOS_INVALIDOS', 'Debe ingresar una cantidad cosechada mayor a 0 kg.', 400);
      }

      const acts = await this.db
        .select()
        .from(actividadesRealizadasTable)
        .where(eq(actividadesRealizadasTable.cicloId, ciclo.id));
      for (const act of acts) {
        const dias = Number((act.datosEspecificos as Record<string, unknown>)?.diasCarencia ?? 0);
        if (dias > 0) {
          const hasta = sumarDiasIso(act.fechaEjecucion, dias);
          if (fecha < hasta) {
            throw new ProduccionDomainError(
              'CARENCIA_FITOSANITARIA_ACTIVA',
              `Cosecha bloqueada por período de carencia vigente hasta el ${hasta} (aplicación del ${act.fechaEjecucion} con ${dias} días de carencia).`,
              409,
            );
          }
        }
      }

      return this.db.transaction(async (tx) => {
        const codTraz = `COS-${fecha.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 899)}`;
        const obsFull = destino ? `Destino: ${destino}${observaciones ? ` · ${observaciones}` : ''}` : (observaciones || null);

        const [cos] = await tx
          .insert(cosechasTable)
          .values({
            codigoTrazabilidad: codTraz,
            loteId: lote.id,
            cicloId: ciclo.id,
            fecha,
            fechaEfectiva: fecha,
            cantidadCosechadaKg: total.toFixed(4),
            cantidadComercializableKg: comercializable.toFixed(4),
            cantidadDescarteKg: descarte.toFixed(4),
            observaciones: obsFull,
            responsableId: usuario.sub,
            registradoPor: usuario.sub,
            estado: 'ACTIVA',
            origen: 'NO_PROGRAMADA',
            timestampCapturaLocal: new Date().toISOString(),
          })
          .returning();

        const nuevoSaldoLote = Number(lote.cantidadActual || 0) + comercializable;
        await tx
          .update(lotesTable)
          .set({ cantidadActual: nuevoSaldoLote.toFixed(4), actualizadoEn: new Date().toISOString() })
          .where(eq(lotesTable.id, lote.id));

        await tx.insert(eventosTrazabilidadTable).values({
          loteId: lote.id,
          actorId: usuario.sub,
          ubicacionId: lote.fincaId || lote.id,
          tipoEvento: 'COSECHA',
          timestampCapturaLocal: new Date().toISOString(),
          payloadEspecifico: {
            cosechaId: cos.id,
            codigoTrazabilidad: codTraz,
            kgComercializable: comercializable,
            kgDescarte: descarte,
            destino: destino || null,
          },
        });

        await this.registrarAuditoria(tx, usuario.sub, 'CREAR', 'COSECHA', cos.id, {
          produccion: ciclo.nombreCodigo,
          codigoTrazabilidad: codTraz,
          totalKg: total,
        });

        return { id: cos.id, tipo: 'COSECHA', mensaje: `Cosecha ${codTraz} registrada (${total} kg).` };
      });
    }

    if (tipo === 'LABOR') {
      const nombreLabor = String(payload.tipoLabor || 'Mantenimiento').trim();
      const responsableNombre = String(payload.responsable || '').trim();
      const observaciones = String(payload.observaciones || '').trim();
      const categoria = String(payload.categoria || 'MANTENIMIENTO').toUpperCase() as CategoriaTipoActividad;

      return this.db.transaction(async (tx) => {
        const tipoAct = await this.resolverTipoActividad(tx, nombreLabor, categoria);
        const [act] = await tx
          .insert(actividadesRealizadasTable)
          .values({
            cicloId: ciclo.id,
            loteId: lote.id,
            tipoActividadId: tipoAct.id,
            fechaEjecucion: fecha,
            responsableId: usuario.sub,
            observaciones: observaciones || null,
            descripcionTrabajo: responsableNombre ? `${nombreLabor} · Cuadrilla/Resp.: ${responsableNombre}` : nombreLabor,
            datosEspecificos: { responsableNombre },
          })
          .returning();

        await tx.insert(eventosTrazabilidadTable).values({
          loteId: lote.id,
          actorId: usuario.sub,
          ubicacionId: lote.fincaId || lote.id,
          tipoEvento: 'LABOR_CAMPO',
          timestampCapturaLocal: new Date().toISOString(),
          payloadEspecifico: { actividadId: act.id, labor: nombreLabor, responsableNombre },
        });

        return { id: act.id, tipo: 'LABOR', mensaje: `Labor "${nombreLabor}" registrada.` };
      });
    }

    if (tipo === 'OBSERVACION') {
      const subtipo = String(payload.subtipo || 'Observación de campo').trim();
      const hallazgos = String(payload.observaciones || payload.descripcion || '').trim();
      const esClima = Boolean(payload.esEventoClimatico);
      if (!hallazgos) {
        throw new ProduccionDomainError('DATOS_INVALIDOS', 'Debe ingresar el detalle de la observación o clima.', 400);
      }

      return this.db.transaction(async (tx) => {
        const [mon] = await tx
          .insert(monitoreosTable)
          .values({
            cicloId: ciclo.id,
            loteId: lote.id,
            responsableId: usuario.sub,
            fechaInspeccion: fecha,
            estadoGeneralCultivo: esClima ? 'ALERTA_CLIMATICA' : 'NORMAL',
            tipoObservacion: subtipo,
            problemaDetectado: esClima ? subtipo : null,
            descripcionHallazgos: hallazgos,
          })
          .returning();

        if (esClima && lote.fincaId) {
          const [evClima] = await tx
            .insert(eventosClimaticosTable)
            .values({
              fincaId: lote.fincaId,
              tipoEvento: subtipo.slice(0, 50),
              fecha,
              descripcion: hallazgos,
              responsableId: usuario.sub,
            })
            .returning();
          await tx.insert(eventosClimaticosLotesTable).values({
            eventoId: evClima.id,
            loteId: lote.id,
            descripcionDano: hallazgos,
          });
        }

        await tx.insert(eventosTrazabilidadTable).values({
          loteId: lote.id,
          actorId: usuario.sub,
          ubicacionId: lote.fincaId || lote.id,
          tipoEvento: esClima ? 'EVENTO_CLIMATICO' : 'OBSERVACION_CAMPO',
          timestampCapturaLocal: new Date().toISOString(),
          payloadEspecifico: { monitoreoId: mon.id, subtipo, hallazgos },
        });

        return { id: mon.id, tipo: 'OBSERVACION', mensaje: 'Observación / evento registrado.' };
      });
    }

    throw new ProduccionDomainError('TIPO_REGISTRO_INVALIDO', `Tipo de registro no soportado: ${tipo}`, 400);
  }

  async corregirRegistro(
    cicloId: string,
    registroId: string,
    input: { tipoOriginal: string; motivo: string; valorAnterior: string; valorNuevo: string },
    actorId: string,
  ): Promise<{ id: string; mensaje: string }> {
    if (!input.motivo.trim()) {
      throw new ProduccionDomainError('MOTIVO_OBLIGATORIO', 'Toda corrección compensatoria requiere indicar el motivo.', 400);
    }

    return this.db.transaction(async (tx) => {
      const [ciclo] = await tx.select().from(ciclosProductivosTable).where(eq(ciclosProductivosTable.id, cicloId));
      if (!ciclo) throw new EntidadNoEncontradaError('Producción', cicloId);

      const [plantacion] = await tx.select().from(plantacionesTable).where(eq(plantacionesTable.id, ciclo.plantacionId));
      const [lote] = await tx.select().from(lotesTable).where(eq(lotesTable.id, plantacion.loteId));

      const id = randomUUID();
      await tx.insert(eventosTrazabilidadTable).values({
        id,
        loteId: lote.id,
        actorId,
        ubicacionId: lote.fincaId || lote.id,
        tipoEvento: 'COMPENSACION',
        timestampCapturaLocal: new Date().toISOString(),
        payloadEspecifico: {
          registroId,
          tipoOriginal: input.tipoOriginal,
          motivo: input.motivo.trim(),
          valorAnterior: input.valorAnterior,
          valorNuevo: input.valorNuevo,
        },
      });

      await this.registrarAuditoria(
        tx,
        actorId,
        'EDITAR',
        'PRODUCCION_COMPENSACION',
        cicloId,
        { registroId, motivo: input.motivo.trim(), valorNuevo: input.valorNuevo },
        { valorAnterior: input.valorAnterior },
      );

      return { id, mensaje: 'Corrección compensatoria registrada en la bitácora.' };
    });
  }

  private async resolverTipoActividad(
    tx: AgrulTransaction,
    nombre: string,
    categoria: CategoriaTipoActividad,
  ) {
    const limpio = nombre.trim().slice(0, 40) || 'Labor general';
    const existentes = await tx.select().from(tiposActividadTable).where(eq(tiposActividadTable.nombre, limpio)).limit(1);
    if (existentes.length > 0) return existentes[0];

    const catValida: CategoriaTipoActividad = [
      'PREPARACION_SUELO', 'PLANTACION', 'RIEGO', 'FERTILIZACION', 'MANTENIMIENTO', 'CONTROL_SANITARIO', 'OTRO',
    ].includes(categoria)
      ? categoria
      : 'OTRO';

    const [creado] = await tx
      .insert(tiposActividadTable)
      .values({ nombre: limpio, categoria: catValida, estado: 'ACTIVA' })
      .returning();
    return creado;
  }

  async selectorInsumosMinimo(): Promise<Array<{
    id: string;
    codigo: string;
    nombre: string;
    categoria: string;
    unidadMedida: string;
    stockDisponible: number;
    nivelMinimo: number;
  }>> {
    const insumos = await this.db
      .select()
      .from(insumosTable)
      .where(eq(insumosTable.estado, 'ACTIVO'))
      .orderBy(asc(insumosTable.nombre));
    const partidas = await this.db.select().from(partidasInsumoTable);

    return insumos.map((ins) => {
      const stockDisponible = partidas
        .filter((p) => p.insumoId === ins.id)
        .reduce((acc, p) => acc + Number(p.cantidadDisponible || 0), 0);
      return {
        id: ins.id,
        codigo: ins.codigo,
        nombre: ins.nombre,
        categoria: ins.categoria,
        unidadMedida: ins.unidadMedida,
        stockDisponible: Number(stockDisponible.toFixed(2)),
        nivelMinimo: Number(ins.nivelMinimo || 0),
      };
    });
  }

  async obtenerResumenInsumosUnificado() {
    const insumos = await this.selectorInsumosMinimo();
    const egresos = await this.db
      .select({
        id: aplicacionesInsumoItemsTable.id,
        insumoId: aplicacionesInsumoItemsTable.insumoId,
        cantidadAplicada: aplicacionesInsumoItemsTable.cantidadAplicada,
        registradoEn: aplicacionesInsumoTable.registradoEn,
        observaciones: aplicacionesInsumoTable.observaciones,
      })
      .from(aplicacionesInsumoItemsTable)
      .innerJoin(aplicacionesInsumoTable, eq(aplicacionesInsumoItemsTable.aplicacionId, aplicacionesInsumoTable.id))
      .orderBy(desc(aplicacionesInsumoTable.registradoEn))
      .limit(50);

    const mapInsumo = new Map(insumos.map((i) => [i.id, i]));
    const alertas = insumos.filter((i) => i.stockDisponible <= i.nivelMinimo);

    return {
      insumos,
      alertas,
      egresos: egresos.map((e) => {
        const ins = mapInsumo.get(e.insumoId);
        return {
          id: e.id,
          insumoNombre: ins?.nombre || 'Insumo',
          unidadMedida: ins?.unidadMedida || '',
          cantidad: Number(e.cantidadAplicada),
          fecha: e.registradoEn || '',
          detalle: e.observaciones || 'Fumigación / Aplicación en Producción',
        };
      }),
    };
  }

  async registrarIngresoStockRapido(
    input: { insumoId: string; cantidad: number; proveedor?: string; fechaVencimiento?: string | null },
    actorId: string,
  ) {
    if (!(input.cantidad > 0)) {
      throw new ProduccionDomainError('CANTIDAD_INVALIDA', 'La cantidad ingresada debe ser mayor a 0.', 400);
    }

    return this.db.transaction(async (tx) => {
      const finca = await this.obtenerFincaPrincipal(tx);
      const [insumo] = await tx.select().from(insumosTable).where(eq(insumosTable.id, input.insumoId));
      if (!insumo) throw new EntidadNoEncontradaError('Insumo', input.insumoId);

      const [partida] = await tx
        .insert(partidasInsumoTable)
        .values({
          fincaId: finca.id,
          insumoId: insumo.id,
          unidadMedida: insumo.unidadMedida,
          fechaIngreso: hoyIsoTucuman(),
          cantidadInicial: input.cantidad.toFixed(2),
          cantidadDisponible: input.cantidad.toFixed(2),
          proveedor: input.proveedor?.trim() || 'Proveedor General BPA',
          fechaVencimiento: input.fechaVencimiento || null,
        })
        .returning();

      await this.registrarAuditoria(tx, actorId, 'CREAR', 'INGRESO_STOCK', partida.id, {
        insumo: insumo.nombre,
        cantidad: input.cantidad,
        proveedor: partida.proveedor,
      });

      return partida;
    });
  }

  async crearCultivoRapido(nombre: string, tipoCicloVida: 'ANUAL' | 'PERENNE' = 'ANUAL') {
    const limpio = nombre.trim().slice(0, 40);
    if (!limpio) throw new ProduccionDomainError('NOMBRE_REQUERIDO', 'El nombre del cultivo es obligatorio.', 400);
    const [existente] = await this.db.select().from(cultivosTable).where(eq(cultivosTable.nombre, limpio)).limit(1);
    if (existente) return existente;
    const [creado] = await this.db
      .insert(cultivosTable)
      .values({ nombre: limpio, tipoCicloVida, estado: 'ACTIVO' })
      .returning();
    return creado;
  }

  async crearVariedadRapido(cultivoId: string, nombre: string) {
    const limpio = nombre.trim().slice(0, 40);
    if (!limpio) throw new ProduccionDomainError('NOMBRE_REQUERIDO', 'El nombre de la variedad es obligatorio.', 400);
    const [existente] = await this.db
      .select()
      .from(variedadesTable)
      .where(and(eq(variedadesTable.cultivoId, cultivoId), eq(variedadesTable.nombre, limpio)))
      .limit(1);
    if (existente) return existente;
    const [creado] = await this.db
      .insert(variedadesTable)
      .values({ cultivoId, nombre: limpio, estado: 'ACTIVO' })
      .returning();
    return creado;
  }
}
