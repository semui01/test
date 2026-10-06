// Core utilities: math, easing, noise, timing engine, captions, post FX.
'use strict';

const W = 1080, H = 1920, FPS = 60, DURATION = 71.0;

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const invlerp = (a, b, v) => clamp((v - a) / (b - a));
const TAU = Math.PI * 2;

const E = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackSoft: t => { const c1 = 1.1, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: t => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: t => { const c4 = TAU / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
};

// progress of a tween starting at t0 lasting d, eased
function K(t, t0, d, ease = E.outCubic) { return ease(clamp((t - t0) / d)); }
// window: rises over [a, a+fi], holds, falls over [b-fo, b]
function win(t, a, b, fi = 0.3, fo = 0.3, ei = E.outCubic, eo = E.inCubic) {
  if (t < a || t > b) return 0;
  const i = fi > 0 ? ei(clamp((t - a) / fi)) : 1;
  const o = fo > 0 ? 1 - eo(clamp((t - (b - fo)) / fo)) : 1;
  return Math.min(i, o);
}

// ---------- deterministic randomness / noise ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u) * 2 - 1; }
function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
function fbm2(x, y, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise2(x * f, y * f); f *= 2; a *= 0.5; } return v; }

// ---------- color ----------
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a = 1) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mixHex(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); }

const C = {
  bg: '#06080a', bg2: '#0c1311', ink: '#f3efe4', dim: '#8d968f', faint: '#4a524d',
  ai: '#38e1ff', safe: '#4dff88', red: '#ff2d42', red2: '#b3122a', amber: '#ffb648',
  cap1: '#d3d39a', cap2: '#9aa35d', cap3: '#626b38', cap4: '#3c4322',
  flesh: '#f1ece0', flesh2: '#d9d1bf', flesh3: '#b6ac96',
  soil1: '#2b1e15', soil2: '#3d2b1d', soil3: '#55402b', soil4: '#1a120c',
};

// ---------- timing engine ----------
// markup: [r:word] red, [c:word] cyan(AI), [g:word] green(safe), [a:word] amber(human)
const SCRIPT = [
  { id: 's1', text: 'Mistaking a dog breed | with [c:AI] is [g:harmless], | but a false positive | on a toxic mushroom | can be [r:fatal].' },
  { id: 's2', text: 'The reason computer vision | fails so badly | is a physical trap | called [c:visual occlusion].' },
  { id: 's3', text: 'Take the [r:death cap], | a highly toxic mushroom | [c:AI] frequently mistakes | for a [g:harmless edible].' },
  { id: 's4a', text: '[c:AI] relies strictly | on [c:surface pixels].' },
  { id: 's4b', text: "From a top-down | smartphone photo, | the death cap's shape | looks perfectly [g:innocent]." },
  { id: 's5a', text: "But [a:human experts] | don't just look at the cap." },
  { id: 's5b', text: 'To spot this | specific threat, | they check for a | [a:sack-like structure] | at the base of the stem.' },
  { id: 's6', text: 'But out in the wild, | this crucial root | is completely [r:buried] | under soil and fallen leaves.' },
  { id: 's7', text: "Because it's blocked | from the camera's line of sight — | that's [c:visual occlusion] — | the data [r:doesn't exist]." },
  { id: 's8', text: 'And this limitation | goes [a:deeper than the dirt].' },
  { id: 's9', text: 'Flipping the cap | reveals pure [a:white gills], | which drop a [a:white spore print], | a classic [r:warning sign].' },
  { id: 's10', text: "A 2D surface image | can [r:never] capture | what's underneath." },
  { id: 's11', text: "Because [c:AI] can't infer | features it can't see, | it makes [r:life-or-death guesses] | using deceptive camouflage." },
  { id: 's12', text: 'And that deadly death cap, | missing the buried root | and hidden white gills, | the AI confidently labels | the lethal hazard: | [g:safe to eat].' },
];

function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (/^\d/.test(w)) return 2;
  return w.split('-').filter(Boolean).reduce((s, p) => {
    let n = (p.match(/[aeiouy]+/g) || []).length;
    if (p.length > 2 && p.endsWith('e') && !p.endsWith('le') && n > 1) n--;
    if (p.endsWith('ed') && !/[td]ed$/.test(p) && n > 1) n--;
    return s + Math.max(1, n);
  }, 0);
}

function buildTiming() {
  const words = [];
  const segs = [];
  let t = 0;
  for (const seg of SCRIPT) {
    const marked = seg.text.replace(/\[(\w):([^\]]+)\]/g, (_, c, s) => s.split(' ').map(w => `⟦${c}⟧${w}`).join(' '));
    const toks = marked.split(/\s+/).filter(Boolean);
    const segWords = [];
    for (let i = 0; i < toks.length; i++) {
      let tok = toks[i];
      if (tok === '—') { if (segWords.length) segWords[segWords.length - 1].dash = true; continue; }
      if (tok === '|') { if (segWords.length) segWords[segWords.length - 1].brk = true; continue; }
      let color = null;
      const m = tok.match(/^⟦(\w)⟧(.*)$/);
      if (m) { color = m[1]; tok = m[2]; }
      const punct = (tok.match(/[,.:;!?]+$/) || [''])[0];
      const syl = syllables(tok);
      const w = { text: tok, color, punct, syl, seg: seg.id, idx: segWords.length };
      segWords.push(w);
    }
    seg.words = segWords;
    seg.start = t;
    for (const w of segWords) {
      w.start = t;
      w.dur = 0.12 + 0.088 * w.syl + (w.text.length > 8 ? 0.03 : 0);
      t += w.dur;
      w.end = t;
      if (w.punct.includes(',')) t += 0.2;
      else if (w.punct.includes(':')) t += 0.26;
      else if (w.punct.includes('.')) t += 0.36;
      else if (w.dash) t += 0.2;
      words.push(w);
    }
    seg.end = segWords[segWords.length - 1].end;
    t += 0.12;
    segs.push(seg);
  }
  const segMap = {};
  segs.forEach(s => (segMap[s.id] = s));
  // real voiceover timings (generated by voice.py) override the estimate
  if (typeof VO_TIMING !== 'undefined') {
    for (const s of segs) {
      const vt = VO_TIMING[s.id];
      if (!vt || vt.length !== s.words.length) throw new Error('VO_TIMING mismatch for ' + s.id);
      s.words.forEach((w, i) => { w.start = vt[i][0]; w.end = vt[i][1]; w.dur = w.end - w.start; });
      s.start = s.words[0].start; s.end = s.words[s.words.length - 1].end;
    }
    return { words, segs, segMap, scale: 1 };
  }
  // otherwise scale the estimate to the speaking window
  const S0 = 0.35, S1 = 68.9;
  const rawEnd = segs[segs.length - 1].end;
  const k = (S1 - S0) / rawEnd;
  for (const w of words) { w.start = S0 + w.start * k; w.end = S0 + w.end * k; w.dur *= k; }
  for (const s of segs) { s.start = S0 + s.start * k; s.end = S0 + s.end * k; }
  return { words, segs, segMap, scale: k };
}
const TIMING = buildTiming();

// time of a word in a segment: T('s1','fatal') or T('s1', 3); 'start'/'end' for the segment
function T(segId, word, which = 'start') {
  const s = TIMING.segMap[segId];
  if (word === undefined || word === 'start') return s.start;
  if (word === 'end') return s.end;
  let w;
  if (typeof word === 'number') w = s.words[word];
  else {
    const needle = word.toLowerCase();
    w = s.words.find(x => x.text.toLowerCase().replace(/[^a-z0-9'-]/g, '') === needle) ||
        s.words.find(x => x.text.toLowerCase().startsWith(needle));
  }
  if (!w) throw new Error('T: word not found ' + segId + ' ' + word);
  return which === 'end' ? w.end : w.start;
}

// ---------- captions ----------
const CAP = { font: 800, size: 66, lineH: 80, maxW: 880, y: 1505 };
function buildCaptionChunks() {
  const chunks = [];
  for (const seg of TIMING.segs) {
    let cur = [];
    for (const w of seg.words) {
      cur.push(w);
      if (w.brk) { chunks.push({ words: cur, seg: seg.id }); cur = []; }
    }
    if (cur.length) chunks.push({ words: cur, seg: seg.id });
  }
  for (const c of chunks) c.start = c.words[0].start - 0.06;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i], next = chunks[i + 1];
    const natEnd = c.words[c.words.length - 1].end + 0.45;
    if (!next) c.end = DURATION;
    else if (next.seg !== c.seg) c.end = Math.min(next.start, natEnd);
    else c.end = next.start;
  }
  return chunks;
}
const CHUNKS = buildCaptionChunks();

const CAP_COLORS = { r: '#ff4357', c: '#43e4ff', g: '#5cff95', a: '#ffbb52' };
let _capLayoutCache = new Map();
function layoutChunk(ctx, chunk) {
  if (_capLayoutCache.has(chunk)) return _capLayoutCache.get(chunk);
  ctx.save();
  ctx.font = `${CAP.font} ${CAP.size}px Inter`;
  ctx.letterSpacing = '-1px';
  const space = ctx.measureText(' ').width + 16;
  const lines = [[]];
  let lw = 0;
  for (const w of chunk.words) {
    const disp = w.text;
    const ww = ctx.measureText(disp).width;
    if (lw > 0 && lw + space + ww > CAP.maxW) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push({ w, disp, ww });
    lw += (lw > 0 ? space : 0) + ww;
  }
  const out = [];
  lines.forEach((ln, li) => {
    const total = ln.reduce((s, x) => s + x.ww, 0) + space * (ln.length - 1);
    let x = W / 2 - total / 2;
    for (const it of ln) { out.push({ ...it, x, line: li }); x += it.ww + space; }
  });
  ctx.restore();
  const res = { items: out, nLines: lines.length };
  _capLayoutCache.set(chunk, res);
  return res;
}

function drawCaptions(ctx, t, opts = {}) {
  const chunk = CHUNKS.find(c => t >= c.start && t < c.end);
  if (!chunk) return;
  const L = layoutChunk(ctx, chunk);
  const out = clamp((chunk.end - t) / 0.12);
  const baseY = CAP.y - (L.nLines - 1) * CAP.lineH / 2 + (opts.yOff || 0);
  ctx.save();
  ctx.font = `${CAP.font} ${CAP.size}px Inter`;
  ctx.letterSpacing = '-1px';
  ctx.textBaseline = 'middle';
  for (const it of L.items) {
    const w = it.w;
    const p = clamp((t - (w.start - 0.04)) / 0.16);
    if (p <= 0) continue;
    const e = E.outBack(p);
    const active = t >= w.start - 0.04 && t < w.end + 0.06;
    const sc = lerp(0.55, 1, e) * (active ? 1.06 : 1);
    const y = baseY + it.line * CAP.lineH + (1 - e) * 26 - (active ? 3 : 0);
    const cx = it.x + it.ww / 2;
    ctx.save();
    ctx.globalAlpha = clamp(p * 1.6) * out;
    ctx.translate(cx, y);
    ctx.scale(sc, sc);
    const col = w.color ? CAP_COLORS[w.color] : C.ink;
    // shadow + stroke for legibility
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(it.disp, -it.ww / 2, 4);
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(2,4,4,0.9)';
    ctx.strokeText(it.disp, -it.ww / 2, 0);
    if (w.color) { ctx.shadowColor = rgba(col, 0.75); ctx.shadowBlur = 26; }
    ctx.fillStyle = col;
    ctx.fillText(it.disp, -it.ww / 2, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- drawing helpers ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function textW(ctx, s) { return ctx.measureText(s).width; }
function setFont(ctx, weight, size, fam = 'Inter', ls = 0) {
  ctx.font = `${weight} ${size}px ${fam}`;
  ctx.letterSpacing = ls + 'px';
}
function fillTextC(ctx, s, x, y) { ctx.textAlign = 'center'; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }

// typewriter text: reveal characters over time with a scramble on the leading edge
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$@';
function typeText(s, p, seed = 1, scramble = 3) {
  const n = s.length;
  const shown = Math.floor(p * n);
  let out = s.slice(0, shown);
  if (p < 1) {
    for (let i = shown; i < Math.min(n, shown + scramble); i++) {
      if (s[i] === ' ') { out += ' '; continue; }
      out += GLYPHS[Math.floor(hash1(seed * 13 + i * 7 + Math.floor(p * 40)) * GLYPHS.length)];
    }
  }
  return out;
}

// offscreen canvas factory
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- post FX ----------
const FX = {};
FX.init = function () {
  FX.grain = [];
  const rng = mulberry32(99);
  for (let k = 0; k < 8; k++) {
    const c = makeCanvas(540, 960);
    const g = c.getContext('2d');
    const img = g.createImageData(540, 960);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(128 + (rng() + rng() + rng() - 1.5) * 120);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    FX.grain.push(c);
  }
  FX.tmp = makeCanvas(W, H);
  FX.vig = makeCanvas(W, H);
  const vg = FX.vig.getContext('2d');
  const grd = vg.createRadialGradient(W / 2, H * 0.46, H * 0.22, W / 2, H * 0.5, H * 0.72);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0.35)');
  grd.addColorStop(1, 'rgba(0,0,0,0.85)');
  vg.fillStyle = grd;
  vg.fillRect(0, 0, W, H);
};
FX.grainPass = function (ctx, frame, amt = 0.07) {
  const c = FX.grain[frame % FX.grain.length];
  ctx.save();
  ctx.globalAlpha = amt;
  ctx.globalCompositeOperation = 'overlay';
  const ox = (hash1(frame) * 40) | 0, oy = (hash1(frame + 7) * 40) | 0;
  ctx.drawImage(c, -ox, -oy, W + 80, H + 80);
  ctx.restore();
};
FX.vignette = function (ctx, amt = 1) {
  ctx.save(); ctx.globalAlpha = amt; ctx.drawImage(FX.vig, 0, 0); ctx.restore();
};
// horizontal slice glitch on the whole frame
FX.glitch = function (ctx, amt, seed) {
  if (amt <= 0.001) return;
  const tmp = FX.tmp, g = tmp.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.drawImage(ctx.canvas, 0, 0);
  const rng = mulberry32(seed | 0);
  const n = Math.floor(4 + amt * 14);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(rng() * H), h = Math.floor(6 + rng() * 90 * amt);
    const dx = (rng() - 0.5) * 160 * amt;
    ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
    if (rng() < 0.35) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.5 * amt;
      ctx.fillStyle = rng() < 0.5 ? '#ff0040' : '#00e5ff';
      ctx.fillRect(dx * 0.5, y, W, Math.max(2, h * 0.25));
      ctx.restore();
    }
  }
  // RGB fringe: offset copies in screen mode
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.22 * amt;
  ctx.drawImage(tmp, 10 * amt, 0);
  ctx.globalAlpha = 0.18 * amt;
  ctx.drawImage(tmp, -10 * amt, 0);
  ctx.restore();
};
FX.scanlines = function (ctx, amt = 0.08, y0 = 0, y1 = H) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${amt})`;
  for (let y = y0; y < y1; y += 4) ctx.fillRect(0, y, W, 2);
  ctx.restore();
};
FX.flash = function (ctx, amt, col = '#ffffff') {
  if (amt <= 0) return;
  ctx.save(); ctx.globalAlpha = amt; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore();
};
