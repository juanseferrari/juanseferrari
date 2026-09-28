// OAuth y webhook de Strava.

const crypto = require('crypto');
const strava = require('../training/strava');
const sync = require('../training/sync');
const { setSyncState, getSyncState } = require('../training/queries');
const { page, escapeHtml } = require('../training/layout');

// El state del OAuth se firma con SESSION_SECRET y lleva un timestamp, asi
// no hace falta guardarlo en ningun lado para validarlo a la vuelta.
function makeState() {
  const payload = String(Date.now());
  const mac = crypto.createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload).digest('base64url');
  return payload + '.' + mac;
}

function checkState(state) {
  if (typeof state !== 'string') return false;
  const i = state.lastIndexOf('.');
  if (i < 0) return false;
  const payload = state.slice(0, i);
  const mac = state.slice(i + 1);
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  // El state vale 15 minutos.
  return Date.now() - Number(payload) < 15 * 60 * 1000;
}

const stravaController = {
  // GET /training/connect  (protegido)
  connect: async (req, res) => {
    try {
      const connected = await strava.isConnected();
      const tokens = connected ? await strava.readTokens() : null;
      const last = await getSyncState('last_sync');

      res.send(page({
        title: 'Conectar Strava',
        user: req.user,
        body: `
          <div class="card pad">
            <h1>Strava</h1>
            ${connected ? `
              <p class="ok">Conectado${tokens && tokens.athlete_id ? ' (atleta ' + tokens.athlete_id + ')' : ''}.</p>
              <p class="muted">Última sincronización: ${last && last.at ? escapeHtml(new Date(last.at).toLocaleString('es-AR')) : 'nunca'}.</p>
              <form method="POST" action="/api/training/backfill">
                <button type="submit">Traer actividades (backfill)</button>
              </form>
              <p class="muted small">Volver a conectar renueva los permisos sin perder nada.</p>
            ` : `
              <p class="muted">Todavía no está conectado. Autorizá el acceso de solo lectura a tus actividades.</p>
            `}
            <a class="btn strava" href="${escapeHtml(strava.authorizeUrl(makeState()))}">
              ${connected ? 'Volver a conectar' : 'Conectar con Strava'}
            </a>
            <a class="back" href="/training">← Volver al calendario</a>
          </div>`,
      }));
    } catch (err) {
      res.status(500).send(page({
        title: 'Conectar Strava', user: req.user,
        body: `<div class="card pad"><h1>Strava</h1>
          <p class="bad">${escapeHtml(err.message)}</p>
          <a class="back" href="/training">← Volver</a></div>`,
      }));
    }
  },

  // GET /training/connect/callback
  callback: async (req, res) => {
    const { code, state, error, scope } = req.query;

    if (error) {
      return res.status(400).send(page({
        title: 'Strava', user: req.user,
        body: `<div class="card pad"><h1>No se autorizó</h1>
          <p class="bad">Strava devolvió: ${escapeHtml(String(error))}</p>
          <a class="back" href="/training/connect">← Probar de nuevo</a></div>`,
      }));
    }

    if (!checkState(state)) {
      return res.status(400).send(page({
        title: 'Strava', user: req.user,
        body: `<div class="card pad"><h1>Link vencido</h1>
          <p class="bad">El pedido de autorización no es válido o ya venció.</p>
          <a class="back" href="/training/connect">← Empezar de nuevo</a></div>`,
      }));
    }

    // Sin activity:read_all no vemos las actividades privadas.
    if (scope && !String(scope).includes('activity:read_all')) {
      return res.status(400).send(page({
        title: 'Strava', user: req.user,
        body: `<div class="card pad"><h1>Faltan permisos</h1>
          <p class="bad">Hay que aceptar el permiso de ver todas las actividades.</p>
          <a class="back" href="/training/connect">← Probar de nuevo</a></div>`,
      }));
    }

    try {
      await strava.exchangeCode(code);
      res.send(page({
        title: 'Strava conectado', user: req.user,
        body: `<div class="card pad"><h1>Listo</h1>
          <p class="ok">Strava quedó conectado.</p>
          <form method="POST" action="/api/training/backfill">
            <button type="submit">Traer mis actividades</button>
          </form>
          <a class="back" href="/training">← Ir al calendario</a></div>`,
      }));
    } catch (err) {
      res.status(500).send(page({
        title: 'Strava', user: req.user,
        body: `<div class="card pad"><h1>Falló la conexión</h1>
          <p class="bad">${escapeHtml(err.message)}</p>
          <a class="back" href="/training/connect">← Probar de nuevo</a></div>`,
      }));
    }
  },

  // GET /api/strava/webhook  — verificacion de la suscripcion.
  webhookVerify: (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
      return res.json({ 'hub.challenge': challenge });
    }
    res.status(403).json({ error: 'verify_token inválido' });
  },

  // POST /api/strava/webhook  — eventos de actividad.
  //
  // Strava reintenta si no respondemos rapido, asi que contestamos 200 al
  // toque y procesamos despues.
  webhookEvent: (req, res) => {
    res.status(200).send('ok');

    const event = req.body || {};
    setImmediate(async () => {
      try {
        await handleEvent(event);
      } catch (err) {
        console.error('[strava webhook] fallo procesando el evento:', err.message || err);
      }
    });
  },
};

async function handleEvent(event) {
  const { object_type: type, object_id: id, aspect_type: aspect } = event;

  if (type !== 'activity') {
    // Los eventos de athlete (deauthorize) no nos cambian nada del plan.
    if (type === 'athlete' && event.updates && event.updates.authorized === 'false') {
      console.warn('[strava webhook] la app fue desautorizada');
      await setSyncState('deauthorized_at', { at: new Date().toISOString() });
    }
    return;
  }

  if (aspect === 'delete') {
    await strava.deleteActivity(id);
    console.log(`[strava webhook] actividad ${id} borrada`);
  } else {
    const detail = await sync.syncActivity(id);
    console.log(`[strava webhook] actividad ${id} (${aspect}) guardada: ${detail.sport_type}`);
  }

  await setSyncState('last_webhook', {
    at: new Date().toISOString(), id, aspect,
  });
  // El recalculo del matcheo es puro y se hace al renderizar, asi que no hay
  // nada que recalcular y guardar: con la actividad en la DB alcanza.
}

module.exports = stravaController;
