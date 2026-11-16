# VacunaBI — Validación de salida y aceptación en Windows

**Alcance:** aplicación V2.2 y estabilizaciones V2.2.1–V2.2.2.

La corrección de recarga en V2.2.1 usa la API de pywebview para abrir `salidas/dashboard.html` sin añadir parámetros a la dirección `file://`. Comprobar especialmente WIN-09 y WIN-10 en un equipo real; las regresiones automatizadas no sustituyen esta prueba.

## Qué está comprobado automáticamente

El workflow de Windows ejecuta pruebas de ETL, decisiones, interfaz, exportación nativa simulada y contrato de recursos de la versión. Además, construye y adjunta `VacunaBI.exe` con PyInstaller.

En V2.2.2, confirmar con una segunda apertura que la copia compatible se muestra sin descargar otra vez ambas fuentes. Pulsar **Actualizar datos** debe iniciar una consulta explícita, no una recarga automática al abrir.

**Importante:** que el ejecutable se compile y las pruebas pasen no demuestra que la aplicación se haya iniciado y utilizado en un equipo Windows. El uso manual se valida por separado.

## Lista de aceptación manual — Windows 10/11

Entorno de referencia: Windows 10/11 con Microsoft Edge WebView2 disponible. Utilizar la compilación más reciente que haya finalizado con éxito en [GitHub Actions](https://github.com/Codeforgeettttt/VacunaBI/actions/workflows/windows.yml), no una compilación anterior.

Registrar para cada prueba: **Pass/Fail/No ejecutada**, captura o vídeo breve, versión de Windows y commit del artefacto. No marcar aprobada una prueba sin ejecutarla.

| ID | Acción | Resultado esperado | Estado inicial |
| --- | --- | --- | --- |
| WIN-01 | Extraer el ZIP y abrir `VacunaBI.exe` desde una carpeta con permisos de escritura. | La primera apertura genera un tablero y las siguientes de la misma versión abren la copia sin repetir el ETL. | No ejecutada |
| WIN-02 | Cargar datos con conexión y esperar la finalización. | Se muestran fuente, corte, fecha de extracción y KPI. | No ejecutada |
| WIN-03 | Recorrer Resumen, Localidades, Sectores, Decisiones, Calidad y Metodología. | Se abren las seis vistas y la navegación indica la activa. | No ejecutada |
| WIN-04 | Cambiar año, localidad y filtros avanzados. | Los resultados compatibles cambian; los incompatibles se explican. | No ejecutada |
| WIN-05 | Seleccionar una localidad en el mapa y comparar dos territorios. | Mapa, ranking y ficha presentan el mismo corte y valores coherentes. | No ejecutada |
| WIN-06 | Recorrer las cuatro etapas de Decisiones, volver y avanzar. | La selección y las dosis introducidas permanecen; entradas incorrectas se explican. | No ejecutada |
| WIN-07 | Exportar CSV, XLSX, ficha territorial y reporte ejecutivo. | El diálogo nativo permite guardar, cancelar y abrir archivos válidos. | No ejecutada |
| WIN-08 | Cambiar tema claro/oscuro y reducir la ventana a 800 × 600. | Contenido legible, sin cortes críticos ni scroll horizontal general. | No ejecutada |
| WIN-09 | Simular indisponibilidad de Internet después de una carga exitosa, cerrar y reabrir. | Aparece la última copia válida sin presentar datos desactualizados como recién extraídos. | No ejecutada |
| WIN-10 | Recuperar conexión y pulsar Actualizar datos. | Ejecuta una sola actualización a petición del usuario, reabre el HTML local sin parámetros `?actualizado=`, informa éxito y muestra la extracción reciente sin `File not found` de WebView2. | No ejecutada |
| WIN-11 | Navegar con Tab, Shift+Tab, Enter, Espacio y Esc en mapa, tablas y diálogos. | Foco visible, orden lógico y posibilidad de operar sin ratón. | No ejecutada |

## Validación de accesibilidad pendiente

La documentación anterior recoge comprobaciones automatizadas en Chromium y axe. Para completar la aceptación manual se requiere:

- Una prueba con lector de pantalla en Windows (por ejemplo, NVDA) sobre navegación, KPI, mapa, formularios, simulaciones y avisos.
- Pruebas de contraste y foco en ambos temas, incluyendo zoom y tamaños de ventana reducidos.
- Una sesión breve con usuarios nuevos: consultar cobertura, localizar brechas, comparar localidades, simular y exportar, registrando dificultades y pasos.
- Evidencia verificable de incidencias, correcciones y nueva ejecución.

Las pruebas automáticas **no certifican por sí solas conformidad WCAG 2.2 AA**.

## Procedimiento de reporte

1. Abrir [las compilaciones recientes](https://github.com/Codeforgeettttt/VacunaBI/actions/workflows/windows.yml) y descargar `VacunaBI-Windows` del último workflow exitoso.
2. Registrar SHA, fecha, versión de Windows y edición de WebView2.
3. Ejecutar WIN-01 a WIN-11 sin modificar los resultados ni los datos para aparentar éxitos.
4. Abrir un issue por fallo indicando paso, resultado, esperado, evidencia y entorno.
5. Cerrar la versión para distribución solo cuando no existan fallos críticos y se hayan revisado las incidencias.

Este documento es documentación técnica de validación de producto; no es un informe académico.
