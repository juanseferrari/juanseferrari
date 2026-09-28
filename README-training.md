# Training 70.3 — `/training`

Calendario del plan de Ironman 70.3 (domingo **7 de marzo de 2027**) que se
cruza automáticamente con las actividades de Strava para marcar qué sesiones
hice y cuáles no.

La vista es **pública de solo lectura**. Conectar Strava, correr el backfill y
marcar overrides requieren estar logueado.

Zona horaria: `America/Argentina/Buenos_Aires`. Todo lo que sea "qué día fue"
usa `start_date_local` de Strava, nunca UTC.

---

## Cómo está armado

```
data/plan-70-3.json              el plan, generado (no editar a mano salvo retoques puntuales)
scripts/generate-plan.js         genera el JSON desde plan-config.js
scripts/seed-plan.js             carga el JSON en la DB (upsert por id)
scripts/backfill-strava.js       trae actividades históricas
scripts/strava-subscription.js   crea / lista / borra el webhook

src/training/plan-config.js      TODAS las constantes editables del plan
src/training/matching.js         cruce plan ↔ actividades (función pura, con tests)
src/training/strava.js           OAuth, refresh, rate limit
src/training/sync.js             backfill / webhook / cron comparten esto
src/training/queries.js          acceso a Supabase
src/training/layout.js           estilos y layout compartido
src/training/dates.js            fechas como string, sin líos de UTC

src/controllers/training-controller.js   semana, mes, stats, guía, overrides
src/controllers/strava-controller.js     OAuth y webhook
src/controllers/auth-controller.js       magic link
src/middleware/auth.js                   sesión y guards
src/routes/training-route.js             todas las rutas
```

### Rutas

| Ruta | Auth | Qué hace |
|---|---|---|
| `GET /training` | pública | vista semana (default: la actual) |
| `GET /training/month` | pública | grilla del mes |
| `GET /training/stats` | pública | cumplimiento y horas por disciplina |
| `GET /training/guia` | pública | zonas de FC y glosario |
| `GET /api/training/session/:id` | pública | detalle para el bottom sheet |
| `GET /training/login` | — | pide el magic link |
| `GET /training/connect` | 🔒 | inicia el OAuth de Strava |
| `POST /api/training/override` | 🔒 | marcar hecha / saltear / vincular |
| `POST /api/training/backfill` | 🔒 | trae actividades históricas |
| `GET /api/strava/webhook` | — | verificación (`hub.challenge`) |
| `POST /api/strava/webhook` | — | eventos de actividad |
| `GET /api/training/cron/sync` | `CRON_SECRET` | resync de los últimos 7 días |

---

## Variables de entorno

Están todas documentadas en [`.env.example`](.env.example). En Heroku:

```sh
heroku config:set SUPABASE_SERVICE_KEY=sb_secret_...
heroku config:set TRAINING_EMAIL=vos@ejemplo.com
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set SITE_URL=https://www.juanseferrari.com
heroku config:set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...
heroku config:set STRAVA_REDIRECT_URI=https://www.juanseferrari.com/training/connect/callback
heroku config:set STRAVA_VERIFY_TOKEN=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
heroku config:set STRAVA_WEBHOOK_URL=https://www.juanseferrari.com/api/strava/webhook
heroku config:set CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
```

`SUPABASE_URL` y `SUPABASE_KEY` ya estaban configuradas para `/weight/new`.

---

## Configurar la app en Strava

1. Entrá a <https://www.strava.com/settings/api> y creá la aplicación.
2. **Authorization Callback Domain**: `www.juanseferrari.com`
   (solo el dominio: sin `https://`, sin path).
3. Copiá *Client ID* y *Client Secret* a las config vars.
4. Deployá, entrá a `/training/connect` y autorizá. Hay que aceptar el
   permiso de **ver todas las actividades** (`activity:read_all`), si no las
   privadas no se ven.

### Webhook

Strava permite **una sola** suscripción por aplicación, y al crearla te pega
un GET de verificación en el momento: la app tiene que estar deployada.

```sh
# con las config vars cargadas en el ambiente local:
npm run strava:subscription list
npm run strava:subscription create
npm run strava:subscription delete <id>
```

Para correrlo con las vars de Heroku sin copiarlas a mano:

```sh
heroku run npm run strava:subscription create
```

---

## Cargar y re-seedear el plan

El plan **no se edita a mano**: se edita `src/training/plan-config.js` (los
volúmenes semanales, la semana tipo, la progresión de la bici larga, etc.) y
se regenera.

```sh
npm run plan:generate        # reescribe data/plan-70-3.json
npm run plan:seed            # upsert en la DB (idempotente)
npm run plan:seed -- --dry   # muestra qué haría, sin escribir
npm run plan:seed -- --prune # además borra lo que ya no esté en el JSON
```

El seed es un upsert por `id`, así que correrlo dos veces no duplica nada.
Los ids son estables (`w05-tue-swim`), o sea que re-seedear **no pierde los
overrides** mientras no cambien los ids.

`--prune` sí borra los overrides de las sesiones que desaparecieron, porque
`session_overrides` tiene FK con `on delete cascade`.

Para correr el seed contra producción:

```sh
heroku run npm run plan:seed
```

### Qué se puede tocar en `plan-config.js`

| Constante | Qué controla |
|---|---|
| `WEEKS` | el volumen semanal (natación en m, bici y trote en min) |
| `WEEK_TEMPLATE` | qué sesión va cada día de la semana |
| `VOLUME_SPLIT` | cómo se reparte el volumen (la bici larga se lleva 45%, el trote largo 40%) |
| `BIKE_LONG_PROGRESSION` | minutos de la bici larga por semana (interpola entre los puntos) |
| `RUN_LONG_MAX_MIN` | techo del trote largo (hoy 105') |
| `SWIM_RAMP` | cuántas natas por semana en la pre-base |
| `BRICK` | desde qué semana, cada cuánto y cuánto trota |
| `CLEAT_TECHNIQUE_WEEKS` | en qué semanas la bici larga lleva nota de calas |
| `TEST_RACES` | los triatlones de prueba (semanas 12 y 16) |

El generador valida lo que produce: ids únicos, todos los días cubiertos
entre el inicio y la carrera, la carrera en domingo, y los bricks con sus dos
partes. Si algo no cierra, falla en vez de escribir el archivo.

---

## Backfill

Trae las actividades desde el inicio del plan (28/9/2026). Es idempotente.

```sh
npm run strava:backfill              # desde el inicio del plan
npm run strava:backfill 2026-11-01   # desde una fecha
heroku run npm run strava:backfill
```

También está el botón en `/training/connect`.

## Cron nocturno

Red de seguridad por si se pierde un webhook: re-sincroniza los últimos 7
días. Con Heroku Scheduler, todos los días a la madrugada:

```sh
curl -s "https://www.juanseferrari.com/api/training/cron/sync?secret=$CRON_SECRET"
```

---

## Cómo se decide si una sesión está hecha

En `src/training/matching.js`, función pura y con tests (`npm test`).

**Deportes que cuentan:**

| Plan | `sport_type` de Strava |
|---|---|
| swim | `Swim`, `OpenWaterSwim` |
| bike | `Ride`, `VirtualRide`, `GravelRide`, `MountainBikeRide` (no `EBikeRide`) |
| run | `Run`, `TrailRun`, `VirtualRun` |
| brick | un ride seguido de un run el mismo día, con < 20' de hueco |

`Soccer`, `WeightTraining`, `Workout`, etc. no cumplen nada: aparecen como
"extra" del día.

**Métrica:** duración (`moving_time_s`), porque muchas bicis son en rodillo
con distancia 0. En natación, si hay `target_distance_m`, se usa distancia.
Varias actividades del mismo deporte el mismo día se suman.

**Estados:** `done` ≥ 80%, `partial` 50–79%, `missed` < 50% en fecha pasada,
`moved` si se hizo ±1 día, `today`, `upcoming`, `rest`, `skipped`.

Cada actividad se asigna **a lo sumo a una** sesión. La asignación va en dos
pasadas: primero todas las sesiones reclaman lo del mismo día, y recién
después las que quedaron vacías miran ±1 día. Entre sesiones del mismo día,
las clave eligen primero.

**El override manual siempre gana** sobre el cálculo automático.

---

## Tests

```sh
npm test
```

Cubren rodillo sin distancia, dos trotes el mismo día, sesión movida, brick
(con y sin transición), actividad no deportiva, `EBikeRide`, los tres tipos
de override, umbrales, y que una actividad no se cuente dos veces.

---

## Privacidad

El calendario es público, así que:

- **No se guardan** `map`, polylines, `start_latlng`, `end_latlng`, ni
  `location_*`. Se filtran en `stripGeo()` antes de escribir.
- La anon key **no puede leer** `activities` (la tabla cruda con `raw_json`),
  `strava_tokens` ni `sync_state`: se les revocaron los grants. Lo público
  sale de la vista `activities_public`.
- Los tokens de Strava viven solo en la DB, del lado del server.
