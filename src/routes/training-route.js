const express = require('express');
const router = express.Router();

const training = require('../controllers/training-controller');
const strava = require('../controllers/strava-controller');
const authCtl = require('../controllers/auth-controller');
const { attachUser, requireAuth, requireCronSecret } = require('../middleware/auth');
const sync = require('../training/sync');
const { autosyncMiddleware } = require('../training/autosync');

// El webhook de Strava manda JSON y tiene que contestar rapido: va antes de
// cualquier middleware que consulte la DB.
router.get('/api/strava/webhook', strava.webhookVerify);
router.post('/api/strava/webhook', express.json(), strava.webhookEvent);

// De acá para abajo, todo sabe si hay sesión (sin bloquear).
router.use(attachUser);

// --- vistas públicas de solo lectura
//
// autosync dispara un resync en segundo plano si hace +6 h que no
// sincronizamos. No bloquea la respuesta. Es la red de seguridad por si se
// pierde un evento del webhook; reemplaza al cron nocturno.
router.get('/training', autosyncMiddleware, training.week);
router.get('/training/month', autosyncMiddleware, training.month);
router.get('/training/stats', autosyncMiddleware, training.stats);
router.get('/training/guia', training.guia);
router.get('/api/training/session/:id', training.sessionDetail);

// --- login
router.get('/training/login', authCtl.loginForm);
router.post('/training/login', express.urlencoded({ extended: false }), authCtl.sendLink);
router.get('/training/auth/callback', authCtl.callbackBridge);
router.post('/training/auth/session', express.json(), authCtl.createSession);
router.post('/training/logout', authCtl.logout);

// --- protegido
router.get('/training/connect', requireAuth, strava.connect);
router.get('/training/connect/callback', strava.callback);
router.post('/api/training/override', requireAuth, express.json(), training.override);

router.post('/api/training/backfill', requireAuth, async (req, res, next) => {
  try {
    const r = await sync.backfill();
    res.send(`<p>Listo: ${r.fetched} actividades entre ${r.from} y ${r.to}.</p>
      <p><a href="/training">Ver el calendario</a></p>`);
  } catch (err) { next(err); }
});

// --- cron (opcional): lo mismo que hace autosync, pero disparable desde
// afuera. Queda por si alguna vez conviene un Scheduler de verdad.
router.get('/api/training/cron/sync', requireCronSecret, async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 7;
    const r = await sync.syncRecent(days);
    res.json({ ok: true, ...r });
  } catch (err) { next(err); }
});

module.exports = router;
