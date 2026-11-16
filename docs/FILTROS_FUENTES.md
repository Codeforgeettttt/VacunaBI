# Filtros, fuentes y disponibilidad — VacunaBI V2.2

## Qué información se puede consultar

VacunaBI reúne recursos **distintos**, sin asumir que comparten los mismos cortes y dimensiones.

| Origen | Dimensiones disponibles | Uso |
| --- | --- | --- |
| Serie distrital | Año, mes y biológico según los registros publicados | Cobertura temporal y evolución del distrito |
| Seguimiento sectorial | Fecha de corte, localidad, institución y biológico según los registros publicados | KPI de primera infancia, mapa, ranking, sectores y priorización |

Los cortes de ambas fuentes pueden diferir. No se agregan años o desgloses que una fuente no proporciona.

## Selector de fuente y año

En **Explorar datos**, **Fuente** ofrece tres opciones:

- **Según la vista (ambas):** cada visualización usa su recurso original. Es la opción predeterminada.
- **Serie distrital:** muestra los datos de la fuente temporal. Las vistas sectoriales quedan sin resultados si se exige esta fuente.
- **Seguimiento sectorial:** muestra las filas sectoriales. Las visualizaciones exclusivamente distritales no están disponibles para esta selección.

El desplegable **Año** etiqueta cada opción usando los registros entregados por el ETL: «Ambas fuentes», «Solo serie distrital» o «Solo seguimiento sectorial». Esas etiquetas describen el año general, **no prometen disponibilidad de cada biológico o combinación concreta**.

La interfaz deshabilita opciones incompatibles cuando no están seleccionadas y explica por qué. Una selección previa que se volvió incompatible no se descarta silenciosamente: se ofrece una acción visible para corregirla.

## Ejemplos de mensajes

- **Año que solo figura en la serie distrital:** se pueden consultar las tendencias del distrito, pero el mapa territorial y el análisis sectorial no cuentan con registros de ese año.
- **Biológico distrital + localidad:** la fuente temporal no incluye ese desglose. Se ofrece quitar los filtros territoriales.
- **Localidad + institución sin combinación en el corte:** no hay filas compatibles; se puede restablecer la consulta.
- **Fuente sectorial sin datos para el año seleccionado:** se ofrece usar el último corte sectorial presente en los registros.

El texto distingue tres causas: **año no disponible en la fuente**, **granularidad no publicada** y **combinación sin registros**.

> «Sin datos» no significa «cobertura del 0 %». Tampoco significa que no se hayan administrado vacunas.

## Integración técnica

- `frontend/availability.js`: calcula inventarios por año y compatibilidad de filtros sobre los registros existentes, sin cambiar medidas.
- `frontend/dashboard.js`: aplica la selección de fuente y los filtros, explica resultados ausentes y sugiere acciones.
- `frontend/dashboard.css`: estilos accesibles para estados y disponibilidad.
- `dashboard_template.html`: controles y regiones de estado.
- `etl.py`: incrusta los módulos JavaScript en el HTML autónomo, incluido el que utiliza `VacunaBI.exe`.

**No se cambiaron** las fórmulas de cobertura, brecha, dosis adicionales, cálculo de escenarios ni las reglas de validación de las fuentes.

## Comprobaciones

```bash
python test_etl.py
python -m unittest -v test_etl_regression test_dashboard_template test_app_export test_release_integrity
node --test test_decisiones.cjs test_frontend.cjs
```

Las pruebas verifican años por fuente, restricciones territoriales, combinaciones sin registros y ausencia de años inventados. Además, es necesario probar el ejecutable en Windows con el último artefacto publicado y verificar un año distrital sin datos sectoriales.
