# Roadmap de desarrollo — VacunaBI

El repositorio está dedicado a la **aplicación VacunaBI**: interfaz, lógica, ETL, pruebas, automatización y documentación técnica.

| Versión | Evolución del producto | Estado |
| --- | --- | --- |
| V1.0 | Base funcional con API CKAN, ETL, KPIs, dashboard y escritorio | Integrada |
| V1.1 | Rediseño UI/UX, navegación y componentes consistentes | Primera iteración implementada; pendiente validación visual |
| V1.2 | Filtros globales, gráficos interactivos y exportaciones desde interfaz | Pendiente |
| V1.3 | Mapa geográfico y fichas de localidades | Pendiente |
| V1.4 | Calidad de datos, trazabilidad ETL y diccionario | Pendiente |
| V1.5 | Accesibilidad, optimización, seguridad y pruebas | Pendiente |
| V2.0 | Escenarios, alertas y priorización territorial explicable | Pendiente |

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
- [ ] Revisión visual y de navegación en navegador.
- [ ] Revisión funcional en pywebview.
- [ ] Verificación con datos reales y capturas actuales.
