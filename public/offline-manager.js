// Agrul — Mobile Offline Resilience & Background Sync Engine
// Implements AGRUL-049 | RNF-02, RNF-09, RNF-01, RNF-15 | RN-11

(function (window) {
  'use strict';

  class AgrulOfflineManager {
    constructor() {
      this.prefixBorradores = 'agrul_borrador_';
      this.keyColaOffline = 'agrul_cola_offline';
      this.isSyncing = false;
      this.listeners = [];

      this._initListeners();
    }

    _initListeners() {
      window.addEventListener('online', () => {
        this.notificarEstado('ONLINE');
        this.sincronizarCola();
      });

      window.addEventListener('offline', () => {
        this.notificarEstado('OFFLINE');
      });

      // Chequeo periódico en segundo plano si hay items pendientes y hay conexión
      setInterval(() => {
        if (navigator.onLine && this.cantidadPendientes() > 0 && !this.isSyncing) {
          this.sincronizarCola();
        }
      }, 15000);
    }

    onEstadoChange(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    notificarEstado(estado, extra = {}) {
      const info = {
        estado, // 'ONLINE' | 'OFFLINE' | 'SINCRONIZANDO'
        isOnline: navigator.onLine,
        pendientes: this.cantidadPendientes(),
        ...extra,
      };
      this.listeners.forEach((fn) => {
        try {
          fn(info);
        } catch (e) {
          console.error('[AgrulOffline] Error en listener:', e);
        }
      });
    }

    /**
     * Genera clave única de idempotencia (UUID v4) al abrir formulario (RN-11 / RF-M9-06)
     */
    generarClaveIdempotencia(prefijo = 'idem') {
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
     * Guarda un borrador local de formulario (RNF-02)
     */
    guardarBorrador(formulario, datos) {
      try {
        const key = `${this.prefixBorradores}${formulario}`;
        const payload = {
          formulario,
          datos,
          actualizadoEn: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (err) {
        console.warn('[AgrulOffline] No se pudo guardar borrador en localStorage:', err);
      }
    }

    /**
     * Recupera un borrador local previo
     */
    obtenerBorrador(formulario) {
      try {
        const key = `${this.prefixBorradores}${formulario}`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.datos || null;
      } catch {
        return null;
      }
    }

    /**
     * Elimina el borrador local tras envío exitoso
     */
    limpiarBorrador(formulario) {
      try {
        const key = `${this.prefixBorradores}${formulario}`;
        localStorage.removeItem(key);
      } catch (err) {
        console.warn('[AgrulOffline] Error al limpiar borrador:', err);
      }
    }

    /**
     * Encola una petición para sincronización posterior si no hay red (RNF-02)
     * Preserva la misma clave de idempotencia original para evitar duplicados (RN-11)
     */
    encolarPeticionOffline({ url, method = 'POST', headers = {}, body, claveIdempotencia, tipoOperacion = 'OPERACION_CAMPO' }) {
      const cola = this.obtenerColaOffline();
      const idemKey = claveIdempotencia || this.generarClaveIdempotencia('offline');

      const item = {
        id: this.generarClaveIdempotencia('queue'),
        url,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idemKey,
          ...headers,
        },
        body,
        claveIdempotencia: idemKey,
        tipoOperacion,
        intentos: 0,
        proximoIntento: Date.now(),
        ultimoError: null,
        creadoEn: new Date().toISOString(),
      };

      cola.push(item);
      this._guardarCola(cola);
      this.notificarEstado(navigator.onLine ? 'ONLINE' : 'OFFLINE', { encolado: item });
      return item;
    }

    obtenerColaOffline() {
      try {
        const raw = localStorage.getItem(this.keyColaOffline);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    _guardarCola(cola) {
      try {
        localStorage.setItem(this.keyColaOffline, JSON.stringify(cola));
      } catch (err) {
        console.warn('[AgrulOffline] Error al guardar cola offline:', err);
      }
    }

    cantidadPendientes() {
      return this.obtenerColaOffline().length;
    }

    limpiarColaOffline() {
      try {
        localStorage.removeItem(this.keyColaOffline);
        this.notificarEstado(navigator.onLine ? 'ONLINE' : 'OFFLINE');
      } catch (err) {
        console.warn('[AgrulOffline] Error al limpiar cola:', err);
      }
    }

    /**
     * Cálculo de Backoff Exponencial con Jitter (RNF-02)
     */
    calcularBackoffMs(intento, baseMs = 1000, maxMs = 60000, incluirJitter = true) {
      const exp = Math.max(0, intento);
      const delay = Math.min(maxMs, baseMs * Math.pow(2, exp));
      const jitter = incluirJitter ? Math.random() * (baseMs * 0.5) : 0;
      return Math.min(maxMs, Math.round(delay + jitter));
    }

    /**
     * Sincroniza la cola offline enviando peticiones pendientes con backoff
     */
    async sincronizarCola() {
      if (this.isSyncing) return;
      if (!navigator.onLine) {
        this.notificarEstado('OFFLINE');
        return;
      }

      const cola = this.obtenerColaOffline();
      if (cola.length === 0) {
        this.notificarEstado('ONLINE');
        return;
      }

      this.isSyncing = true;
      this.notificarEstado('SINCRONIZANDO');

      const itemsRestantes = [];
      let exitosos = 0;
      const ahoraMs = Date.now();

      for (const item of cola) {
        if (item.proximoIntento > ahoraMs) {
          itemsRestantes.push(item);
          continue;
        }

        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: typeof item.body === 'string' ? item.body : JSON.stringify(item.body),
          });

          if (res.ok || res.status === 200 || res.status === 201) {
            exitosos++;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${res.status}`;

            // Si falló por idempotencia ya registrada, cuenta como resuelta
            if (errMsg.includes('Ya existe una operación registrada con la clave de idempotencia') ||
                errMsg.includes('idempotencia')) {
              exitosos++;
            } else {
              item.intentos += 1;
              const delay = this.calcularBackoffMs(item.intentos, 1000, 60000, true);
              item.proximoIntento = Date.now() + delay;
              item.ultimoError = errMsg;
              itemsRestantes.push(item);
            }
          }
        } catch (netErr) {
          // Error de red
          item.intentos += 1;
          const delay = this.calcularBackoffMs(item.intentos, 1000, 60000, true);
          item.proximoIntento = Date.now() + delay;
          item.ultimoError = netErr.message || 'Error de conexión';
          itemsRestantes.push(item);
        }
      }

      this._guardarCola(itemsRestantes);
      this.isSyncing = false;

      this.notificarEstado(navigator.onLine ? 'ONLINE' : 'OFFLINE', {
        exitosos,
        pendientes: itemsRestantes.length,
      });

      return {
        exitosos,
        pendientes: itemsRestantes.length,
      };
    }
  }

  window.AgrulOfflineManager = AgrulOfflineManager;
  window.AgrulOffline = new AgrulOfflineManager();
})(typeof window !== 'undefined' ? window : globalThis);
