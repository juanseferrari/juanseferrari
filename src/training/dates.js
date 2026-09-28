// Fechas del plan. Todo se maneja como string YYYY-MM-DD, nunca como Date
// local del server: Heroku corre en UTC y a la noche UTC ya es el dia
// siguiente en Buenos Aires.
//
// Para aritmetica usamos Date en UTC puro (mediodia, para que ningun DST
// pueda correr un dia) y volvemos a string enseguida.

const { TIMEZONE } = require('./plan-config');

const MS_DAY = 86400000;

// Hoy en Buenos Aires, como YYYY-MM-DD. en-CA da justo ese formato.
function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtc(isoDate) {
  return new Date(isoDate + 'T12:00:00Z');
}

function fromUtc(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = toUtc(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

// Diferencia en dias: b - a. Positivo si b es posterior.
function diffDays(a, b) {
  return Math.round((toUtc(b) - toUtc(a)) / MS_DAY);
}

// 0 = domingo, 1 = lunes... igual que Date#getDay.
function dayOfWeek(isoDate) {
  return toUtc(isoDate).getUTCDay();
}

// La fecha local (YYYY-MM-DD) de un start_date_local de Strava. Strava manda
// el local time del atleta ya convertido, en formato ISO sin offset real
// ("2026-10-03T07:12:45Z" donde la Z miente), asi que alcanza con cortar.
function localDateOf(startDateLocal) {
  return String(startDateLocal).slice(0, 10);
}

// Los segundos del dia de un start_date_local, para ordenar y para medir el
// hueco entre bici y trote en un brick.
function localSecondsOf(startDateLocal) {
  const m = /T(\d{2}):(\d{2}):(\d{2})/.exec(String(startDateLocal));
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatDayMonth(isoDate) {
  const [, m, d] = isoDate.split('-');
  return `${Number(d)} ${MONTHS_ES[Number(m) - 1].slice(0, 3)}`;
}

function formatDayName(isoDate) {
  return DAYS_ES[dayOfWeek(isoDate)];
}

module.exports = {
  today, isIsoDate, addDays, diffDays, dayOfWeek,
  localDateOf, localSecondsOf,
  formatDayMonth, formatDayName, MONTHS_ES, DAYS_ES,
};
