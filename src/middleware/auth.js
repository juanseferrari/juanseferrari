// Auth de un solo usuario sobre Supabase Auth (magic link por email).
//
// Flujo:
//  1. /training/login  -> pide el email y dispara el magic link.
//  2. El link de Supabase vuelve a /training/auth/callback con la sesion en
//     el FRAGMENTO de la URL (#access_token=...), que nunca llega al server.
//  3. Esa pagina puente lee el fragmento y lo POSTea a /training/auth/session.
//  4. El server valida el JWT contra Supabase, chequea que el email sea el
//     autorizado, y deja una cookie httpOnly firmada.
//
// La cookie guarda solo el access_token de Supabase y se valida en cada
// request contra Supabase (getUser), asi que revocar la sesion alcanza.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const COOKIE = 'training_session';
const MAX_AGE_S = 30 * 24 * 3600; // 30 dias

function secret() {
  const v = process.env.SESSION_SECRET;
  if (!v) throw new Error('Falta la config var SESSION_SECRET');
  return v;
}

// Email autorizado. Sin esto, cualquiera que consiga un magic link de este
// proyecto de Supabase podria escribir.
function allowedEmail() {
  const v = process.env.TRAINING_EMAIL;
  if (!v) throw new Error('Falta la config var TRAINING_EMAIL');
  return v.trim().toLowerCase();
}

function anonClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ------------------------------------------------------------------ cookies

function sign(value) {
  const mac = crypto.createHmac('sha256', secret()).update(value).digest('base64url');
  return value + '.' + mac;
}

function unsign(signed) {
  if (typeof signed !== 'string') return null;
  const i = signed.lastIndexOf('.');
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const expected = crypto.createHmac('sha256', secret()).update(value).digest('base64url');
  // timingSafeEqual explota si las longitudes difieren.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

// Parser minimo: el sitio no usa cookie-parser y no vale la pena sumar una
// dependencia por una sola cookie.
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function setSessionCookie(res, accessToken) {
  const value = encodeURIComponent(sign(accessToken));
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  res.setHeader('Set-Cookie',
    COOKIE + '=' + value + '; Path=/; HttpOnly;' + secure +
    ' SameSite=Lax; Max-Age=' + MAX_AGE_S);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  res.setHeader('Set-Cookie',
    COOKIE + '=; Path=/; HttpOnly;' + secure + ' SameSite=Lax; Max-Age=0');
}

// ------------------------------------------------------------------- sesion

// Valida el token contra Supabase y chequea el email. Devuelve el user o null.
async function verifyToken(accessToken) {
  if (!accessToken) return null;
  try {
    const { data, error } = await anonClient().auth.getUser(accessToken);
    if (error || !data || !data.user) return null;
    const email = (data.user.email || '').toLowerCase();
    if (email !== allowedEmail()) return null;
    return data.user;
  } catch {
    return null;
  }
}

// Deja req.user (o null). No bloquea: la vista publica lo usa para decidir
// si muestra los botones de override.
async function attachUser(req, _res, next) {
  try {
    const signed = readCookie(req, COOKIE);
    const token = signed ? unsign(signed) : null;
    req.user = token ? await verifyToken(token) : null;
  } catch {
    // Si falta SESSION_SECRET o Supabase no responde, el sitio publico tiene
    // que seguir funcionando: simplemente no hay sesion.
    req.user = null;
  }
  next();
}

// Bloquea si no hay sesion.
function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const back = encodeURIComponent(req.originalUrl || '/training');
  res.redirect('/training/login?next=' + back);
}

// Para el cron: header o query con el secreto compartido.
function requireCronSecret(req, res, next) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return res.status(503).json({ error: 'CRON_SECRET no configurado' });
  const given = req.get('x-cron-secret') || req.query.secret;
  if (!given || given !== expected) return res.status(401).json({ error: 'No autorizado' });
  next();
}

module.exports = {
  COOKIE, attachUser, requireAuth, requireCronSecret,
  setSessionCookie, clearSessionCookie, verifyToken,
  sign, unsign, readCookie, anonClient, allowedEmail,
};
