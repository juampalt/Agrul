import { randomUUID } from 'node:crypto';
import { DomainError } from '../../src/core/domain/errors/domain.error.js';
import type {
  FincaResumenDto,
  ProduccionResumenDto,
  TimelineItemDto,
  TipoRegistroUnificado,
} from '../../src/infrastructure/database/producciones.service.js';

class InMemoryProduccionError extends DomainError {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface InMemoryCultivo {
  id: string;
  nombre: string;
  tipoCicloVida: 'ANUAL' | 'PERENNE';
}

interface InMemoryVariedad {
  id: string;
  cultivoId: string;
  nombre: string;
}

interface InMemoryInsumo {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  categoria: string;
  nivelMinimo: number;
  stockDisponible: number;
  carenciaDias: number;
}

interface InMemoryEgreso {
  id: string;
  insumoNombre: string;
  unidadMedida: string;
  cantidad: number;
  fecha: string;
  detalle: string;
}

export class InMemoryProduccionesService {
  private finca: {
    id: string;
    nombre: string;
    propietario: string | null;
    localidad: string;
    departamento: string;
    provincia: string;
    observaciones: string | null;
    hectareasTotales: number;
  } = {
    id: 'f0000000-0000-4000-8000-000000000001',
    nombre: 'Finca La Esperanza',
    propietario: 'Agrul Agroindustrial S.A.',
    localidad: 'San Isidro de Lules',
    departamento: 'Lules',
    provincia: 'Tucumán',
    observaciones: 'Finca modelo de trazabilidad frutícola (Frutilla y Arándano).',
    hectareasTotales: 150,
  };

  private cultivos: InMemoryCultivo[] = [
    { id: 'c0000000-0000-4000-8000-000000000001', nombre: 'Frutilla', tipoCicloVida: 'ANUAL' },
    { id: 'c0000000-0000-4000-8000-000000000002', nombre: 'Arándano', tipoCicloVida: 'PERENNE' },
  ];

  private variedades: InMemoryVariedad[] = [
    { id: 'v0000000-0000-4000-8000-000000000001', cultivoId: 'c0000000-0000-4000-8000-000000000001', nombre: 'San Andreas' },
    { id: 'v0000000-0000-4000-8000-000000000002', cultivoId: 'c0000000-0000-4000-8000-000000000001', nombre: 'Albión' },
    { id: 'v0000000-0000-4000-8000-000000000003', cultivoId: 'c0000000-0000-4000-8000-000000000002', nombre: 'Emerald' },
  ];

  private producciones: ProduccionResumenDto[] = [
    {
      id: 'p0000000-0000-4000-8000-000000000001',
      codigo: 'LOT-2026-00001',
      loteId: 'l0000000-0000-4000-8000-000000000001',
      plantacionId: 'pl000000-0000-4000-8000-000000000001',
      fincaId: 'f0000000-0000-4000-8000-000000000001',
      cultivoId: 'c0000000-0000-4000-8000-000000000001',
      cultivoNombre: 'Frutilla',
      variedadId: 'v0000000-0000-4000-8000-000000000001',
      variedadNombre: 'San Andreas',
      hectareas: 30,
      fechaInicio: '2026-06-01',
      fechaFin: null,
      estado: 'ACTIVA',
      ultimoRegistroEn: '2026-11-15T14:30:00.000Z',
      kgCosechados: 4850,
      kgComercializable: 4520,
      totalRegistros: 3,
      carenciaActivaHasta: null,
    },
    {
      id: 'p0000000-0000-4000-8000-000000000002',
      codigo: 'LOT-2026-00002',
      loteId: 'l0000000-0000-4000-8000-000000000002',
      plantacionId: 'pl000000-0000-4000-8000-000000000002',
      fincaId: 'f0000000-0000-4000-8000-000000000001',
      cultivoId: 'c0000000-0000-4000-8000-000000000002',
      cultivoNombre: 'Arándano',
      variedadId: 'v0000000-0000-4000-8000-000000000003',
      variedadNombre: 'Emerald',
      hectareas: 45,
      fechaInicio: '2026-05-15',
      fechaFin: null,
      estado: 'ACTIVA',
      ultimoRegistroEn: '2026-11-14T10:15:00.000Z',
      kgCosechados: 3200,
      kgComercializable: 3050,
      totalRegistros: 2,
      carenciaActivaHasta: null,
    },
  ];

  private historialPorProduccion = new Map<string, TimelineItemDto[]>([
    [
      'p0000000-0000-4000-8000-000000000001',
      [
        {
          id: 'h0000000-0000-4000-8000-000000000001',
          tipo: 'COSECHA',
          fecha: '2026-11-15T14:30:00.000Z',
          titulo: 'Cosecha Pasada #2',
          detalle: '2.650 kg brutos (2.480 kg fresco / 170 kg descarte)',
          usuarioNombre: 'Carlos Gómez',
          datos: { pasada: 2, kgBrutos: 2650, kgFresco: 2480, kgDescarte: 170 },
        },
        {
          id: 'h0000000-0000-4000-8000-000000000002',
          tipo: 'FUMIGACION',
          fecha: '2026-10-20T09:00:00.000Z',
          titulo: 'Fumigación preventiva',
          detalle: 'Aplicado Azoxistrobina 25% SC (1.5 L)',
          usuarioNombre: 'Carlos Gómez',
          datos: { cantidad: 1.5, unidad: 'L' },
        },
        {
          id: 'h0000000-0000-4000-8000-000000000003',
          tipo: 'COSECHA',
          fecha: '2026-11-01T15:00:00.000Z',
          titulo: 'Cosecha Pasada #1',
          detalle: '2.200 kg brutos (2.040 kg fresco / 160 kg descarte)',
          usuarioNombre: 'Carlos Gómez',
          datos: { pasada: 1, kgBrutos: 2200, kgFresco: 2040, kgDescarte: 160 },
        },
      ],
    ],
    [
      'p0000000-0000-4000-8000-000000000002',
      [
        {
          id: 'h0000000-0000-4000-8000-000000000004',
          tipo: 'COSECHA',
          fecha: '2026-11-14T10:15:00.000Z',
          titulo: 'Cosecha Pasada #1',
          detalle: '3.200 kg brutos (3.050 kg fresco / 150 kg descarte)',
          usuarioNombre: 'Carlos Gómez',
          datos: { pasada: 1, kgBrutos: 3200, kgFresco: 3050, kgDescarte: 150 },
        },
        {
          id: 'h0000000-0000-4000-8000-000000000005',
          tipo: 'LABOR',
          fecha: '2026-09-10T08:30:00.000Z',
          titulo: 'Poda de formación',
          detalle: 'Poda de limpieza en Cuadro Sur (45 ha)',
          usuarioNombre: 'Carlos Gómez',
          datos: { hectareasTrabajadas: 45 },
        },
      ],
    ],
  ]);

  private insumos: InMemoryInsumo[] = [
    {
      id: 'i0000000-0000-4000-8000-000000000001',
      codigo: 'INS-001',
      nombre: 'Azoxistrobina 25% SC',
      unidadMedida: 'L',
      categoria: 'FITOSANITARIO',
      nivelMinimo: 10,
      stockDisponible: 38.5,
      carenciaDias: 7,
    },
    {
      id: 'i0000000-0000-4000-8000-000000000002',
      codigo: 'INS-002',
      nombre: 'Nitrato de Calcio Soluble',
      unidadMedida: 'KG',
      categoria: 'FERTILIZANTE',
      nivelMinimo: 50,
      stockDisponible: 240,
      carenciaDias: 0,
    },
    {
      id: 'i0000000-0000-4000-8000-000000000003',
      codigo: 'INS-003',
      nombre: 'Spinosad Bio-Insecticida',
      unidadMedida: 'L',
      categoria: 'FITOSANITARIO',
      nivelMinimo: 15,
      stockDisponible: 8,
      carenciaDias: 3,
    },
  ];

  private egresos: InMemoryEgreso[] = [
    {
      id: 'e0000000-0000-4000-8000-000000000001',
      insumoNombre: 'Azoxistrobina 25% SC',
      unidadMedida: 'L',
      cantidad: 1.5,
      fecha: '2026-10-20T09:00:00.000Z',
      detalle: 'Fumigación en LOT-2026-00001',
    },
  ];

  async obtenerFincaResumen(): Promise<FincaResumenDto> {
    const activas = this.producciones.filter((p) => p.estado === 'ACTIVA');
    const hectareasAsignadas = activas.reduce((acc, p) => acc + p.hectareas, 0);
    const hectareasDisponibles = Math.max(0, this.finca.hectareasTotales - hectareasAsignadas);
    return {
      ...this.finca,
      hectareasAsignadas,
      hectareasDisponibles,
      produccionesActivas: activas.length,
      distribucion: activas.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        cultivoNombre: p.cultivoNombre,
        variedadNombre: p.variedadNombre,
        hectareas: p.hectareas,
        porcentajeFinca: Math.round((p.hectareas / this.finca.hectareasTotales) * 1000) / 10,
      })),
    };
  }

  async actualizarFincaConfig(
    datos: {
      nombre: string;
      hectareasTotales: number;
      localidad: string;
      provincia: string;
      departamento?: string;
      propietario?: string | null;
      observaciones?: string | null;
    },
    _actorId: string
  ): Promise<FincaResumenDto> {
    const asignadas = this.producciones
      .filter((p) => p.estado === 'ACTIVA')
      .reduce((acc, p) => acc + p.hectareas, 0);
    if (datos.hectareasTotales < asignadas) {
      throw new InMemoryProduccionError(
        'SUPERFICIE_INSUFICIENTE',
        `Las hectáreas totales (${datos.hectareasTotales} ha) no pueden ser menores a las asignadas a producciones activas (${asignadas} ha).`,
        422
      );
    }
    this.finca = {
      ...this.finca,
      nombre: datos.nombre,
      hectareasTotales: datos.hectareasTotales,
      localidad: datos.localidad,
      provincia: datos.provincia,
      departamento: datos.departamento ?? this.finca.departamento,
      propietario: datos.propietario !== undefined ? datos.propietario : this.finca.propietario,
      observaciones: datos.observaciones !== undefined ? datos.observaciones : this.finca.observaciones,
    };
    return this.obtenerFincaResumen();
  }

  async listarProducciones(estadoFiltro: 'ACTIVA' | 'FINALIZADA' | 'TODAS' = 'TODAS'): Promise<ProduccionResumenDto[]> {
    if (estadoFiltro === 'TODAS') return [...this.producciones];
    return this.producciones.filter((p) => p.estado === estadoFiltro);
  }

  async crearProduccion(
    input: { cultivoId: string; variedadId: string; fechaInicio: string; hectareas: number; observaciones?: string },
    _actorId: string
  ): Promise<ProduccionResumenDto> {
    const cultivo = this.cultivos.find((c) => c.id === input.cultivoId) || this.cultivos[0];
    const variedad = this.variedades.find((v) => v.id === input.variedadId) || this.variedades[0];
    const id = randomUUID();
    const num = String(this.producciones.length + 1).padStart(5, '0');
    const nueva: ProduccionResumenDto = {
      id,
      codigo: `LOT-2026-${num}`,
      loteId: randomUUID(),
      plantacionId: randomUUID(),
      fincaId: this.finca.id,
      cultivoId: cultivo.id,
      cultivoNombre: cultivo.nombre,
      variedadId: variedad.id,
      variedadNombre: variedad.nombre,
      hectareas: input.hectareas,
      fechaInicio: input.fechaInicio,
      fechaFin: null,
      estado: 'ACTIVA',
      ultimoRegistroEn: new Date().toISOString(),
      kgCosechados: 0,
      kgComercializable: 0,
      totalRegistros: 1,
      carenciaActivaHasta: null,
    };
    this.producciones.unshift(nueva);
    this.historialPorProduccion.set(id, [
      {
        id: randomUUID(),
        tipo: 'LABOR',
        fecha: new Date().toISOString(),
        titulo: 'Inicio de Producción',
        detalle: input.observaciones || `${cultivo.nombre} (${variedad.nombre}) · ${input.hectareas} ha`,
        usuarioNombre: 'Administrador',
        datos: { hectareas: input.hectareas },
      },
    ]);
    return nueva;
  }

  async finalizarProduccion(cicloId: string, _actorId: string, motivo?: string): Promise<ProduccionResumenDto> {
    const prod = this.producciones.find((p) => p.id === cicloId);
    if (!prod) throw new Error('Producción no encontrada.');
    prod.estado = 'FINALIZADA';
    prod.fechaFin = new Date().toISOString().slice(0, 10);
    prod.ultimoRegistroEn = new Date().toISOString();
    const hist = this.historialPorProduccion.get(cicloId) || [];
    hist.unshift({
      id: randomUUID(),
      tipo: 'EDICION',
      fecha: new Date().toISOString(),
      titulo: 'Cierre de Producción',
      detalle: motivo || 'Campaña finalizada.',
      usuarioNombre: 'Administrador',
      datos: {},
    });
    this.historialPorProduccion.set(cicloId, hist);
    return prod;
  }

  async obtenerDetalleProduccion(cicloId: string, filtroTipo: TipoRegistroUnificado | 'TODOS' = 'TODOS') {
    const produccion = this.producciones.find((p) => p.id === cicloId);
    if (!produccion) throw new Error('Producción no encontrada.');
    const hist = this.historialPorProduccion.get(cicloId) || [];
    const historial = filtroTipo === 'TODOS' ? hist : hist.filter((h) => h.tipo === filtroTipo);
    return { produccion, historial };
  }

  async registrarActualizacion(
    cicloId: string,
    payload: Record<string, unknown>,
    usuario: { sub: string; perfil: string }
  ) {
    const prod = this.producciones.find((p) => p.id === cicloId);
    if (!prod) throw new InMemoryProduccionError('NO_ENCONTRADO', 'Producción no encontrada.', 404);
    const tipo = (String(payload.tipo || 'LABOR').toUpperCase()) as TipoRegistroUnificado;
    const ahora = new Date().toISOString();
    const hoyStr = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let titulo = String(payload.titulo || tipo);
    let detalle = String(payload.observaciones || payload.detalle || '');

    if (tipo === 'COSECHA') {
      const fechaCosecha = String(payload.fecha || hoyStr).slice(0, 10);
      if (prod.carenciaActivaHasta && fechaCosecha <= prod.carenciaActivaHasta) {
        throw new InMemoryProduccionError(
          'CARENCIA_ACTIVA',
          `Cosecha bloqueada: el lote tiene un período de carencia vigente hasta el ${prod.carenciaActivaHasta}.`,
          422
        );
      }
      const kgDescarte = Number(payload.kgDescarte ?? 0);
      const hasComercial = payload.kgComercializable !== undefined && payload.kgComercializable !== null;
      const kgComercial = hasComercial
        ? Number(payload.kgComercializable)
        : Math.max(0, Number(payload.kgBrutos ?? payload.cantidadKg ?? 0) - kgDescarte);
      const kgBrutos = hasComercial
        ? kgComercial + kgDescarte
        : Number(payload.kgBrutos ?? payload.cantidadKg ?? (kgComercial + kgDescarte));

      prod.kgCosechados += kgBrutos;
      prod.kgComercializable += kgComercial;
      titulo = `Cosecha registrada (${kgBrutos} kg)`;
      detalle = `Comercializable: ${kgComercial} kg · Descarte: ${kgDescarte} kg${payload.destino ? ` · Destino: ${String(payload.destino)}` : ''}${detalle ? ` · ${detalle}` : ''}`;
    } else if (tipo === 'FUMIGACION') {
      const insumoId = String(payload.insumoId || '');
      const cant = Number(payload.cantidad ?? 0);
      const diasCarencia = Number(payload.diasCarencia ?? 0);
      const ins = this.insumos.find((i) => i.id === insumoId);
      if (!ins) {
        throw new InMemoryProduccionError('INSUMO_NO_ENCONTRADO', 'El insumo seleccionado no existe.', 404);
      }
      if (cant <= 0) {
        throw new InMemoryProduccionError('CANTIDAD_INVALIDA', 'La cantidad utilizada debe ser mayor a cero.', 400);
      }
      if (cant > ins.stockDisponible) {
        throw new InMemoryProduccionError(
          'STOCK_INSUFICIENTE',
          `Stock insuficiente de ${ins.nombre}: disponible ${ins.stockDisponible} ${ins.unidadMedida}, solicitado ${cant} ${ins.unidadMedida}.`,
          422
        );
      }
      ins.stockDisponible = Math.round((ins.stockDisponible - cant) * 1000) / 1000;
      if (diasCarencia > 0) {
        const hastaDate = new Date(Date.now() - 3 * 60 * 60 * 1000 + diasCarencia * 86400000);
        const hastaStr = hastaDate.toISOString().slice(0, 10);
        if (!prod.carenciaActivaHasta || hastaStr > prod.carenciaActivaHasta) {
          prod.carenciaActivaHasta = hastaStr;
        }
      }
      this.egresos.unshift({
        id: randomUUID(),
        insumoNombre: ins.nombre,
        unidadMedida: ins.unidadMedida,
        cantidad: cant,
        fecha: ahora,
        detalle: `Fumigación en ${prod.codigo}`,
      });
      titulo = `Fumigación: ${ins.nombre}`;
      detalle = `Aplicado ${cant} ${ins.unidadMedida} · Carencia: ${diasCarencia} días${detalle ? ` · ${detalle}` : ''}`;
    } else if (tipo === 'LABOR') {
      const tipoLabor = String(payload.tipoLabor || 'Labor agrícola');
      const unidades = Number(payload.cantidadUnidades ?? 0);
      const responsable = String(payload.responsable || '').trim();
      titulo = tipoLabor;
      const partes: string[] = [];
      if (unidades > 0) partes.push(`${unidades} unidades`);
      if (responsable) partes.push(`Resp: ${responsable}`);
      if (detalle) partes.push(detalle);
      detalle = partes.length > 0 ? partes.join(' · ') : 'Ejecutada en campo';
    } else if (tipo === 'OBSERVACION') {
      const subtipo = String(payload.subtipo || 'Observación de campo');
      titulo = subtipo;
      detalle = detalle || subtipo;
    }

    prod.ultimoRegistroEn = ahora;
    prod.totalRegistros += 1;

    const item: TimelineItemDto = {
      id: randomUUID(),
      tipo,
      fecha: ahora,
      titulo,
      detalle: detalle || 'Registro operativo',
      usuarioNombre: usuario.perfil === 'ENCARGADO_CAMPO' ? 'Carlos Gómez' : 'Administrador',
      datos: payload,
    };
    const hist = this.historialPorProduccion.get(cicloId) || [];
    hist.unshift(item);
    this.historialPorProduccion.set(cicloId, hist);
    return item;
  }

  async corregirRegistro(
    cicloId: string,
    _regId: string,
    body: { tipoOriginal: string; motivo: string; valorAnterior: string; valorNuevo: string },
    _actorId: string
  ) {
    const prod = this.producciones.find((p) => p.id === cicloId);
    if (!prod) throw new Error('Producción no encontrada.');
    const item: TimelineItemDto = {
      id: randomUUID(),
      tipo: 'EDICION',
      fecha: new Date().toISOString(),
      titulo: `Edición compensatoria (${body.tipoOriginal})`,
      detalle: `Motivo: ${body.motivo} · ${body.valorAnterior} → ${body.valorNuevo}`,
      usuarioNombre: 'Administrador',
      datos: body,
    };
    const hist = this.historialPorProduccion.get(cicloId) || [];
    hist.unshift(item);
    this.historialPorProduccion.set(cicloId, hist);
    return item;
  }

  async selectorInsumosMinimo() {
    return this.insumos.map((i) => ({ ...i }));
  }

  async obtenerResumenInsumosUnificado() {
    const insumos = await this.selectorInsumosMinimo();
    const alertas = insumos.filter((i) => i.stockDisponible <= i.nivelMinimo);
    return { insumos, alertas, egresos: [...this.egresos] };
  }

  async registrarIngresoStockRapido(
    input: { insumoId: string; cantidad: number; proveedor?: string; fechaVencimiento?: string | null },
    _actorId: string
  ) {
    const ins = this.insumos.find((i) => i.id === input.insumoId);
    if (!ins) throw new Error('Insumo no encontrado.');
    ins.stockDisponible += input.cantidad;
    return ins;
  }

  async crearInsumoConStock(
    input: { codigo: string; nombre: string; unidadMedida: string; categoria: string; cantidad: number },
    _actorId: string
  ) {
    const codNorm = input.codigo.trim().toLowerCase();
    if (this.insumos.some((i) => i.codigo.trim().toLowerCase() === codNorm)) {
      throw new InMemoryProduccionError(
        'CODIGO_INSUMO_DUPLICADO',
        `Ya existe un insumo registrado con el código "${input.codigo.trim()}".`,
        409
      );
    }
    const nuevo: InMemoryInsumo = {
      id: randomUUID(),
      codigo: input.codigo.trim(),
      nombre: input.nombre.trim(),
      unidadMedida: input.unidadMedida,
      categoria: input.categoria,
      nivelMinimo: 10,
      stockDisponible: input.cantidad,
      carenciaDias: 0,
    };
    this.insumos.push(nuevo);
    return nuevo;
  }

  async crearCultivoRapido(nombre: string, tipoCicloVida: 'ANUAL' | 'PERENNE' = 'ANUAL') {
    const nuevo = { id: randomUUID(), nombre, tipoCicloVida };
    this.cultivos.push(nuevo);
    return nuevo;
  }

  async crearVariedadRapido(cultivoId: string, nombre: string) {
    const nueva = { id: randomUUID(), cultivoId, nombre };
    this.variedades.push(nueva);
    return nueva;
  }

  async obtenerDashboardResumenUnificado(filtros: { produccionId?: string } = {}) {
    const scope = filtros.produccionId
      ? this.producciones.filter((p) => p.id === filtros.produccionId)
      : this.producciones;
    const activas = scope.filter((p) => p.estado === 'ACTIVA');
    const totalKilosCosechados = scope.reduce((a, p) => a + p.kgCosechados, 0);
    const totalKilosComercializables = scope.reduce((a, p) => a + p.kgComercializable, 0);
    const totalKilosDescarte = Math.max(0, totalKilosCosechados - totalKilosComercializables);
    const alertas = this.insumos
      .filter((i) => i.stockDisponible <= i.nivelMinimo)
      .map((i) => ({
        ...i,
        insumoId: i.id,
        nombreComercial: i.nombre,
        stockActual: i.stockDisponible,
        stockMinimo: i.nivelMinimo,
        consumoAcumulado: this.egresos
          .filter((e) => e.insumoNombre === i.nombre)
          .reduce((acc, e) => acc + e.cantidad, 0),
        nivelAlerta: i.stockDisponible <= 0 ? 'CRITICO' : 'BAJO',
      }));

    return {
      kpis: {
        lotesEnProduccion: {
          totalLotes: scope.length,
          lotesActivos: activas.length,
          superficieTotalHa: this.finca.hectareasTotales,
          superficieEnProduccionHa: activas.reduce((a, p) => a + p.hectareas, 0),
          ciclosEnCurso: activas.length,
        },
        produccionAcumulada: {
          totalKilosCosechados,
          totalKilosComercializables,
          totalKilosDescarte,
          porcentajeDescarte:
            totalKilosCosechados > 0
              ? Math.round((totalKilosDescarte / totalKilosCosechados) * 1000) / 10
              : 0,
          totalCosechas: scope.length,
        },
        alertasStockInsumos: {
          totalInsumosMonitoreados: this.insumos.length,
          insumosStockCritico: alertas.length,
          insumosStockBajo: alertas.length,
          alertas,
        },
        actividadesVencidasOPendientes: {
          totalActividades: 5,
          pendientesPlanificadas: 0,
          vencidas: 0,
          proximasAVencer7Dias: 0,
          items: [],
        },
      },
      graficos: {
        evolucionCosecha: {
          labels: ['2026-10', '2026-11'],
          datasets: {
            kilosBrutos: [0, totalKilosCosechados],
            kilosComercializables: [0, totalKilosComercializables],
            kilosDescarte: [0, totalKilosDescarte],
          },
        },
        consumoInsumosPorCategoria: {
          categorias: ['FITOSANITARIO'],
          volumenTotal: [1.5],
          porcentajes: [100],
          unidades: ['L'],
        },
        rendimientoPorCultivo: {
          cultivos: scope.map((p) => p.cultivoNombre),
          rendimientoBrutoKgHa: scope.map((p) => Math.round(p.kgCosechados / (p.hectareas || 1))),
          rendimientoComercialKgHa: scope.map((p) => Math.round(p.kgComercializable / (p.hectareas || 1))),
        },
      },
      costosPorLote: scope.map((p) => ({
        loteId: p.loteId,
        codigoLote: p.codigo,
        cultivo: `${p.cultivoNombre} (${p.variedadNombre})`,
        superficieHa: p.hectareas,
        kilosCosechados: p.kgCosechados,
        costoInsumos: 0,
        costoManoObra: 0,
        costoMaquinaria: 0,
        costoTotalEstimado: 0,
        costoPorHectarea: 0,
        costoPorKiloCosechado: 0,
      })),
    };
  }
}
