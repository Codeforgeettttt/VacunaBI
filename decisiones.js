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
  function alertas(prioridades, anual, meta, logs) {
    const lista = [];
    for (const fila of prioridades) {
      if (fila.dato.brecha) lista.push({tipo:'Bajo la meta',detalle:fila.localidad,valor:fila.dato.cobertura});
      if (fila.dato.cobertura > 100) lista.push({tipo:'Revisión de calidad',detalle:fila.localidad+' · superior a 100 %',valor:fila.dato.cobertura});
    }
    const series = new Map(anual.filter(r => r.anio_completo).map(r => [JSON.stringify([r.biologico,r.anio]),r]));
    const ultimo = Math.max(...anual.filter(r => r.anio_completo).map(r => r.anio));
    for (const r of series.values()) {
      if (r.anio !== ultimo) continue;
      const anterior = series.get(JSON.stringify([r.biologico,r.anio-1]));
      if (anterior && r.cobertura < anterior.cobertura) lista.push({tipo:'Descenso distrital',detalle:r.biologico+' · '+(r.anio-1)+'–'+r.anio,valor:r.cobertura-anterior.cobertura});
    }
    if (anual.some(r => !r.anio_completo && r.anio > ultimo)) lista.push({tipo:'Periodo parcial',detalle:'La serie distrital tiene meses sin cerrar.'});
    const invalidas = (logs.sectores?.filas_invalidas ?? 0) +(logs.mensual?.filas_invalidas ?? 0);
    if (invalidas) lista.push({tipo:'Revisión de calidad',detalle:invalidas+' filas inválidas descartadas por el ETL.'});
    return lista;
  }
  return {medicion, escenario, priorizar, alertas};
})();
