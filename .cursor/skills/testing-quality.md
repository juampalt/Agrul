# Testing & Quality Assurance

> **Cuándo usar esta skill:** Al escribir tests unitarios, de integración o end-to-end con Vitest, fixtures de datos, o al validar la inmutabilidad y consistencia transaccional.

---

## 1. Contexto & Propósito
En Agrul, los tests son la salvaguarda de cumplimiento normativo. Verifican matemáticamente la integridad del log inmutable, las transiciones de la máquina de estados, el balance de masa en divisiones (splits) y la absorción sin pérdida de eventos capturados offline.

---

## 2. Invariantes y Reglas No Negociables
1. **Test de Regresión de Inmutabilidad:** Debe existir un test automatizado que intente forzar un `UPDATE` o `DELETE` sobre `eventos_trazabilidad` y verifique que el trigger de PostgreSQL aborte la operación con error `VIOLACION_DE_INMUTABILIDAD`.
2. **Conservación de Masa en Splits:** Si un lote de 1.000 kg se divide, la suma de los lotes hijos generados debe ser exactamente igual o menor (considerando mermas justificadas) y jamás superior al disponible del padre.
3. **Rollback Transaccional Comprobado:** Si falla la inserción de un evento, el estado materializado del lote no debe mutar.
4. **Idempotencia en Sincronización Offline:** Enviar dos veces el mismo batch de eventos offline no debe duplicar registros históricos.

---

## 3. Matriz de Pruebas Críticas

| Suite | Tipo | Objetivo |
| :--- | :--- | :--- |
| `lote-transitions.test.ts` | Unitario | Validar que no se pueda pasar a estados inválidos o registrar eventos en lotes cerrados. |
| `lote-split-merge.test.ts` | Unitario | Validar balance de cantidades y generación correcta de nodos en `LoteGenealogia`. |
| `inmutabilidad-trigger.test.ts` | Integración | Ejecutar UPDATE/DELETE directo en DB y verificar excepción de Postgres. |
| `batch-sync-offline.test.ts` | Integración | Validar ingesta ordenada por `timestampCapturaLocal` e idempotencia. |
| `api-contracts.test.ts` | Integración | Validar envelope `{ success, data, error, timestamp }` en Fastify. |

---

## 4. Qué Mockear y Qué NO Mockear

| Componente | ¿Se Mockea? | Justificación |
| :--- | :--- | :--- |
| **Entidades de Dominio (`Lote`, `TraceEvent`)** | ❌ **NUNCA** | Lógica pura en memoria sin I/O. |
| **Triggers y Transacciones SQL** | ❌ **NO en integración** | Debe correr contra PostgreSQL de prueba para validar triggers reales. |
| **Dispositivos de Campo / Red Celular** | ✅ **SÍ** | Simular pérdida de paquetes y reconexión en tests de sincronización. |
| **Reloj del Sistema** | ✅ **SÍ (Controlado)** | Usar `vi.setSystemTime()` para comparar timestamps UTC determinísticos. |

---

## 5. DOs and DON'Ts

### DO
- **DO:** Usar **Vitest** como runner oficial de pruebas para máxima velocidad con TypeScript.
- **DO:** Correr las pruebas de integración en transacciones aisladas o con base de datos limpia para evitar contaminación entre tests.
- **DO:** Validar que los errores de negocio arrojen instancias de `DomainError` tipadas.

### DON'T
- **DON'T:** No silenciar errores de base de datos dentro de los tests.
- **DON'T:** No usar `Math.random()` sin semilla en tests de genealogía.

---

## 6. Registro de Decisiones (Self-Correction Log)
- *2026-10-03:* Se adoptan tests específicos de conservación de masa para operaciones de split/merge.
- *2026-10-03:* Se incorpora prueba de estrés e idempotencia para el batch sync offline.
