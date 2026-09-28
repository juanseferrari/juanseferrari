const { createClient } = require('@supabase/supabase-js');

// Cliente con service role, para las escrituras del lado del server (seed,
// webhook de Strava, backfill, overrides). Ignora RLS, asi que NUNCA se
// expone al cliente ni se usa en una ruta publica sin auth.
//
// La anon key de src/db/supabase.js alcanza para las lecturas publicas.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function assertConfigured() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
  if (missing.length) {
    throw new Error(
      'Faltan las config vars ' + missing.join(' y ') + '. ' +
      'Configuralas con: heroku config:set ' + missing.join('=... ') + '=...'
    );
  }
}

let client = null;
function getAdmin() {
  if (!client) {
    assertConfigured();
    client = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// Mismo patron perezoso que el cliente anon: si falta la key solo fallan las
// rutas que escriben, no arranca roto el sitio entero.
const admin = new Proxy({}, {
  get(_t, prop) {
    const c = getAdmin();
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});

module.exports = { admin, getAdmin };
