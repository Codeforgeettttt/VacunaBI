# Registro de cambios — VacunaBI

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

## [1.1.0] — En desarrollo (2026-11-16)

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

### Pendiente
- Verificar visualmente la V1.1 en navegador y pywebview.
- Validar las vistas con datos reales.
- Habilitar GitHub Pages solo cuando se necesite publicar el dashboard web.

## [1.0.0] — Base integrada (2026-11-16)

- ETL para Datos Abiertos Bogotá y cálculo de indicadores.
- Dashboard con Chart.js, aplicación de escritorio mediante pywebview.
- Salidas CSV, Excel, JSON y HTML.
- Pruebas unitarias y regresiones de transformación.
- Workflow de actualización y documentación técnica de desarrollo.
