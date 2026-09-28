#!/usr/bin/env node
// Trae las actividades de Strava desde el inicio del plan (o desde la fecha
// que le pases) y las guarda. Idempotente: se puede correr las veces que
// haga falta.
//
//   node scripts/backfill-strava.js
//   node scripts/backfill-strava.js 2026-10-01

const { backfill } = require('../src/training/sync');
const { isIsoDate } = require('../src/training/dates');
const { getRateLimit } = require('../src/training/strava');

async function main() {
  const from = process.argv[2];
  if (from && !isIsoDate(from)) {
    console.error('Fecha inválida. Usá YYYY-MM-DD.');
    process.exit(1);
  }

  console.log('Trayendo actividades' + (from ? ' desde ' + from : '') + '…');
  const res = await backfill(from);
  console.log(`${res.fetched} actividades entre ${res.from} y ${res.to}, ${res.saved} guardadas.`);

  const rl = getRateLimit();
  if (rl) console.log(`Rate limit: ${rl.u15}/${rl.l15} en 15 min, ${rl.uDay}/${rl.lDay} hoy.`);
}

main().catch((err) => {
  console.error('Falló el backfill:', err.message || err);
  process.exit(1);
});
