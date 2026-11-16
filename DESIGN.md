---
name: Agrul Precision AgTech Suite
description: Sistema de trazabilidad agroindustrial con estética Light AgTech de alto contraste sobre lienzo agrícola natural.
colors:
  emerald-primary: "#10b981"
  emerald-dark: "#064e3b"
  emerald-soft: "#dcfce7"
  emerald-text: "#15803d"
  agri-backdrop: "#3b5038"
  agri-deep: "#2d422a"
  surface-white: "#ffffff"
  surface-frosted: "rgba(246, 248, 250, 0.94)"
  surface-hover: "#f8fafc"
  surface-muted: "#f1f5f9"
  ink-primary: "#0f172a"
  ink-secondary: "#475569"
  ink-muted: "#64748b"
  ink-dim: "#94a3b8"
  border-subtle: "rgba(0, 0, 0, 0.06)"
  sky-info: "#38bdf8"
  amber-warning: "#f59e0b"
  rose-danger: "#ef4444"
typography:
  display:
    fontFamily: "Outfit, Plus Jakarta Sans, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Outfit, Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Outfit, Plus Jakarta Sans, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-primary}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  card-surface:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  badge-connection:
    backgroundColor: "{colors.emerald-soft}"
    textColor: "{colors.emerald-text}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Agrul — Design System (`DESIGN.md`)

## Overview
- **Creative North Star:** *El Cuaderno de Campo Instrumental* — una ventana clara, nítida y de alto contraste suspendida sobre un fondo agrícola profundo (`#3b5038`), diseñada para lectura rápida tanto bajo luz solar en finca como en escritorio de administración.
- **Modo de superficie:** `Operate` (herramienta operativa y tablero de trazabilidad). La jerarquía, la legibilidad tabular y la claridad de estado tienen prioridad sobre la ornamentación.

## Colors
- **Primary (`#10b981`):** Verde esmeralda Agrul para acciones principales, indicador de marca (`.brand-badge-modern`), foco activo (`--border-focus`) y estados saludables.
- **Agricultural Backdrop (`#3b5038` / `#2d422a`):** Fondo texturizado sutil en verde oliva/campo que enmarca la ventana principal flotante sin competir con los datos.
- **Surfaces (`#ffffff`, `rgba(246, 248, 250, 0.94)`, `#f8fafc`, `#f1f5f9`):** Superficies claras para tarjetas KPI, tablas de lotes, modales y barra lateral izquierda (`68px`).
- **Ink (`#0f172a`, `#64748b`, `#94a3b8`):** Tinta pizarra oscura para máxima legibilidad sobre blanco.
- **Semantic Accents:**
  - Éxito / Saludable: `#10b981` / `#15803d` sobre `#dcfce7`
  - Información / Agua / Riego: `#38bdf8`
  - Alerta / Carencia próxima: `#f59e0b`
  - Peligro / Bloqueo de carencia / Stock crítico: `#ef4444`

## Typography
- **Headings (`Outfit`):** Titulares de barra superior, números KPI (`.temp-number`, contadores de tablero) y encabezados de módulo con peso `700`–`800` y tracking ligeramente compacto (`-0.02em` a `-0.03em`).
- **Body & UI (`Plus Jakarta Sans`):** Texto de tablas, formularios, etiquetas de filtros, tooltips y manual interactivo a `14px` base (`line-height: 1.5`).

## Layout
- **Shell Principal:** Contenedor centrado (`max-width: 1680px`) en ventana flotante clara con barra lateral fija de iconos a la izquierda (`--sidebar-w: 68px`), cabecera superior limpia (`.app-header`) y área de trabajo central.
- **Densidad Operativa:** Grillas responsivas para tarjetas KPI del Tablero Ejecutivo y tablas filtrables para inventario de lotes, cosechas, actividades y auditoría.

## Elevation & Depth
- **Separación por contraste y bordes finos:** En modo Light AgTech, las tarjetas blancas se distinguen del lienzo mediante `1px solid rgba(0, 0, 0, 0.06)` y sombras suaves (`0 1px 4px rgba(0, 0, 0, 0.06)`), reservando `box-shadow` más marcada para la ventana flotante principal, el badge de marca y modales activos.

## Shapes
- **Radios consistentes:**
  - `8px` (`--radius-sm`): Botones de acción, inputs, tabs internos.
  - `14px` (`--radius-md`): Tarjetas KPI, contenedores de gráficos, modales y `.brand-badge-modern`.
  - `20px` (`--radius-lg`): Ventana principal de la aplicación.
  - `9999px` (`--radius-full`): Píldoras de estado (`.connection-badge`), filtros rápidos y selectores segmentados (`.resource-period-tabs`).

## Components
- **Sidebar Icon Rail (`.nav-item`):** Botones de `68px` de ancho con iconos claros, estado activo destacado en verde esmeralda y accesos inferiores fijos para Auditoría/Configuración (⚙️) y Manual de Usuario (ℹ️).
- **Tarjetas KPI & Chart.js (`.dashboard-ejecutivo`):** Fondo blanco `#ffffff`, encabezado con título y badge de unidad/período, valores numéricos destacados y gráficos Chart.js con leyendas interactivas.
- **Modales Operativos:** Backdrop oscuro translúcido centrado (`display: flex`) con formulario claro, botones de cierre explícitos (`Escape` / `×`) y mensajes de validación visibles en español.

## Do's and Don'ts
- **DO:** Mantener alto contraste (`#0f172a` sobre `#ffffff`) en todas las tablas, filtros y tarjetas para garantizar legibilidad en campo.
- **DO:** Usar los tokens semánticos (`#10b981`, `#f59e0b`, `#ef4444`) de forma estricta para estados de trazabilidad, stock y bloqueos de carencia.
- **DON'T:** No reintroducir fondos oscuros en tarjetas del Tablero Ejecutivo ni paneles de telemetría satelital simulada.
- **DON'T:** No usar tipografías decorativas que reduzcan la escaneabilidad de códigos de lote (`LOT-2026-XXXXX`) o pesos en kilogramos.
