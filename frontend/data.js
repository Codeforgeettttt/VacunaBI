'use strict';
globalThis.VacunaDatos = (() => {
  const available = (rows, key) => [...new Set(rows.map(row => row[key]))].sort((a,b) => String(a).localeCompare(String(b), 'es'));
  const rate = (doses, target) => Math.round(doses / target * 1000) / 10;
  function aggregate(rows, keys) {
    const groups = new Map();
    for (const row of rows) {
      const id = JSON.stringify(keys.map(key => row[key]));
      if (!groups.has(id)) groups.set(id, Object.assign(Object.fromEntries(keys.map(key => [key, row[key]])), {dosis_aplicada:0, denominador:0}));
      const group = groups.get(id);
      group.dosis_aplicada += row.dosis_aplicada;
      group.denominador += row.denominador;
    }
    return [...groups.values()].map(r => ({...r, cobertura:rate(r.dosis_aplicada,r.denominador)}))
      .sort((a,b) => a.cobertura - b.cobertura);
  }
  return {available,rate,aggregate};
})();
