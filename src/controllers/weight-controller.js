const { supabase } = require('../db/supabase');

// Fecha de hoy en Argentina (el server de Heroku corre en UTC, y a la noche
// UTC ya es el dia siguiente: sin esto el registro de las 22hs cae mañana).
function todayInBuenosAires() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function renderPage({ today, recent, message, error, values }) {
  const rows = recent.map(function (r, i) {
    const prev = recent[i + 1];
    let delta = '';
    if (prev) {
      const diff = Number(r.weight_kg) - Number(prev.weight_kg);
      const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
      const sign = diff > 0 ? '+' : '';
      delta = `<span class="delta ${cls}">${sign}${diff.toFixed(1)}</span>`;
    }
    return `<li>
      <span class="row-date">${formatDate(r.date)}</span>
      <span class="row-kg">${Number(r.weight_kg).toFixed(1)} kg ${delta}</span>
    </li>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registrar peso</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%96%EF%B8%8F%3C/text%3E%3C/svg%3E">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px 16px;
      background: #f8f8f6; color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; justify-content: center;
    }
    .card {
      width: 100%; max-width: 420px;
      background: #fff; border-radius: 16px;
      padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,.06);
    }
    h1 { margin: 0 0 4px; font-size: 20px; }
    .sub { margin: 0 0 20px; font-size: 13px; color: #888; }
    label { display: block; font-size: 13px; color: #666; margin-bottom: 6px; }
    input {
      width: 100%; padding: 13px; margin-bottom: 16px;
      border: 1px solid #e2e2dd; border-radius: 10px;
      font-size: 16px; background: #fcfcfb; color: #1a1a1a;
      font-family: inherit;
    }
    input:focus { outline: none; border-color: #1D9E75; }
    button {
      width: 100%; padding: 14px; border: 0; border-radius: 10px;
      background: #1D9E75; color: #fff; font-size: 16px; font-weight: 600;
      font-family: inherit; cursor: pointer;
    }
    button:active { background: #17805e; }
    .msg { padding: 12px; border-radius: 10px; font-size: 14px; margin-bottom: 16px; }
    .msg.ok { background: #e8f6f0; color: #146b50; }
    .msg.bad { background: #fdecea; color: #b3261e; }
    h2 { font-size: 13px; color: #888; font-weight: 600; margin: 24px 0 8px; }
    ul { list-style: none; margin: 0; padding: 0; }
    li {
      display: flex; justify-content: space-between; align-items: center;
      padding: 11px 0; border-bottom: 1px solid #f0f0ec; font-size: 15px;
    }
    li:last-child { border-bottom: 0; }
    .row-date { color: #888; font-size: 14px; }
    .row-kg { font-weight: 600; font-variant-numeric: tabular-nums; }
    .delta { font-size: 12px; font-weight: 600; margin-left: 6px; }
    .delta.up { color: #b3541e; }
    .delta.down { color: #1D9E75; }
    .delta.flat { color: #bbb; }
    .empty { color: #aaa; font-size: 14px; padding: 8px 0; }
    .back { display: block; text-align: center; margin-top: 20px; font-size: 13px; color: #888; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Registrar peso</h1>
    <p class="sub">Un registro por dia. Si ya cargaste hoy, se actualiza.</p>

    ${message ? `<div class="msg ok">${escapeHtml(message)}</div>` : ''}
    ${error ? `<div class="msg bad">${escapeHtml(error)}</div>` : ''}

    <form method="POST" action="/weight/new">
      <label for="weight">Peso (kg)</label>
      <input type="number" id="weight" name="weight" step="0.1" min="20" max="300"
             inputmode="decimal" placeholder="75.5" required
             value="${values.weight ? escapeHtml(values.weight) : ''}" autofocus>

      <label for="date">Fecha</label>
      <input type="date" id="date" name="date" value="${escapeHtml(values.date || today)}" max="${today}" required>

      <button type="submit">Guardar</button>
    </form>

    <h2>ULTIMOS REGISTROS</h2>
    ${rows ? `<ul>${rows}</ul>` : '<p class="empty">Todavia no hay registros.</p>'}

    <a class="back" href="/training">&larr; Volver a training</a>
  </div>
</body>
</html>`;
}

async function fetchRecent() {
  const { data, error } = await supabase
    .from('weights')
    .select('date, weight_kg')
    .order('date', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

const weightController = {
  new: async (req, res) => {
    const today = todayInBuenosAires();
    try {
      const recent = await fetchRecent();
      res.send(renderPage({ today, recent, message: null, error: null, values: {} }));
    } catch (err) {
      res.status(500).send(renderPage({
        today, recent: [], message: null,
        error: 'No se pudo conectar con la base de datos.', values: {}
      }));
    }
  },

  create: async (req, res) => {
    const today = todayInBuenosAires();
    const rawWeight = (req.body.weight || '').toString().replace(',', '.');
    const date = (req.body.date || '').toString() || today;
    const weight = Number(rawWeight);

    const valid = /^\d+(\.\d{1,2})?$/.test(rawWeight) && weight > 20 && weight < 300;
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

    if (!valid || !validDate) {
      const recent = await fetchRecent().catch(function () { return []; });
      return res.status(400).send(renderPage({
        today, recent, message: null,
        error: !valid ? 'Peso invalido. Tiene que estar entre 20 y 300 kg.' : 'Fecha invalida.',
        values: { weight: rawWeight, date: date }
      }));
    }

    try {
      // upsert sobre date (unique): recargar el mismo dia corrige, no duplica.
      // Pedimos la fila de vuelta y la verificamos: si RLS rechaza la escritura
      // no siempre llega un error, y sin esto mostrabamos "Guardado" sin guardar.
      const { data, error } = await supabase
        .from('weights')
        .upsert({ date: date, weight_kg: weight }, { onConflict: 'date' })
        .select('date, weight_kg');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('la escritura no devolvio ninguna fila');

      const recent = await fetchRecent();
      res.send(renderPage({
        today, recent,
        message: `Guardado: ${weight.toFixed(1)} kg el ${formatDate(date)}.`,
        error: null, values: {}
      }));
    } catch (err) {
      const recent = await fetchRecent().catch(function () { return []; });
      res.status(500).send(renderPage({
        today, recent, message: null,
        error: 'No se pudo guardar. Proba de nuevo.',
        values: { weight: rawWeight, date: date }
      }));
    }
  }
};

module.exports = weightController;
