# Roadmap de desarrollo — VacunaBI

El repositorio está dedicado a la **aplicación VacunaBI**: interfaz, lógica, ETL, pruebas, automatización y documentación técnica.

| Versión | Evolución del producto | Estado |
| --- | --- | --- |
| V1.0 | Base funcional con API CKAN, ETL, KPIs, dashboard y escritorio | Integrada |
| V1.1 | Rediseño UI/UX, navegación y componentes consistentes | Cinco vistas verificadas con datos reales en Chromium y Windows |
| V1.2 | Filtros globales, gráficos interactivos y exportaciones desde interfaz | Implementada |
| V1.3 | Mapa geográfico, fichas y comparación de localidades | Implementada |
| V1.4 | Calidad de datos, trazabilidad ETL y diccionario | Implementada |
| V1.5 | Tablas accesibles, modo claro y optimización de gráficos | Implementada |
| V2.0 | Escenarios, alertas y priorización territorial explicable | Implementada |
| V2.1 | Claridad de indicadores, filtros y flujo de decisiones | Integrada |
| V2.2 | Diseño visual, fuentes compatibles y modularización | Integrada |
| V2.2.1 | Estabilización WebView2: recarga del HTML sin parámetros en `file://` | Corrección integrada; release preliminar sujeta a CI y aceptación manual pendiente |
| V2.2.2 | Inicio rápido usando copia compatible; actualización del ETL solo bajo demanda | Implementada en código; pruebas manuales de Windows pendientes |

V2.0 y posteriores utilizan simulaciones aritméticas de denominador fijo. Las proyecciones estadísticas requieren series adecuadas y una evaluación del error fuera de muestra. Consulta la [metodología de decisiones](DECISIONES.md).

## Reglas de evolución

- Conservar la funcionalidad del ETL y sus indicadores cuando se modifique la interfaz.
- Mantener numeradores, denominadores, fuentes, periodos y unidades identificables.
- Diferenciar datos faltantes de valores cero y datos observados de escenarios.
- Evitar agregados incorrectos y comparaciones de periodos incompatibles.
- Ejecutar pruebas de regresión antes de continuar a la siguiente versión.
- Registrar cambios mediante commits progresivos por funcionalidad.
- Publicar documentación de producto, instalación, arquitectura y cambios; excluir materiales ajenos a la aplicación.

## V1.1 — Criterios para cerrar la iteración

- [x] Interfaz modular con cinco vistas.
- [x] Identidad visual y componentes comunes.
- [x] Conservación de marcadores ETL e identificadores de gráficos.
- [x] Pruebas estructurales de interfaz en CI.
- [x] Revisión visual y de navegación en navegador.
- [x] Revisión funcional en pywebview.
- [x] Verificación con datos reales y capturas actuales.

## V1.2 — Criterios verificados

- [x] El año, la localidad, el sector y el biológico actualizan las vistas compatibles.
- [x] Los filtros sectoriales explican la falta de desglose de la serie distrital.
- [x] El modo comparativo utiliza dos años cerrados y el modo actual admite un rango de meses.
- [x] La tabla conserva numeradores y denominadores. La cobertura agrupada usa la suma de ambas medidas.
- [x] CSV y XLSX contienen las mismas filas filtradas y metadatos de la selección.
