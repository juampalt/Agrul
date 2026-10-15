# 🌱 Agrul — Motor Integral de Trazabilidad Agroindustrial

Sistema de trazabilidad agroindustrial y cadena de custodia con inmutabilidad de eventos, soporte de linaje N:M (splits y merges) y cumplimiento de estándares de certificación internacional (GlobalG.A.P., SENASA).

---

## 🚀 Inicio Rápido (Entorno Local)

### Opción 1: Ejecutable de un solo clic (Windows)
Simplemente hacé **doble clic en el archivo**:
```text
iniciar-agrul.bat
```
El script verificará el entorno, instalará dependencias si es la primera vez que se ejecuta, levantará el servidor API y abrirá el Dashboard automáticamente en tu navegador.

### Opción 2: Desde la consola de comandos
```bash
# Instalar dependencias
npm install

# Iniciar servidor en modo desarrollo
npm run dev
```

Una vez iniciado:
- **Dashboard Web & Grafo de Linaje:** [http://localhost:3000](http://localhost:3000)
- **API Healthcheck:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## 🧪 Pruebas Automatizadas

```bash
# Correr suite de 100 tests (Vitest)
npm test

# Verificación de tipos estricta (TypeScript)
npm run lint
```

---

## 📦 Stack Tecnológico
- **Backend:** Node.js (ESM), Fastify v5, Zod (`fastify-type-provider-zod`)
- **Persistencia & ORM:** Drizzle ORM, PostgreSQL (con trigger PL/pgSQL de inmutabilidad)
- **Frontend:** Dashboard SPA Vanilla CSS/JS con renderizador de grafos SVG y lector/generador QR.
- **Testing:** Vitest 3.x con mocks y repositorios en memoria.
