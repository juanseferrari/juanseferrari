// Sincronizacion de actividades desde Strava. Lo comparten el webhook, el
// backfill y el cron nocturno.

const strava = require('./strava');
const { setSyncState } = require('./queries');
const { today, addDays } = require('./dates');

// Desde cuando traemos actividades: el inicio del plan.
const { PLAN_START } = require('./plan-config');

// epoch segundos del arranque de un dia local. Strava filtra por UTC; nos
// pasamos de rango a proposito (un dia de margen) y despues filtramos por
// start_date_local, que es lo que realmente importa.
function epochOf(isoDate) {
  return Math.floor(new Date(isoDate + 'T00:00:00Z').getTime() / 1000);
}

// Trae y guarda una actividad puntual (la del webhook).
async function syncActivity(id) {
  const detail = await strava.getActivity(id);
  await strava.upsertActivities([detail]);
  return detail;
}

// Re-sincroniza un rango de fechas locales. Idempotente: upsert por id.
async function syncRange(fromDate, toDate) {
  const after = epochOf(addDays(fromDate, -1));
  const before = epochOf(addDays(toDate, 2));

  let saved = 0;
  const list = await strava.listActivities({
    after, before,
    onPage: async (batch) => {
      // El listado de /athlete/activities ya trae lo que necesitamos
      // (moving_time, distance, sport_type). No pedimos el detalle de cada
      // una para no comernos el rate limit en el backfill.
      saved += await strava.upsertActivities(batch);
    },
  });

  await setSyncState('last_sync', {
    at: new Date().toISOString(),
    from: fromDate, to: toDate, count: list.length,
  });

  return { fetched: list.length, saved };
}

// Backfill completo desde el inicio del plan.
async function backfill(fromDate) {
  const from = fromDate || PLAN_START;
  const to = today();
  const res = await syncRange(from, to);
  await setSyncState('backfill', {
    at: new Date().toISOString(), from, to, count: res.fetched,
  });
  return { ...res, from, to };
}

// Red de seguridad del cron: los ultimos N dias.
async function syncRecent(days = 7) {
  const to = today();
  const from = addDays(to, -days);
  return { ...(await syncRange(from, to)), from, to };
}

module.exports = { syncActivity, syncRange, backfill, syncRecent, epochOf };
