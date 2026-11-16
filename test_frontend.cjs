const {test} = require('node:test');
const assert = require('node:assert/strict');
require('./frontend/data.js');
require('./frontend/tables.js');

test('la agregación conserva población y cobertura ponderada por localidad', () => {
  const rows = [{localidad:'A',dosis_aplicada:5,denominador:10},{localidad:'A',dosis_aplicada:90,denominador:100}];
  assert.deepEqual(VacunaDatos.aggregate(rows,['localidad']),[
    {localidad:'A',dosis_aplicada:95,denominador:110,cobertura:86.4}
  ]);
});

test('la exportación conserva acentos y limita fórmulas de celdas', () => {
  const data = VacunaTablas.csv([['Localidad','Cobertura'],['Bogotá',86.4],['=1+2','Texto "citado"']]).join('');
  assert.equal(data,'\uFEFF"Localidad";"Cobertura"\r\n"Bogotá";86,4\r\n"\'=1+2";"Texto ""citado"""');
});
