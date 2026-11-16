const D = /*__DATOS__*/null;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const S = ['--s1','--s2','--s3','--s4','--s5'].map(css), K = D.kpis, META = D.meta;
const fmt = n => n.toLocaleString('es-CO');
Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",sans-serif';
Chart.defaults.color = css('--ink2');
Chart.defaults.borderColor = css('--grid');
Chart.defaults.plugins.tooltip.callbacks.label = c => ` ${c.dataset.label ? c.dataset.label + ': ' : ''}${fmt(c.parsed.y ?? c.parsed.x)} %`;

// línea de meta horizontal o vertical, dibujada sobre la grilla
const metaLine = {id:'meta', afterDatasetsDraw(ch, a, o){ if(!o.on) return; const {ctx, chartArea:A, scales} = ch;
  const ax = o.axis === 'x' ? scales.x : scales.y, p = ax.getPixelForValue(META); ctx.save(); ctx.strokeStyle = css('--crit'); ctx.setLineDash([5,4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); o.axis === 'x' ? (ctx.moveTo(p, A.top), ctx.lineTo(p, A.bottom)) : (ctx.moveTo(A.left, p), ctx.lineTo(A.right, p)); ctx.stroke(); ctx.restore(); }};
Chart.register(metaLine);

document.getElementById('meta-info').textContent = `Fuente: Datos Abiertos Bogotá · corte sectorial: ${K.fecha_corte_sectores}`;
document.getElementById('data-freshness').textContent = `Extracción: ${D.generado} · tablero disponible`;
const set = (id, v, s, ok) => { document.getElementById(id).textContent = v; const e = document.getElementById(id + 's'); e.textContent = s; e.className = 'st ' + (ok ? 'ok' : 'bad'); };

// 1. Serie anual (años cerrados)
const cerr = D.anual.filter(r => r.anio_completo), bios = [...new Set(cerr.map(r => r.biologico))];
const anios = [...new Set(cerr.map(r => r.anio))].sort();
new Chart(cAnual, {type:'line', data:{labels:anios, datasets:bios.map((b,i) => ({label:b, borderColor:S[i], backgroundColor:S[i], borderWidth:2, pointRadius:4, pointHoverRadius:6,
  data:anios.map(y => (cerr.find(r => r.biologico === b && r.anio === y) || {}).cobertura ?? null)}))},
  options:{maintainAspectRatio:false, interaction:{mode:'index', intersect:false}, scales:{y:{suggestedMin:60, suggestedMax:100, ticks:{callback:v => v + ' %'}}},
    plugins:{meta:{on:true}, legend:{position:'bottom', labels:{boxWidth:12, usePointStyle:true}}}}});

// 2. Año en curso: acumulado vs ritmo necesario
document.getElementById('tActual').textContent = `Avance ${D.anio_actual}`;
const bm = [...new Set(D.mensual_actual.map(r => r.biologico))], meses = [1,2,3,4,5,6,7,8,9,10,11,12];
new Chart(cActual, {type:'line', data:{labels:['E','F','M','A','M','J','J','A','S','O','N','D'], datasets:[
  ...bm.map(b => { const i = bios.indexOf(b); return {label:b, borderColor:S[i < 0 ? 4 : i], backgroundColor:S[i < 0 ? 4 : i], borderWidth:2, pointRadius:2,
    data:meses.map(m => (D.mensual_actual.find(r => r.biologico === b && r.mes_num === m) || {}).cobertura_acum ?? null)}; }),
  {label:'Ritmo para 95 %', data:meses.map(m => +(META * m / 12).toFixed(1)), borderColor:css('--muted'), borderDash:[4,4], borderWidth:1.5, pointRadius:0}]},
  options:{maintainAspectRatio:false, interaction:{mode:'index', intersect:false}, scales:{y:{min:0, max:100, ticks:{callback:v => v + ' %'}}},
    plugins:{legend:{display:false}}}});

// 3. Localidades
new Chart(cLoc, {type:'bar', data:{labels:D.loc_infancia.map(r => r.localidad), datasets:[{data:D.loc_infancia.map(r => r.cobertura),
  backgroundColor:S[0], borderRadius:4, barPercentage:.8}]},
  options:{indexAxis:'y', maintainAspectRatio:false, scales:{x:{min:0, max:100, ticks:{callback:v => v + ' %'}}, y:{grid:{display:false}}},
    plugins:{meta:{on:true, axis:'x'}, legend:{display:false}, tooltip:{callbacks:{label:c => { const r = D.loc_infancia[c.dataIndex];
      return ` ${r.cobertura} % · ${fmt(r.dosis_aplicada)} de ${fmt(r.denominador)} niños (${r.zona})`; }}}}}});

// 4-5. Sector institucional y grupo de biológico
const hbar = (el, rows, key) => new Chart(el, {type:'bar', data:{labels:rows.map(r => r[key]), datasets:[{data:rows.map(r => r.cobertura),
  backgroundColor:S[0], borderRadius:4, barPercentage:.7}]},
  options:{indexAxis:'y', maintainAspectRatio:false, scales:{x:{min:0, max:100, ticks:{callback:v => v + ' %'}}, y:{grid:{display:false}}},
    plugins:{meta:{on:true, axis:'x'}, legend:{display:false}, tooltip:{callbacks:{label:c => ` ${rows[c.dataIndex].cobertura} % · ${fmt(rows[c.dataIndex].dosis_aplicada)} dosis`}}}}});
hbar(cInst, D.institucion, 'institucion');
hbar(cGrupo, D.grupo, 'grupo_biologico');

// 6. Mapa de calor (también sirve de vista de tabla)
const ramp = ['#cde2fb','#9ec5f4','#6da7ec','#3987e5','#256abf','#184f95'];
const cell = v => { if (v == null) return '<td style="color:var(--muted)">–</td>'; const i = Math.max(0, Math.min(5, Math.floor((v - 20) / 14)));
  return `<td style="background:${ramp[i]};color:${i > 2 ? '#fff' : '#0b0b0b'};font-weight:${v >= META ? 700 : 400}">${v}</td>`; };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
function renderHeat(rows) {
  const locs = [...new Set(rows.map(r => r.localidad))].sort();
  const insts = [...new Set(rows.map(r => r.institucion))].sort();
  const index = new Map(rows.map(r => [JSON.stringify([r.localidad, r.institucion]), r.cobertura]));
  heat.innerHTML = rows.length ? '<table><tr><th>Localidad</th>' + insts.map(i => `<th>${esc(i)}</th>`).join('') + '</tr>' +
    locs.map(l => '<tr><th scope="row">' + esc(l) + '</th>' + insts.map(i => cell(index.get(JSON.stringify([l, i])))).join('') + '</tr>').join('') + '</table>'
    : '<p>No hay registros de seguimiento sectorial que cumplan esta combinación de año y filtros. Consulta la disponibilidad de fuentes arriba; un dato ausente no significa 0 %.</p>';
}
renderHeat(D.heat);

// 7. Log de limpieza
log.innerHTML = '<table><tr><th>Fuente</th><th style="text-align:left">Paso</th><th>Registros</th></tr>' +
  Object.entries(D.logs).flatMap(([f, o]) => Object.entries(o).map(([k, v]) => `<tr><td>${f}</td><td style="text-align:left">${k.replaceAll('_', ' ')}</td><td>${fmt(v)}</td></tr>`)).join('') + '</table>';
