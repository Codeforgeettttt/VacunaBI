'use strict';
globalThis.VacunaDecisiones = (() => {
  function medicion(dosis, denominador, meta) {
    if (![dosis, denominador, meta].every(Number.isFinite) || dosis < 0 || denominador <= 0 || meta <= 0 || meta > 100) return null;
    const cobertura = dosis / denominador * 100;
    return {dosis, denominador, cobertura, brecha:Math.max(0,meta-cobertura),
      faltantes:Math.max(0,Math.ceil(meta*denominador/100)-dosis)};
  }
  function escenario(dato, adicionales, meta) {
    if (!dato || !Number.isSafeInteger(adicionales) || adicionales < 0) return null;
    const resultado = medicion(dato.dosis + adicionales,dato.denominador,meta);
    return resultado && {...resultado, mejora:resultado.cobertura-dato.cobertura};
  }
  return {medicion, escenario};
})();
