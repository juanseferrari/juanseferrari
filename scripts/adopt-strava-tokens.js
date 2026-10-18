#!/usr/bin/env node
// Guarda en la DB un par de tokens de Strava que ya tenés (de las config
// vars STRAVA_ACCESS_TOKEN / STRAVA_REFRESH_TOKEN).
//
//   heroku run npm run strava:adopt
//
// Normalmente NO hace falta: el flujo normal es /training/connect, que hace
// el OAuth y guarda los tokens solo. Esto es para cuando ya los tenés de
// antes y no querés repetir la autorización.
//
// El refresh token es lo único que importa a largo plazo: el access vence
// cada 6 horas y la app lo renueva sola contra la DB. Por eso los tokens
// tienen que vivir en la tabla y no en config vars, que el código no puede
// reescribir.

const strava = require('../src/training/strava');

// Sin este scope Strava devuelve 401 al pedir las actividades.
const NEEDED_SCOPE = 'activity:read_all';

async function main() {
  const refresh = process.env.STRAVA_REFRESH_TOKEN;
  if (!refresh) {
    console.error('Falta STRAVA_REFRESH_TOKEN.');
    console.error('Configurala con: heroku config:set STRAVA_REFRESH_TOKEN=...');
    console.error('O más simple: entrá a /training/connect y hacé el OAuth.');
    process.exit(1);
  }

  console.log('Canjeando el refresh token por un par nuevo…');
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    console.error(`Strava rechazó el refresh (${res.status}).`);
    console.error(JSON.stringify(json));
    console.error('\nSi dice "invalid", el refresh token no corresponde a este ' +
      'client_id. Hacé el OAuth desde /training/connect.');
    process.exit(1);
  }

  // El scope viaja con la autorización: si falta, no hay token que lo arregle.
  if (!String(json.scope || '').includes(NEEDED_SCOPE)) {
    console.error(`\nEste token tiene scope "${json.scope}", le falta ${NEEDED_SCOPE}.`);
    console.error('Con ese scope Strava no deja leer las actividades.');
    console.error('Entrá a /training/connect y aceptá "ver todas tus actividades".');
    process.exit(1);
  }

  const me = await (await fetch('https://www.strava.com/api/v3/athlete', {
    headers: { Authorization: 'Bearer ' + json.access_token },
  })).json();

  await strava.saveTokens({
    athlete_id: me.id,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: json.expires_at,
    scope: json.scope,
  });

  console.log(`Guardado. Atleta ${me.id} (${me.username || me.firstname}).`);
  console.log(`Scope: ${json.scope}`);
  console.log(`El access token vence ${new Date(json.expires_at * 1000).toLocaleString('es-AR')}; se renueva solo.`);
  console.log('\nAhora corré el backfill:  heroku run npm run strava:backfill');
}

main().catch((err) => {
  console.error('Falló:', err.message || err);
  process.exit(1);
});
