# ADR-0001: Consolidación en 5 Módulos mediante Fachada Transaccional de Producción

- **Estado:** Aceptado
- **Fecha:** 2026-11-16
- **Decisores:** Arquitectura Agrul & Product Owner

## Contexto y Problema
El sistema creció con 11 módulos independientes (`Fincas`, `Lotes`, `Cultivos`, `Variedades`, `Plantaciones`, `Ciclos Productivos`, `Actividades`, `Monitoreos`, `Aplicaciones`, `Cosechas`, `Poscosecha`, `Meteorología`), fragmentando la carga diaria en campo y administración. Se requiere consolidar toda la experiencia operativa en **5 módulos únicos** (`Finca`, `Producción`, `Insumos y Stock`, `Estadísticas e Indicadores`, `Auditoría`) con RBAC estricto para `ENCARGADO_CAMPO` y `ADMIN_SISTEMA`.

## Alternativas Consideradas
1. **Fachada transaccional sobre el esquema existente (`lotes` + `plantaciones` + `ciclos_productivos`)**: Crear un módulo/fachada `/api/v1/producciones` que coordine en una transacción ACID las entidades subyacentes y compute las hectáreas asignadas a ciclos `ABIERTO`/`ACTIVA`.
2. **Nueva tabla `producciones` independiente**: Duplicar estructura o migrar destructivamente las tablas actuales.

## Decisión
Se adopta la **Alternativa 1 (Fachada transaccional sobre el esquema existente)**.

## Consecuencias
- **Positivas:** Cero pérdida de datos semilla ni usuarios actuales (`admin`, `encargado`, `sistema`); se preservan intactos los triggers PL/pgSQL de inmutabilidad en `eventos_trazabilidad`, las FK de `cosechas`, `aplicaciones_insumos`, `actividades_realizadas` y `monitoreos`, y la suite existente de tests de dominio.
- **Negativas / Trade-offs:** La creación de una *Producción* requiere coordinar 3 inserts atómicos (`lotes`, `plantaciones`, `ciclos_productivos`) en una única transacción Drizzle, y el endpoint `/api/v1/producciones/:id/registros` actúa como router unificado hacia los casos de uso especializados.
