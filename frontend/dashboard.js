(() => {
  const $ = id => document.getElementById(id);
  const refresh = $('refresh-data');
  const refreshStatus = $('refresh-status');
  const auditTime = new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'medium'});
  const auditCount = value => value == null ? '—' : fmt(value);
  function auditTable(target, headings, rows) {
    $(target).innerHTML = rows.length ? '<table><thead><tr>' + headings.map(value => `<th scope="col">${esc(value)}</th>`).join('') +
      '</tr></thead><tbody>' + rows.map(row => '<tr><th scope="row">' + esc(row[0]) + '</th>' +
      row.slice(1).map(value => `<td>${esc(value)}</td>`).join('') + '</tr>').join('') +
      '</tbody></table>' : '<p>Todavía no hay ejecuciones registradas para este tablero.</p>';
  }
  function mostrarAuditoria(runs) {
    const published = (D.auditoria ?? []).findLast(run => run.estado === 'Correcta');
    const sources = Object.entries(published?.fuentes ?? {}).map(([key,value]) => [
      key === 'sectores' ? 'Seguimiento sectorial' : 'Cobertura mensual',value.recurso,value.corte,
      auditCount(value.originales),auditCount(value.aceptados),auditCount(value.descartados),auditCount(value.observados)
    ]);
    auditTable('audit-sources',['Fuente','Recurso CKAN','Corte','Originales','Aceptados','Descartados','Observados'],sources);
    const time = value => {
      const date = new Date(value);
      return value && Number.isFinite(date.getTime()) ? auditTime.format(date) : '—';
    };
    const latest = runs.at(-1);
    const status = $('audit-summary');
    status.dataset.status = latest?.estado === 'Fallida' ? 'error' : '';
    status.textContent = latest
      ? `Última ejecución: ${latest.estado.toLowerCase()} · ${time(latest.fin || latest.inicio)}. ${latest.estado === 'Fallida' ? 'El tablero conserva la última copia válida.' : 'Esta ejecución terminó correctamente.'}`
      : 'Este tablero todavía no tiene un historial de actualizaciones.';
    const explanation = run => {
      if (run.estado !== 'Fallida') return '—';
      if (run.fase?.startsWith('Descarga')) return 'La fuente no respondió o la descarga quedó incompleta.';
      if (run.fase === 'Publicación') return 'No se pudieron publicar los archivos de esta actualización.';
      return 'La actualización encontró datos que no superaron la validación.';
    };
    auditTable('audit-runs',['Inicio','Fin','Estado','Fase','Detalle'],runs.slice().reverse().map(run =>
      [time(run.inicio),time(run.fin),run.estado,run.fase,explanation(run)]));
  }
  mostrarAuditoria(D.auditoria ?? []);
  function reportRefresh(message, state = '') {
    refreshStatus.textContent = message;
    refreshStatus.dataset.status = state;
    refreshStatus.hidden = false;
    if (state === 'error') $('data-freshness').textContent = `Extracción: ${D.generado} · última copia válida`;
  }
  async function syncAudit() {
    try {
      const runs = await window.pywebview?.api?.get_audit?.();
      if (Array.isArray(runs)) mostrarAuditoria(runs);
    } catch {
      // Se conserva la auditoría publicada en el HTML.
    }
  }
  async function enableRefresh() {
    refresh.hidden = !window.pywebview?.api?.refresh_data;
    if (refresh.hidden) return;
    await syncAudit();
    try {
      if (await window.pywebview.api.consumir_aviso_recarga?.()) {
        reportRefresh('Actualización completada. Se cargó el tablero actualizado.');
      } else if (await window.pywebview.api.usa_copia_local?.() && refreshStatus.hidden) {
        reportRefresh('La actualización no se completó. Estás viendo el último tablero guardado.','error');
      }
    } catch {
      // El tablero y la actualización siguen disponibles aunque falle esta consulta de estado.
    }
  }
  window.addEventListener('pywebviewready',enableRefresh);
  enableRefresh();
  refresh.addEventListener('click',async () => {
    refresh.disabled = true;
    refresh.setAttribute('aria-busy','true');
    reportRefresh('Consultando Datos Abiertos Bogotá…');
    try {
      const result = await window.pywebview.api.refresh_data();
      if (result.ok) {
        // El archivo se abre desde Python: WebView2 no admite query strings en file://.
        const loaded = await window.pywebview.api.recargar_dashboard();
        if (!loaded?.ok) reportRefresh(loaded?.message || 'No se pudo abrir el tablero actualizado.','error');
      } else {
        reportRefresh(result.message,'error');
        await syncAudit();
      }
    } catch {
      reportRefresh('Falló la consulta. Se conserva el tablero anterior.','error');
    } finally {
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
    }
  });
  const filters = ['fSource', 'fYear', 'fLocal', 'fBio', 'fSector', 'fMode', 'fCompare', 'fMonthFrom', 'fMonthTo'];
  const sector = D.sectoriales ?? [];
  let manualRows = [];
  const manualSource = 'Registro manual · vista previa';
  const manualFields = ['fecha_reporte','localidad','institucion','biologico','dosis_aplicada','denominador'];
  const manualKey = row => JSON.stringify(manualFields.slice(0,4).map(field => row[field]));
  function currentSector() {
    if (!manualRows.length) return sector;
    const preview = new Map(sector.map(row => [manualKey(row),row]));
    manualRows.forEach(row => preview.set(manualKey(row),row));
    return [...preview.values()];
  }
  const monthly = D.mensual ?? [];
  const {available,rate,aggregate} = globalThis.VacunaDatos;
  const append = (select, values) => values.forEach(value => select.add(new Option(value, value)));
  const historicalYears = available(cerr, 'anio').map(Number);
  const disponibilidad = globalThis.VacunaDisponibilidad;
  const inventory = disponibilidad.years(D.anual,sector);
  inventory.forEach(row => $('fYear').add(new Option(`${row.year} · ${disponibilidad.label(row)}`,row.year)));
  append($('fCompare'), historicalYears.slice().reverse());
  const territory = D.limites_localidades ?? [];
  append($('fLocal'), territory.length ? available(territory,'localidad') : available(sector,'localidad'));
  append($('territory-compare'), territory.length ? available(territory,'localidad') : available(sector,'localidad'));
  append($('fSector'), available(sector, 'institucion'));
  for (const [name, rows] of [['Serie distrital', D.anual], ['Seguimiento sectorial', sector]]) {
    const group = document.createElement('optgroup');
    group.label = name;
    available(rows, 'biologico').forEach(value => group.append(new Option(value, JSON.stringify([name, value]))));
    $('fBio').append(group);
  }
  const charts = Object.fromEntries(['cAnual','cActual','cLoc','cInst','cGrupo'].map(id => [id, Chart.getChart(id)]));
  const template = Object.fromEntries(Object.entries(charts).map(([id, chart]) => [id, chart.data.datasets.map(row => ({...row}))]));
  const theme = $('theme-toggle');
  function themeMode(light) {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    theme.setAttribute('aria-pressed',String(light));
    document.querySelector('meta[name="theme-color"]').content = css('--page');
    S.splice(0,S.length,...['--s1','--s2','--s3','--s4','--s5'].map(css));
    Chart.defaults.color = css('--ink2');
    Chart.defaults.borderColor = css('--grid');
    for (const chart of Object.values(charts)) {
      chart.options.color = Chart.defaults.color;
      chart.options.borderColor = Chart.defaults.borderColor;
      chart.dataSignature = '';
    }
  }
  try { themeMode(localStorage.getItem('vacunabi-tema') === 'claro'); } catch { themeMode(false); }
  theme.addEventListener('click',() => {
    const light = theme.getAttribute('aria-pressed') !== 'true';
    themeMode(light);
    try { localStorage.setItem('vacunabi-tema',light ? 'claro' : 'oscuro'); } catch {}
    render();
  });
  const monthNames = charts.cActual.data.labels.slice();
  ['fMonthFrom','fMonthTo'].forEach(id => meses.forEach((month, index) => $(id).add(new Option(
    new Intl.DateTimeFormat('es-CO', {month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,index,1))),month))));
  const dialog = $('chart-dialog');
  let expanded = null;
  let opener = null;
  dialog.addEventListener('close', () => {
    expanded?.destroy();
    expanded = null;
    $('expanded-chart').replaceChildren();
    opener?.focus();
  });
  const statusByChart = {};
  const svg = $('territory-map');
  const mapPaths = new Map();
  const levels = [
    [70,'#a44962','Menos de 70 %'], [80,'#d66d5c','70 a menos de 80 %'],
    [90,'#d3a756','80 a menos de 90 %'], [95,'#5ba3bb','90 a menos de 95 %'],
    [Infinity,'#299e83','95 % o más']
  ];
  const missing = '#33455b';
  $('territory-legend').innerHTML = [...levels,[null,missing,'Sin datos para los filtros']]
    .map(([,color,label]) => `<li><span aria-hidden="true" style="background:${color}"></span>${label}</li>`).join('');
  if (territory.length) {
    const points = territory.flatMap(item => item.anillos.flat());
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
    const scale = Math.min(412/(right-left),544/(top-bottom));
    const dx = (450-(right-left)*scale)/2, dy = (580-(top-bottom)*scale)/2;
    for (const item of territory) {
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      const title = document.createElementNS('http://www.w3.org/2000/svg','title');
      path.setAttribute('d',item.anillos.map(ring => ring.map(([x,y], i) =>
        `${i ? 'L' : 'M'}${(dx+(x-left)*scale).toFixed(2)},${(dy+(top-y)*scale).toFixed(2)}`).join('') + 'Z').join(' '));
      path.setAttribute('fill-rule','evenodd');
      path.setAttribute('role','button');
      path.setAttribute('tabindex','0');
      path.append(title);
      const select = () => {
        $('fLocal').value = $('fLocal').value === item.localidad ? '' : item.localidad;
        render();
      };
      path.addEventListener('click',select);
      path.addEventListener('keydown',event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
      });
      mapPaths.set(item.localidad,{path,title});
      svg.append(path);
    }
  }
  let fichaTerritorial = [];
  function renderTerritory(rows, selected, cut, candidates, district, history, context) {
    const lookup = new Map(rows.map(row => [row.localidad,row]));
    for (const [name,{path,title}] of mapPaths) {
      const row = lookup.get(name);
      const label = name + (row ? `: ${fmt(row.cobertura)} %` : ': sin datos');
      title.textContent = label;
      path.setAttribute('aria-label',label);
      path.setAttribute('aria-pressed',String(name === selected));
      path.setAttribute('fill',row ? levels.find(([max]) => row.cobertura < max)[1] : missing);
    }
    const row = lookup.get(selected);
    const main = row ? model.medicion(row.dosis_aplicada,row.denominador,META) : null;
    $('territory-detail').textContent = selected
      ? main ? `${selected} · ${fmt(row.cobertura)} % · ${fmt(row.dosis_aplicada)} dosis / ${fmt(row.denominador)} · corte ${cut}. Meta: ${META} %. ${fmt(+main.brecha.toFixed(1))} pp de brecha y ${fmt(main.faltantes)} dosis adicionales estimadas. Fuente: ${context.source}.`
        : `${selected} · sin datos para estos filtros.`
      : `${rows.length} de ${territory.length} localidades con cobertura para estos filtros.`;
    $('territory-quality').hidden = !row;
    $('territory-quality').textContent = context.manual ? 'Vista previa manual incluida.'
      : context.observed ? 'Hay registros marcados para revisión en esta selección.'
      : 'Datos oficiales incluidos en la última validación.';
    $('territory-district').textContent = row && district
      ? `Referencia distrital del seguimiento sectorial: ${fmt(district.cobertura)} % (${fmt(district.dosis_aplicada)} dosis / ${fmt(district.denominador)}). Diferencia local: ${fmt(+(row.cobertura-district.cobertura).toFixed(1))} pp.` : '';
    $('territory-history').hidden = !selected;
    $('territory-periods').innerHTML = history.length > 1
      ? '<table><thead><tr><th>Corte</th><th>Dosis</th><th>Denominador</th><th>Cobertura</th></tr></thead><tbody>' +
        history.map(item => `<tr><th scope="row">${esc(item.fecha_reporte)}</th><td>${fmt(item.dosis_aplicada)}</td><td>${fmt(item.denominador)}</td><td>${fmt(item.cobertura)} %</td></tr>`).join('') +
        '</tbody></table>'
      : '<p>Se requieren al menos dos cortes de esta localidad con filtros compatibles para mostrar la evolución.</p>';
    const picker = $('territory-compare');
    picker.disabled = !selected;
    for (const option of picker.options) option.disabled = option.value !== '' && option.value === selected;
    if (!selected || picker.value === selected) picker.value = '';
    const other = candidates.find(candidate => candidate.localidad === picker.value);
    fichaTerritorial = row ? [
      ['Localidad seleccionada',selected,row],
      ...(district ? [['Referencia distrital','Bogotá D.C.',district]] : []),
      ...(other ? [['Localidad de comparación',other.localidad,other]] : [])
    ].map(([tipo,nombre,dato]) => [tipo,nombre,cut,context.biological,context.inst,dato.dosis_aplicada,dato.denominador,dato.cobertura,context.source]) : [];
    $('territory-export').disabled = !fichaTerritorial.length;
    const comparison = $('territory-comparison');
    const cards = $('territory-comparison-cards');
    cards.hidden = !(row && other);
    cards.innerHTML = row && other ? [row,other].map(dato =>
      `<div><strong>${esc(dato.localidad)}</strong><span>${fmt(dato.cobertura)} %</span><small>${fmt(dato.dosis_aplicada)} dosis / ${fmt(dato.denominador)}</small></div>`).join('') : '';
    if (!picker.value) {
      comparison.textContent = selected ? '' : 'Selecciona primero una localidad en el mapa o en el filtro.';
      return;
    }
    if (!row || !other) {
      comparison.textContent = `${picker.value} · sin datos comparables para el mismo corte y filtros.`;
      return;
    }
    const gap = +(row.cobertura - other.cobertura).toFixed(1);
    const interpretation = gap === 0 ? 'Las coberturas coinciden.' : `${gap > 0 ? selected : other.localidad} presenta la mayor cobertura en este corte y selección.`;
    comparison.textContent = `${other.localidad} · ${fmt(other.cobertura)} % · ${fmt(other.dosis_aplicada)} dosis / ${fmt(other.denominador)} · corte ${cut}. Diferencia (${selected} − ${other.localidad}): ${fmt(gap)} pp. ${interpretation}`;
  }
  for (const id of Object.keys(charts)) {
    const chart = charts[id];
    const card = chart.canvas.closest('.card');
    const actions = document.createElement('div');
    actions.className = 'chart-actions';
    const expand = document.createElement('button');
    expand.type = 'button';
    expand.textContent = 'Ampliar gráfico';
    const title = card.querySelector('h3');
    expand.setAttribute('aria-label', 'Ampliar gráfico: ' + title.textContent);
    actions.append(expand);
    chart.canvas.parentElement.after(actions);
    chart.actions = actions;
    const values = document.createElement('details');
    values.className = 'chart-values';
    const summary = document.createElement('summary');
    summary.textContent = 'Consultar tabla del gráfico';
    summary.setAttribute('aria-label','Consultar tabla del gráfico: ' + title.textContent);
    const region = document.createElement('div');
    region.className = 'scroll';
    region.tabIndex = 0;
    region.setAttribute('role','region');
    region.setAttribute('aria-label','Valores: ' + title.textContent);
    values.append(summary,region);
    actions.after(values);
    chart.values = values;
    values.addEventListener('toggle',() => { if (values.open) renderChartValues(chart); });
    expand.addEventListener('click', () => {
      opener = expand;
      $('chart-dialog-title').textContent = title.textContent;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label', title.textContent);
      $('expanded-chart').append(canvas);
      dialog.showModal();
      const data = {labels:[...chart.data.labels],datasets:chart.data.datasets.map((dataset,index) => ({
        ...dataset, data:[...dataset.data], hidden:!chart.isDatasetVisible(index)
      }))};
      expanded = new Chart(canvas,{type:chart.config.type,data,options:{
        indexAxis:chart.config.options.indexAxis, maintainAspectRatio:false,
        interaction:chart.config.options.interaction, scales:chart.config.options.scales,
        plugins:chart.config.options.plugins
      }});
    });
    const status = document.createElement('p');
    status.className = 'chart-status';
    status.hidden = true;
    charts[id].canvas.parentElement.before(status);
    statusByChart[id] = status;
    charts[id].options.scales[charts[id].config.type === 'bar' ? 'x' : 'y'].max = undefined;
  }
  const renderChartValues = chart => globalThis.VacunaTablas.chartValues(chart,fmt,esc);
  function setChart(id, labels, datasets, message, source, counts = null) {
    const chart = charts[id];
    const signature = JSON.stringify([labels,datasets,message,source,counts]);
    if (chart.dataSignature === signature) return;
    chart.dataSignature = signature;
    const prior = new Map(chart.data.datasets.map((dataset,index) => [dataset.label,chart.isDatasetVisible(index)]));
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.canvas.parentElement.hidden = Boolean(message);
    statusByChart[id].hidden = !message;
    statusByChart[id].textContent = message;
    chart.options.plugins.tooltip.callbacks.footer = () => source;
    chart.tableSource = source;
    chart.tableCounts = counts;
    chart.values.hidden = Boolean(message);
    datasets.forEach((dataset,index) => chart.setDatasetVisibility(index,prior.get(dataset.label) ?? true));
    chart.update('none');
    if (chart.values.open) renderChartValues(chart);
    const controls = chart.actions;
    controls.hidden = Boolean(message);
    for (const button of controls.querySelectorAll('[data-series]')) button.remove();
    const title = chart.canvas.closest('.card').querySelector('h3').textContent;
    controls.firstElementChild.setAttribute('aria-label','Ampliar gráfico: ' + title);
    if (chart.config.type === 'line') datasets.forEach((dataset,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.series = String(index);
      button.textContent = dataset.label;
      button.setAttribute('aria-pressed',String(chart.isDatasetVisible(index)));
      button.addEventListener('click',() => {
        chart.setDatasetVisibility(index,!chart.isDatasetVisible(index));
        button.setAttribute('aria-pressed',String(chart.isDatasetVisible(index)));
        chart.update('none');
        if (chart.values.open) renderChartValues(chart);
      });
      controls.append(button);
    });
  }
  function bar(id, rows, key, source, active = '') {
    const dataset = {...template[id][0], backgroundColor:active ? rows.map(row => row[key] === active ? css('--primary') : S[0]) : S[0], data:rows.map(r => r.cobertura)};
    charts[id].options.plugins.tooltip.callbacks.label = ({dataIndex}) => {
      const row = rows[dataIndex];
      return `${fmt(row.cobertura)} % · ${fmt(row.dosis_aplicada)} de ${fmt(row.denominador)}`;
    };
    setChart(id, rows.map(r => r[key]), [dataset], rows.length ? '' : 'No hay registros del seguimiento sectorial que cumplan los filtros. Revisa el año y la fuente en «Explorar datos»; no significa cobertura cero.', source, rows);
  }
  const color = name => S[(Math.max(0,bios.indexOf(name))) % S.length];
  function series(rows, periods, key) {
    const seriesByName = new Map();
    for (const row of rows) {
      if (!seriesByName.has(row.biologico)) seriesByName.set(row.biologico,new Map());
      const values = seriesByName.get(row.biologico);
      if (!values.has(row[key])) values.set(row[key],row.cobertura);
    }
    return [...seriesByName].sort(([a],[b]) => a.localeCompare(b,'es')).map(([name,values]) => ({
      label:name, borderColor:color(name), backgroundColor:color(name), borderWidth:2, pointRadius:4,
      data:periods.map(period => values.get(period) ?? null)
    }));
  }
  const sectorSource = 'Seguimiento de cobertura por sectores · Datos Abiertos Bogotá';
  const seriesSource = 'Cobertura mensual de vacunación · Datos Abiertos Bogotá';
  let sectorRows = [];
  let seriesRows = [];
  let page = 0;
  const pageSize = 15;
  const tableFields = ['periodo','localidad','sector','biologico','dosis','denominador','cobertura'];
  const tableNames = ['Periodo','Localidad','Sector','Biológico','Dosis','Denominador','Cobertura (%)'];
  function tableRows() {
    const rows = $('table-source').value === 'sector' ? sectorRows : seriesRows;
    const query = $('table-search').value.trim().toLocaleLowerCase('es');
    const sort = $('table-sort').value;
    const filtered = query ? rows.filter(row => tableFields.some(key =>
      String(row[key] ?? '').toLocaleLowerCase('es').includes(query))) : rows.slice();
    return filtered.sort((a,b) => sort === 'asc' ? a.cobertura-b.cobertura :
      sort === 'desc' ? b.cobertura-a.cobertura : b.periodo.localeCompare(a.periodo));
  }
  function renderTable() {
    const rows = tableRows();
    const pages = Math.ceil(rows.length / pageSize);
    page = Math.max(0, Math.min(page, pages-1));
    $('table-prev').disabled = page === 0;
    $('table-next').disabled = page + 1 >= pages;
    ['export-csv','export-xlsx'].forEach(id => $(id).disabled = !rows.length);
    $('table-page').textContent = rows.length ? `Página ${page+1} de ${pages} · ${rows.length} resultados` : 'Sin resultados';
    const format = (value, key) => value == null ? '—' : key === 'cobertura' ? `${fmt(value)} %` : typeof value === 'number' ? fmt(value) : value;
    $('selection-table').innerHTML = rows.length ? '<table><thead><tr>' +
      tableNames.map(name => `<th scope="col">${name}</th>`).join('') +
      '</tr></thead><tbody>' + rows.slice(page*pageSize, (page+1)*pageSize).map(row =>
        '<tr>' + tableFields.map(key => `<td>${esc(format(row[key], key))}</td>`).join('') + '</tr>').join('') +
      '</tbody></table>' : '<p>La fuente de esta tabla no tiene filas para el periodo y los filtros actuales. No equivale a cobertura cero; puedes cambiar la fuente o el año.</p>';
  }
  const model = globalThis.VacunaDecisiones;
  globalThis.VacunaEtapas.connect(document);
  let decisionContext = {filas:[],anual:[],corte:'',filtros:''};
  function refreshDecisions() {
    const ctx = decisionContext;
    const totals = ctx.filas.reduce((sum,row) => [sum[0]+row.dosis_aplicada,sum[1]+row.denominador],[0,0]);
    const data = model.medicion(...totals,META);
    $('decision-summary').textContent = data
      ? `Corte ${ctx.corte} · ${ctx.filas.length} localidades · cobertura ${fmt(+data.cobertura.toFixed(1))} % · ${fmt(data.faltantes)} dosis para la meta de ${META} % con el denominador actual.`
      : 'No hay registros oficiales de primera infancia compatibles con el año y los filtros. La ausencia de registros no implica cobertura cero.';
    const weight = $('priority-weight').valueAsNumber;
    $('priority-weights').textContent = `Brecha: ${weight} % · dosis faltantes: ${100-weight} %`;
    ctx.prioridades = model.priorizar(ctx.filas,META,weight);
    const first = ctx.prioridades[0];
    $('decision-top').innerHTML = ctx.prioridades.filter(row => row.dato.faltantes > 0).slice(0,3).map(row =>
      `<li><strong>${esc(row.localidad)}</strong> · ${fmt(+row.dato.brecha.toFixed(1))} pp de brecha · ${fmt(row.dato.faltantes)} dosis</li>`).join('');
    $('decision-finding').textContent = first?.dato.faltantes
      ? `Revisar primero ${first.localidad}. En el corte ${ctx.corte}, el seguimiento sectorial registra ${fmt(+first.dato.cobertura.toFixed(1))} %; faltan ${fmt(first.dato.faltantes)} dosis para alcanzar la meta bajo el denominador observado. Regla: ${weight} % de peso para la brecha.`
      : '';
    auditTable('priority-table',['Localidad','Cobertura (%)','Brecha (pp)','Dosis faltantes','Puntaje'],
      ctx.prioridades.map(row => [row.localidad,fmt(+row.dato.cobertura.toFixed(1)),fmt(+row.dato.brecha.toFixed(1)),fmt(row.dato.faltantes),fmt(+row.puntaje.toFixed(1))]));
    const picker = $('scenario-local'), local = picker.value;
    picker.replaceChildren(new Option('Total de la selección',''));
    append(picker,available(ctx.filas,'localidad'));
    if ([...picker.options].some(option => option.value === local)) picker.value = local;
    $('decision-selection').textContent = `${ctx.filtros} · ${ctx.corte ? 'Corte '+ctx.corte : 'Sin corte sectorial compatible'} · Escenario: ${picker.value || 'total de la selección'}`;
    const territorial = ctx.filas.find(row => row.localidad === picker.value);
    const baseline = territorial ? model.medicion(territorial.dosis_aplicada,territorial.denominador,META) : data;
    const inputs = ['scenario-a','scenario-b'].map(id => $(id));
    const valid = inputs.map(input => Number.isSafeInteger(input.valueAsNumber) && input.valueAsNumber >= 0);
    inputs.forEach((input,index) => input.setAttribute('aria-invalid',String(!valid[index])));
    $('scenario-status').textContent = valid.every(Boolean) ? 'A y B son simulaciones. El dato observado permanece fijo.' : 'Ingresa una cantidad entera de dosis igual o mayor que cero.';
    const [a,b] = inputs.map((input,index) => valid[index] ? model.escenario(baseline,input.valueAsNumber,META) : null);
    ctx.escenarios = baseline ? [['Dato observado',baseline],['Escenario A',a],['Escenario B',b]] : [];
    auditTable('scenario-table',['Caso','Dosis','Dosis añadidas','Denominador','Cobertura (%)','Cambio (pp)','Dosis para la meta'],
      ctx.escenarios.map(([label,row]) => row ? [label,fmt(row.dosis),fmt(row.dosis-baseline.dosis),fmt(row.denominador),fmt(+row.cobertura.toFixed(1)),fmt(+(row.mejora ?? 0).toFixed(1)),fmt(row.faltantes)] : [label,'Entrada inválida','—','—','—','—','—']));
    const alertRows = ctx.filas.map(row => ({...row,dato:model.medicion(row.dosis_aplicada,row.denominador,META)}));
    ctx.alertas = model.alertas(alertRows,ctx.anual,META,D.logs);
    if (ctx.alertas.length) auditTable('decision-alerts',['Regla','Evidencia','Valor'],ctx.alertas.map(row => [
      row.tipo,row.detalle,row.valor == null ? '—' : `${fmt(+row.valor.toFixed(1))} ${row.tipo === 'Descenso distrital' ? 'pp' : '%'}`
    ]));
    else $('decision-alerts').textContent = 'No hay alertas para los datos comparables de esta selección.';
    $('decision-export').disabled = !(data || ctx.alertas.length) || Boolean(baseline && !valid.every(Boolean));
  }
  $('priority-weight').addEventListener('input',refreshDecisions);
  ['scenario-local','scenario-a','scenario-b'].forEach(id => $(id).addEventListener('input',refreshDecisions));
  // El inventario se deriva de los registros realmente descargados, nunca de años supuestos.
  function updateAvailability(info,selection) {
    const {sourceMode,year,local,inst,bio,cut} = selection;
    const yearOption = $('fYear');
    for (const option of yearOption.options) {
      if (!option.value) continue;
      const record = info.inventory.find(row => row.year === option.value);
      option.disabled = (sourceMode === 'district' && !record?.district ||
        sourceMode === 'sector' && !record?.sector) && option.value !== year;
    }
    const sectorUnavailable = sourceMode === 'district' || (year && !info.sectorYear);
    for (const id of ['fLocal','fSector']) {
      const select = $(id);
      select.disabled = Boolean(sectorUnavailable && !select.value);
      for (const option of select.options) {
        if (!option.value) continue;
        const compatible = sector.some(row => (!year || row.fecha_reporte.startsWith(year)) &&
          (id === 'fLocal' ? row.localidad === option.value : row.institucion === option.value));
        option.disabled = (!compatible || sourceMode === 'district') && option.value !== select.value;
      }
    }
    for (const option of $('fBio').options) {
      if (!option.value) continue;
      const [origin,name] = JSON.parse(option.value);
      const rows = origin === 'Serie distrital' ? D.anual : sector;
      const compatible = (origin === 'Serie distrital' ? sourceMode !== 'sector' :
        sourceMode !== 'district' && !(year && !info.sectorYear)) &&
        rows.some(row => (!year || (origin === 'Serie distrital' ? String(row.anio) === year :
            row.fecha_reporte.startsWith(year))) && row.biologico === name &&
          (origin === 'Serie distrital' || ((!local || row.localidad === local) &&
            (!inst || row.institucion === inst))));
      option.disabled = !compatible && option.value !== bio;
    }
    const badges = [
      {text:'Serie distrital',present:info.district,
        detail:sourceMode === 'sector' ? 'fuera de la consulta' : !info.districtYear ? 'sin datos en el año' :
          info.districtAllowed ? 'sin registros compatibles' : 'sin el desglose solicitado'},
      {text:'Seguimiento sectorial',present:info.territorial,
        detail:sourceMode === 'district' ? 'fuera de la consulta' : !info.sectorYear ? 'sin datos en el año' :
          info.sectorAllowed ? 'sin registros compatibles' : 'sin el desglose solicitado'}
    ];
    $('source-availability').replaceChildren(...badges.map(item => {
      const el = document.createElement('span');
      el.dataset.available = String(item.present);
      el.textContent = `${item.text}: ${item.present ? 'con datos' : item.detail}`;
      return el;
    }));
    const notice = $('filters-status');
    notice.dataset.status = info.reason === 'ok' ? '' : 'warning';
    notice.textContent = info.message + (info.territorial && cut ? ` Corte sectorial compatible: ${cut}.` : '');
    $('filter-suggestions').replaceChildren(...info.buttons.map(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.dataset.suggestion = action.id;
      return button;
    }));
  }
  $('filter-suggestions').addEventListener('click',event => {
    const action = event.target.closest('button[data-suggestion]')?.dataset.suggestion;
    if (!action) return;
    const bio = $('fBio').value;
    const bioSource = bio ? JSON.parse(bio)[0] : '';
    if (action === 'reset-selection') {
      filters.forEach(id => $(id).selectedIndex = 0);
    } else if (action === 'latest-sector') {
      const latest = sector.reduce((date,row) => row.fecha_reporte > date ? row.fecha_reporte : date,'');
      $('fSource').value = 'sector';
      $('fYear').value = latest.slice(0,4);
      $('fLocal').value = '';
      $('fSector').value = '';
      if (bioSource === 'Serie distrital') $('fBio').value = '';
    } else if (action === 'district' || action === 'clear-granularity') {
      if (action === 'district' || bioSource === 'Serie distrital') $('fSource').value = 'district';
      $('fLocal').value = '';
      $('fSector').value = '';
      if (bioSource === 'Seguimiento sectorial') $('fBio').value = '';
      if (action === 'clear-granularity' && $('fSource').value === 'sector') $('fSource').value = 'auto';
    } else if (action === 'sector') {
      $('fSource').value = 'sector';
      if (bioSource === 'Serie distrital') $('fBio').value = '';
    } else if (action === 'clear-biological') {
      $('fBio').value = '';
    }
    render();
  });
  function render() {
    const {fSource:sourceMode, fYear:year, fLocal:local, fBio:bio, fSector:inst, fMode:mode, fCompare:other, fMonthFrom:from, fMonthTo:to} =
      Object.fromEntries(filters.map(id => [id, $(id).value]));
    const [bioSource, biological] = bio ? JSON.parse(bio) : [];
    const availability = disponibilidad.inspect({source:sourceMode,year,local,inst,bioSource,biological},D.anual,sector);
    const sectorCompatible = availability.sectorAllowed;
    const districtCompatible = availability.districtAllowed;
    const empty = 'Esta fuente no tiene registros compatibles con los filtros. Consulta la disponibilidad de fuentes arriba; la ausencia no equivale a una cobertura del 0 %.';
    const disabledDistrict = sourceMode === 'sector'
      ? 'Este gráfico utiliza la serie distrital. Cambia la fuente a «Según la vista» o «Serie distrital».'
      : 'La serie distrital no publica un desglose por localidad, institución o biológico del seguimiento sectorial. Ajusta los filtros.';
    const disabledSector = sourceMode === 'district'
      ? 'Este gráfico necesita seguimiento sectorial. Cambia la fuente a «Según la vista» o «Seguimiento sectorial».'
      : 'El biológico seleccionado pertenece a la serie distrital y no está disponible en el seguimiento sectorial.';
    const comparable = sectorCompatible ? currentSector().filter(r =>
      (!year || r.fecha_reporte.startsWith(year)) &&
      (!inst || r.institucion === inst) && (!biological || r.biologico === biological)) : [];
    const selected = comparable.filter(r => !local || r.localidad === local);
    // Cada corte es una foto de cobertura. Agregar solo el corte más reciente de la selección.
    const cut = selected.reduce((date, r) => r.fecha_reporte > date ? r.fecha_reporte : date, '');
    const rows = selected.filter(r => r.fecha_reporte === cut);
    const source = cut ? `${sectorSource} · Corte ${cut}${rows.some(r => r.manual) ? ' · incluye vista previa manual' : ''}` : sectorSource;
    const infancy = rows.filter(r => r.grupo_biologico === 'Primera infancia');
    const locations = aggregate(infancy, ['localidad']);
    const total = aggregate(infancy, [])[0];
    const medida = total ? model.medicion(total.dosis_aplicada,total.denominador,META) : null;
    const lower = locations.filter(r => model.medicion(r.dosis_aplicada,r.denominador,META)?.brecha > 0).length;
    const periodo = `Corte ${cut}${infancy.some(r => r.manual) ? ' · vista previa manual' : ''}`;
    set('k1',medida ? `${fmt(+medida.cobertura.toFixed(1))} %` : '—',medida ? `${periodo} · ${medida.brecha ? 'bajo la meta' : 'en la meta o superior'}` : empty,medida?.brecha === 0);
    set('kGap',medida ? `${fmt(+medida.brecha.toFixed(1))} pp` : '—',medida ? `Meta ${META} % · ${periodo}` : empty,medida?.brecha === 0);
    set('k3',locations.length ? `${lower} de ${locations.length}` : '—',locations.length ? `${periodo} · con datos compatibles` : empty,locations.length > 0 && lower === 0);
    set('k4',medida ? fmt(medida.faltantes) : '—',medida ? `Dosis · ${periodo}` : empty,medida?.faltantes === 0);
    $('summary-finding').textContent = locations.length
      ? `${locations[0].localidad} registra la menor cobertura de la selección (${fmt(locations[0].cobertura)} %). ${lower} de ${locations.length} localidades con datos están por debajo del ${META} %. ${periodo}. Fuente: seguimiento sectorial de Datos Abiertos Bogotá.`
      : 'No hay registros de primera infancia compatibles en el seguimiento sectorial. No significa que la cobertura sea 0 %; revisa la fuente, el año y los filtros.';
    const primary = year ? +year : historicalYears.at(-1);
    $('compare-label').hidden = mode !== 'comparativo';
    $('fCompare').disabled = mode !== 'comparativo';
    for (const option of $('fCompare').options) option.disabled = +option.value === primary;
    if (+other === primary) $('fCompare').value = [...$('fCompare').options].find(option => !option.disabled)?.value ?? '';
    const compare = +$('fCompare').value;
    const annualRows = districtCompatible ? cerr.filter(r => (!biological || r.biologico === biological) &&
      (mode === 'comparativo' ? [primary,compare].includes(r.anio) : !year || r.anio === +year)) : [];
    const actualYear = mode === 'actual' || mode === '' ? +(year || D.anio_actual) : 0;
    const applicableRange = mode === 'actual' && districtCompatible;
    ['month-from-label','month-to-label'].forEach(id => $(id).hidden = !applicableRange);
    ['fMonthFrom','fMonthTo'].forEach(id => $(id).disabled = !applicableRange);
    const low = applicableRange ? +(from || 1) : 1;
    const high = applicableRange ? +(to || 12) : 12;
    const selectedMonths = meses.filter(month => month >= low && month <= high);
    const monthRows = districtCompatible ? monthly.filter(r => r.anio === actualYear && selectedMonths.includes(r.mes_num) &&
      (!biological || r.biologico === biological)).map(r => ({...r,cobertura:r.cobertura_acum})) : [];
    const periods = available(annualRows, 'anio').map(Number);
    const annualVisible = mode !== 'actual';
    const monthlyVisible = mode !== 'historico' && mode !== 'comparativo';
    charts.cAnual.canvas.closest('.card').hidden = !annualVisible;
    charts.cActual.canvas.closest('.card').hidden = !monthlyVisible;
    const pair = mode === 'comparativo' && periods.length !== 2;
    const annualMessage = !districtCompatible ? disabledDistrict : pair ? 'Selecciona dos años cerrados con datos comparables.' : annualRows.length ? '' : empty;
    setChart('cAnual', periods, series(annualRows,periods,'anio'), annualMessage,
      periods.length ? `${seriesSource} · Años cerrados ${periods.join(', ')}` : seriesSource);
    $('tActual').textContent = `Avance ${actualYear || D.anio_actual}`;
    const partial = monthRows.length && D.anual.some(r => r.anio === actualYear && !r.anio_completo && (!biological || r.biologico === biological));
    $('period-status').hidden = !partial;
    $('period-status').textContent = partial ? 'Periodo parcial · las series incluyen solo los meses reportados.' : '';
    const pace = {...template.cActual.at(-1),borderColor:css('--muted'),data:selectedMonths.map(month => template.cActual.at(-1).data[month-1])};
    setChart('cActual', selectedMonths.map(month => monthNames[month-1]), [...series(monthRows,selectedMonths,'mes_num'),pace],
      !districtCompatible ? disabledDistrict : low > high ? 'El mes inicial debe ser anterior o igual al mes final.' : monthRows.length ? '' : empty, `${seriesSource} · ${actualYear}`);
    const tv1 = annualRows.find(r => r.anio === primary && r.biologico === 'Triple viral 1 año');
    const tv5 = annualRows.find(r => r.anio === primary && r.biologico.startsWith('Triple viral R1 o DPT'));
    const difference = tv1 && tv5 ? +(tv1.cobertura-tv5.cobertura).toFixed(1) : null;
    set('k2',difference == null || !annualVisible ? '—' : `${fmt(difference)} pts`,
      difference == null || !annualVisible ? 'Requiere las dos etapas para el mismo año cerrado.' : `${fmt(tv1.cobertura)} % → ${fmt(tv5.cobertura)} % (${primary})`,difference != null && difference <= 0);
    const comparisonRows = local ? comparable.filter(r => r.fecha_reporte === cut && r.grupo_biologico === 'Primera infancia') : [];
    const territorialRows = local ? aggregate(comparisonRows,['localidad']) : locations;
    bar('cLoc',territorialRows,'localidad',source,local);
    const history = local ? aggregate(selected.filter(r => r.grupo_biologico === 'Primera infancia'),['fecha_reporte'])
      .sort((a,b) => a.fecha_reporte.localeCompare(b.fecha_reporte)) : [];
    const territorySource = sectorSource + (comparisonRows.some(r => r.manual) ? ' · incluye vista previa manual' : '');
    renderTerritory(territorialRows,local,cut,territorialRows,aggregate(comparisonRows,[])[0],history,
      {biological:biological || 'Primera infancia',inst:inst || 'Todos los sectores',source:territorySource,
       manual:infancy.some(r => r.manual),observed:infancy.some(r => r.flag_sobre_100 || r.flag_inconsistencia)});
    bar('cInst',aggregate(rows,['institucion']),'institucion',source);
    bar('cGrupo',aggregate(rows,['grupo_biologico']),'grupo_biologico',source);
    renderHeat(aggregate(rows,['localidad','institucion']));
    sectorRows = rows.map(r => ({
      periodo:r.fecha_reporte, localidad:r.localidad, sector:r.institucion, biologico:r.biologico,
      dosis:r.dosis_aplicada, denominador:r.denominador, cobertura:rate(r.dosis_aplicada,r.denominador), fuente:r.manual ? manualSource : sectorSource
    }));
    seriesRows = [
      ...(annualVisible && !annualMessage ? annualRows.map(r => ({periodo:String(r.anio), biologico:r.biologico,
        dosis:r.vacunados, denominador:r.poblacion_meta, cobertura:r.cobertura, fuente:seriesSource})) : []),
      ...(monthlyVisible ? monthRows.map(r => ({periodo:`${r.anio}-${String(r.mes_num).padStart(2,'0')}`, biologico:r.biologico,
        dosis:r.vacunados_acum, denominador:r.poblacion_meta, cobertura:r.cobertura, fuente:seriesSource})) : [])
    ];
    const chips = ['Bogotá D.C.',sourceMode === 'auto' ? '' : $('fSource').selectedOptions[0].textContent,year,local,biological,inst,mode ? $('fMode').selectedOptions[0].textContent : '',
      mode === 'comparativo' && compare ? `Comparar con ${compare}` : '',
      applicableRange && (from || to) ? `Meses ${low}–${high}` : '',
      manualRows.length ? 'Vista previa manual' : ''].filter(Boolean);
    $('filter-chips').replaceChildren(...chips.map(name => {
      const chip = document.createElement('span');
      chip.textContent = name;
      return chip;
    }));
    updateAvailability(availability,{sourceMode,year,local,inst,bio,cut});
    if (sourceMode === 'district' || sourceMode === 'sector' || (year && (!availability.sectorYear || !availability.districtYear))) {
      $('table-source').value = sourceMode === 'district' || (sourceMode === 'auto' && !availability.sectorYear) ? 'serie' : 'sector';
    }
    const baseDecisiones = sectorCompatible ? sector.filter(r => r.grupo_biologico === 'Primera infancia'
      && (!year || r.fecha_reporte.startsWith(year)) && (!local || r.localidad === local)
      && (!inst || r.institucion === inst) && (!biological || r.biologico === biological)) : [];
    const corteDecisiones = baseDecisiones.reduce((date,r) => r.fecha_reporte > date ? r.fecha_reporte : date,'');
    decisionContext = {corte:corteDecisiones,filas:aggregate(baseDecisiones.filter(r => r.fecha_reporte === corteDecisiones),['localidad']),
      anual:districtCompatible ? D.anual.filter(r => (!year || r.anio <= +year) && (!biological || r.biologico === biological)) : [],
      filtros:[year || 'Años disponibles',local || 'Todas las localidades',inst || 'Todos los sectores',biological || 'Primera infancia'].join(' · ')};
    refreshDecisions();
    page = 0;
    renderTable();
  }
  filters.forEach(id => $(id).addEventListener('change',render));
  $('territory-compare').addEventListener('change',render);
  $('fReset').addEventListener('click',() => {
    filters.forEach(id => $(id).selectedIndex = 0);
    render();
  });
  ['table-source','table-search','table-sort'].forEach(id => $(id).addEventListener('input',() => { page=0; renderTable(); }));
  $('table-prev').addEventListener('click',() => { page--; renderTable(); });
  $('table-next').addEventListener('click',() => { page++; renderTable(); });

  function exportValues() {
    const selection = [...$('filter-chips').children].map(chip => chip.textContent).join(' · ');
    return [[...tableNames,'Fuente','Selección','Actualizado'], ...tableRows().map(row =>
      [...tableFields.map(key => row[key]),row.fuente,selection,D.generado])];
  }
  async function download(parts, type, extension, filename = `VacunaBI-${$('table-source').value}.${extension}`) {
    const file = new Blob(parts,{type});
    const guardar = window.pywebview?.api?.guardar_exportacion;
    if (guardar) {
      const status = $('export-status');
      status.hidden = false;
      status.textContent = 'Preparando exportación…';
      status.dataset.status = '';
      try {
        const data = await new Promise((resolve,reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await guardar(filename,data);
        status.textContent = result.mensaje || 'Exportación cancelada.';
        status.dataset.status = result.estado === 'error' ? 'error' : '';
      } catch {
        status.textContent = 'No se pudo iniciar el guardado.';
        status.dataset.status = 'error';
      }
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),30000);
  }
  const manualFile = $('manual-file');
  const manualStatus = $('manual-status');
  const officialCut = K.fecha_corte_sectores;
  const municipalities = new Map(sector.map(row => [row.localidad,row.zona]));
  const biologicals = new Map(sector.map(row => [row.biologico,row.grupo_biologico]));
  const institutions = new Set(sector.map(row => row.institucion));
  function parsePreview(text) {
    const records = [];
    const pattern = /(?:^|;|\r?\n)(?:"((?:[^"]|"")*)"|([^;"\r\n]*))(?=;|\r?\n|$)/gy;
    const content = text.replace(/^\uFEFF/,'').trim();
    let row = [];
    let cursor = 0;
    while (cursor < content.length) {
      const match = pattern.exec(content);
      if (!match || !match[0].length) throw new Error('El CSV tiene comillas o separadores inválidos.');
      if (match[0].startsWith('\n') || match[0].startsWith('\r')) {
        records.push(row);
        row = [];
      }
      row.push((match[1]?.replaceAll('""','"') ?? match[2]).trim());
      cursor = pattern.lastIndex;
    }
    records.push(row);
    if (records.shift().join(';') !== manualFields.join(';') || !records.length) {
      throw new Error('Usa las columnas de la plantilla y agrega al menos un registro.');
    }
    const seen = new Set();
    return records.map((fields,index) => {
      const [fecha_reporte,localidad,institucion,biologico,dosis,target] = fields;
      const dosis_aplicada = Number(dosis), denominador = Number(target);
      if (fields.length !== manualFields.length || fecha_reporte !== officialCut ||
          !municipalities.has(localidad) || !institutions.has(institucion) || !biologicals.has(biologico) ||
          !/^\d+$/.test(dosis ?? '') || !/^\d+$/.test(target ?? '') ||
          !Number.isSafeInteger(dosis_aplicada) || !Number.isSafeInteger(denominador) || denominador <= 0) {
        throw new Error(`Registro ${index+1}: verifica corte, localidad, sector, biológico y cantidades enteras con denominador mayor que cero.`);
      }
      const item = {fecha_reporte,localidad,institucion,biologico,dosis_aplicada,denominador,
        zona:municipalities.get(localidad),grupo_biologico:biologicals.get(biologico),manual:true};
      const key = manualKey(item);
      if (seen.has(key)) throw new Error(`Registro ${index+1}: la combinación aparece más de una vez en el CSV.`);
      seen.add(key);
      return item;
    });
  }
  manualFile.addEventListener('change',async () => {
    const file = manualFile.files[0];
    if (!file) return;
    try {
      if (file.size > 1024*1024) throw new Error('El archivo supera 1 MB.');
      const content = await file.text();
      if (manualFile.files[0] !== file) return;
      manualRows = parsePreview(content);
      manualStatus.setAttribute('data-active','');
      manualStatus.textContent = `Vista previa activa · ${manualRows.length} registros del corte ${officialCut}.`;
      $('manual-clear').disabled = false;
      render();
    } catch (error) {
      if (manualFile.files[0] !== file) return;
      manualStatus.textContent = error.message + (manualRows.length ? ' La vista previa anterior sigue activa.' : ' Se mantienen los datos oficiales.');
      manualFile.value = '';
    }
  });
  $('manual-clear').addEventListener('click',() => {
    manualRows = [];
    manualFile.value = '';
    manualStatus.removeAttribute('data-active');
    manualStatus.textContent = 'Viendo datos oficiales.';
    $('manual-clear').disabled = true;
    render();
  });
  $('manual-template').addEventListener('click',() => {
    const example = sector.find(row => row.fecha_reporte === officialCut);
    const lines = [manualFields.join(';')];
    if (example) lines.push(manualFields.map(key => '"' + String(example[key]).replaceAll('"','""') + '"').join(';'));
    download(['\uFEFF',lines.join('\r\n')],'text/csv;charset=utf-8','csv','VacunaBI-plantilla-manual.csv');
  });
  const {csv} = globalThis.VacunaTablas;
  $('export-csv').addEventListener('click',() => {
    download(csv(exportValues()),'text/csv;charset=utf-8','csv');
  });
  $('territory-export').addEventListener('click',() => {
    const headings = ['Tipo','Territorio','Corte','Biológico','Sector','Dosis','Denominador','Cobertura (%)','Fuente'];
    download(csv([headings,...fichaTerritorial]),'text/csv;charset=utf-8','csv','VacunaBI-ficha-territorial.csv');
  });
  $('decision-export').addEventListener('click',() => {
    const ctx = decisionContext;
    const weight = $('priority-weight').valueAsNumber;
    const history = [
      ['Bloque','Elemento','Dosis','Denominador','Cobertura (%)','Brecha (pp)','Dosis faltantes','Puntaje o alerta'],
      ['Metadatos','Corte sectorial: '+(ctx.corte || 'sin datos')],
      ['Metadatos','Filtros: '+ctx.filtros],
      ['Metadatos','Fuente sectorial: '+sectorSource],
      ['Metadatos','Fuente distrital: '+seriesSource],
      ['Metadatos','Generado: '+D.generado],
      ['Metadatos','Meta '+META+' % · peso brecha '+(Number.isFinite(weight) ? weight+' %' : 'inválido')],
      ['Metadatos','Simulación con denominador fijo, sin proyección estadística; registros manuales excluidos.'],
      ['Metadatos','Escenario territorial: '+($('scenario-local').value || 'total de la selección')],
      ...ctx.prioridades.map(({localidad,dato,puntaje}) => ['Prioridad',localidad,dato.dosis,dato.denominador,+dato.cobertura.toFixed(1),+dato.brecha.toFixed(1),dato.faltantes,+puntaje.toFixed(1)]),
      ...ctx.escenarios.filter(([,dato]) => dato).map(([label,dato]) => ['Escenario',label,dato.dosis,dato.denominador,+dato.cobertura.toFixed(1),+dato.brecha.toFixed(1),dato.faltantes]),
      ...ctx.alertas.map(row => ['Alerta',row.detalle,'','','','','',row.tipo+(row.valor == null ? '' : ' · '+fmt(+row.valor.toFixed(1))+' '+(row.tipo === 'Descenso distrital' ? 'pp' : '%'))])
    ];
    download(csv(history),'text/csv;charset=utf-8','csv','VacunaBI-reporte-ejecutivo.csv');
  });
  // Open XML necesita un contenedor ZIP. Las cinco entradas se guardan sin compresión.
  function zipXml(parts) {
    const encoder = new TextEncoder();
    const output = [];
    const directory = [];
    let offset = 0;
    const header = size => {
      const bytes = new Uint8Array(size);
      const view = new DataView(bytes.buffer);
      return {bytes,u16:(p,v) => view.setUint16(p,v,true),u32:(p,v) => view.setUint32(p,v,true)};
    };
    const crc32 = bytes => {
      let crc = -1;
      for (const byte of bytes) {
        crc ^= byte;
        for (let bit=0;bit<8;bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
      return (crc ^ -1) >>> 0;
    };
    for (const [path,xml] of Object.entries(parts)) {
      const name = encoder.encode(path);
      const data = encoder.encode(xml);
      const crc = crc32(data);
      const local = header(30);
      local.u32(0,0x04034b50); local.u16(4,20); local.u16(12,33); local.u32(14,crc);
      local.u32(18,data.length); local.u32(22,data.length); local.u16(26,name.length);
      const central = header(46);
      central.u32(0,0x02014b50); central.u16(4,20); central.u16(6,20);
      central.u16(14,33); central.u32(16,crc); central.u32(20,data.length);
      central.u32(24,data.length); central.u16(28,name.length); central.u32(42,offset);
      output.push(local.bytes,name,data);
      directory.push(central.bytes,name);
      offset += local.bytes.length + name.length + data.length;
    }
    const end = header(22);
    end.u32(0,0x06054b50);
    end.u16(8,directory.length/2); end.u16(10,directory.length/2);
    end.u32(12,directory.reduce((sum,entry) => sum+entry.length,0)); end.u32(16,offset);
    return [...output,...directory,end.bytes];
  }
  $('export-xlsx').addEventListener('click',() => {
    const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const packageRel = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const rows = exportValues().map((row,index) => `<row r="${index+1}">` + row.map((value,column) => {
      const address = String.fromCharCode(65+column) + (index+1);
      return typeof value === 'number' ? `<c r="${address}"><v>${value}</v></c>` :
        `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${esc(String(value ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,''))}</t></is></c>`;
    }).join('') + '</row>').join('');
    const parts = {
      '[Content_Types].xml': `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      '_rels/.rels': `${xml}<Relationships xmlns="${packageRel}"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `${xml}<workbook xmlns="${main}" xmlns:r="${rel}"><sheets><sheet name="Selección" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': `${xml}<Relationships xmlns="${packageRel}"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      'xl/worksheets/sheet1.xml': `${xml}<worksheet xmlns="${main}"><sheetData>${rows}</sheetData></worksheet>`
    };
    download(zipXml(parts),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx');
  });
  render();
})();
