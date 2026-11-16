# Roadmap de producto — VacunaBI

Este documento describe **funcionalidades previstas**. No debe confundirse con el estado de implementación actual.

| Versión | Enfoque | Entrega verificable |
| --- | --- | --- |
| V1.0 | Base, ETL, KPIs, dashboard y escritorio | Código fuente e indicadores preservados, pruebas y documentación |
| V1.1 | Rediseño UI/UX | Navegación modular, tarjetas y gráficos reutilizables, sistema de diseño |
| V1.2 | Interactividad | Filtros por dimensiones disponibles, comparaciones, tablas y exportación |
| V1.3 | Territorial | Mapa oficial de localidades, ranking, fichas y brechas |
| V1.4 | Calidad de datos | Historial ETL, validaciones, diccionario y trazabilidad |
| V1.5 | Consolidación | Accesibilidad, rendimiento, pruebas, seguridad y documentación |
| V2.0 | Apoyo a decisiones | Alertas explicables, simulaciones, escenarios y prioridades sustentadas |

## Criterios transversales

- No reemplazar datos oficiales por datos simulados en visualizaciones productivas.
- Conservar numeradores, denominadores, unidades, periodos y fuentes.
- Tratar coberturas superiores al 100 % como anomalías que requieren contextualización.
- No confundir diferencias entre etapas con abandono individual.
- Verificar comparabilidad antes de cruzar localidades, sectores, biológicos o periodos.
- Registrar resultados de las pruebas ejecutadas, no resultados supuestos.
- Mantener una rama `main` estable; desarrollar mediante ramas y Pull Requests.
- Registrar contribuciones reales sin atribuir commits a personas que no participaron.

## V1.1 — Primer alcance de diseño

- Layout con navegación lateral y encabezado.
- Módulos: resumen, localidades, sectores, calidad de datos y metodología.
- Tokens visuales de colores, tipografía, espaciado y estados.
- Componentes KPI, gráficos y tablas consistentes.
- Estados de carga, fallo y falta de datos.
- Pruebas de regresión para conservar los mismos resultados del ETL.

Los cambios se dividirán en commits pequeños con explicaciones y evidencia visual.
