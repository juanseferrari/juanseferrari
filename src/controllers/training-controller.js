// Vistas de /training. Mobile-first: semana (default), mes, stats y guia.
//
// El calendario es publico de solo lectura. Las acciones de override solo
// aparecen (y solo funcionan) con sesion.

const path = require('path');
const q = require('../training/queries');
const { matchPlan, summarizeWeek, globalStats } = require('../training/matching');
const {
  page, escapeHtml, SPORT_ICON, SPORT_NAME, STATUS, ZONES, FC_MAX, PHASE_COLORS,
} = require('../training/layout');
const {
  today, addDays, diffDays, dayOfWeek, formatDayMonth, formatDayName, MONTHS_ES,
} = require('../training/dates');
const { RACE_DATE, WEEKS, PLAN_START } = require('../training/plan-config');

const FIRST_WEEK = WEEKS[0].week;
const LAST_WEEK = WEEKS[WEEKS.length - 1].week;

// Lunes de la semana que contiene esa fecha.
function mondayOf(isoDate) {
  const dow = dayOfWeek(isoDate);       // 0 = domingo
  const back = dow === 0 ? 6 : dow - 1; // lunes = 0 atras
  return addDays(isoDate, -back);
}

// Numero de semana del plan para una fecha.
function weekNumberOf(isoDate) {
  const monday = mondayOf(isoDate);
  return FIRST_WEEK + Math.round(diffDays(mondayOf(PLAN_START), monday) / 7);
}

function weekStartOf(week) {
  return addDays(mondayOf(PLAN_START), (week - FIRST_WEEK) * 7);
}

function clampWeek(w) {
  return Math.min(LAST_WEEK, Math.max(FIRST_WEEK, w));
}

function daysToRace(from) {
  return diffDays(from, RACE_DATE);
}

// ------------------------------------------------------------------ helpers

function fmtTarget(s) {
  const bits = [];
  if (s.sport === 'swim' && s.target_distance_m) bits.push(s.target_distance_m + ' m');
  else if (s.target_duration_min) bits.push(s.target_duration_min + "'");
  return bits.join(' · ');
}

// "45' / 52'" — objetivo vs real.
function fmtProgress(r) {
  const p = r.progress;
  if (!p || !p.target) {
    if (p && p.actual) return p.metric === 'distance' ? `— / ${p.actual} m` : `— / ${p.actual}'`;
    return '';
  }
  const unit = p.metric === 'distance' ? ' m' : "'";
  const hasActual = p.actual > 0;
  return `${p.target}${unit} / ${hasActual ? p.actual + unit : '—'}`;
}

function countdownBlock(t) {
  const d = daysToRace(t);
  const label = d > 1 ? `días al 70.3` : d === 1 ? 'día al 70.3' : d === 0 ? '¡ES HOY!' : 'días desde el 70.3';
  return `<div class="countdown">
    <div class="n">${d >= 0 ? d : Math.abs(d)}</div>
    <div class="l">${label} · domingo 7 de marzo de 2027</div>
  </div>`;
}

function sessionButton(r, t) {
  const s = r.session;
  const st = STATUS[r.status] || STATUS.upcoming;
  const prog = fmtProgress(r);
  const target = fmtTarget(s);
  const sub = r.status === 'rest'
    ? 'Movilidad opcional'
    : (prog || target);

  return `<button class="ses ${st.cls}${s.is_key_session ? ' key' : ''}"
      data-id="${escapeHtml(s.id)}" type="button"
      aria-label="${escapeHtml(s.title)}, ${escapeHtml(st.label)}">
    <span class="r1">
      <span class="ico" aria-hidden="true">${SPORT_ICON[s.sport] || '•'}</span>
      <span class="tt">${escapeHtml(s.title)}</span>
      <span class="st"><span aria-hidden="true">${st.icon}</span>${st.label}</span>
    </span>
    ${sub ? `<span class="r2">${escapeHtml(sub)}</span>` : ''}
  </button>`;
}

function barsBlock(totals) {
  const rows = [
    ['Natación', totals.swim, 'm'],
    ['Bici', totals.bike, 'min'],
    ['Trote', totals.run, 'min'],
  ];
  return `<div class="bars">${rows.map(([name, t, unit]) => `
    <div class="bar-row">
      <span class="nm">${name}</span>
      <span class="bar"><i style="width:${Math.min(100, t.pct)}%"></i></span>
      <span class="v">${t.actual}/${t.target} ${unit}</span>
    </div>`).join('')}</div>`;
}

// ------------------------------------------------------------------- vistas

const trainingController = {
  // GET /training?week=N
  week: async (req, res, next) => {
    try {
      const t = today();
      const requested = req.query.week != null ? Number(req.query.week) : weekNumberOf(t);
      const week = clampWeek(Number.isFinite(requested) ? requested : weekNumberOf(t));

      const from = weekStartOf(week);
      const to = addDays(from, 6);

      const { sessions, activities, overrides } = await q.loadRange(from, to);
      const { results, extras } = matchPlan({ sessions, activities, overrides, today: t });
      const totals = summarizeWeek(results);

      const meta = WEEKS.find((w) => w.week === week) || {};
      // La fase real la toman las sesiones (la 19 cruza a taper a mitad).
      const phase = results.length ? results[results.length - 1].session.phase : meta.phase;

      // Agrupamos por dia.
      const byDay = new Map();
      for (const r of results) {
        if (!byDay.has(r.session.date)) byDay.set(r.session.date, []);
        byDay.get(r.session.date).push(r);
      }
      const extrasByDay = new Map();
      for (const a of extras) {
        const d = String(a.start_date_local).slice(0, 10);
        if (d < from || d > to) continue;
        if (!extrasByDay.has(d)) extrasByDay.set(d, []);
        extrasByDay.get(d).push(a);
      }

      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(from, i);
        const rs = byDay.get(date) || [];
        const ex = extrasByDay.get(date) || [];
        days.push(`
          <section class="day${date === t ? ' is-today' : ''}">
            <h3>${formatDayName(date)} ${formatDayMonth(date)}</h3>
            ${rs.map((r) => sessionButton(r, t)).join('')}
            ${ex.map((a) => `<div class="extra">＋ ${escapeHtml(a.name || a.sport_type)} · ${Math.round((a.moving_time_s || 0) / 60)}' <span class="muted">(extra)</span></div>`).join('')}
          </section>`);
      }

      const prev = week > FIRST_WEEK ? week - 1 : null;
      const next2 = week < LAST_WEEK ? week + 1 : null;

      res.send(page({
        title: `Semana ${week} · Training 70.3`,
        user: req.user,
        active: 'week',
        body: `
        ${countdownBlock(t)}
        <div class="wrap">
          <nav class="weeknav" aria-label="Cambiar semana">
            <a href="/training?week=${prev}" aria-disabled="${prev === null}" aria-label="Semana anterior">‹</a>
            <span class="mid">${week === weekNumberOf(t) ? 'Esta semana' : `Semana ${week}`}</span>
            <a href="/training?week=${next2}" aria-disabled="${next2 === null}" aria-label="Semana siguiente">›</a>
          </nav>

          <header class="weekhead">
            <div class="top">
              <div>
                <h2>Semana ${week} · ${escapeHtml(phase || '')}</h2>
                <div class="dates">${formatDayMonth(from)} – ${formatDayMonth(to)}</div>
              </div>
              ${meta.recovery ? '<span class="badge rec">Recuperación</span>' : ''}
            </div>
            ${barsBlock(totals)}
          </header>

          ${days.join('')}

          <p class="legend">
            <i>✓ hecha</i><i>◐ parcial</i><i>→ movida</i><i>✕ no hecha</i><i>★ clave</i>
          </p>
          ${req.user ? '' : '<p class="small muted" style="text-align:center;margin:14px 0">Vista pública de solo lectura.</p>'}
        </div>
        <div class="sheet-bg" id="sheetBg"><div class="sheet" id="sheet"></div></div>`,
        scripts: sheetScript(),
      }));
    } catch (err) { next(err); }
  },

  // GET /training/month?m=YYYY-MM
  month: async (req, res, next) => {
    try {
      const t = today();
      const m = /^\d{4}-\d{2}$/.test(req.query.m || '') ? req.query.m : t.slice(0, 7);
      const first = m + '-01';
      const year = Number(m.slice(0, 4));
      const mon = Number(m.slice(5, 7));
      const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
      const last = `${m}-${String(daysInMonth).padStart(2, '0')}`;

      // La grilla arranca el lunes de la semana del dia 1.
      const gridStart = mondayOf(first);
      const gridEnd = addDays(gridStart, 41);

      const { sessions, activities, overrides } = await q.loadRange(gridStart, gridEnd);
      const { results } = matchPlan({ sessions, activities, overrides, today: t });

      const byDay = new Map();
      for (const r of results) {
        if (!byDay.has(r.session.date)) byDay.set(r.session.date, []);
        byDay.get(r.session.date).push(r);
      }

      const cells = [];
      for (let i = 0; i < 42; i++) {
        const date = addDays(gridStart, i);
        const out = date < first || date > last;
        const rs = (byDay.get(date) || []).filter((r) => r.status !== 'rest');
        const dots = rs.map((r) => {
          const cls = r.status === 'done' || r.status === 'moved' ? 'done'
            : r.status === 'partial' ? 'partial'
            : r.status === 'missed' ? 'missed' : '';
          return `<span class="dot ${cls}"></span>`;
        }).join('');
        cells.push(`<a class="mcell${out ? ' out' : ''}${date === t ? ' today' : ''}"
          href="/training?week=${weekNumberOf(date)}#d-${date}"
          aria-label="${date}">
          <span>${Number(date.slice(8))}</span>
          <span class="dots">${dots}</span></a>`);
        if (date >= last && (i + 1) % 7 === 0) break;
      }

      const prevM = mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
      const nextM = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`;

      res.send(page({
        title: `${MONTHS_ES[mon - 1]} ${year} · Training 70.3`,
        user: req.user,
        active: 'month',
        body: `
        ${countdownBlock(t)}
        <div class="wrap">
          <nav class="weeknav">
            <a href="/training/month?m=${prevM}" aria-label="Mes anterior">‹</a>
            <span class="mid">${MONTHS_ES[mon - 1]} ${year}</span>
            <a href="/training/month?m=${nextM}" aria-label="Mes siguiente">›</a>
          </nav>
          <div class="month">
            <div class="mgrid">
              ${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="dow">${d}</div>`).join('')}
              ${cells.join('')}
            </div>
          </div>
          <p class="legend">
            <i>● verde: hecha</i><i>● amarillo: parcial</i><i>● rojo: no hecha</i><i>● gris: pendiente</i>
          </p>
        </div>`,
      }));
    } catch (err) { next(err); }
  },

  // GET /training/stats
  stats: async (req, res, next) => {
    try {
      const t = today();
      const [sessions, activities, overrides] = await Promise.all([
        q.allSessions(), q.allActivities(), q.allOverrides(),
      ]);
      const { results } = matchPlan({ sessions, activities, overrides, today: t });
      const st = globalStats(results, t);

      // Cumplimiento por fase.
      const phases = {};
      for (const r of results) {
        if (r.status === 'rest' || r.session.date >= t) continue;
        const p = r.session.phase;
        phases[p] = phases[p] || { total: 0, done: 0 };
        phases[p].total++;
        if (r.status === 'done' || r.status === 'moved') phases[p].done++;
      }

      res.send(page({
        title: 'Stats · Training 70.3',
        user: req.user,
        active: 'stats',
        body: `
        ${countdownBlock(t)}
        <div class="wrap">
          <div class="stats">
            <div class="stat"><div class="n">${st.pct}%</div><div class="l">Cumplimiento total</div></div>
            <div class="stat"><div class="n">${st.keyPct}%</div><div class="l">Sesiones clave</div></div>
            <div class="stat"><div class="n">${st.done}/${st.total}</div><div class="l">Sesiones hechas</div></div>
          </div>
          <div class="card pad">
            <h1>Horas por disciplina</h1>
            <div class="kv-list">
              <div class="kv"><span class="k">🏊 Natación</span><span class="v">${st.hours.swim} h</span></div>
              <div class="kv"><span class="k">🚴 Bici</span><span class="v">${st.hours.bike} h</span></div>
              <div class="kv"><span class="k">🏃 Trote</span><span class="v">${st.hours.run} h</span></div>
              <div class="kv"><span class="k">Total</span><span class="v">${Math.round((st.hours.swim + st.hours.bike + st.hours.run) * 10) / 10} h</span></div>
            </div>
          </div>
          <div class="card pad">
            <h1>Por fase</h1>
            ${Object.keys(phases).length === 0
              ? '<p class="muted">Todavía no hay sesiones pasadas.</p>'
              : Object.entries(phases).map(([p, v]) => `
              <div class="bar-row" style="margin-bottom:10px">
                <span class="nm">${p}</span>
                <span class="bar"><i style="width:${v.total ? Math.round((v.done / v.total) * 100) : 0}%;background:${PHASE_COLORS[p] || 'var(--accent)'}"></i></span>
                <span class="v">${v.done}/${v.total}</span>
              </div>`).join('')}
          </div>
          ${req.user ? `<a class="btn ghost" href="/training/connect">Strava</a>
            <form method="POST" action="/training/logout"><button class="act-btn ghost" type="submit">Cerrar sesión</button></form>`
            : '<a class="back" href="/training/login">Entrar</a>'}
        </div>`,
      }));
    } catch (err) { next(err); }
  },

  // GET /training/guia — zonas de FC y glosario.
  guia: (req, res) => {
    const zr = (z) => `${Math.round(FC_MAX * z.pct[0])}–${Math.round(FC_MAX * z.pct[1])} lpm`;
    res.send(page({
      title: 'Guía · Training 70.3',
      user: req.user,
      active: 'guia',
      body: `
      <div class="wrap" style="padding-top:18px">
        <div class="card pad">
          <h1>Zonas de frecuencia cardíaca</h1>
          <p class="muted small">FC máxima medida: ${FC_MAX} lpm.</p>
          ${ZONES.map((z) => `<div class="zone" style="background:${z.color}">
            <b>${z.z} · ${z.name} — ${zr(z)}</b>${escapeHtml(z.desc)}</div>`).join('')}
        </div>
        <div class="card pad">
          <h1>Glosario</h1>
          ${Object.entries(GLOSSARY).map(([, g]) => `
            <details style="margin-bottom:10px">
              <summary style="cursor:pointer;font-weight:600;font-size:14.5px;min-height:44px;display:flex;align-items:center">${escapeHtml(g.title)}</summary>
              <p class="small" style="line-height:1.6;white-space:pre-wrap;margin:8px 0 0">${escapeHtml(g.body)}</p>
            </details>`).join('')}
        </div>
      </div>`,
    }));
  },

  // GET /api/training/session/:id — detalle para el bottom sheet.
  sessionDetail: async (req, res, next) => {
    try {
      const t = today();
      const s = await q.getSession(req.params.id);
      if (!s) return res.status(404).json({ error: 'No existe esa sesión' });

      const from = addDays(s.date, -1);
      const to = addDays(s.date, 1);
      const { sessions, activities, overrides } = await q.loadRange(from, to);
      const { results } = matchPlan({ sessions, activities, overrides, today: t });
      const r = results.find((x) => x.session.id === s.id);

      res.json({
        session: s,
        status: r ? r.status : 'upcoming',
        statusLabel: (STATUS[r ? r.status : 'upcoming'] || STATUS.upcoming).label,
        progress: r ? r.progress : null,
        matched: (r ? r.matched : []).map((a) => ({
          id: a.id, name: a.name, sport_type: a.sport_type,
          moving_time_s: a.moving_time_s, distance_m: a.distance_m,
          start_date_local: a.start_date_local,
          average_heartrate: a.average_heartrate,
        })),
        override: r ? r.override : null,
        canEdit: Boolean(req.user),
        sportName: SPORT_NAME[s.sport] || s.sport,
        sportIcon: SPORT_ICON[s.sport] || '•',
      });
    } catch (err) { next(err); }
  },

  // POST /api/training/override  (protegido)
  override: async (req, res, next) => {
    try {
      const { session_id: sessionId, action, reason, activity_id: activityId } = req.body || {};
      if (!sessionId) return res.status(400).json({ error: 'Falta session_id' });

      const s = await q.getSession(sessionId);
      if (!s) return res.status(404).json({ error: 'No existe esa sesión' });

      const current = await q.getOverride(sessionId);
      const links = (current && current.manual_activity_ids) || [];

      if (action === 'done') {
        await q.setOverride(sessionId, { status: 'done', reason: null, manual_activity_ids: links });
      } else if (action === 'skip') {
        await q.setOverride(sessionId, {
          status: 'skipped',
          reason: (reason || '').toString().slice(0, 200) || null,
          manual_activity_ids: links,
        });
      } else if (action === 'clear') {
        if (links.length) {
          await q.setOverride(sessionId, { status: null, reason: null, manual_activity_ids: links });
        } else {
          await q.clearOverride(sessionId);
        }
      } else if (action === 'link' || action === 'unlink') {
        const id = Number(activityId);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'activity_id inválido' });
        const next2 = action === 'link'
          ? [...new Set([...links, id])]
          : links.filter((x) => Number(x) !== id);
        await q.setOverride(sessionId, {
          status: current ? current.status : null,
          reason: current ? current.reason : null,
          manual_activity_ids: next2,
        });
      } else {
        return res.status(400).json({ error: 'Acción desconocida' });
      }

      res.json({ ok: true });
    } catch (err) { next(err); }
  },
};

// Glosario, heredado de la version anterior de /training.
const GLOSSARY = {
  fondo: { title: 'Carrera de fondo (Z2)', body: 'La carrera de fondo es la sesión más importante del plan. Consiste en correr durante un tiempo prolongado a un ritmo cómodo, donde podés mantener una conversación sin dificultad.\n\nPara vos, eso significa mantenerte en Z2: entre 103 y 120 lpm. Si tu FC sube de 120, reducí el ritmo. Si tenés que caminar al principio para no pasarte, está perfectamente bien.\n\nEl objetivo no es ir rápido, sino acumular tiempo en movimiento aeróbico.' },
  strides: { title: 'Strides (aceleraciones controladas)', body: 'Aceleraciones cortas de 20–30 segundos al final de una carrera fácil. No son sprints, sino una progresión controlada: empezás al 70% y llegás al 90–95%, luego reducís suave.\n\nActivan el sistema neuromuscular y mejoran la eficiencia de la zancada sin acumular fatiga.' },
  ladrillo: { title: 'Ladrillo (brick)', body: 'Dos disciplinas en una misma sesión, sin descanso. El más común es bici seguido de carrera.\n\nEntrena la transición muscular: cuando bajás de la bici las piernas vienen del movimiento circular del pedaleo y de repente tienen que correr. Los primeros minutos se sienten rarísimos.\n\nEl día de la carrera el ladrillo es bici 90 km → carrera 21 km. Los ladrillos eliminan la sorpresa.' },
  sweetspot: { title: 'Sweet spot', body: 'Intensidad entre Z3 y Z4, ~85–90% del umbral de lactato. El rango donde se genera más adaptación aeróbica por unidad de tiempo, sin el costo de recuperación del trabajo a umbral.\n\nEn FC: 130–145 lpm.' },
  bikez2: { title: 'Bici en zona 2', body: 'Andar en Z2 es más difícil de calibrar que correr: en descensos la FC baja, en subidas sube. El objetivo es la FC promedio de la sesión, no el pico.\n\nPara vos: 103–120 lpm la mayor parte de la salida. Cadencia 85–95 RPM.' },
  series: { title: 'Series de natación', body: 'Repeticiones de distancias cortas con descanso entre ellas (por ejemplo 8×100 m con 20 s de pausa).\n\nAl fragmentar la distancia podés mantener mejor técnica y nadar más rápido.\n\nRitmo de referencia: 2:00–2:15 min/100 m en Z2.' },
  tempo: { title: 'Carrera tempo', body: '20–40 minutos a Z3–Z4, con calentamiento y enfriamiento en Z1–Z2. Es lo que más mejora el umbral de lactato.\n\nRitmo ~5:00–5:15 min/km.' },
  calas: { title: 'Calas', body: 'Los pedales automáticos enganchan la zapatilla al pedal. Dan mucha más eficiencia pero hay que aprender a desengancharse ANTES de frenar, no cuando ya estás parado.\n\nPrimeras semanas: practicá enganchar y desenganchar con la bici apoyada, después en movimiento en un lugar sin tráfico. Todo el mundo se cae una vez.' },
};

module.exports = trainingController;

// ------------------------------------------------------- script del sheet

function sheetScript() {
  return `<script>
(function () {
  var bg = document.getElementById('sheetBg');
  var sheet = document.getElementById('sheet');
  if (!bg) return;

  function fmtDur(s) { var m = Math.round((s||0)/60); return m + "'"; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function close() { bg.classList.remove('open'); document.body.style.overflow = ''; }

  function render(d) {
    var s = d.session;
    var acts = d.matched.map(function (a) {
      var det = [];
      if (a.moving_time_s) det.push(fmtDur(a.moving_time_s));
      if (a.distance_m > 0) det.push((a.distance_m/1000).toFixed(1) + ' km');
      if (a.average_heartrate) det.push(Math.round(a.average_heartrate) + ' lpm');
      return '<div class="act"><span>' + esc(a.name || a.sport_type) +
        '<br><span class="muted small">' + det.join(' · ') + '</span></span>' +
        '<a href="https://www.strava.com/activities/' + a.id + '" target="_blank" rel="noopener">Strava ↗</a></div>';
    }).join('');

    var kv = '';
    if (s.target_duration_min) kv += '<div class="kv"><span class="k">Duración objetivo</span><span class="v">' + s.target_duration_min + "'</span></div>";
    if (s.target_distance_m) kv += '<div class="kv"><span class="k">Distancia objetivo</span><span class="v">' + s.target_distance_m + ' m</span></div>';
    if (s.bike_duration_min) kv += '<div class="kv"><span class="k">Bici</span><span class="v">' + s.bike_duration_min + "'</span></div>";
    if (s.run_duration_min) kv += '<div class="kv"><span class="k">Trote</span><span class="v">' + s.run_duration_min + "'</span></div>";
    if (s.intensity) kv += '<div class="kv"><span class="k">Intensidad</span><span class="v">' + esc(s.intensity) + '</span></div>';
    if (d.progress && d.progress.actual) {
      kv += '<div class="kv"><span class="k">Real</span><span class="v">' + d.progress.actual +
        (d.progress.metric === 'distance' ? ' m' : "'") + '</span></div>';
    }

    var ov = d.override && d.override.status === 'skipped' && d.override.reason
      ? '<p class="small muted">Salteada: ' + esc(d.override.reason) + '</p>' : '';

    var actions = '';
    if (d.canEdit) {
      actions = '<h4>Acciones</h4>' +
        '<div class="row2">' +
        '<button class="act-btn" data-act="done">Marcar hecha</button>' +
        '<button class="act-btn ghost" data-act="skip">Saltear</button>' +
        '</div>' +
        '<button class="act-btn ghost" data-act="clear">Quitar override</button>';
    }

    sheet.innerHTML = '<div class="grab"></div>' +
      '<h3>' + d.sportIcon + ' ' + esc(s.title) + '</h3>' +
      '<p class="sub">' + esc(s.date) + ' · ' + esc(d.sportName) + ' · ' + esc(d.statusLabel) +
        (s.is_key_session ? ' · sesión clave ★' : '') + '</p>' +
      ov +
      (s.description ? '<p class="desc">' + esc(s.description) + '</p>' : '') +
      kv +
      (acts ? '<h4>Actividades</h4>' + acts : '<h4>Actividades</h4><p class="muted small">Ninguna todavía.</p>') +
      actions;

    sheet.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        var reason = null;
        if (act === 'skip') {
          reason = prompt('¿Por qué? (lesión, viaje, etc.)');
          if (reason === null) return;
        }
        b.disabled = true;
        fetch('/api/training/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: s.id, action: act, reason: reason })
        }).then(function (r) {
          if (!r.ok) throw new Error('falló');
          location.reload();
        }).catch(function () {
          b.disabled = false;
          alert('No se pudo guardar.');
        });
      });
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.ses');
    if (btn) {
      var id = btn.getAttribute('data-id');
      sheet.innerHTML = '<div class="grab"></div><p class="muted" style="padding:20px 0;text-align:center">Cargando…</p>';
      bg.classList.add('open');
      document.body.style.overflow = 'hidden';
      fetch('/api/training/session/' + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(render)
        .catch(function () {
          sheet.innerHTML = '<div class="grab"></div><p class="bad" style="padding:20px 0;text-align:center">No se pudo cargar.</p>';
        });
      return;
    }
    if (e.target === bg) close();
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // Swipe horizontal para cambiar de semana.
  var x0 = null, y0 = null;
  document.addEventListener('touchstart', function (e) {
    if (bg.classList.contains('open')) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 === null || bg.classList.contains('open')) return;
    var dx = e.changedTouches[0].clientX - x0;
    var dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 65 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    var nav = document.querySelector('.weeknav');
    if (!nav) return;
    var link = dx < 0 ? nav.lastElementChild : nav.firstElementChild;
    if (link && link.tagName === 'A' && link.getAttribute('aria-disabled') !== 'true') {
      location.href = link.getAttribute('href');
    }
  }, { passive: true });
})();
</script>`;
}
