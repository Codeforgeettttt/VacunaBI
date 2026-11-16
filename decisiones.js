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
  function priorizar(filas, meta, peso) {
    if (!Number.isFinite(peso) || peso < 0 || peso > 100) return [];
    const datos = filas.map(fila => ({...fila,dato:medicion(fila.dosis_aplicada,fila.denominador,meta)})).filter(fila => fila.dato);
    const maximo = Math.max(1,...datos.map(fila => fila.dato.faltantes));
    return datos.map(fila => ({...fila,puntaje:peso*fila.dato.brecha/meta+(100-peso)*fila.dato.faltantes/maximo}))
      .sort((a,b) => b.puntaje-a.puntaje || a.localidad.localeCompare(b.localidad,'es'));
  }
  return {medicion, escenario, priorizar};
})();
