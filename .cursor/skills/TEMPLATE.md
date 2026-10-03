# Skill Template — Agrul Engineering Standards

> **Cuándo usar esta skill:** [Descripción clara de las situaciones, tareas o archivos que disparan la consulta de este documento].

---

## 1. Contexto & Propósito
[Explicación concisa del problema que resuelve este módulo o dominio dentro de Agrul. Por qué existe y cuál es su responsabilidad delimitada.]

---

## 2. Invariantes y Reglas No Negociables
1. **[Invariante 1]:** [Regla estricta del sistema, e.g., inmutabilidad, aislamiento de capas, UTC timestamps].
2. **[Invariante 2]:** [Otra regla fundamental que jamás debe romperse].
3. **[Invariante 3]:** [Criterio de integridad o consistencia].

---

## 3. DOs and DON'Ts

### DO
- **Hacé esto:** [Práctica recomendada con justificación breve].
- **Seguí este patrón:** [Convención específica adoptada en Agrul].

### DON'T
- **Nunca hagas esto:** [Anti-patrón común que debe evitarse terminantemente].
- **Evitá:** [Solución rápida o hack que degrade la arquitectura].

---

## 4. Patrones de Código Canónicos

### ✅ Golden Pattern (Forma Correcta)
```typescript
// Ejemplo canónico de implementación siguiendo los estándares del proyecto
export async function handleOperation(input: ValidatedInput): Promise<OperationResult> {
  // Lógica clara, tipada y con manejo de errores estandarizado
}
```

### ❌ Anti-Pattern (Forma Incorrecta)
```typescript
// Lo que NO se debe hacer y por qué
export async function badOperation(anyData: any) {
  // Ejemplo de lo que rompe los principios de diseño
}
```

---

## 5. Casos Borde y Manejo de Excepciones
- **Caso 1:** [Cómo proceder ante desconexión, conflicto o dato nulo].
- **Caso 2:** [Cómo proceder ante eventos concurrentes].

---

## 6. Registro de Decisiones (Self-Correction Log)
*Registrá acá las decisiones tomadas o correcciones indicadas por el usuario para este dominio:*
- *[Fecha - YYYY-MM-DD]: Decisión o corrección adoptada.*
