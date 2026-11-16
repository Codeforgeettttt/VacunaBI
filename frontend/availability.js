'use strict';
// Compatibilidad de fuentes calculada exclusivamente con los registros entregados por el ETL.
globalThis.VacunaDisponibilidad = (() => {
  const yearOf = row => String(row.fecha_reporte ?? '').slice(0,4);
  function years(annual = [], sector = []) {
    const result = new Map();
    for (const row of annual) {
      const year = String(row.anio ?? '');
      if (!/^\d{4}$/.test(year)) continue;
      const current = result.get(year) ?? {year, district:false, sector:false};
      current.district = true;
      result.set(year,current);
    }
    for (const row of sector) {
      const year = yearOf(row);
      if (!/^\d{4}$/.test(year)) continue;
      const current = result.get(year) ?? {year, district:false, sector:false};
      current.sector = true;
      result.set(year,current);
    }
    return [...result.values()].sort((a,b) => +b.year - +a.year);
  }
  const label = row => row.district && row.sector ? 'Ambas fuentes' :
    row.district ? 'Solo serie distrital' : 'Solo seguimiento sectorial';
  function inspect(selection, annual = [], sector = []) {
    const {source='auto',year='',local='',inst='',bioSource='',biological=''} = selection;
    const inventory = years(annual,sector);
    const yearInfo = inventory.find(row => row.year === String(year)) ?? null;
    const districtYear = !year || Boolean(yearInfo?.district);
    const sectorYear = !year || Boolean(yearInfo?.sector);
    const hasDistrict = annual.some(row => (!year || String(row.anio) === String(year)) &&
      (!biological || bioSource !== 'Serie distrital' || row.biologico === biological));
    const hasSector = sector.some(row => (!year || yearOf(row) === String(year)) &&
      (!local || row.localidad === local) && (!inst || row.institucion === inst) &&
      (!biological || bioSource !== 'Seguimiento sectorial' || row.biologico === biological));
    const districtAllowed = source !== 'sector' && !local && !inst &&
      bioSource !== 'Seguimiento sectorial';
    const sectorAllowed = source !== 'district' && bioSource !== 'Serie distrital';
    const district = districtAllowed && hasDistrict;
    const territorial = sectorAllowed && hasSector;
    const latestCut = sector.reduce((latest,row) =>
      row.fecha_reporte > latest ? row.fecha_reporte : latest, '');
    const sectorYears = inventory.filter(row => row.sector).map(row => row.year);
    const buttons = [];
    let message = '';
    let reason = 'ok';

    if (source === 'district' && (local || inst || bioSource === 'Seguimiento sectorial')) {
      reason = 'granularity';
      message = 'La serie distrital muestra datos de Bogotá, sin desglose por localidad, institución ni biológico del seguimiento sectorial. Quita los filtros incompatibles; esto no representa una cobertura de 0 %.';
      buttons.push({id:'clear-granularity',label:'Quitar filtros incompatibles'});
    } else if (bioSource === 'Serie distrital' && (local || inst || source === 'sector')) {
      reason = 'granularity';
      message = 'Este biológico pertenece a la serie distrital. No se puede combinar con localidad, institución o la fuente sectorial porque ese desglose no está publicado.';
      buttons.push({id:'clear-granularity',label:'Consultar serie distrital'});
    } else if (bioSource === 'Seguimiento sectorial' && source === 'district') {
      reason = 'granularity';
      message = 'Este biológico pertenece al seguimiento sectorial y no está disponible en la fuente distrital.';
      buttons.push({id:'clear-biological',label:'Quitar biológico incompatible'});
    } else if (year && source === 'district' && !districtYear) {
      reason = 'no-district-year';
      message = `La serie distrital no tiene registros para ${year} en los datos cargados. Puedes elegir un año que indique «Serie distrital» o cambiar la fuente.`;
      if (sectorYear) buttons.push({id:'sector',label:'Ver seguimiento sectorial'});
    } else if (year && source === 'sector' && !sectorYear) {
      reason = 'no-sector-year';
      message = `El seguimiento sectorial no tiene registros para ${year}. Esto no equivale a cobertura cero. Consulta otro año con seguimiento sectorial.`;
      if (latestCut) buttons.push({id:'latest-sector',label:`Ver corte sectorial ${latestCut}`});
      if (districtYear) buttons.push({id:'district',label:'Ver serie distrital'});
    } else if (year && districtYear && !sectorYear && source !== 'district') {
      reason = 'no-sector-year';
      message = `En ${year} hay información distrital, pero no hay registros de seguimiento sectorial para ese año en los datos cargados. Los mapas, indicadores por localidad y prioridades necesitan esa fuente. No significa que la cobertura haya sido cero.`;
      if (latestCut) buttons.push({id:'latest-sector',label:`Ver corte sectorial ${latestCut}`});
      buttons.push({id:'district',label:'Consultar serie distrital sin filtros territoriales'});
    } else if (year && sectorYear && !districtYear && source !== 'sector' && hasSector) {
      reason = 'no-district-year';
      message = `En ${year} hay seguimiento sectorial, pero no hay serie distrital para ese año en los datos cargados. Las tendencias históricas pueden no estar disponibles.`;
      buttons.push({id:'sector',label:'Consultar seguimiento sectorial'});
    } else if (!hasSector && sectorAllowed && !hasDistrict) {
      reason = 'empty';
      message = 'No encontramos registros compatibles con esta combinación de año, localidad, sector y biológico. Esto significa dato no disponible, no cobertura del 0 %.';
      buttons.push({id:'reset-selection',label:'Restablecer filtros'});
    } else if (!hasSector && sectorAllowed && !local && !inst && year && sectorYear) {
      reason = 'empty-sector';
      message = 'La fuente sectorial tiene registros en ese año, pero no para todos los filtros seleccionados. Puedes quitar un filtro o elegir otro corte.';
      buttons.push({id:'reset-selection',label:'Restablecer filtros'});
    } else if (district && !territorial && source !== 'district') {
      reason = 'district-only';
      message = 'Esta selección permite consultar la serie distrital; el análisis sectorial no tiene filas compatibles. Los resultados por localidad se dejan sin dato.';
      if (latestCut) buttons.push({id:'latest-sector',label:`Ver corte sectorial ${latestCut}`});
    } else if (territorial && !district && source !== 'sector' && !local && !inst) {
      reason = 'sector-only';
      message = 'Esta selección utiliza seguimiento sectorial. La serie distrital no tiene datos compatibles con los filtros actuales.';
    } else if (district && territorial) {
      message = 'Hay datos de ambas fuentes para la selección general. Cada vista utiliza únicamente las dimensiones y cortes que publica su fuente.';
    } else if (territorial) {
      message = 'Hay registros sectoriales compatibles. La serie distrital no proporciona el mismo desglose por localidad o institución.';
    } else if (district) {
      message = 'Hay datos distritales compatibles con la selección.';
    } else {
      reason = 'empty';
      message = 'No hay registros compatibles con esta selección en las fuentes cargadas. No se interpreta la ausencia como cobertura cero.';
      buttons.push({id:'reset-selection',label:'Restablecer filtros'});
    }
    return {inventory,yearInfo,districtYear,sectorYear,districtAllowed,sectorAllowed,
      district,territorial,latestCut,sectorYears,reason,message,buttons};
  }
  return {years,label,inspect};
})();
