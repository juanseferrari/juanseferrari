// Matcheo entre sesiones planificadas y actividades de Strava.
//
// Funcion pura: no toca la red ni la DB. Recibe el plan, las actividades y
// los overrides, y devuelve el estado de cada sesion. Todo lo que dependa de
// "ahora" entra por parametro (`today`), para que los tests sean deterministas.

const { localDateOf, localSecondsOf, addDays } = require('./dates');

// Que sport_type de Strava cuenta para cada deporte del plan.
// EBikeRide queda afuera a proposito.
const SPORT_MAP = {
  swim: ['Swim', 'OpenWaterSwim'],
  bike: ['Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide'],
  run:  ['Run', 'TrailRun', 'VirtualRun'],
};

// Hueco maximo entre el fin de la bici y el inicio del trote para que cuente
// como brick.
const BRICK_GAP_MAX_S = 20 * 60;

// Umbrales de cumplimiento.
const DONE_RATIO = 0.8;
const PARTIAL_RATIO = 0.5;

// Cuantos dias alrededor de la fecha planificada se busca una actividad.
const MOVED_WINDOW_DAYS = 1;

// Las sesiones de descanso no se cumplen ni se fallan.
function isRestSession(session) {
  return session.sport === 'strength' || session.title === 'Descanso';
}

function sportOf(activity) {
  return activity.sport_type || activity.type || '';
}

// Devuelve 'swim' | 'bike' | 'run' | null segun el sport_type de Strava.
function planSportOf(activity) {
  const st = sportOf(activity);
  for (const sport of Object.keys(SPORT_MAP)) {
    if (SPORT_MAP[sport].includes(st)) return sport;
  }
  return null;
}

// Una actividad "cuenta" para una sesion si su deporte mapea al de la sesion.
// Los bricks aceptan bici y trote.
function activityCountsFor(session, activity) {
  const sport = planSportOf(activity);
  if (!sport) return false;
  if (session.sport === 'brick') return sport === 'bike' || sport === 'run';
  if (session.sport === 'race') return sport === 'swim' || sport === 'bike' || sport === 'run';
  return session.sport === sport;
}

function endSecondsOf(activity) {
  return localSecondsOf(activity.start_date_local)
    + (Number(activity.elapsed_time_s) || Number(activity.moving_time_s) || 0);
}

// Un ride seguido de un run el mismo dia, con menos de BRICK_GAP_MAX_S entre
// el fin del ride y el inicio del run. Devuelve el par o null.
function findBrickPair(activities) {
  const rides = activities.filter((a) => planSportOf(a) === 'bike')
    .sort((a, b) => localSecondsOf(a.start_date_local) - localSecondsOf(b.start_date_local));
  const runs = activities.filter((a) => planSportOf(a) === 'run')
    .sort((a, b) => localSecondsOf(a.start_date_local) - localSecondsOf(b.start_date_local));

  for (const ride of rides) {
    for (const run of runs) {
      const gap = localSecondsOf(run.start_date_local) - endSecondsOf(ride);
      if (gap >= 0 && gap <= BRICK_GAP_MAX_S) return { ride, run };
    }
  }
  return null;
}

// --------------------------------------------------------------- cumplimiento

// Metrica principal: duracion. En natacion, si la sesion tiene distancia
// objetivo, se usa distancia (los relojes miden mal el tiempo en pileta y el
// objetivo esta escrito en metros).
function progressFor(session, activities) {
  const useDistance = session.sport === 'swim' && session.target_distance_m > 0;

  if (useDistance) {
    const actual = activities.reduce((a, x) => a + (Number(x.distance_m) || 0), 0);
    return {
      metric: 'distance',
      target: session.target_distance_m,
      actual: Math.round(actual),
      ratio: session.target_distance_m > 0 ? actual / session.target_distance_m : 0,
    };
  }

  const target = session.target_duration_min;
  const actualS = activities.reduce((a, x) => a + (Number(x.moving_time_s) || 0), 0);
  const actualMin = actualS / 60;
  return {
    metric: 'duration',
    target: target || 0,
    actual: Math.round(actualMin),
    ratio: target > 0 ? actualMin / target : (actualS > 0 ? 1 : 0),
  };
}

function statusFromRatio(ratio) {
  if (ratio >= DONE_RATIO) return 'done';
  if (ratio >= PARTIAL_RATIO) return 'partial';
  return null;
}

// ------------------------------------------------------------------ asignacion

// Prioridad de asignacion: una actividad se le da primero a la sesion del
// mismo dia, y entre sesiones del mismo dia, a las clave.
//
// El orden en que se recorren las sesiones define quien elige primero.
function assignmentOrder(sessions) {
  return sessions
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      // Las clave eligen primero.
      const key = (b.s.is_key_session ? 1 : 0) - (a.s.is_key_session ? 1 : 0);
      if (key) return key;
      // Despues los bricks, que necesitan dos actividades especificas.
      const brick = (b.s.sport === 'brick' ? 1 : 0) - (a.s.sport === 'brick' ? 1 : 0);
      if (brick) return brick;
      // Empate: orden original (fecha, sort_order).
      return a.i - b.i;
    })
    .map((x) => x.s);
}

/**
 * Cruza el plan con las actividades.
 *
 * @param {object} input
 * @param {Array}  input.sessions   sesiones planificadas
 * @param {Array}  input.activities actividades de Strava
 * @param {Array}  input.overrides  [{ session_id, status, reason, manual_activity_ids }]
 * @param {string} input.today      YYYY-MM-DD en hora local
 * @returns {{ results: Array, extras: Array }}
 */
function matchPlan({ sessions = [], activities = [], overrides = [], today }) {
  const byId = new Map();
  for (const o of overrides) byId.set(o.session_id, o);

  // Actividades indexadas por fecha local.
  const byDate = new Map();
  for (const a of activities) {
    const d = localDateOf(a.start_date_local);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(a);
  }

  // Una actividad se asigna a lo sumo a una sesion.
  const taken = new Set();

  // Primero los vinculos manuales: ganan sobre cualquier calculo.
  const manualBySession = new Map();
  for (const o of overrides) {
    const ids = o.manual_activity_ids || [];
    if (!ids.length) continue;
    const linked = [];
    for (const id of ids) {
      const a = activities.find((x) => String(x.id) === String(id));
      if (a && !taken.has(a.id)) { linked.push(a); taken.add(a.id); }
    }
    if (linked.length) manualBySession.set(o.session_id, linked);
  }

  const results = new Map();
  const ordered = assignmentOrder(sessions);

  // El estado parcial de cada sesion mientras se asignan las actividades.
  const state = new Map();
  for (const s of sessions) {
    state.set(s.id, { matched: (manualBySession.get(s.id) || []).slice(), moved: false });
  }

  const planned = ordered.filter((s) => !isRestSession(s));

  // --- Pasada 1: mismo dia.
  //
  // Se hace para TODAS las sesiones antes de mirar +-1 dia. Si no, una sesion
  // del lunes puede robarse como "movida" la actividad del martes que en
  // realidad corresponde a la sesion del martes.
  for (const session of planned) {
    const st = state.get(session.id);
    const sameDay = (byDate.get(session.date) || []).filter((a) => !taken.has(a.id));

    if (session.sport === 'brick') {
      const pair = findBrickPair(sameDay.filter((a) => activityCountsFor(session, a)));
      if (pair) {
        st.matched.push(pair.ride, pair.run);
      } else {
        // Sin par, la bici y el trote sueltos del dia igual suman volumen:
        // hizo el trabajo pero no la transicion.
        for (const a of sameDay) if (activityCountsFor(session, a)) st.matched.push(a);
      }
    } else {
      for (const a of sameDay) if (activityCountsFor(session, a)) st.matched.push(a);
    }

    for (const a of st.matched) taken.add(a.id);
  }

  // --- Pasada 2: +-1 dia, solo para las sesiones que quedaron vacias.
  for (const session of planned) {
    const st = state.get(session.id);
    if (st.matched.length) continue;

    const nearby = [];
    for (let d = -MOVED_WINDOW_DAYS; d <= MOVED_WINDOW_DAYS; d++) {
      if (d === 0) continue;
      for (const a of byDate.get(addDays(session.date, d)) || []) {
        if (!taken.has(a.id) && activityCountsFor(session, a)) nearby.push(a);
      }
    }
    if (!nearby.length) continue;

    if (session.sport === 'brick') {
      // El brick movido tiene que seguir siendo un brick: bici y trote
      // pegados, y del mismo dia.
      const byNearbyDate = new Map();
      for (const a of nearby) {
        const d = localDateOf(a.start_date_local);
        if (!byNearbyDate.has(d)) byNearbyDate.set(d, []);
        byNearbyDate.get(d).push(a);
      }
      for (const list of byNearbyDate.values()) {
        const p = findBrickPair(list);
        if (p) { st.matched.push(p.ride, p.run); st.moved = true; break; }
      }
    } else {
      // Solo de un dia: no mezclamos el de ayer con el de mañana.
      const chosen = localDateOf(nearby[0].start_date_local);
      for (const a of nearby) {
        if (localDateOf(a.start_date_local) === chosen) st.matched.push(a);
      }
      st.moved = true;
    }

    for (const a of st.matched) taken.add(a.id);
  }

  // --- Estados.
  for (const session of sessions) {
    const override = byId.get(session.id);

    if (isRestSession(session)) {
      results.set(session.id, {
        session, status: 'rest', matched: [], moved: false,
        progress: null, override: override || null,
      });
      continue;
    }

    const { matched, moved } = state.get(session.id);
    const progress = progressFor(session, matched);
    let status = statusFromRatio(progress.ratio);

    if (!status) {
      if (session.date < today) status = 'missed';
      else if (session.date === today) status = 'today';
      else status = 'upcoming';
    } else if (moved) {
      status = 'moved';
    }

    // El override siempre gana.
    if (override && override.status === 'done') status = 'done';
    else if (override && override.status === 'skipped') status = 'skipped';

    results.set(session.id, {
      session, status, matched, moved, progress,
      override: override || null,
    });
  }

  // Lo que no se asigno a ninguna sesion se muestra como "extra" del dia.
  const extras = activities.filter((a) => !taken.has(a.id));

  // Devolvemos en el orden original del plan, no en el de asignacion.
  return {
    results: sessions.map((s) => results.get(s.id)).filter(Boolean),
    extras,
  };
}

// Resumen de una semana: volumen real vs planeado por deporte.
function summarizeWeek(matchResults) {
  const totals = {
    swim: { target: 0, actual: 0, unit: 'm' },
    bike: { target: 0, actual: 0, unit: 'min' },
    run:  { target: 0, actual: 0, unit: 'min' },
  };

  for (const r of matchResults) {
    const s = r.session;
    if (isRestSession(s)) continue;

    if (s.sport === 'brick' || s.sport === 'race') {
      totals.bike.target += s.bike_duration_min || 0;
      totals.run.target += s.run_duration_min || 0;
      for (const a of r.matched) {
        const sport = planSportOf(a);
        if (sport === 'bike' || sport === 'run') {
          totals[sport].actual += (Number(a.moving_time_s) || 0) / 60;
        } else if (sport === 'swim') {
          totals.swim.actual += Number(a.distance_m) || 0;
        }
      }
      continue;
    }

    if (s.sport === 'swim') {
      totals.swim.target += s.target_distance_m || 0;
      for (const a of r.matched) totals.swim.actual += Number(a.distance_m) || 0;
    } else if (s.sport === 'bike' || s.sport === 'run') {
      totals[s.sport].target += s.target_duration_min || 0;
      for (const a of r.matched) totals[s.sport].actual += (Number(a.moving_time_s) || 0) / 60;
    }
  }

  for (const k of Object.keys(totals)) {
    totals[k].actual = Math.round(totals[k].actual);
    totals[k].target = Math.round(totals[k].target);
    totals[k].pct = totals[k].target > 0
      ? Math.round((totals[k].actual / totals[k].target) * 100)
      : 0;
  }
  return totals;
}

// Stats globales sobre todo el plan (solo dias pasados).
function globalStats(matchResults, today) {
  const past = matchResults.filter((r) =>
    r.session.date < today && !isRestSession(r.session));

  const completed = (r) => r.status === 'done' || r.status === 'moved';
  const key = past.filter((r) => r.session.is_key_session);

  const hours = { swim: 0, bike: 0, run: 0 };
  const seen = new Set();
  for (const r of matchResults) {
    for (const a of r.matched) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      const sport = planSportOf(a);
      if (sport) hours[sport] += (Number(a.moving_time_s) || 0) / 3600;
    }
  }

  return {
    total: past.length,
    done: past.filter(completed).length,
    pct: past.length ? Math.round((past.filter(completed).length / past.length) * 100) : 0,
    keyTotal: key.length,
    keyDone: key.filter(completed).length,
    keyPct: key.length ? Math.round((key.filter(completed).length / key.length) * 100) : 0,
    hours: {
      swim: Math.round(hours.swim * 10) / 10,
      bike: Math.round(hours.bike * 10) / 10,
      run: Math.round(hours.run * 10) / 10,
    },
  };
}

module.exports = {
  matchPlan, summarizeWeek, globalStats,
  planSportOf, findBrickPair, progressFor, isRestSession,
  SPORT_MAP, BRICK_GAP_MAX_S, DONE_RATIO, PARTIAL_RATIO,
};
