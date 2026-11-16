const {test} = require('node:test');
const assert = require('node:assert/strict');
require('./decisiones.js');
const {medicion, escenario, priorizar, alertas} = globalThis.VacunaDecisiones;

test('cobertura, denominador inválido y redondeo de dosis necesarias', () => {
  assert.equal(medicion(0, 0, 95), null);
  assert.equal(medicion(18, 21, 95).faltantes, 2);
  assert.equal(medicion(105, 100, 95).cobertura, 105);
});

test('los escenarios conservan el denominador y el dato observado', () => {
  const base = Object.freeze(medicion(70, 100, 95));
  assert.equal(escenario(base, -1, 95), null);
  assert.equal(escenario(base, 0.5, 95), null);
  const caso = escenario(base, 25, 95);
  assert.equal(caso.cobertura, 95);
  assert.equal(caso.denominador, 100);
  assert.equal(caso.faltantes, 0);
  assert.equal(base.dosis, 70);
});

test('el ranking pondera dos criterios y tiene desempate reproducible', () => {
  const filas = [{localidad:'A',dosis_aplicada:50,denominador:100},
    {localidad:'B',dosis_aplicada:850,denominador:1000}];
  assert.equal(priorizar(filas,95,100)[0].localidad,'A');
  assert.equal(priorizar(filas,95,0)[0].localidad,'B');
  assert.deepEqual(priorizar(filas,95,60),priorizar(filas.slice().reverse(),95,60));
  assert.deepEqual(priorizar(filas,95,101),[]);
});

test('los descensos requieren dos años consecutivos cerrados', () => {
  const a = (anio,cobertura,anio_completo = true) => ({biologico:'Prueba',anio,cobertura,anio_completo});
  assert.ok(!alertas([], [a(2023,90),a(2025,80)],95,{}).length);
  assert.equal(alertas([], [a(2024,90),a(2025,80)],95,{})[0].valor,-10);
  assert.equal(alertas([], [a(2024,90),a(2025,80,false)],95,{})[0].tipo,'Periodo parcial');
});
