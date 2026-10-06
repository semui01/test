// Frame compositor: background, scenes, header, captions, post FX.
'use strict';

let canvas, ctx;
let SCENES = [], CHAPTERS = [], TRANSITIONS = [];

function buildTimeline() {
  const b = id => T(id) - 0.12;
  SCENES = [
    { a: 0, b: b('s2'), s: SceneA },
    { a: b('s2'), b: b('s3'), s: SceneB },
    { a: b('s3'), b: b('s4b'), s: typeof SceneC !== 'undefined' ? SceneC : null },
    { a: b('s4b'), b: b('s5a'), s: typeof SceneD !== 'undefined' ? SceneD : null },
    { a: b('s5a'), b: b('s9'), s: typeof SceneE !== 'undefined' ? SceneE : null },
    { a: b('s9'), b: b('s10'), s: typeof SceneI !== 'undefined' ? SceneI : null },
    { a: b('s10'), b: b('s11'), s: typeof SceneF !== 'undefined' ? SceneF : null },
    { a: b('s11'), b: b('s12'), s: typeof SceneG !== 'undefined' ? SceneG : null },
    { a: b('s12'), b: DURATION + 1, s: typeof SceneH !== 'undefined' ? SceneH : null },
  ].filter(x => x.s);
  CHAPTERS = [
    [0, 'THE STAKES'], [b('s2'), 'THE TRAP'], [b('s3'), 'THE SUSPECT'], [b('s4a'), 'SURFACE PIXELS'],
    [b('s4b'), 'THE PHOTO'], [b('s5a'), 'THE EXPERT CHECK'], [b('s6'), 'BURIED'], [b('s7'), 'LINE OF SIGHT'],
    [b('s8'), 'UNDER THE CAP'], [b('s10'), 'FLAT DATA'], [b('s11'), 'THE GUESS'], [b('s12'), 'THE VERDICT'],
  ];
  // global cut transitions (time, kind)
  TRANSITIONS = [
    [b('s2'), 'glitch'], [b('s3'), 'flash'], [b('s4b'), 'whip'], [b('s5a'), 'whip'], [b('s9'), 'whip'], [b('s10'), 'glitch'], [b('s11'), 'whip'], [b('s12'), 'glitch'],
  ];
}

// background tint keyframes
let TINTS = [];
function buildTints() {
  const b = id => T(id) - 0.12;
  TINTS = [
    [0, '#0d2626'], [T('s1', 'fatal') - 0.05, '#0d2626'], [T('s1', 'fatal') + 0.1, '#3c0912'], [b('s2') - 0.05, '#3c0912'],
    [b('s2') + 0.2, '#08233a'], [b('s3') - 0.05, '#08233a'], [b('s3') + 0.3, '#1f2611'], [b('s4a'), '#1f2611'],
    [b('s4a') + 0.4, '#06283a'], [b('s4b'), '#06283a'], [b('s4b') + 0.3, '#14200f'], [b('s5a'), '#14200f'],
    [b('s5a') + 0.4, '#2a1d08'], [b('s6'), '#2a1d08'], [b('s6') + 0.6, '#24170c'], [b('s7'), '#24170c'],
    [b('s7') + 0.4, '#0a2234'], [b('s8'), '#0a2234'], [b('s8') + 0.6, '#230b1c'], [b('s10'), '#230b1c'],
    [b('s10') + 0.3, '#081f33'], [b('s11'), '#081f33'], [b('s11') + 0.3, '#10142c'], [b('s12'), '#10142c'],
    [b('s12') + 0.3, '#0e2116'], [T('s12', 'lethal') - 0.1, '#0e2116'], [T('s12', 'lethal') + 0.1, '#3a0711'],
    [T('s12', 'safe') - 0.05, '#3a0711'], [T('s12', 'safe') + 0.1, '#0b3a1c'], [DURATION, '#0b3a1c'],
  ];
}
function tintAt(t) {
  for (let i = 0; i < TINTS.length - 1; i++) {
    const [t0, c0] = TINTS[i], [t1, c1] = TINTS[i + 1];
    if (t >= t0 && t <= t1) return mixHex(c0, c1, E.inOutQuad(invlerp(t0, t1, t)));
  }
  return TINTS[TINTS.length - 1][1];
}

const SPORES = (() => {
  const r = mulberry32(42), a = [];
  for (let i = 0; i < 70; i++) a.push({ x: r() * W, y: r() * H, s: 1 + r() * 2.6, vx: (r() - 0.5) * 14, vy: -6 - r() * 18, ph: r() * TAU, a: 0.12 + r() * 0.3 });
  return a;
})();

function drawBackground(ctx, t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const tint = tintAt(t);
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, tint); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.028)'; ctx.lineWidth = 1;
  const off = (t * 8) % 60;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 60) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = -60; y <= H; y += 60) { ctx.moveTo(0, y + off + 0.5); ctx.lineTo(W, y + off + 0.5); }
  ctx.stroke();
  ctx.restore();
  // spores
  ctx.save();
  for (const p of SPORES) {
    const x = ((p.x + p.vx * t + Math.sin(t * 0.7 + p.ph) * 20) % W + W) % W;
    const y = ((p.y + p.vy * t) % H + H) % H;
    ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph));
    ctx.fillStyle = '#e8f0d8';
    ctx.beginPath(); ctx.arc(x, y, p.s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawHeader(ctx, t) {
  // legibility band
  const hb = ctx.createLinearGradient(0, 0, 0, 300);
  hb.addColorStop(0, 'rgba(3,5,6,0.85)'); hb.addColorStop(0.65, 'rgba(3,5,6,0.45)'); hb.addColorStop(1, 'rgba(3,5,6,0)');
  ctx.fillStyle = hb; ctx.fillRect(0, 0, W, 300);
  // caption legibility band
  const cb = ctx.createLinearGradient(0, 1330, 0, 1700);
  cb.addColorStop(0, 'rgba(3,5,6,0)'); cb.addColorStop(0.45, 'rgba(3,5,6,0.5)'); cb.addColorStop(1, 'rgba(3,5,6,0.2)');
  ctx.fillStyle = cb; ctx.fillRect(0, 1330, W, 370);
  let ci = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i][0]) ci = i;
  const [ct, name] = CHAPTERS[ci];
  const p = K(t, ct, 0.5, E.outExpo);
  const a = K(t, 0.1, 0.5) * (1 - K(t, DURATION - 0.6, 0.5));
  ctx.save();
  ctx.globalAlpha = a;
  // progress bar
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(60, 104, W - 120, 4);
  ctx.fillStyle = C.ink; ctx.fillRect(60, 104, (W - 120) * clamp(t / DURATION), 4);
  for (const [tt] of CHAPTERS) { ctx.fillStyle = C.bg; ctx.fillRect(60 + (W - 120) * tt / DURATION - 1, 104, 3, 4); }
  // left: recording dot + label
  const dotOn = Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = dotOn ? C.red : rgba(C.red, 0.3);
  ctx.beginPath(); ctx.arc(70, 152, 8, 0, TAU); ctx.fill();
  setFont(ctx, 600, 24, 'JetBrains Mono', 4);
  ctx.fillStyle = C.dim; ctx.textBaseline = 'middle';
  ctx.fillText('AI VISION // FAILURE FILE', 92, 153);
  // chapter
  const num = String(ci + 1).padStart(2, '0') + '/' + String(CHAPTERS.length).padStart(2, '0');
  ctx.textAlign = 'right';
  ctx.fillStyle = C.dim; ctx.fillText(num, W - 60, 153);
  ctx.textAlign = 'left';
  setFont(ctx, 800, 40, 'Inter', 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(56, 172, 900, 60); ctx.clip();
  ctx.translate(0, (1 - p) * 50);
  ctx.fillStyle = C.ink;
  ctx.fillText(typeText(name, clamp(p * 1.5), ci + 5), 60, 202);
  ctx.restore();
  ctx.restore();
}

function transitionFX(ctx, t, frame) {
  let glitch = 0, flash = 0, whip = 0;
  for (const [tt, kind] of TRANSITIONS) {
    const d = t - tt;
    if (Math.abs(d) > 0.3) continue;
    const w = 1 - Math.abs(d) / 0.3;
    if (kind === 'glitch') glitch = Math.max(glitch, w);
    if (kind === 'flash') flash = Math.max(flash, d >= 0 ? Math.pow(1 - d / 0.3, 2) * 0.85 : 0);
    if (kind === 'whip') whip = Math.max(whip, Math.pow(w, 1.5));
  }
  return { glitch, flash, whip };
}

// extra effects scenes may request per frame
const FXREQ = { glitch: 0, shake: 0, flash: 0, flashCol: '#ffffff', red: 0 };

function renderAt(t, frame) {
  FXREQ.glitch = 0; FXREQ.shake = 0; FXREQ.flash = 0; FXREQ.flashCol = '#ffffff'; FXREQ.red = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawBackground(ctx, t);
  const tr = transitionFX(ctx, t, frame);
  ctx.save();
  if (tr.whip > 0) {
    // zoom punch
    const s = 1 + tr.whip * 0.06;
    ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
  }
  for (const sc of SCENES) {
    if (t >= sc.a && t < sc.b) {
      ctx.save();
      sc.s.draw(ctx, t, frame);
      ctx.restore();
    }
  }
  ctx.restore();
  // scene-requested shake: re-blit with offset
  if (FXREQ.shake > 0) {
    const g = FX.tmp.getContext('2d');
    g.clearRect(0, 0, W, H); g.drawImage(canvas, 0, 0);
    const dx = noise1(t * 37) * FXREQ.shake, dy = noise1(t * 41 + 5) * FXREQ.shake;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(FX.tmp, dx, dy);
  }
  if (tr.whip > 0) {
    // directional streak blur approximation
    const g = FX.tmp.getContext('2d');
    g.clearRect(0, 0, W, H); g.drawImage(canvas, 0, 0);
    ctx.save();
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.18 * tr.whip;
      ctx.drawImage(FX.tmp, 0, i * 22 * tr.whip);
      ctx.drawImage(FX.tmp, 0, -i * 22 * tr.whip);
    }
    ctx.restore();
  }
  drawHeader(ctx, t);
  drawCaptions(ctx, t);
  const gl = Math.max(tr.glitch, FXREQ.glitch);
  if (gl > 0) FX.glitch(ctx, gl, frame * 7 + 3);
  FX.flash(ctx, Math.max(tr.flash, tr.whip * 0.12), '#ffffff');
  FX.flash(ctx, FXREQ.flash, FXREQ.flashCol);
  FX.vignette(ctx, 1);
  FX.grainPass(ctx, frame, 0.09);
  // fade from/to black
  const fadeIn = 1 - K(t, 0, 0.35);
  const fadeOut = K(t, DURATION - 0.35, 0.35);
  FX.flash(ctx, Math.max(fadeIn, fadeOut), '#000000');
}

async function init() {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d', { alpha: false });
  const fams = ['400 10px Anton', '500 10px Inter', '700 10px Inter', '800 10px Inter', '900 10px Inter',
    '400 10px "JetBrains Mono"', '600 10px "JetBrains Mono"', '800 10px "JetBrains Mono"',
    'italic 400 10px "Instrument Serif"', '400 10px "Instrument Serif"'];
  await Promise.all(fams.map(f => document.fonts.load(f)));
  await document.fonts.ready;
  FX.init();
  if (typeof initAssets === 'function') initAssets();
  if (typeof initAssets4 === 'function') initAssets4();
  if (typeof initAssets3 === 'function') initAssets3();
  buildTimeline();
  buildTints();
  window.READY = true;
}

window.renderFrame = function (frame) {
  renderAt(frame / FPS, frame);
  return true;
};
window.renderTime = function (t) {
  renderAt(t, Math.round(t * FPS));
  return true;
};
init();
