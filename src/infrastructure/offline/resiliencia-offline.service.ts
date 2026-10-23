/**
 * Servicio de Resiliencia Móvil Offline, Borradores Locales e Idempotencia en Cliente
 * Issue: AGRUL-049 | Requisitos: RNF-02, RNF-09, RNF-01, RNF-15 | Reglas: RN-11
 */

export interface PeticionOfflineInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body: any;
  claveIdempotencia?: string;
  tipoOperacion?: string;
}

export interface PeticionOffline {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  claveIdempotencia: string;
  tipoOperacion: string;
  intentos: number;
  proximoIntento: number;
  ultimoError?: string | null;
  creadoEn: string;
}

export interface ResultadoSincronizacionOffline {
  totalProcesados: number;
  exitosos: number;
  fallidos: number;
  pendientes: number;
  detalles: Array<{
    id: string;
    claveIdempotencia: string;
    exito: boolean;
    error?: string;
  }>;
}

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear?(): void;
  key?(index: number): string | null;
  length?: number;
}

export class InMemoryStorageProvider implements StorageProvider {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

export class ResilienciaOfflineService {
  private readonly storage: StorageProvider;
  private readonly prefixBorradores = 'agrul_borrador_';
  private readonly keyColaOffline = 'agrul_cola_offline';

  constructor(storageProvider?: StorageProvider) {
    if (storageProvider) {
      this.storage = storageProvider;
    } else if (typeof globalThis !== 'undefined' && (globalThis as Record<string, any>).localStorage) {
      this.storage = (globalThis as Record<string, any>).localStorage as StorageProvider;
    } else {
      this.storage = new InMemoryStorageProvider();
    }
  }

  /**
   * Genera una clave única de idempotencia (UUID v4) al abrir o instanciar un formulario (RF-M9-06 / RN-11).
   */
  public generarClaveIdempotencia(prefijo = 'idem'): string {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    return prefijo ? `${prefijo}_${uuid}` : uuid;
  }

  /**
   * Guarda un borrador local estructurado en el dispositivo ante pérdida o inestabilidad de red (RNF-02).
   */
  public guardarBorrador<T extends Record<string, any>>(formulario: string, datos: T): void {
    const key = `${this.prefixBorradores}${formulario}`;
    const payload = {
      formulario,
      datos,
      actualizadoEn: new Date().toISOString(),
    };
    this.storage.setItem(key, JSON.stringify(payload));
  }

  /**
   * Obtiene el borrador local previamente almacenado de un formulario.
   */
  public obtenerBorrador<T = any>(formulario: string): T | null {
    const key = `${this.prefixBorradores}${formulario}`;
    const raw = this.storage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return parsed.datos as T;
    } catch {
      return null;
    }
  }

  /**
   * Elimina un borrador local una vez que la operación fue confirmada con éxito por el servidor.
   */
  public limpiarBorrador(formulario: string): void {
    const key = `${this.prefixBorradores}${formulario}`;
    this.storage.removeItem(key);
  }

  /**
   * Encola una petición para sincronización posterior cuando se detecta falla de red o modo offline.
   * Preserva la clave de idempotencia original para que los reintentos no dupliquen operaciones en la base de datos (RNF-02 / RN-11).
   */
  public encolarPeticionOffline(peticion: PeticionOfflineInput): PeticionOffline {
    const cola = this.obtenerColaOffline();
    const claveIdempotencia = peticion.claveIdempotencia || this.generarClaveIdempotencia('offline');

    const item: PeticionOffline = {
      id: this.generarClaveIdempotencia('queue'),
      url: peticion.url,
      method: (peticion.method || 'POST').toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': claveIdempotencia,
        ...(peticion.headers || {}),
      },
      body: peticion.body,
      claveIdempotencia,
      tipoOperacion: peticion.tipoOperacion || 'OPERACION_CAMPO',
      intentos: 0,
      proximoIntento: Date.now(),
      ultimoError: null,
      creadoEn: new Date().toISOString(),
    };

    cola.push(item);
    this.guardarColaOffline(cola);
    return item;
  }

  /**
   * Obtiene la lista actual de peticiones encoladas en modo offline.
   */
  public obtenerColaOffline(): PeticionOffline[] {
    const raw = this.storage.getItem(this.keyColaOffline);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PeticionOffline[];
    } catch {
      return [];
    }
  }

  /**
   * Elimina una petición específica de la cola offline.
   */
  public eliminarDeColaOffline(id: string): void {
    const cola = this.obtenerColaOffline().filter(item => item.id !== id);
    this.guardarColaOffline(cola);
  }

  /**
   * Vacía toda la cola offline.
   */
  public limpiarColaOffline(): void {
    this.storage.removeItem(this.keyColaOffline);
  }

  /**
   * Cantidad de operaciones encoladas pendientes de sincronización.
   */
  public cantidadPendientes(): number {
    return this.obtenerColaOffline().length;
  }

  /**
   * Calcula el tiempo de espera para el próximo reintento aplicando algoritmo de Backoff Exponencial con Jitter (RNF-02).
   * Fórmula: baseMs * 2^intento + jitter aleatorio (hasta maxMs).
   */
  public calcularBackoffMs(
    intento: number,
    baseMs = 1000,
    maxMs = 60000,
    incluirJitter = false
  ): number {
    const exp = Math.max(0, intento);
    const delayTeorico = baseMs * Math.pow(2, exp);
    const capped = Math.min(maxMs, delayTeorico);
    if (!incluirJitter) {
      return capped;
    }
    const jitter = Math.random() * (baseMs * 0.5);
    return Math.min(maxMs, Math.round(capped + jitter));
  }

  /**
   * Sincroniza la cola offline en segundo plano ejecutando las peticiones pendientes con backoff exponencial.
   */
  public async sincronizarCola(
    fetchCustom?: typeof fetch,
    ahoraMs = Date.now()
  ): Promise<ResultadoSincronizacionOffline> {
    const fetchFn = fetchCustom || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) {
      throw new Error('No hay función fetch disponible para sincronización.');
    }

    const cola = this.obtenerColaOffline();
    const detalles: ResultadoSincronizacionOffline['detalles'] = [];
    let exitosos = 0;
    let fallidos = 0;
    const itemsRestantes: PeticionOffline[] = [];

    for (const item of cola) {
      // Si todavía no se cumplió el período de backoff exponencial, postergar para la próxima ronda
      if (item.proximoIntento > ahoraMs) {
        itemsRestantes.push(item);
        continue;
      }

      try {
        const response = await fetchFn(item.url, {
          method: item.method,
          headers: item.headers,
          body: typeof item.body === 'string' ? item.body : JSON.stringify(item.body),
        });

        // 200, 201 son éxitos; 422 con "ya existe clave de idempotencia" también se considera resuelto con éxito
        if (response.ok || response.status === 200 || response.status === 201) {
          exitosos++;
          detalles.push({
            id: item.id,
            claveIdempotencia: item.claveIdempotencia,
            exito: true,
          });
        } else {
          // Si el servidor respondió con error de negocio definitivo (ej. 422 por validación o 400),
          // verificar si fue por clave ya procesada (idempotencia cumplida)
          const respBody: any = await response.json().catch(() => ({}));
          const errMsg: string = respBody?.error?.message || `HTTP ${response.status}`;

          if (errMsg.includes('Ya existe una operación registrada con la clave de idempotencia') ||
              errMsg.includes('idempotencia')) {
            exitosos++;
            detalles.push({
              id: item.id,
              claveIdempotencia: item.claveIdempotencia,
              exito: true,
            });
          } else {
            // Error de servidor o validación
            fallidos++;
            item.intentos += 1;
            const backoff = this.calcularBackoffMs(item.intentos, 1000, 60000, true);
            item.proximoIntento = Date.now() + backoff;
            item.ultimoError = errMsg;
            detalles.push({
              id: item.id,
              claveIdempotencia: item.claveIdempotencia,
              exito: false,
              error: errMsg,
            });
            itemsRestantes.push(item);
          }
        }
      } catch (err: any) {
        // Error de red (Failed to fetch / network drop)
        fallidos++;
        item.intentos += 1;
        const backoff = this.calcularBackoffMs(item.intentos, 1000, 60000, true);
        item.proximoIntento = Date.now() + backoff;
        item.ultimoError = err.message || 'Error de conexión de red';
        detalles.push({
          id: item.id,
          claveIdempotencia: item.claveIdempotencia,
          exito: false,
          error: item.ultimoError || undefined,
        });
        itemsRestantes.push(item);
      }
    }

    this.guardarColaOffline(itemsRestantes);

    return {
      totalProcesados: cola.length - itemsRestantes.length + fallidos,
      exitosos,
      fallidos,
      pendientes: itemsRestantes.length,
      detalles,
    };
  }

  private guardarColaOffline(cola: PeticionOffline[]): void {
    this.storage.setItem(this.keyColaOffline, JSON.stringify(cola));
  }
}
