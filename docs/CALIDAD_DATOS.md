# Calidad y trazabilidad de datos

VacunaBI consulta y valida ambos recursos CKAN antes de preparar una publicación. Si una página está vacía antes de alcanzar el total declarado, cambian los totales, se repiten identificadores o falta una columna requerida, la descarga falla. En Windows, VacunaBI conserva y abre el último tablero guardado cuando existe.

| Campo | Significado |
| --- | --- |
| Originales | Registros obtenidos del recurso CKAN antes de limpiar. |
| Aceptados | Registros que permanecen después de aplicar las reglas de esa fuente. Incluye meses válidos sin reporte. |
| Descartados | Diferencia entre originales y aceptados. El detalle de limpieza distingue filas fuera del alcance, datos inválidos, duplicados y totales ya calculados por la fuente. |
| Observados sectoriales | Filas aceptadas con cobertura superior al 100 % o inconsistencia entre cobertura publicada y recalculada. Cada fila cuenta una vez. |
| Observados mensuales | Meses aceptados con dosis sin reporte. Un dato faltante conserva su estado y no se convierte en cero. |
| Corte | Última fecha sectorial válida o último mes con reporte. Los cortes de las dos fuentes pueden diferir. |

El proceso prepara las salidas en una carpeta temporal, guarda un respaldo y publica el HTML al final. Si algún reemplazo falla, restaura los archivos ya reemplazados. `salidas/auditoria.json` conserva hasta 30 ejecuciones recientes de la instalación, con inicio, fin, estado, fase, fuentes y detalle del fallo cuando aplica. El HTML incorpora el historial disponible al generarlo. En Windows la vista también lee la auditoría local para mostrar los fallos ocurridos después de la última publicación correcta.
