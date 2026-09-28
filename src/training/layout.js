// Layout y estilos compartidos de /training. Mobile-first: se disena para
// ~380px y se ensancha en desktop.

const { FC_MAX, ZONES, PHASE_COLORS } = require('./plan-config');

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Iconos por deporte. Se acompanan siempre de texto: el estado no se
// comunica solo con color ni solo con icono.
const SPORT_ICON = {
  swim: '🏊', bike: '🚴', run: '🏃', brick: '🚴🏃',
  strength: '💪', race: '🏁',
};

const SPORT_NAME = {
  swim: 'Natación', bike: 'Bici', run: 'Trote', brick: 'Brick',
  strength: 'Descanso', race: 'Carrera',
};

// Cada estado lleva color + icono + texto, para no depender del color solo.
const STATUS = {
  done:     { label: 'Hecha',      icon: '✓', cls: 'st-done' },
  partial:  { label: 'Parcial',    icon: '◐', cls: 'st-partial' },
  moved:    { label: 'Movida',     icon: '→', cls: 'st-moved' },
  missed:   { label: 'No hecha',   icon: '✕', cls: 'st-missed' },
  today:    { label: 'Hoy',        icon: '●', cls: 'st-today' },
  upcoming: { label: 'Pendiente',  icon: '·', cls: 'st-upcoming' },
  rest:     { label: 'Descanso',   icon: '—', cls: 'st-rest' },
  skipped:  { label: 'Salteada',   icon: '⊘', cls: 'st-skipped' },
};

const CSS = `
:root {
  color-scheme: light dark;
  --bg:#f8f8f6; --card:#fff; --fg:#1a1a1a; --muted:#8a8a85;
  --line:#e6e6e2; --line-soft:#f0f0ec;
  --accent:#1D9E75;
  --done:#1D9E75; --partial:#D99A25; --missed:#C6503C;
  --moved:#1D9E75; --upcoming:#b9b9b4; --today:#185FA5;
  --chip:#f1f1ef;
  --safe-b: env(safe-area-inset-bottom, 0px);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#131314; --card:#1c1c1e; --fg:#ececec; --muted:#8e8e93;
    --line:#2c2c2e; --line-soft:#242426;
    --accent:#2ECC96;
    --done:#2ECC96; --partial:#E8B04B; --missed:#E0705C;
    --moved:#2ECC96; --upcoming:#48484a; --today:#4A9EE8;
    --chip:#2c2c2e;
  }
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin:0; padding:0; }
body {
  background: var(--bg); color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px; line-height: 1.45;
  padding-bottom: calc(72px + var(--safe-b));
  overflow-x: hidden;
}
a { color: inherit; }
.wrap { max-width: 640px; margin: 0 auto; padding: 0 16px; }

/* --- nav inferior, al alcance del pulgar --- */
.tabbar {
  position: fixed; left:0; right:0; bottom:0; z-index:20;
  display:flex; background: var(--card);
  border-top:.5px solid var(--line);
  padding-bottom: var(--safe-b);
}
.tabbar a {
  flex:1; text-align:center; padding:11px 4px 9px;
  font-size:11px; color:var(--muted); text-decoration:none;
  min-height:44px;
}
.tabbar a .ico { display:block; font-size:19px; line-height:1.15; }
.tabbar a.on { color: var(--accent); font-weight:600; }

/* --- countdown --- */
.countdown {
  text-align:center; padding:18px 16px 12px;
}
.countdown .n { font-size:40px; font-weight:700; letter-spacing:-.03em; line-height:1; }
.countdown .l { font-size:13px; color:var(--muted); margin-top:4px; }

/* --- header de semana --- */
.weekhead {
  background: var(--card); border:.5px solid var(--line);
  border-radius:14px; padding:14px 16px; margin-bottom:14px;
}
.weekhead .top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.weekhead h2 { margin:0; font-size:17px; font-weight:600; }
.weekhead .dates { font-size:12.5px; color:var(--muted); margin-top:2px; }
.badge {
  display:inline-block; font-size:11px; font-weight:600;
  padding:3px 9px; border-radius:999px; color:#fff; white-space:nowrap;
}
.badge.rec { background:#8A6FC4; }
.bars { margin-top:12px; display:grid; gap:8px; }
.bar-row { display:grid; grid-template-columns:56px 1fr auto; gap:9px; align-items:center; font-size:12px; }
.bar-row .nm { color:var(--muted); }
.bar { height:7px; background:var(--line-soft); border-radius:99px; overflow:hidden; }
.bar > i { display:block; height:100%; border-radius:99px; background:var(--accent); }
.bar-row .v { color:var(--muted); font-variant-numeric:tabular-nums; font-size:11.5px; }

/* --- navegacion de semanas --- */
.weeknav { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 12px; }
.weeknav a, .weeknav span.sp {
  min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center;
  background:var(--card); border:.5px solid var(--line); border-radius:11px;
  text-decoration:none; font-size:17px; color:var(--fg);
}
.weeknav a[aria-disabled="true"] { opacity:.3; pointer-events:none; }
.weeknav .mid { flex:1; text-align:center; font-size:13px; color:var(--muted); }

/* --- dia --- */
.day { margin-bottom:12px; }
.day > h3 {
  margin:0 0 6px; font-size:12px; font-weight:600; color:var(--muted);
  text-transform:uppercase; letter-spacing:.055em;
  display:flex; align-items:baseline; gap:7px;
}
.day.is-today > h3 { color:var(--today); }
.day.is-today > h3::after {
  content:"HOY"; font-size:10px; background:var(--today); color:#fff;
  padding:1px 6px; border-radius:999px; letter-spacing:.04em;
}

/* --- sesion --- */
.ses {
  display:block; width:100%; text-align:left;
  background:var(--card); border:.5px solid var(--line);
  border-left:3px solid var(--upcoming);
  border-radius:12px; padding:11px 13px; margin-bottom:7px;
  min-height:44px; font:inherit; color:inherit; cursor:pointer;
}
.ses:active { background:var(--line-soft); }
.ses .r1 { display:flex; align-items:center; gap:9px; }
.ses .ico { font-size:17px; flex-shrink:0; }
.ses .tt { flex:1; font-weight:600; font-size:14.5px; }
.ses .st {
  font-size:11px; font-weight:600; white-space:nowrap;
  display:flex; align-items:center; gap:3px;
}
.ses .r2 {
  margin-top:3px; padding-left:26px;
  font-size:12.5px; color:var(--muted);
  font-variant-numeric:tabular-nums;
}
.ses.st-done    { border-left-color:var(--done); }
.ses.st-done .st,    .ses.st-moved .st { color:var(--done); }
.ses.st-partial { border-left-color:var(--partial); }
.ses.st-partial .st { color:var(--partial); }
.ses.st-missed  { border-left-color:var(--missed); }
.ses.st-missed .st  { color:var(--missed); }
.ses.st-moved   { border-left-color:var(--moved); }
.ses.st-today   { border-left-color:var(--today); border-color:var(--today); border-width:1px; border-left-width:3px; }
.ses.st-today .st   { color:var(--today); }
.ses.st-upcoming .st{ color:var(--upcoming); }
.ses.st-rest    { border-left-color:var(--line); opacity:.72; }
.ses.st-rest .st{ color:var(--muted); }
.ses.st-skipped { border-left-color:var(--muted); }
.ses.st-skipped .st { color:var(--muted); }
.ses.key .tt::after {
  content:"★"; color:var(--partial); font-size:11px; margin-left:5px;
  vertical-align:top;
}
.extra {
  font-size:12px; color:var(--muted); padding:6px 13px;
  border:.5px dashed var(--line); border-radius:10px; margin-bottom:7px;
}

/* --- vista mes --- */
.month { background:var(--card); border:.5px solid var(--line); border-radius:14px; padding:12px; }
.mgrid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
.mgrid .dow { text-align:center; font-size:10px; color:var(--muted); padding-bottom:5px; }
.mcell {
  aspect-ratio:1; border-radius:9px; background:var(--line-soft);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:2px; font-size:11px; text-decoration:none; color:var(--fg);
  min-height:40px; border:1px solid transparent;
}
.mcell.out { opacity:.25; }
.mcell.today { border-color:var(--today); }
.mcell .dots { display:flex; gap:2px; }
.mcell .dot { width:5px; height:5px; border-radius:50%; background:var(--upcoming); }
.mcell .dot.done { background:var(--done); }
.mcell .dot.partial { background:var(--partial); }
.mcell .dot.missed { background:var(--missed); }
.mcell .dot.rest { background:transparent; }

/* --- bottom sheet --- */
.sheet-bg {
  position:fixed; inset:0; background:rgba(0,0,0,.45);
  display:none; z-index:40; align-items:flex-end;
}
.sheet-bg.open { display:flex; }
.sheet {
  background:var(--card); width:100%; max-height:88vh; overflow:auto;
  border-radius:18px 18px 0 0; padding:8px 18px calc(24px + var(--safe-b));
  animation: up .18s ease-out;
}
@media (min-width:640px) {
  .sheet-bg { align-items:center; justify-content:center; }
  .sheet { max-width:560px; border-radius:16px; }
}
@keyframes up { from { transform:translateY(14px); opacity:.7 } to { transform:none; opacity:1 } }
.sheet .grab { width:36px; height:4px; background:var(--line); border-radius:99px; margin:6px auto 12px; }
.sheet h3 { margin:0 0 3px; font-size:18px; }
.sheet .sub { color:var(--muted); font-size:13px; margin:0 0 14px; }
.sheet .desc { font-size:14px; line-height:1.55; margin:0 0 14px; white-space:pre-wrap; }
.sheet .kv { display:flex; justify-content:space-between; padding:9px 0; border-bottom:.5px solid var(--line-soft); font-size:13.5px; }
.sheet .kv .k { color:var(--muted); }
.sheet .kv .v { font-variant-numeric:tabular-nums; font-weight:600; }
.sheet h4 { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin:18px 0 7px; }
.act { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 0; border-bottom:.5px solid var(--line-soft); font-size:13.5px; }
.act a { color:var(--today); text-decoration:none; font-size:12px; }

/* --- botones --- */
.btn, button.act-btn {
  display:flex; align-items:center; justify-content:center; gap:8px;
  min-height:44px; padding:12px 16px; border-radius:11px; border:0;
  background:var(--accent); color:#fff; font-size:15px; font-weight:600;
  font-family:inherit; text-decoration:none; cursor:pointer; width:100%;
  margin-top:9px;
}
button.act-btn.ghost, .btn.ghost {
  background:transparent; border:.5px solid var(--line); color:var(--fg);
}
.btn.strava { background:#FC4C02; }
.btn:active, button.act-btn:active { filter:brightness(.93); }
.row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.row2 > * { margin-top:9px; }

/* --- misc --- */
.card { background:var(--card); border:.5px solid var(--line); border-radius:14px; }
.card.pad { padding:20px 18px; margin:16px 0; }
h1 { font-size:21px; font-weight:600; margin:0 0 12px; }
.muted { color:var(--muted); }
.small { font-size:12px; }
.ok { color:var(--done); }
.bad { color:var(--missed); }
.back { display:block; text-align:center; margin-top:18px; font-size:13px; color:var(--muted); text-decoration:none; }
input[type=email], input[type=text] {
  width:100%; padding:13px; border:1px solid var(--line); border-radius:10px;
  font-size:16px; background:var(--bg); color:var(--fg); font-family:inherit;
  margin-bottom:10px;
}
.stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
.stat { background:var(--card); border:.5px solid var(--line); border-radius:12px; padding:11px 9px; text-align:center; }
.stat .n { font-size:19px; font-weight:700; font-variant-numeric:tabular-nums; }
.stat .l { font-size:10.5px; color:var(--muted); margin-top:2px; line-height:1.25; }
.zone { border-radius:9px; padding:9px 12px; color:#fff; font-size:12px; margin-bottom:6px; }
.zone b { display:block; font-size:13px; }
.legend { display:flex; flex-wrap:wrap; gap:10px; font-size:11.5px; color:var(--muted); margin:10px 0 0; }
.legend i { font-style:normal; }
`;

// El layout base. `user` decide si se muestran las acciones de override.
function page({ title, body, user, active, scripts = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Training">
<meta name="theme-color" content="#1D9E75" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131314" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/icons/weight-192.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8F%8A%3C/text%3E%3C/svg%3E">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="Camino al Ironman 70.3 — 7 de marzo de 2027.">
<style>${CSS}</style>
</head>
<body>
${body}
${active ? tabbar(active, user) : ''}
${scripts}
</body>
</html>`;
}

function tabbar(active, user) {
  const items = [
    { href: '/training', key: 'week', ico: '📅', label: 'Semana' },
    { href: '/training/month', key: 'month', ico: '🗓', label: 'Mes' },
    { href: '/training/stats', key: 'stats', ico: '📊', label: 'Stats' },
    { href: '/training/guia', key: 'guia', ico: '📖', label: 'Guía' },
  ];
  return `<nav class="tabbar">${items.map((i) =>
    `<a href="${i.href}" class="${active === i.key ? 'on' : ''}">
      <span class="ico">${i.ico}</span>${i.label}</a>`).join('')}</nav>`;
}

module.exports = {
  page, tabbar, escapeHtml, CSS,
  SPORT_ICON, SPORT_NAME, STATUS, ZONES, FC_MAX, PHASE_COLORS,
};
