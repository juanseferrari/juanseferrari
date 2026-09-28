// Login de un solo usuario con magic link de Supabase.

const auth = require('../middleware/auth');
const { page, escapeHtml } = require('../training/layout');

function loginPage({ user, message, error, next: nextUrl }) {
  return page({
    title: 'Entrar · Training',
    user,
    body: `
    <div class="wrap">
      <div class="card pad">
        <h1>Entrar</h1>
        <p class="muted small">Te mando un link por email. No hay contraseña.</p>
        ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ''}
        ${error ? `<p class="bad">${escapeHtml(error)}</p>` : ''}
        <form method="POST" action="/training/login">
          <input type="hidden" name="next" value="${escapeHtml(nextUrl || '/training')}">
          <label for="email" class="small muted">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email"
                 inputmode="email" placeholder="tu@email.com">
          <button class="act-btn" type="submit">Mandarme el link</button>
        </form>
        <a class="back" href="/training">← Volver al calendario</a>
      </div>
    </div>`,
  });
}

const authController = {
  loginForm: (req, res) => {
    if (req.user) return res.redirect(req.query.next || '/training');
    res.send(loginPage({ user: req.user, next: req.query.next }));
  },

  sendLink: async (req, res) => {
    const email = (req.body.email || '').toString().trim().toLowerCase();
    const nextUrl = (req.body.next || '/training').toString();

    if (!email) {
      return res.status(400).send(loginPage({ error: 'Poné tu email.', next: nextUrl }));
    }

    // Solo el email autorizado recibe link. Igual respondemos lo mismo para
    // no filtrar cual es.
    try {
      if (email === auth.allowedEmail()) {
        const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const { error } = await auth.anonClient().auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${base}/training/auth/callback` },
        });
        if (error) throw error;
      }
      res.send(loginPage({
        message: 'Si ese email está autorizado, ya te llegó el link. Revisá la casilla.',
        next: nextUrl,
      }));
    } catch (err) {
      res.status(500).send(loginPage({
        error: 'No se pudo mandar el link: ' + err.message,
        next: nextUrl,
      }));
    }
  },

  // El magic link vuelve acá con la sesión en el FRAGMENTO de la URL, que no
  // llega al server. Esta página lo lee en el cliente y lo POSTea.
  callbackBridge: (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Entrando…</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;
min-height:100vh;align-items:center;justify-content:center;margin:0;
background:#f8f8f6;color:#1a1a1a}
@media (prefers-color-scheme:dark){body{background:#131314;color:#ececec}}
p{font-size:15px}</style></head>
<body><p id="msg">Entrando…</p>
<script>
(function () {
  var h = new URLSearchParams(location.hash.slice(1));
  var token = h.get('access_token');
  var err = h.get('error_description') || h.get('error');
  if (err) { document.getElementById('msg').textContent = 'No se pudo entrar: ' + err; return; }
  if (!token) { document.getElementById('msg').textContent = 'El link no trae sesión. Pedí uno nuevo.'; return; }
  fetch('/training/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (d.ok) { location.replace(d.next || '/training'); }
    else { document.getElementById('msg').textContent = d.error || 'No se pudo entrar.'; }
  }).catch(function () {
    document.getElementById('msg').textContent = 'No se pudo entrar.';
  });
})();
</script></body></html>`);
  },

  // Recibe el token del fragmento, lo valida y deja la cookie.
  createSession: async (req, res) => {
    const token = (req.body && req.body.access_token) || '';
    const user = await auth.verifyToken(token);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Sesión inválida o email no autorizado.' });
    }
    auth.setSessionCookie(res, token);
    res.json({ ok: true, next: '/training' });
  },

  logout: (req, res) => {
    auth.clearSessionCookie(res);
    res.redirect('/training');
  },
};

module.exports = authController;
