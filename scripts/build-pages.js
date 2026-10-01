const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const basePath = (process.env.PAGES_BASE_PATH || '/Alisio').replace(/\/$/, '');
const siteOrigin = (process.env.PAGES_SITE_ORIGIN || 'https://kostinatyn32.github.io').replace(/\/$/, '');
const siteBase = `${siteOrigin}${basePath}`;

if (path.dirname(out) !== root || path.basename(out) !== 'dist') {
  throw new Error(`Refusing to clear an unexpected build path: ${out}`);
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function rewriteSitePaths(source, mini = false) {
  const replacements = [
    ['/assets/', `${basePath}/assets/`],
    ['/video/', `${basePath}/video/`],
    ['/styles.css', `${basePath}/styles.css`],
    ['/app.js', `${basePath}/app.js`],
    ['/privacy', `${basePath}/privacy/`],
    ['/ai-audit', `${basePath}/`]
  ];
  if (mini) {
    replacements.push(
      ['/qr.css', `${basePath}/qr/qr.css`],
      ['/qr.js', `${basePath}/qr/qr.js`],
      ['/qr-config.js', `${basePath}/qr/qr-config.js`],
      ['/qr', `${basePath}/qr/`]
    );
  }

  let result = source;
  for (const [from, to] of replacements) {
    result = result
      .replaceAll(`"${from}`, `"${to}`)
      .replaceAll(`'${from}`, `'${to}`)
      .replaceAll(`(${from}`, `(${to}`);
  }

  return result
    .replaceAll('href="/"', `href="${basePath}/"`)
    .replaceAll('href="/#', `href="${basePath}/#`)
    .replaceAll('__SITE_BASE__', siteBase)
    .replaceAll(`${siteBase}/ai-audit`, `${siteBase}/`)
    .replaceAll('content="/ai-audit"', `content="${basePath}/"`)
    .replaceAll('href="/ai-audit"', `href="${basePath}/"`)
    .replaceAll('content=""', `content="${siteBase}"`);
}

function write(relative, content) {
  const file = path.join(out, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDirectory(source, destination) {
  fs.cpSync(path.join(root, source), path.join(out, destination), { recursive: true });
}

write('index.html', rewriteSitePaths(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
write('styles.css', rewriteSitePaths(fs.readFileSync(path.join(root, 'styles.css'), 'utf8')));
write('app.js', rewriteSitePaths(fs.readFileSync(path.join(root, 'app.js'), 'utf8')));
write('qr/index.html', rewriteSitePaths(fs.readFileSync(path.join(root, 'qr.html'), 'utf8'), true));
write('qr/qr.css', rewriteSitePaths(fs.readFileSync(path.join(root, 'qr.css'), 'utf8'), true));
write('qr/qr.js', rewriteSitePaths(fs.readFileSync(path.join(root, 'qr.js'), 'utf8'), true));
write('qr/qr-config.js', fs.readFileSync(path.join(root, 'qr-config.js'), 'utf8'));
const businessPage = fs.readFileSync(path.join(root, 'business-audit.html'), 'utf8');
write('business-audit/index.html', rewriteSitePaths(businessPage)
  .replaceAll('href="/assets/', `href="${basePath}/assets/`)
  .replaceAll('src="/assets/', `src="${basePath}/assets/`)
  .replaceAll('href="/privacy"', `href="${basePath}/privacy/`)
  .replaceAll('href="/ai-audit"', `href="${basePath}/`)
  .replaceAll('href="/business-audit.css"', `href="${basePath}/business-audit/business-audit-v5.css"`)
  .replaceAll('src="/business-audit.js"', `src="${basePath}/business-audit/business-audit.js"`)
  .replaceAll('src="/qr-config.js"', `src="${basePath}/qr-config.js"`));
write('business-audit/business-audit-v5.css', fs.readFileSync(path.join(root, 'business-audit.css'), 'utf8'));
write('business-audit/business-audit.js', fs.readFileSync(path.join(root, 'business-audit.js'), 'utf8'));
write('qr-config.js', fs.readFileSync(path.join(root, 'qr-config.js'), 'utf8'));

const privacy = fs.readFileSync(path.join(root, 'public', 'privacy.html'), 'utf8');
write('privacy/index.html', rewriteSitePaths(privacy));
copyDirectory('public/assets', 'assets');
copyDirectory('public/video', 'video');
write('404.html', '<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Сторінку не знайдено | ALISIO</title><meta http-equiv="refresh" content="0;url=' + basePath + '/"><p>Повертаємося на <a href="' + basePath + '/">ALISIO</a>.</p></html>');
write('.nojekyll', '');

for (const name of ['robots.txt', 'sitemap.xml']) {
  const source = path.join(root, 'public', name);
  if (!fs.existsSync(source)) continue;
  let content = fs.readFileSync(source, 'utf8').replaceAll('__SITE_BASE__', siteBase);
  content = rewriteSitePaths(content);
  write(name, content);
}

console.log(`Built ALISIO sites for ${siteBase}/ and ${siteBase}/qr/`);
