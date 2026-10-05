// usage: node render.js <startFrame> <endFrame> <out.mp4>
// renders frames [start,end) and pipes JPEGs into ffmpeg (high-quality intermediate)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), { spawn } = require('child_process');
(async () => {
  const [a, b, out] = process.argv.slice(2);
  const start = parseInt(a), end = parseInt(b);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '10', '-pix_fmt', 'yuv420p', '-threads', '2', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, 'src/index.html'));
  await page.waitForFunction('window.READY === true', null, { timeout: 30000 });
  const t0 = Date.now();
  for (let f = start; f < end; f++) {
    const data = await page.evaluate(fr => { window.renderFrame(fr); return document.getElementById('c').toDataURL('image/jpeg', 0.96); }, f);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - start) % 120 === 0) process.stdout.write(`[${out}] ${f - start}/${end - start} ${((Date.now() - t0) / Math.max(1, f - start)).toFixed(0)}ms/f\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 5));
  console.log(`[${out}] done ${(Date.now() - t0) / 1000}s`);
})();
