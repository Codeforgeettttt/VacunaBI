'use strict';
globalThis.VacunaTablas = (() => {
  function chartValues(chart, fmt, esc) {
    const region = chart.values.lastElementChild;
    const heading = chart.canvas.closest('.card').querySelector('h3').textContent;
    chart.values.firstElementChild.setAttribute('aria-label','Consultar tabla del gráfico: ' + heading);
    region.setAttribute('aria-label','Valores: ' + heading);
    const columns = chart.data.datasets.map((dataset,index) => ({dataset,index})).filter(item => chart.isDatasetVisible(item.index));
    if (!columns.length) {
      region.innerHTML = '<p>Activa al menos una serie para consultar sus valores.</p>';
      return;
    }
    const counts = chart.tableCounts;
    const titles = counts ? ['Cobertura (%)','Dosis','Denominador'] : columns.map(({dataset}) => dataset.label ?? 'Cobertura (%)');
    const table = chart.data.labels.map((label,index) => {
      const result = columns.map(({dataset}) => dataset.data[index] == null ? 'Sin datos' : fmt(dataset.data[index]) + ' %');
      if (counts) result.push(fmt(counts[index].dosis_aplicada),fmt(counts[index].denominador));
      return `<tr><th scope="row">${esc(label)}</th>${result.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`;
    }).join('');
    region.innerHTML = `<table><caption>${esc(chart.tableSource)}</caption><thead><tr><th scope="col">Categoría</th>${titles.map(title => `<th scope="col">${esc(title)}</th>`).join('')}</tr></thead><tbody>${table}</tbody></table>`;
  }
  function csv(rows) {
    const csvCell = value => {
      if (typeof value === 'number') return String(value).replace('.',',');
      const text = String(value ?? '');
      const safe = /^[\s]*[=+\-@]|^[\t\r\n]/.test(text) ? "'" + text : text;
      return '"' + safe.replaceAll('"','""') + '"';
    };
    return ['\uFEFF',rows.map(row => row.map(csvCell).join(';')).join('\r\n')];
  }
  return {chartValues,csv};
})();
