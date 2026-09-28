// Cliente de Strava: OAuth de un solo atleta (yo), refresh automatico del
// token y respeto de los rate limits.
//
// Los tokens viven en la tabla strava_tokens (fila unica id=1) y nunca salen
// del server.

const { admin } = require('../db/supabase-admin');

const API = 'https://www.strava.com/api/v3';
const OAUTH = 'https://www.strava.com/oauth';

// Scope minimo para leer las actividades, incluidas las privadas.
const SCOPE = 'activity:read_all';

// Margen antes del vencimiento para refrescar. Strava da tokens de 6 horas.
const REFRESH_MARGIN_S = 10 * 60;

function clientId() {
  const v = process.env.STRAVA_CLIENT_ID;
  if (!v) throw new Error('Falta la config var STRAVA_CLIENT_ID');
  return v;
}

function clientSecret() {
  const v = process.env.STRAVA_CLIENT_SECRET;
  if (!v) throw new Error('Falta la config var STRAVA_CLIENT_SECRET');
  return v;
}

function redirectUri() {
  const v = process.env.STRAVA_REDIRECT_URI;
  if (!v) throw new Error('Falta la config var STRAVA_REDIRECT_URI');
  return v;
}

// URL a la que mandamos al navegador para que autorice la app.
function authorizeUrl(state) {
  const p = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  });
  return `${OAUTH}/authorize?${p}`;
}

async function readTokens() {
  const { data, error } = await admin
    .from('strava_tokens').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function saveTokens(t) {
  const { error } = await admin.from('strava_tokens').upsert({
    id: 1,
    athlete_id: t.athlete_id || null,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    scope: t.scope || SCOPE,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}

async function isConnected() {
  const t = await readTokens();
  return Boolean(t && t.refresh_token);
}

// Canjea el code del callback por tokens.
async function exchangeCode(code) {
  const res = await fetch(`${OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava rechazó el code (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  await saveTokens({
    athlete_id: json.athlete && json.athlete.id,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: json.expires_at,
    scope: SCOPE,
  });
  return json;
}

async function refresh(tokens) {
  const res = await fetch(`${OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo refrescar el token (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  const next = {
    athlete_id: tokens.athlete_id,
    access_token: json.access_token,
    // Strava puede rotar el refresh token; si no lo manda, se conserva.
    refresh_token: json.refresh_token || tokens.refresh_token,
    expires_at: json.expires_at,
    scope: tokens.scope,
  };
  await saveTokens(next);
  return next;
}

// Devuelve un access_token valido, refrescando si esta por vencer.
async function accessToken() {
  const t = await readTokens();
  if (!t) throw new Error('Strava no está conectado. Entrá a /training/connect.');
  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at - now > REFRESH_MARGIN_S) return t.access_token;
  const next = await refresh(t);
  return next.access_token;
}

// ----------------------------------------------------------- rate limiting

// Strava manda X-RateLimit-Usage / X-RateLimit-Limit como "15min,diario".
// Guardamos el ultimo valor visto solo para loguear y para frenar antes de
// comernos un 429.
let lastUsage = null;

function readRateLimit(res) {
  const usage = res.headers.get('x-ratelimit-usage');
  const limit = res.headers.get('x-ratelimit-limit');
  if (!usage || !limit) return null;
  const [u15, uDay] = usage.split(',').map(Number);
  const [l15, lDay] = limit.split(',').map(Number);
  lastUsage = { u15, uDay, l15, lDay };
  return lastUsage;
}

function getRateLimit() {
  return lastUsage;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET contra la API de Strava, con refresh de token y backoff.
 *
 * Reintenta en 429 (rate limit) y 5xx, con espera exponencial. En 429
 * respeta el minuto que falta para que se reinicie la ventana de 15 min.
 */
async function apiGet(pathname, params = {}, attempt = 0) {
  const token = await accessToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${API}${pathname}${qs ? '?' + qs : ''}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  readRateLimit(res);

  if (res.status === 429) {
    if (attempt >= 3) throw new Error('Strava rate limit: me quedé sin reintentos');
    // La ventana corta es de 15 min y se reinicia en :00, :15, :30, :45.
    const now = new Date();
    const mins = 15 - (now.getMinutes() % 15);
    const waitMs = Math.min(mins * 60000, 60000 * (attempt + 1));
    console.warn(`[strava] 429, esperando ${Math.round(waitMs / 1000)}s`);
    await sleep(waitMs);
    return apiGet(pathname, params, attempt + 1);
  }

  if (res.status >= 500) {
    if (attempt >= 3) throw new Error(`Strava ${res.status} tras 3 reintentos`);
    await sleep(1000 * Math.pow(2, attempt));
    return apiGet(pathname, params, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Strava ${res.status} en ${pathname}: ${await res.text()}`);
  }

  return res.json();
}

async function getActivity(id) {
  return apiGet(`/activities/${id}`);
}

// Pagina /athlete/activities entre dos fechas (epoch segundos).
async function listActivities({ after, before, perPage = 100, onPage }) {
  const all = [];
  for (let page = 1; ; page++) {
    const params = { page, per_page: perPage };
    if (after) params.after = after;
    if (before) params.before = before;

    const batch = await apiGet('/athlete/activities', params);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (onPage) await onPage(batch, page);
    if (batch.length < perPage) break;
  }
  return all;
}

// ------------------------------------------------------------- persistencia

// Campos con geolocalizacion que NO guardamos: la vista es publica y no
// queremos exponer por donde entreno.
const GEO_FIELDS = [
  'map', 'start_latlng', 'end_latlng', 'segment_efforts', 'splits_standard',
  'splits_metric', 'laps', 'best_efforts', 'photos', 'location_city',
  'location_state', 'location_country',
];

function stripGeo(raw) {
  const out = { ...raw };
  for (const f of GEO_FIELDS) delete out[f];
  return out;
}

function toRow(a) {
  return {
    id: a.id,
    sport_type: a.sport_type || a.type || 'Workout',
    start_date_local: a.start_date_local,
    moving_time_s: a.moving_time || 0,
    elapsed_time_s: a.elapsed_time || 0,
    distance_m: a.distance || 0,
    trainer: Boolean(a.trainer),
    average_heartrate: a.average_heartrate != null ? a.average_heartrate : null,
    name: a.name || null,
    raw_json: stripGeo(a),
    updated_at: new Date().toISOString(),
  };
}

async function upsertActivities(activities) {
  if (!activities.length) return 0;
  const rows = activities.map(toRow);
  const { error } = await admin.from('activities').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  return rows.length;
}

async function deleteActivity(id) {
  const { error } = await admin.from('activities').delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  SCOPE, authorizeUrl, exchangeCode, accessToken, refresh,
  readTokens, saveTokens, isConnected,
  apiGet, getActivity, listActivities,
  upsertActivities, deleteActivity, toRow, stripGeo,
  getRateLimit,
};
