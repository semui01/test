// usage: node preview.js out_prefix t1 t2 ... ; writes full-res PNG per time + contact sheet
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
(async () => {
  const [prefix, ...times] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, 'src/index.html'));
  await page.waitForFunction('window.READY === true', null, { timeout: 30000 });
  fs.mkdirSync('out/prev', { recursive: true });
  const files = [];
  let i = 0;
  for (const t of times) {
    const t0 = Date.now();
    await page.evaluate(tt => window.renderTime(tt), parseFloat(t));
    const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    const f = `out/prev/${prefix}_${String(i).padStart(2, '0')}.png`;
    fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
    files.push(f); i++;
    process.stdout.write(`t=${t} ${Date.now() - t0}ms\n`);
  }
  if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 20).join('\n'));
  await browser.close();
  if (files.length > 1) {
    const cols = Math.min(files.length, 4);
    execSync(`ffmpeg -y -loglevel error -i out/prev/${prefix}_%02d.png -vf "scale=540:-1,tile=${cols}x${Math.ceil(files.length / cols)}:padding=6:color=white" -frames:v 1 out/prev/${prefix}_sheet.jpg`);
    console.log('sheet: out/prev/' + prefix + '_sheet.jpg');
  }
})();
