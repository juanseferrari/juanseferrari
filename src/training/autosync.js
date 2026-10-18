// Sync oportunista: cuando alguien entra al calendario, si hace rato que no
// sincronizamos, disparamos un resync en segundo plano.
//
// Reemplaza al cron. El webhook de Strava ya avisa en el momento, asi que
// esto es la red de seguridad para cuando se pierde un evento (o cuando la
// suscripcion se cae y nadie se entera).
//
// Reglas:
//  - NO bloquea la respuesta: la pagina se sirve igual de rapido.
//  - Un solo sync a la vez (lock en memoria): recargar diez veces no dispara
//    diez syncs.
//  - El "hace cuanto" se guarda en la DB, no en memoria, porque Heroku duerme
//    el dyno y lo reinicia: en memoria se perderia en cada arranque.

const { getSyncState, setSyncState } = require('./queries');

// Cada cuanto, como mucho, re-sincronizamos por visita.
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Cuantos dias hacia atras mira el resync.
const DAYS_BACK = 7;

// Si un sync queda colgado, no bloqueamos para siempre.
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

let running = false;
let runningSince = 0;

// Cache del ultimo chequeo para no pegarle a la DB en cada request.
let lastCheck = 0;
let lastKnownSync = null;
const CHECK_CACHE_MS = 60 * 1000;

function locked() {
  if (!running) return false;
  if (Date.now() - runningSince > LOCK_TIMEOUT_MS) {
    // El anterior quedo colgado; soltamos el lock.
    running = false;
    return false;
  }
  return true;
}

async function shouldSync() {
  const now = Date.now();

  if (now - lastCheck < CHECK_CACHE_MS && lastKnownSync !== null) {
    return now - lastKnownSync > MIN_INTERVAL_MS;
  }

  const state = await getSyncState('last_sync');
  lastCheck = now;
  lastKnownSync = state && state.at ? new Date(state.at).getTime() : 0;
  return now - lastKnownSync > MIN_INTERVAL_MS;
}

// Dispara el sync si corresponde. No espera el resultado ni lanza: un fallo
// de Strava no puede romper la vista del calendario.
function maybeSync() {
  if (locked()) return;

  // El lock se toma ACA, sincronicamente, antes de cualquier await. Si se
  // tomara despues del primer await, diez requests seguidos pasarian todos
  // el chequeo antes de que el primero lo marque, y saldrian diez syncs.
  running = true;
  runningSince = Date.now();

  // Arrancamos sin await a proposito: el handler sigue y responde.
  (async () => {
    try {
      if (!(await shouldSync())) return;

      // Solo si Strava esta conectado; si no, no tiene sentido intentarlo.
      const strava = require('./strava');
      if (!(await strava.isConnected())) return;

      const sync = require('./sync');
      const r = await sync.syncRecent(DAYS_BACK);
      lastKnownSync = Date.now();
      console.log(`[autosync] ${r.fetched} actividades entre ${r.from} y ${r.to}`);
    } catch (err) {
      // Queda logueado y se reintenta en la proxima visita.
      console.error('[autosync] falló:', err.message || err);
      // Marcamos el intento para no reintentar en loop si Strava esta caido.
      try {
        await setSyncState('last_sync_error', {
          at: new Date().toISOString(), message: String(err.message || err),
        });
      } catch { /* si ni eso anda, no hay nada que hacer */ }
      lastKnownSync = Date.now();
    } finally {
      running = false;
    }
  })();
}

// Middleware: dispara y sigue de largo.
function autosyncMiddleware(_req, _res, next) {
  maybeSync();
  next();
}

module.exports = { maybeSync, autosyncMiddleware, MIN_INTERVAL_MS, DAYS_BACK };
