# Registro de cambios — VacunaBI

## [2.2.0]

- Mejora la selección de fuente, año y granularidad: cada año indica si incluye serie distrital, seguimiento sectorial o ambas.
- Diferencia datos ausentes, filtros incompatibles y años no disponibles, con acciones guiadas para corregir la selección.
- Los paneles y tablas explican que la falta de registros no equivale a cobertura cero; se mantienen las fórmulas y fuentes originales.
- Añade pruebas de compatibilidad por fuente y documentación de filtros en `docs/FILTROS_FUENTES.md`.

- El ejecutable vuelve a abrir la última copia válida si falla la API al iniciar y muestra su estado en el tablero.
- La estabilización posterior separa además el código de gráficos y dashboard en `frontend/charts.js` y `frontend/dashboard.js`, integrados por ETL en un único HTML autónomo.
- Añade pruebas offline del ensamblado y una lista de aceptación manual de Windows y accesibilidad.

- Las tareas de aceptación manual de Windows y accesibilidad se mantienen documentadas como pendientes hasta obtener evidencia real.

- Refina la tipografía, las acciones y la navegación agrupada por tipo de análisis.
- Añade contexto de fuente y periodo a los indicadores y gráficos.
- Mantiene mapa y ranking en el mismo corte y mejora la ficha y la comparación territorial.
- Muestra progreso, selección y resultados prioritarios durante el análisis de decisiones.
- Separa utilidades de datos, tablas y etapas y las integra en el tablero autónomo.
- Usa el diálogo nativo para el guardado de CSV y Excel en Windows y explica los fallos de actualización.

## [2.1.0]

- Unifica la estimación de dosis adicionales con redondeo del objetivo al entero superior.
- Simplifica los filtros globales y traslada los controles temporales al gráfico correspondiente.
- Reorganiza el resumen, la vista territorial y el análisis de decisiones por etapas.
- Separa los estilos y la navegación en `frontend/` e incluye los recursos en el HTML y el ejecutable.

## [2.0.0]

- Resumen ejecutivo con prioridades territoriales y reglas visibles.
- Comparación de dos escenarios de dosis sobre el mismo denominador.
- Alertas de brecha, descensos, periodos parciales y calidad.
- Reporte ejecutivo CSV con fuentes, filtros y supuestos.

## [1.5.0]

- Tablas de valores para los cinco gráficos, con navegación por teclado.
- Tema claro opcional con colores adaptados para texto y gráficos.
- Consultas indexadas por serie y actualización de los gráficos cuando cambia su contenido.
- Política de contenido local y protección contra respuestas obsoletas al leer archivos CSV.

## [1.4.0]

- Validación de esquema y paginación de los recursos CKAN.
- Detección de registros inválidos, extracción incompleta y observaciones de calidad.
- Historial de ejecuciones y resumen de fuentes en el tablero.
- Preparación de las exportaciones antes de reemplazar el tablero válido.

## [1.3.0]

- Mapa de las 20 localidades con límites oficiales, filtros compartidos y ficha territorial.
- Comparación de localidades y referencia distrital bajo el mismo corte y filtros.
- Evolución territorial cuando hay al menos dos cortes comparables y exportación de la ficha en CSV.

## [1.2.0] — 2026-11-16

- Filtros compartidos por año, localidad, sector y biológico para las dimensiones disponibles en cada fuente.
- Modos histórico, actual con rango mensual y comparativo entre dos años cerrados.
- Actualización de indicadores, gráficos y tabla territorial con denominadores ponderados por dosis y población objetivo.
- Leyendas accesibles, ampliación de gráficos y tabla de resultados con búsqueda, orden y paginación.
- Descarga de la selección en CSV y XLSX con metadatos de fuente y periodo.

## [1.1.0] — Línea base de interfaz (2026-11-16)

### Añadido
- Identidad visual VacunaBI y navegación en cinco módulos.
- Resumen, Localidades, Sectores y biológicos, Calidad de datos y Metodología.
- Sistema de diseño con tarjetas, espacios, tipografía y rejilla adaptable.
- Navegación con teclado, foco visible y ajuste de gráficos al cambiar de vista.
- Pruebas automáticas de interfaz e integración con GitHub Actions.

### Modificado
- Interfaz y distribución de los gráficos existentes.
- README enfocado exclusivamente en el código de la aplicación.
- Instrucciones de clonación y ejecución del nuevo repositorio.
- Documentación técnica de línea base y roadmap.

### Eliminado
- `informe.py`, dedicado a generar documentos académicos y gráficos fuera de la aplicación.
- Referencias al archivo Word y a entregas académicas en la documentación de producto.

### Evolución posterior
- La validación de la navegación y las vistas con datos reales se abordó en las versiones siguientes.
- GitHub Pages permanece como opción de publicación, no como requisito del ejecutable de Windows.

## [1.0.0] — Base integrada (2026-11-16)

- ETL para Datos Abiertos Bogotá y cálculo de indicadores.
- Dashboard con Chart.js, aplicación de escritorio mediante pywebview.
- Salidas CSV, Excel, JSON y HTML.
- Pruebas unitarias y regresiones de transformación.
- Workflow de actualización y documentación técnica de desarrollo.
