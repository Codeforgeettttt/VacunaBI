const {test} = require('node:test');
const assert = require('node:assert/strict');
require('./frontend/data.js');
require('./frontend/availability.js');
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

const district = [
  {anio:2023,biologico:'Triple viral 1 año'},
  {anio:2024,biologico:'Triple viral 1 año'},
];
const sector = [
  {fecha_reporte:'2025-08-26',localidad:'Usme',institucion:'ICBF',biologico:'Pentavalente'},
  {fecha_reporte:'2025-08-26',localidad:'Suba',institucion:'Colegios',biologico:'Triple viral'},
];

test('los años identifican cuál fuente contiene registros sin inventar cortes', () => {
  assert.deepEqual(VacunaDisponibilidad.years(district,sector),[
    {year:'2025',district:false,sector:true},
    {year:'2024',district:true,sector:false},
    {year:'2023',district:true,sector:false},
  ]);
  const info = VacunaDisponibilidad.inspect({year:'2024'},district,sector);
  assert.equal(info.district,true);
  assert.equal(info.territorial,false);
  assert.equal(info.reason,'no-sector-year');
  assert.match(info.message,/no hay registros de seguimiento sectorial/i);
  assert.match(info.message,/no significa.*cero/i);
  assert.ok(info.buttons.some(button => button.id === 'latest-sector'));
});

test('no atribuye a localidades una serie distrital sin desglose', () => {
  const info = VacunaDisponibilidad.inspect({year:'2024',source:'district',local:'Usme'},district,sector);
  assert.equal(info.district,false);
  assert.equal(info.territorial,false);
  assert.equal(info.reason,'granularity');
  assert.ok(info.buttons.some(button => button.id === 'clear-granularity'));
});

test('un biológico distrital no aparece como dato sectorial', () => {
  const info = VacunaDisponibilidad.inspect({year:'2025',bioSource:'Serie distrital',
    biological:'Triple viral 1 año',local:'Suba'},district,sector);
  assert.equal(info.territorial,false);
  assert.equal(info.reason,'granularity');
});

test('distingue combinación sectorial vacía de una cobertura cero', () => {
  const info = VacunaDisponibilidad.inspect({year:'2025',local:'Usme',
    inst:'Colegios'},district,sector);
  assert.equal(info.territorial,false);
  assert.equal(info.reason,'empty');
  assert.match(info.message,/no.*cobertura del 0/i);
});

test('registros sectoriales compatibles se detectan sin alterar cálculos', () => {
  const info = VacunaDisponibilidad.inspect({year:'2025',source:'sector',
    local:'Usme',inst:'ICBF',bioSource:'Seguimiento sectorial',
    biological:'Pentavalente'},district,sector);
  assert.equal(info.district,false);
  assert.equal(info.territorial,true);
  assert.equal(info.sectorYears[0],'2025');
  assert.equal(VacunaDatos.rate(95,110),86.4);
});

test('no inventa años cuando ambas fuentes están vacías', () => {
  const info = VacunaDisponibilidad.inspect({year:'2024'},[],[]);
  assert.deepEqual(info.inventory,[]);
  assert.equal(info.district,false);
  assert.equal(info.territorial,false);
});
