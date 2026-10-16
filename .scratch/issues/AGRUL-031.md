---
id: AGRUL-031
title: "AGRUL-031: Formulario Móvil Ultrarrápido de Cosecha para Operarios de Campo"
epic: "Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable"
status: done
priority: "Alta (P1)"
module: "Módulo 5: Cosecha y Destino"
labels: ["mobile", "usabilidad", "campo", "rnf-01", "status:done"]
---

# AGRUL-031 — Formulario Móvil Ultrarrápido de Cosecha para Operarios de Campo

- **Épica:** Épica 11: Módulo 5 — Cosecha, Destinos y Saldo Comercializable
- **Módulo:** Módulo 5: Cosecha y Destino
- **Prioridad:** Alta (P1)
- **Status:** done
- **Requisitos Funcionales:** RF-M5-13
- **Reglas de Negocio:** RN-01
- **Skills:** .cursor/skills/api-contracts.md

## Descripción
Interfaz y endpoint simplificado para carga en smartphone con guantes y bajo el sol (RNF-15): sólo 4 campos obligatorios (lote, cantidad total, comercializable y fecha) y resto plegado (RNF-01).

## Tareas Técnicas
1. Diseñar formulario móvil minimalista con botones táctiles grandes (>48px) y alto contraste (RNF-15).
2. Limitar inputs obligatorios a 4 campos: Lote, Total Cosechado, Comercializable y Fecha (RNF-01).
3. Autocompletar ciclo activo y fecha actual.

## Criterios de Aceptación
- [x] RF-M5-13 / RNF-01: Carga completable en menos de 15 segundos en campo con 4 campos obligatorios.
- [x] RNF-15: Interfaz legible a plena luz solar y amigable con dispositivos desde 360px de ancho.

## Comments
- **Implementación finalizada:**
  - Caso de uso `RegistrarCosechaRapidaUseCase` en `src/application/use-cases/cosechas.use-cases.ts`.
  - DTO `RegistrarCosechaRapidaInputDto` en `src/application/dtos/cosechas.dto.ts`.
  - Schema Zod `RegistrarCosechaRapidaBodySchema` en `src/infrastructure/http/schemas/cosechas.schema.ts`.
  - Endpoints `POST /api/v1/cosechas/rapida` y alias `POST /api/v1/cosechas/movil` en `src/infrastructure/http/routes/api.routes.ts`.
  - Controller `registrarRapida` con soporte de envelope de advertencia de carencia fitosanitaria (RF-M5-11 / RN-14).
  - Autocompletado inteligente de `fecha` a la actual y `cicloId` al ciclo productivo abierto del lote si no son provistos.
  - Resolución dual de lote por UUID o código alfanumérico (ej: `LOT-2026-00031`) para compatibilidad directa con escaneo QR de cajones y tablones.
  - Frontend UI móvil en `public/index.html` con modal ultrarrápido `#modal-cosecha-rapida`: botones táctiles y campos > 48px, modo de alto contraste a plena luz solar (`.solar-high-contrast`), cálculo reactivo de descarte / porcentaje comercial en tiempo real, campos adicionales plegados bajo `<details>`, y verificación instantánea de carencia fitosanitaria.
  - Estilos CSS dedicados en `public/app.css` optimizados para smartphones desde 360px de ancho y operarios con guantes.
  - 9 pruebas unitarias dedicadas en `tests/unit/application/cosecha-rapida.use-case.test.ts` (100% pasando).
  - 5 pruebas de integración HTTP en `tests/integration/api.test.ts` (100% pasando).
