---
id: AGRUL-034
title: "AGRUL-034: Consulta Inversa de Trazabilidad para Retiro Preventivo de Insumos (Recall)"
epic: "Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales"
status: ready-for-agent
priority: "Alta (P1)"
module: "Módulo 6: Trazabilidad"
labels: ["recall", "seguridad-alimentaria", "consulta-inversa", "ready-for-agent"]
---

# AGRUL-034 — Consulta Inversa de Trazabilidad para Retiro Preventivo de Insumos (Recall)

- **Épica:** Épica 12: Módulo 6 — Motor de Trazabilidad e Informes Oficiales
- **Módulo:** Módulo 6: Trazabilidad
- **Prioridad:** Alta (P1)
- **Status:** ready-for-agent
- **Requisitos Funcionales:** RF-M6-12
- **Skills:** .cursor/skills/domain-traceability.md

## Descripción
Mecanismo de rastreo descendente inverso: dado un lote de insumo (ej. lote de fertilizante o pesticida contaminado), identificar al instante todos los lotes de campo, ciclos y cosechas que lo recibieron.

## Tareas Técnicas
1. Implementar ConsultaInversaInsumoUseCase: recibe loteInsumoId o insumoId.
2. Recorrer aplicaciones que utilizaron dicho lote de insumo y listar lotes productivos y cosechas derivadas.
3. Listar despachos y compradores que recibieron dicha producción para activar protocolo de retiro inmediato.

## Criterios de Aceptación
- [ ] RF-M6-12: Mapeo exacto de insumo -> aplicaciones -> cosechas -> destinos en una sola consulta.
- [ ] Fundamental para contingencias sanitarias y certificaciones internacionales.

## Comments
