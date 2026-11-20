// Pagina temporal para descubrir como la app de Mercado Pago en Android
// acepta el monto precargado. Cada boton manda el monto de una forma distinta.
// No tiene links desde ningun lado; borrarla cuando encontremos la variante.

const ALIAS = 'juanseferraribru';
const ANDROID_INTENT_SUFFIX = '#Intent;scheme=mercadopago;package=com.mercadopago.wallet;end';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildVariants(amount) {
  const fixed = amount.toFixed(2);
  const base = () => ({
    from: 'clipboard_money_out_mla',
    account: { alias: { id: ALIAS, type: 'cvu' } },
    type: 'cvu'
  });
  const path = (data, extra = '') =>
    'money-out/transfers/new?data=' + encodeURIComponent(JSON.stringify(data)) + extra;
  const intent = (p) => 'intent://' + p + ANDROID_INTENT_SUFFIX;

  return [
    { id: 'A', desc: 'Actual: amount "100.00" (string)',
      href: intent(path({ ...base(), amount: fixed })) },
    { id: 'B', desc: 'amount como número: 100',
      href: intent(path({ ...base(), amount })) },
    { id: 'C', desc: 'amount string sin decimales: "100"',
      href: intent(path({ ...base(), amount: String(Math.round(amount)) })) },
    { id: 'D', desc: 'amount como query param aparte (&amount=100)',
      href: intent(path(base(), '&amount=' + fixed)) },
    { id: 'E', desc: 'amount dentro de data Y como query param',
      href: intent(path({ ...base(), amount: fixed }, '&amount=' + fixed)) },
    { id: 'F', desc: 'Sin "from" (por si el flujo clipboard ignora el monto)',
      href: intent(path((({ from, ...rest }) => ({ ...rest, amount: fixed }))(base()))) },
    { id: 'G', desc: 'amount con coma: "100,00"',
      href: intent(path({ ...base(), amount: fixed.replace('.', ',') })) },
    { id: 'H', desc: 'mercadopago:// directo (igual que iOS), sin intent',
      href: 'mercadopago://' + path({ ...base(), amount: fixed }) }
  ];
}

const payTestController = {
  show: (req, res) => {
    const raw = (req.params.amount || '100').replace(',', '.');
    const amount = /^\d+(\.\d{1,2})?$/.test(raw) ? Number(raw) : 100;
    const variants = buildVariants(amount);

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Pay test</title>
  <style>
    body { margin: 0; padding: 20px 16px; font-family: -apple-system, Roboto, sans-serif; background: #f4f5f7; color: #1a1a1a; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p.sub { font-size: 13px; color: #777; margin: 0 0 20px; }
    .v { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 10px rgba(0,0,0,.06); }
    .v a { display: block; text-align: center; padding: 12px; background: #00b1ea; color: #fff; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px; }
    .v .d { font-size: 14px; margin: 0 0 10px; }
    .v code { display: block; margin-top: 10px; font-size: 10px; color: #888; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Prueba monto Android – $${amount.toFixed(2)}</h1>
  <p class="sub">Tocá cada botón, fijate si la app abre con el monto cargado, volvé y probá el siguiente. Anotá las letras que funcionan.</p>
  ${variants.map(v => `
  <div class="v">
    <p class="d"><b>${v.id}.</b> ${esc(v.desc)}</p>
    <a href="${esc(v.href)}">Probar ${v.id}</a>
    <code>${esc(decodeURIComponent(v.href))}</code>
  </div>`).join('')}
</body>
</html>`);
  }
};

module.exports = payTestController;
