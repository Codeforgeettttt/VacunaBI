# Índice de documentación — VacunaBI V2.2.3

**Proyecto:** VacunaBI · Inteligencia de Negocios · Universidad Manuela Beltrán

Esta carpeta separa la documentación de **producto**, **análisis funcional**, **arquitectura técnica**, **gestión de información** y **pruebas**. Cada archivo tiene una finalidad concreta para evitar que el manual general se vuelva difícil de consultar.

## Punto de partida

| Documento | Qué encontrarás | Para quién es |
| --- | --- | --- |
| [Documentación integral](DOCUMENTACION_INTEGRAL.md) | Contexto, objetivos, alcance, uso, evolución, arquitectura resumida y conclusiones | Lectura inicial, equipo y sustentación |
| [Documentación técnica](DOCUMENTACION_TECNICA.md) | Arquitectura, componentes, interfaces, despliegue, configuración, seguridad, estados y trazabilidad | Desarrolladores y revisión técnica |
| [Casos de uso y diagramas](CASOS_DE_USO_Y_DIAGRAMAS.md) | Catálogo de 19 casos, casos extendidos, diagramas de uso, secuencias, actividades y estados | Análisis y diseño del sistema |
| [Diccionario y gestión de datos](DICCIONARIO_Y_GESTION_DATOS.md) | Recursos, estructura de entradas y salidas, modelo dimensional conceptual, campos, KPI, calidad y linaje | Analistas de datos y mantenedores del ETL |
| [Proceso ETL](PROCESO_ETL.md) | Extracción CKAN, concurrencia, validación, limpieza, cálculo, generación, publicación, auditoría y errores | Equipo técnico, sustentación del flujo de datos |
| [Requisitos y plan de pruebas](REQUISITOS_Y_PLAN_PRUEBAS.md) | Requisitos funcionales/no funcionales, pruebas de aceptación y matriz de trazabilidad | Calidad, sustentación y cierre de versiones |

## Documentos especializados que ya existían

| Documento | Utilidad |
| --- | --- |
| [Calidad y trazabilidad](CALIDAD_DATOS.md) | Resumen de registros originales, aceptados, observados y descartados |
| [Filtros y fuentes](FILTROS_FUENTES.md) | Compatibilidad entre granularidad, año y origen del dato |
| [Decisiones](DECISIONES.md) | Metodología de priorización, simulación y alertas |
| [Datos territoriales](DATOS_TERRITORIALES.md) | Procedencia y preparación del mapa de localidades |
| [Validación V2.2](V2.2_VALIDACION.md) | Recorridos y resultados de verificación del dashboard |
| [Validación Windows](VALIDACION_WINDOWS.md) | Lista de aceptación manual y pruebas de accesibilidad pendientes |
| [Contribución](CONTRIBUTING.md) | Reglas de commits y atribución del trabajo |
| [Roadmap](ROADMAP.md) | Evolución de V1.0 a V2.2.3 |

El [README principal](../README.md) reúne comandos de inicio y enlaces, y el [CHANGELOG](../CHANGELOG.md) describe cada incremento de versión.

## Diagramas disponibles

Todos los diagramas de los documentos nuevos están escritos en **Mermaid** para visualizarse directamente en GitHub.

| Diagrama | Documento |
| --- | --- |
| Contexto del sistema y límites | Documentación técnica |
| Componentes y arquitectura lógica | Documentación técnica |
| Despliegue Windows y HTML | Documentación técnica |
| Secuencia de inicio, actualización y recuperación | Documentación técnica y casos de uso |
| Diagrama general de casos de uso (representación Mermaid) | Casos de uso y diagramas |
| Diagramas de uso por analista y operador técnico | Casos de uso y diagramas |
| Actividad de filtros inteligentes | Casos de uso y diagramas |
| Flujo de vista previa CSV | Casos de uso y diagramas |
| Estados de ejecución | Casos de uso y documentación técnica |
| Modelo conceptual de hechos y dimensiones | Diccionario y gestión de datos |
| Linaje de origen a indicador | Diccionario y gestión de datos |
| Flujo y publicación ETL | Proceso ETL |

**Nota de modelado:** el diagrama dimensional es conceptual; el producto genera hojas Excel y archivos CSV/JSON/HTML. No existe un esquema SQL físico ni autenticación por roles. Los diagramas de casos de uso utilizan formas ovaladas en Mermaid: son legibles en GitHub, pero no pretenden sustituir automáticamente una lámina UML formal creada en un modelador especializado.

## Orden sugerido para una sustentación

1. **Presentar el problema y el alcance:** documentación integral, capítulos 1–3.
2. **Mostrar las funcionalidades:** casos de uso UC-01 a UC-19 y la aplicación abierta.
3. **Explicar arquitectura:** contexto, componentes, despliegue y puente pywebview.
4. **Sustentar la información:** dos recursos CKAN, diccionario, granularidades y calidad.
5. **Demostrar el ETL:** extracción en paralelo, reglas de limpieza, KPIs y publicación segura.
6. **Mostrar evidencia:** requisitos, plan de pruebas, automatizaciones, release V2.2.3 y registros de validación realmente ejecutados.
7. **Cerrar con limitaciones y mejoras futuras:** no hay predicción estadística, base SQL, cuentas de usuario ni prueba manual completa de Windows documentada.

## Criterios de mantenimiento documental

Cuando cambie el código, revisar el documento que describe su comportamiento:

- Nuevo filtro o fuente → casos de uso, diccionario, filtros y pruebas.
- Nueva medida o fórmula → proceso ETL, diccionario, decisiones y pruebas de regresión.
- Cambio de interfaz → casos de uso y manual técnico.
- Cambio de pywebview o de salida → manual técnico, README y validación Windows.
- Nueva release → CHANGELOG, roadmap y referencias de versión.

**Estado:** documentación complementaria del código V2.2.3. No modifica indicadores ni el ejecutable publicado. Las verificaciones manuales sin evidencia continúan pendientes.
