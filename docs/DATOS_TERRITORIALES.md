# Límites de localidades de Bogotá

`localidades.json` deriva de [Localidad Bogotá D.C.](https://datosabiertos.bogota.gov.co/dataset/localidad-bogota-d-c), publicado por la Secretaría Distrital de Planeación en Datos Abiertos Bogotá con licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). El recurso oficial descargado indica última actualización de datos el 5 de agosto de 2022.

El archivo conserva los 20 códigos oficiales y los anillos simplificados para su representación en el tablero. La geometría simplificada sirve para visualizar coberturas. Usa el recurso oficial para mensuras o análisis de límites.

El mapa y el ranking muestran la cobertura de primera infancia del mismo corte y filtros. Las áreas sin registros compatibles aparecen en gris. Puedes seleccionar un área con clic, Enter o Espacio, o usar el filtro de localidad. La selección muestra dosis, denominador y fecha de corte.

Regenera el archivo desde [la descarga oficial](https://datosabiertos.bogota.gov.co/dataset/856cb657-8ca3-4ee8-857f-37211173b1f8/resource/497b8756-0927-4aee-8da9-ca4e32ca3a8a/download/loca.json):

```bash
python scripts/preparar_localidades.py loca.json localidades.json
```
