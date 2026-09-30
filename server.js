const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnv();

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8'
};

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 20_000) tooLarge = true;
      else if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Заявка завелика.'), { status: 413 }));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('Перевірте поля форми та спробуйте ще раз.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function validPayload(body) {
  return body && typeof body.name === 'string' && body.name.trim().length >= 2 && body.name.length <= 160 &&
    typeof body.company === 'string' && body.company.trim().length >= 2 && body.company.length <= 240 &&
    typeof body.email === 'string' && body.email.length <= 320 &&
    typeof body.phone === 'string' && body.phone.length <= 80 && (body.email.trim() || body.phone.trim()) &&
    (!body.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) &&
    typeof body.painPoint === 'string' && body.painPoint.length <= 1200;
}

async function handleLead(req, res) {
  let body;
  try { body = await readBody(req); }
  catch (error) { return send(res, error.status || 400, { error: error.message || 'Не вдалося прочитати заявку.' }); }
  if (!validPayload(body)) return send(res, 400, { error: 'Перевірте ім’я, назву готелю та контактні дані.' });

  const target = process.env.AUDIT_LEAD_WEBHOOK_URL;
  if (!target) {
    console.warn('ALISIO lead form is not connected. Set AUDIT_LEAD_WEBHOOK_URL to receive submissions.');
    return send(res, 503, { error: 'Форма ще не підключена до системи приймання заявок. Зв’яжіться з адміністратором сайту.' });
  }

  let url;
  try { url = new URL(target); }
  catch { return send(res, 500, { error: 'Інтеграцію форми налаштовано некоректно.' }); }
  const localDev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localDev) return send(res, 500, { error: 'Адреса системи приймання заявок має використовувати захищене з’єднання.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body), signal: controller.signal
    });
    if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('ALISIO lead webhook request failed:', error.name === 'AbortError' ? 'timeout' : error.message);
    return send(res, 502, { error: 'Не вдалося передати заявку. Дані залишилися у формі. Спробуйте ще раз.' });
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  if (req.method === 'POST' && url.pathname === '/api/audit-lead') return handleLead(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Метод не підтримується.' });

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/ai-audit' || pathname === '/ai-audit/') pathname = '/';
  if (pathname === '/qr' || pathname === '/qr/') pathname = '/qr.html';
  if (pathname === '/privacy' || pathname === '/privacy/') pathname = '/privacy.html';
  if (pathname === '/') pathname = '/index.html';
  const rootFiles = new Map([
    ['/index.html', path.join(ROOT, 'index.html')],
    ['/qr.html', path.join(ROOT, 'qr.html')],
    ['/qr.css', path.join(ROOT, 'qr.css')],
    ['/qr.js', path.join(ROOT, 'qr.js')],
    ['/qr-config.js', path.join(ROOT, 'qr-config.js')],
    ['/styles.css', path.join(ROOT, 'styles.css')],
    ['/app.js', path.join(ROOT, 'app.js')]
  ]);
  const file = rootFiles.get(pathname) || path.resolve(PUBLIC, `.${pathname}`);
  if (!rootFiles.has(pathname) && !file.startsWith(`${PUBLIC}${path.sep}`)) return send(res, 403, { error: 'Доступ заборонено.' });

  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      return res.end('Сторінку не знайдено.');
    }
    const headers = {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cache-Control': ['.html', '.css', '.js'].includes(path.extname(file).toLowerCase()) ? 'no-cache' : 'public, max-age=86400, immutable'
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    if (path.extname(file) === '.html' && file === path.join(ROOT, 'index.html')) {
      let siteUrl = '';
      try {
        const configured = process.env.ALISIO_SITE_URL && new URL(process.env.ALISIO_SITE_URL);
        if (configured && configured.protocol === 'https:') siteUrl = configured.origin;
      } catch { /* Local preview uses relative page metadata until a production URL is set. */ }
      return fs.readFile(file, 'utf8', (readError, html) => {
        if (readError) {
          res.writeHead(500);
          return res.end('Помилка завантаження сторінки.');
        }
        const safeUrl = siteUrl || new URL(`http://${host}`).origin;
        const rendered = html
          .replaceAll('__SITE_BASE__', safeUrl)
          .replace('<meta name="alisio-site-url" content="">', `<meta name="alisio-site-url" content="${siteUrl}">`)
          .replace('<meta property="og:url" content="/ai-audit">', `<meta property="og:url" content="${safeUrl}/ai-audit">`)
          .replace('<meta property="og:image" content="/assets/alisio-og-hotel-ai-night-operations.jpg">', `<meta property="og:image" content="${safeUrl}/assets/alisio-og-hotel-ai-night-operations.jpg">`)
          .replace('<meta name="twitter:image" content="/assets/alisio-og-hotel-ai-night-operations.jpg">', `<meta name="twitter:image" content="${safeUrl}/assets/alisio-og-hotel-ai-night-operations.jpg">`)
          .replace('<link rel="canonical" href="/ai-audit">', `<link rel="canonical" href="${safeUrl}/ai-audit">`);
        res.end(rendered);
      });
    }
    if (path.extname(file) === '.xml' || path.extname(file) === '.txt') {
      return fs.readFile(file, 'utf8', (readError, source) => {
        if (readError) {
          res.writeHead(500);
          return res.end('Помилка завантаження файлу.');
        }
        let siteUrl = `http://${host}`;
        try {
          const configured = process.env.ALISIO_SITE_URL && new URL(process.env.ALISIO_SITE_URL);
          if (configured && configured.protocol === 'https:') siteUrl = configured.origin;
        } catch { /* Local preview uses the request origin. */ }
        res.end(source.replaceAll('__SITE_BASE__', siteUrl));
      });
    }
    fs.createReadStream(file).pipe(res);
  });
});

const port = Number(process.env.PORT || 4173);
server.listen(port, '0.0.0.0', () => {
  console.log(`ALISIO audit site is running at http://localhost:${port}`);
  if (!process.env.AUDIT_LEAD_WEBHOOK_URL) console.warn('Lead form is not connected. Set AUDIT_LEAD_WEBHOOK_URL before accepting real submissions.');
});
