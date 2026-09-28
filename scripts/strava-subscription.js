#!/usr/bin/env node
// Administra la push subscription (webhook) de Strava.
//
//   node scripts/strava-subscription.js list
//   node scripts/strava-subscription.js create
//   node scripts/strava-subscription.js delete <id>
//
// Strava permite UNA sola suscripcion por aplicacion. Si create devuelve
// "already exists", corré list y borrá la vieja primero.
//
// Para crear, Strava hace un GET de verificacion contra callback_url en el
// momento: la app tiene que estar deployada y respondiendo.

const BASE = 'https://www.strava.com/api/v3/push_subscriptions';

function creds() {
  const client_id = process.env.STRAVA_CLIENT_ID;
  const client_secret = process.env.STRAVA_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    throw new Error('Faltan STRAVA_CLIENT_ID y/o STRAVA_CLIENT_SECRET');
  }
  return { client_id, client_secret };
}

async function list() {
  const p = new URLSearchParams(creds());
  const res = await fetch(`${BASE}?${p}`);
  const body = await res.text();
  if (!res.ok) throw new Error(`Strava ${res.status}: ${body}`);
  const subs = JSON.parse(body);
  if (!subs.length) return console.log('No hay suscripciones.');
  for (const s of subs) {
    console.log(`  id=${s.id}  ${s.callback_url}  (creada ${s.created_at})`);
  }
}

async function create() {
  const callback = process.env.STRAVA_WEBHOOK_URL;
  const verify = process.env.STRAVA_VERIFY_TOKEN;
  if (!callback) throw new Error('Falta STRAVA_WEBHOOK_URL (ej https://www.juanseferrari.com/api/strava/webhook)');
  if (!verify) throw new Error('Falta STRAVA_VERIFY_TOKEN');

  console.log(`Creando suscripción para ${callback}…`);
  console.log('(Strava va a pegarle un GET de verificación ahora mismo)');

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...creds(), callback_url: callback, verify_token: verify,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Strava ${res.status}: ${body}`);
  console.log('Creada:', body);
}

async function remove(id) {
  if (!id) throw new Error('Falta el id. Corré primero: list');
  const p = new URLSearchParams({ ...creds() });
  const res = await fetch(`${BASE}/${id}?${p}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Strava ${res.status}: ${await res.text()}`);
  }
  console.log(`Suscripción ${id} borrada.`);
}

const cmd = process.argv[2];
const fn = cmd === 'list' ? list
  : cmd === 'create' ? create
  : cmd === 'delete' ? () => remove(process.argv[3])
  : null;

if (!fn) {
  console.error('Uso: node scripts/strava-subscription.js list|create|delete <id>');
  process.exit(1);
}

fn().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
