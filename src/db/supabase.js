const { createClient } = require('@supabase/supabase-js');

// Proyecto Supabase dedicado a training (separado de Maneki, que tiene datos
// financieros). Las credenciales van por config vars de Heroku; no hay
// fallback hardcodeado para poder rotar la key sin tocar el codigo.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// createClient explota con un mensaje opaco si faltan las credenciales, y
// como esto se requiere al levantar el server se caeria el sitio entero.
// Mejor un error que diga exactamente que falta.
function assertConfigured() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('SUPABASE_KEY');
  if (missing.length) {
    throw new Error(
      'Faltan las config vars ' + missing.join(' y ') + '. ' +
      'Configuralas con: heroku config:set ' + missing.join('=... ') + '=...'
    );
  }
}

// Cliente perezoso: si faltan las vars, solo falla /weight/new (que lo usa)
// en vez de tumbar el resto del sitio al arrancar.
let client = null;
function getClient() {
  if (!client) {
    assertConfigured();
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
  }
  return client;
}

// Proxy para que los consumidores sigan usando `supabase.from(...)` igual
// que antes, sin enterarse de que la creacion es diferida.
const supabase = new Proxy({}, {
  get: function (_target, prop) {
    const c = getClient();
    const value = c[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  }
});

module.exports = { supabase, getClient };
