// Requires
const path = require("path");


const mainController = {
  home: (req, res) => {
    // Send HTML response with Open Graph meta tags
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="og:title" content="Juanse Ferrari">
        <meta property="og:description" content="Programador, entusiasta y fanático del mundo Fintech.">
        <meta property="og:image" content="https://www.juanseferrari.com/images/juanse2.png">

        <!-- Add more meta tags as needed -->
        <title>Juanse Ferrari</title>
      </head>
      <body>
        <!-- Your HTML content goes here -->

        <script>
          // Redirect to the desired URL after a delay (e.g., 3 seconds)
          setTimeout(function() {
            window.location.href = 'https://linktr.ee/juanseferrari';
          }, 300);
        </script>
      </body>
      </html>
    `);
  },

  trabajo: (req, res) => {
    // Send HTML response with Open Graph meta tags
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="og:title" content="Juanse Ferrari | Linkedin">
        <meta property="og:description" content="Programador, entusiasta y fanático del mundo Fintech.">
        <meta property="og:image" content="https://www.juanseferrari.com/images/juanse2.png">

        <!-- Add more meta tags as needed -->
        <title>Juanse Ferrari</title>
      </head>
      <body>
        <!-- Your HTML content goes here -->

        <script>
          // Redirect to the desired URL after a delay (e.g., 3 seconds)
          setTimeout(function() {
            window.location.href = 'https://www.linkedin.com/in/juansegundoferrari/';
          }, 300);
        </script>
      </body>
      </html>
    `);
  },
  agenda: (req,res) => {

     // Send HTML response with Open Graph meta tags
     res.send(`
     <!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <meta property="og:title" content="Juanse Ferrari | Agendar reunión ">
       <meta property="og:description" content="Programador, entusiasta y fanático del mundo Fintech.">
       <meta property="og:image" content="https://www.juanseferrari.com/images/juanse2.png">

       <!-- Add more meta tags as needed -->
       <title>Juanse Ferrari</title>
     </head>
     <body>
       <!-- Your HTML content goes here -->

       <script>
         // Redirect to the desired URL after a delay (e.g., 3 seconds)
         setTimeout(function() {
           window.location.href = 'https://calendar.app.google/Gpq2QUcsDSvuMVmd6';
         }, 300);
       </script>
     </body>
     </html>
   `);

  },
  training: (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'ironman', 'index.html'));
  },
  pay: (req, res) => {
    const ALIAS = 'juanseferraribru';
    // El deeplink va por CBU; el alias es solo lo que se muestra para copiar.
    const CBU = '0000335100000002109354';

    // /pay/100 -> monto fijo. /pay -> solo alias, sin monto.
    const raw = (req.params.amount || '').replace(',', '.');
    const amount = /^\d+(\.\d{1,2})?$/.test(raw) ? Number(raw) : null;

    const amountFormatted = amount === null ? null : amount.toFixed(2);
    const amountPretty = amount === null ? null : amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const deeplinkData = {
      from: 'clipboard_money_out_mla',
      account: { alias: { id: ALIAS, type: 'alias' } },
      type: 'alias'
    };
    if (amountFormatted) deeplinkData.amount = amountFormatted;

    const payload = encodeURIComponent(JSON.stringify(deeplinkData));
    const path = 'money-out/transfers/new?data=' + payload;

    // Android entiende intent://; iOS no, ahi va el scheme propio de la app.
    const androidLink = 'intent://' + path;
    const iosLink = 'mercadopago://' + path;

    const isIOS = /iPad|iPhone|iPod/.test(req.get('user-agent') || '');
    const deeplink = isIOS ? iosLink : androidLink;

    const title = amountPretty
      ? `Pagar $${amountPretty} a Juanse Ferrari`
      : 'Pagar a Juanse Ferrari';

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="Transferí por Mercado Pago al alias ${ALIAS}">
  <meta property="og:image" content="https://www.juanseferrari.com/images/juanse2.png">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f4f5f7;
      color: #1a1a1a;
    }
    .card {
      width: 100%;
      max-width: 380px;
      background: #fff;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
      text-align: center;
    }
    h1 { font-size: 17px; font-weight: 600; margin: 0 0 24px; color: #555; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #999; margin-bottom: 6px; }
    .amount { font-size: 40px; font-weight: 700; margin: 0 0 24px; letter-spacing: -.02em; }
    .field {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: #f4f5f7; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;
    }
    .field .value { font-size: 16px; font-weight: 600; word-break: break-all; text-align: left; }
    .copy {
      border: 0; background: #e3e6eb; color: #333; border-radius: 8px;
      padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .copy:active { background: #d3d7de; }
    .copy.ok { background: #d5f0dd; color: #17663a; }
    .btn {
      display: block; margin-top: 20px; padding: 15px;
      background: #00b1ea; color: #fff; border-radius: 10px;
      font-size: 16px; font-weight: 600; text-decoration: none;
    }
    .btn:active { background: #009acd; }
    .hint { margin-top: 14px; font-size: 12px; color: #999; line-height: 1.5; }
    .fallback { display: none; color: #b3541e; font-weight: 600; }
    .fallback.show { display: block; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Transferencia a Juanse Ferrari</h1>

    ${amountPretty ? `
    <div class="label">Monto</div>
    <div class="amount">$${amountPretty}</div>
    <div class="field">
      <div class="value" id="amountValue">${amountFormatted}</div>
      <button class="copy" data-copy="${amountFormatted}">Copiar</button>
    </div>` : ''}

    <div class="label" style="margin-top:16px">Alias</div>
    <div class="field">
      <div class="value">${ALIAS}</div>
      <button class="copy" data-copy="${ALIAS}">Copiar</button>
    </div>

    <a class="btn" id="payBtn" href="${deeplink}">Pagar con Mercado Pago</a>

    <p class="hint" id="hint">El botón abre la app de Mercado Pago${amountPretty ? ' con el monto ya cargado' : ''}. Si no se abre, copiá el alias y transferí desde tu app.</p>
    <p class="hint fallback" id="fallback">No se pudo abrir Mercado Pago. Copiá el alias de arriba y hacé la transferencia desde la app.</p>
  </div>

  <script>
    // Si el scheme no abre ninguna app, la pagina sigue visible: avisamos que
    // copien el alias en vez de dejar un boton que aparenta no hacer nada.
    (function () {
      var btn = document.getElementById('payBtn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var t = setTimeout(function () {
          if (!document.hidden) {
            document.getElementById('fallback').classList.add('show');
          }
        }, 1500);
        // Si el navegador se va a background, la app abrio: cancelamos el aviso.
        document.addEventListener('visibilitychange', function cancel() {
          if (document.hidden) {
            clearTimeout(t);
            document.removeEventListener('visibilitychange', cancel);
          }
        });
      });
    })();

    document.querySelectorAll('.copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function () {
          var original = btn.textContent;
          btn.textContent = 'Copiado';
          btn.classList.add('ok');
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove('ok');
          }, 1500);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          done();
        }
      });
    });
  </script>
</body>
</html>`);
  }
};

module.exports = mainController;