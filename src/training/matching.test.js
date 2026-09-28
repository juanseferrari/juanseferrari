// node --test src/training/matching.test.js
const test = require('node:test');
const assert = require('node:assert');

const {
  matchPlan, summarizeWeek, globalStats, findBrickPair, planSportOf,
} = require('./matching');

// ------------------------------------------------------------------ helpers

let nextId = 1;

function activity(over = {}) {
  const moving = over.moving_time_s != null ? over.moving_time_s : 3000;
  return {
    id: over.id != null ? over.id : nextId++,
    sport_type: 'Run',
    start_date_local: '2026-10-05T07:00:00Z',
    moving_time_s: moving,
    elapsed_time_s: over.elapsed_time_s != null ? over.elapsed_time_s : moving,
    distance_m: 0,
    trainer: false,
    average_heartrate: null,
    name: 'actividad',
    ...over,
  };
}

function session(over = {}) {
  return {
    id: 's1',
    date: '2026-10-05',
    week: -1,
    phase: 'PreBase',
    sport: 'run',
    title: 'Trote',
    target_duration_min: 50,
    sort_order: 0,
    ...over,
  };
}

const TODAY = '2026-10-10'; // posterior a las fechas de prueba

function statusOf(out, id = 's1') {
  return out.results.find((r) => r.session.id === id).status;
}

// -------------------------------------------------------------------- tests

test('bici en rodillo sin distancia cumple por duracion', () => {
  const s = session({ sport: 'bike', target_duration_min: 60 });
  const a = activity({
    sport_type: 'VirtualRide', trainer: true,
    distance_m: 0, moving_time_s: 60 * 60,
  });

  const out = matchPlan({ sessions: [s], activities: [a], today: TODAY });
  assert.equal(statusOf(out), 'done');
  assert.equal(out.results[0].progress.metric, 'duration');
  assert.equal(out.results[0].progress.actual, 60);
});

test('dos trotes el mismo dia se suman', () => {
  const s = session({ target_duration_min: 60 });
  const a1 = activity({ moving_time_s: 25 * 60, start_date_local: '2026-10-05T07:00:00Z' });
  const a2 = activity({ moving_time_s: 30 * 60, start_date_local: '2026-10-05T19:00:00Z' });

  const out = matchPlan({ sessions: [s], activities: [a1, a2], today: TODAY });
  assert.equal(out.results[0].progress.actual, 55);
  assert.equal(statusOf(out), 'done'); // 55/60 = 92%
  assert.equal(out.results[0].matched.length, 2);
});

test('sesion movida un dia queda en moved', () => {
  const s = session({ date: '2026-10-05', target_duration_min: 50 });
  const a = activity({ start_date_local: '2026-10-06T07:00:00Z', moving_time_s: 50 * 60 });

  const out = matchPlan({ sessions: [s], activities: [a], today: TODAY });
  assert.equal(statusOf(out), 'moved');
  assert.equal(out.results[0].moved, true);
});

test('una actividad a dos dias de distancia no cuenta', () => {
  const s = session({ date: '2026-10-05' });
  const a = activity({ start_date_local: '2026-10-07T07:00:00Z', moving_time_s: 50 * 60 });

  const out = matchPlan({ sessions: [s], activities: [a], today: TODAY });
  assert.equal(statusOf(out), 'missed');
  assert.equal(out.extras.length, 1);
});

test('brick: bici seguida de trote con menos de 20 min de hueco', () => {
  const s = session({
    sport: 'brick', target_duration_min: 100,
    bike_duration_min: 80, run_duration_min: 20, is_key_session: true,
  });
  const ride = activity({
    sport_type: 'Ride', start_date_local: '2026-10-05T08:00:00Z',
    moving_time_s: 80 * 60, elapsed_time_s: 80 * 60,
  });
  // Empieza 10 min despues de terminar la bici.
  const run = activity({
    sport_type: 'Run', start_date_local: '2026-10-05T09:30:00Z',
    moving_time_s: 20 * 60,
  });

  const out = matchPlan({ sessions: [s], activities: [ride, run], today: TODAY });
  assert.equal(statusOf(out), 'done');
  assert.equal(out.results[0].matched.length, 2);
});

test('brick: si el trote arranca 40 min despues, no es brick pero suma volumen', () => {
  const s = session({
    sport: 'brick', target_duration_min: 100,
    bike_duration_min: 80, run_duration_min: 20,
  });
  const ride = activity({
    sport_type: 'Ride', start_date_local: '2026-10-05T08:00:00Z',
    moving_time_s: 80 * 60, elapsed_time_s: 80 * 60,
  });
  const run = activity({
    sport_type: 'Run', start_date_local: '2026-10-05T10:00:00Z',
    moving_time_s: 20 * 60,
  });

  const out = matchPlan({ sessions: [s], activities: [ride, run], today: TODAY });
  const pair = findBrickPair([ride, run]);
  assert.equal(pair, null, 'no deberia detectar el par');
  // Igual cuentan como volumen del dia.
  assert.equal(out.results[0].progress.actual, 100);
});

test('actividad no deportiva no cumple y aparece como extra', () => {
  const s = session({ target_duration_min: 50 });
  const soccer = activity({ sport_type: 'Soccer', moving_time_s: 90 * 60 });
  const weights = activity({ sport_type: 'WeightTraining', moving_time_s: 45 * 60 });

  const out = matchPlan({ sessions: [s], activities: [soccer, weights], today: TODAY });
  assert.equal(statusOf(out), 'missed');
  assert.equal(out.extras.length, 2);
  assert.equal(planSportOf(soccer), null);
});

test('EBikeRide no cuenta como bici', () => {
  const s = session({ sport: 'bike', target_duration_min: 60 });
  const a = activity({ sport_type: 'EBikeRide', moving_time_s: 60 * 60 });

  const out = matchPlan({ sessions: [s], activities: [a], today: TODAY });
  assert.equal(statusOf(out), 'missed');
  assert.equal(out.extras.length, 1);
});

test('override done gana sobre el calculo automatico', () => {
  const s = session({ target_duration_min: 50 });
  const out = matchPlan({
    sessions: [s], activities: [], today: TODAY,
    overrides: [{ session_id: 's1', status: 'done', manual_activity_ids: [] }],
  });
  assert.equal(statusOf(out), 'done');
});

test('override skipped gana aunque haya actividad completa', () => {
  const s = session({ target_duration_min: 50 });
  const a = activity({ moving_time_s: 60 * 60 });
  const out = matchPlan({
    sessions: [s], activities: [a], today: TODAY,
    overrides: [{ session_id: 's1', status: 'skipped', reason: 'lesión' }],
  });
  assert.equal(statusOf(out), 'skipped');
  assert.equal(out.results[0].override.reason, 'lesión');
});

test('vinculo manual asigna una actividad de otro deporte', () => {
  const s = session({ sport: 'bike', target_duration_min: 60 });
  // Un Workout que en realidad fue el rodillo.
  const a = activity({ id: 999, sport_type: 'Workout', moving_time_s: 60 * 60 });

  const out = matchPlan({
    sessions: [s], activities: [a], today: TODAY,
    overrides: [{ session_id: 's1', manual_activity_ids: [999] }],
  });
  assert.equal(out.results[0].matched.length, 1);
  assert.equal(statusOf(out), 'done');
  assert.equal(out.extras.length, 0);
});

test('natacion cumple por distancia, no por duracion', () => {
  const s = session({
    sport: 'swim', target_duration_min: 60, target_distance_m: 2000,
  });
  // Nado corto en tiempo pero completo en metros.
  const a = activity({
    sport_type: 'Swim', distance_m: 2000, moving_time_s: 35 * 60,
  });

  const out = matchPlan({ sessions: [s], activities: [a], today: TODAY });
  assert.equal(out.results[0].progress.metric, 'distance');
  assert.equal(statusOf(out), 'done');
});

test('estados por umbral: done / partial / missed', () => {
  const mk = (min) => matchPlan({
    sessions: [session({ target_duration_min: 100 })],
    activities: [activity({ moving_time_s: min * 60 })],
    today: TODAY,
  });
  assert.equal(statusOf(mk(85)), 'done');     // 85%
  assert.equal(statusOf(mk(80)), 'done');     // justo el umbral
  assert.equal(statusOf(mk(65)), 'partial');  // 65%
  assert.equal(statusOf(mk(50)), 'partial');  // justo el umbral
  assert.equal(statusOf(mk(30)), 'missed');   // 30%
});

test('hoy sin actividad es today, futuro es upcoming', () => {
  const out = matchPlan({
    sessions: [
      session({ id: 'hoy', date: '2026-10-10' }),
      session({ id: 'manana', date: '2026-10-11' }),
    ],
    activities: [], today: '2026-10-10',
  });
  assert.equal(statusOf(out, 'hoy'), 'today');
  assert.equal(statusOf(out, 'manana'), 'upcoming');
});

test('dia de descanso es rest y no se cuenta', () => {
  const out = matchPlan({
    sessions: [session({ id: 'd', sport: 'strength', title: 'Descanso', target_duration_min: null })],
    activities: [], today: TODAY,
  });
  assert.equal(statusOf(out, 'd'), 'rest');

  const stats = globalStats(out.results, TODAY);
  assert.equal(stats.total, 0, 'el descanso no entra en el total');
});

test('cada actividad se asigna a lo sumo a una sesion', () => {
  // Dos trotes planificados el mismo dia, una sola actividad.
  const s1 = session({ id: 'largo', sport: 'run', target_duration_min: 60, is_key_session: true });
  const s2 = session({ id: 'facil', sport: 'run', target_duration_min: 30, sort_order: 1 });
  const a = activity({ moving_time_s: 60 * 60 });

  const out = matchPlan({ sessions: [s1, s2], activities: [a], today: TODAY });
  const matchedCount = out.results.reduce((n, r) => n + r.matched.length, 0);
  assert.equal(matchedCount, 1, 'la actividad no se puede contar dos veces');
  // La clave se la queda.
  assert.equal(statusOf(out, 'largo'), 'done');
  assert.equal(statusOf(out, 'facil'), 'missed');
});

test('mismo dia tiene prioridad sobre +-1 dia', () => {
  // Sesion el 5 y el 6. La actividad del 6 tiene que ir a la del 6, no
  // robarsela la del 5 como "movida".
  const s5 = session({ id: 'd5', date: '2026-10-05', target_duration_min: 50 });
  const s6 = session({ id: 'd6', date: '2026-10-06', target_duration_min: 50 });
  const a = activity({ start_date_local: '2026-10-06T07:00:00Z', moving_time_s: 50 * 60 });

  const out = matchPlan({ sessions: [s5, s6], activities: [a], today: TODAY });
  assert.equal(statusOf(out, 'd6'), 'done');
  assert.equal(statusOf(out, 'd5'), 'missed');
});

test('resumen semanal suma volumen real vs planeado', () => {
  const sessions = [
    session({ id: 'sw', sport: 'swim', target_distance_m: 2000, target_duration_min: 50 }),
    session({ id: 'bk', sport: 'bike', target_duration_min: 90 }),
    session({ id: 'rn', sport: 'run', target_duration_min: 60 }),
  ];
  const activities = [
    activity({ sport_type: 'Swim', distance_m: 1800, moving_time_s: 45 * 60 }),
    activity({ sport_type: 'Ride', distance_m: 0, moving_time_s: 90 * 60 }),
    activity({ sport_type: 'Run', moving_time_s: 30 * 60 }),
  ];

  const out = matchPlan({ sessions, activities, today: TODAY });
  const w = summarizeWeek(out.results);
  assert.equal(w.swim.target, 2000);
  assert.equal(w.swim.actual, 1800);
  assert.equal(w.bike.pct, 100);
  assert.equal(w.run.pct, 50);
});

test('stats globales: cumplimiento total y de sesiones clave', () => {
  const sessions = [
    session({ id: 'a', date: '2026-10-01', target_duration_min: 60, is_key_session: true }),
    session({ id: 'b', date: '2026-10-02', target_duration_min: 60 }),
    session({ id: 'c', date: '2026-10-03', target_duration_min: 60 }),
    session({ id: 'f', date: '2026-10-20', target_duration_min: 60 }), // futura
  ];
  const activities = [
    activity({ start_date_local: '2026-10-01T07:00:00Z', moving_time_s: 60 * 60 }),
    activity({ start_date_local: '2026-10-02T07:00:00Z', moving_time_s: 60 * 60 }),
  ];

  const out = matchPlan({ sessions, activities, today: TODAY });
  const st = globalStats(out.results, TODAY);
  assert.equal(st.total, 3, 'la futura no cuenta');
  assert.equal(st.done, 2);
  assert.equal(st.keyTotal, 1);
  assert.equal(st.keyDone, 1);
  assert.equal(st.keyPct, 100);
  assert.equal(st.hours.run, 2);
});

test('una sesion sin objetivo pero con actividad cuenta como hecha', () => {
  const s = session({ target_duration_min: null });
  const a = activity({ moving_time_s: 30 * 60 });
  const out = matchPlan({ sessions: [s], activities: [a], today: TODAY });
  assert.equal(statusOf(out), 'done');
});
