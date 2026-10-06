// Scene F (s10): exploded iso layers. Scene G (s11): neural net guesses. Scene H (s12): verdict.
'use strict';

let LAYER_IMGS, THUMB;
function initAssets3() {
  const S = 520;
  const mk = () => makeCanvas(S, S);
  // L1: surface (top-down photo)
  const l1 = mk(), g1 = l1.getContext('2d');
  g1.drawImage(FLOOR_TOP, (FLOOR_TOP.width - S) / 2, (FLOOR_TOP.height - S) / 2 - 40, S, S, 0, 0, S, S);
  drawCapTop(g1, S / 2, S / 2, 150, {});
  // L2: the underside of the cap (white gills), never visible from above
  const l2 = mk(), g2 = l2.getContext('2d');
  g2.fillStyle = '#16120f'; g2.fillRect(0, 0, S, S);
  g2.save(); g2.translate(S / 2, S / 2); drawUnderside(g2, 225, {}); g2.restore();
  // L3: buried base (soil + volva)
  const l3 = mk(), g3 = l3.getContext('2d');
  g3.drawImage(SOIL_TEX, 600, 100, 1040, 1040, 0, 0, S, S);
  g3.save(); g3.translate(S / 2, S / 2 + 150); g3.scale(1.9, 1.9);
  g3.globalAlpha = 0.95;
  drawDeathCap(g3, { noShadow: true });
  g3.restore();
  g3.fillStyle = 'rgba(30,18,10,0.35)'; g3.fillRect(0, 0, S, S);
  LAYER_IMGS = [l1, l2, l3];
  // circular thumbnail of the photo
  THUMB = makeCanvas(300, 300);
  const gt = THUMB.getContext('2d');
  gt.drawImage(l1, 60, 60, 400, 400, 0, 0, 300, 300);
}

function isoLayer(ctx, img, cx, cy, k, o = {}) {
  const S = img.width;
  const a = Math.cos(Math.PI / 6) * k, b = Math.sin(Math.PI / 6) * k;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.transform(a, b, -a, b, cx, cy);
  // thickness / shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 30;
  ctx.fillStyle = '#0a0c0d'; ctx.fillRect(-S / 2, -S / 2, S, S);
  ctx.restore();
  ctx.drawImage(img, -S / 2, -S / 2);
  if (o.dim) { ctx.fillStyle = `rgba(4,6,8,${o.dim})`; ctx.fillRect(-S / 2, -S / 2, S, S); }
  if (o.border) {
    ctx.strokeStyle = o.border; ctx.lineWidth = 6 / k;
    ctx.shadowColor = o.border; ctx.shadowBlur = 20;
    ctx.strokeRect(-S / 2, -S / 2, S, S);
  }
  if (o.cross > 0) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = C.red; ctx.lineWidth = 14 / k; ctx.lineCap = 'round';
    const p = o.cross, q = S * 0.36;
    ctx.beginPath(); ctx.moveTo(-q, -q); ctx.lineTo(lerp(-q, q, clamp(p * 2)), lerp(-q, q, clamp(p * 2)));
    if (p > 0.5) { ctx.moveTo(q, -q); ctx.lineTo(lerp(q, -q, clamp(p * 2 - 1)), lerp(-q, q, clamp(p * 2 - 1))); }
    ctx.stroke();
  }
  ctx.restore();
}

const SceneF = {
  draw(ctx, t) {
    const t0 = T('s10') - 0.12, t2d = T('s10', '2d'), tSurf = T('s10', 'surface'), tNever = T('s10', 'never');
    const tCap = T('s10', 'capture'), tInt = T('s10', 'underneath');
    const end = T('s11') - 0.12;
    const out = K(t, end - 0.3, 0.3, E.inCubic);
    const inP = K(t, t0, 0.6, E.outExpo);
    const expl = K(t, tSurf + 0.1, 0.9, E.inOutCubic);
    const k = 0.74;
    const ys = [lerp(830, 520, expl), 830, lerp(830, 1120, expl)];
    const hh = 520 * 0.5 * k;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(0, (1 - inP) * 200);
    // connector lines between layer corners
    if (expl > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      const hw = 520 * Math.cos(Math.PI / 6) * k;
      for (const dx of [-hw, hw]) { ctx.beginPath(); ctx.moveTo(540 + dx, ys[0]); ctx.lineTo(540 + dx, ys[2]); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(540, ys[0] + hh); ctx.lineTo(540, ys[2] + hh); ctx.stroke();
      ctx.restore();
    }
    const nev = K(t, tNever - 0.05, 0.5, E.linear);
    const intPulse = win(t, tInt - 0.1, end, 0.2, 0.3) * (0.6 + 0.4 * Math.sin(t * 10));
    // draw bottom to top
    isoLayer(ctx, LAYER_IMGS[2], 540, ys[2], k, { alpha: clamp(expl * 2), dim: 0.25, border: rgba(C.red, 0.8), cross: nev });
    isoLayer(ctx, LAYER_IMGS[1], 540, ys[1], k, { alpha: clamp(expl * 2), dim: 0.2, border: intPulse > 0 ? rgba(C.red, 0.5 + 0.5 * intPulse) : rgba(C.red, 0.8), cross: K(t, tNever + 0.15, 0.5, E.linear) });
    // camera beam onto the surface layer
    const beam = K(t, t2d - 0.1, 0.5);
    if (beam > 0) {
      ctx.save();
      ctx.globalAlpha = beam * 0.55;
      const hw = 520 * Math.cos(Math.PI / 6) * k;
      const g = ctx.createLinearGradient(0, 250, 0, ys[0]);
      g.addColorStop(0, rgba(C.ai, 0.05)); g.addColorStop(1, rgba(C.ai, 0.4));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(500, 250); ctx.lineTo(580, 250); ctx.lineTo(540 + hw, ys[0]); ctx.lineTo(540, ys[0] + hh); ctx.lineTo(540 - hw, ys[0]); ctx.closePath(); ctx.fill();
      ctx.restore();
      // camera dot
      ctx.save(); ctx.globalAlpha = beam;
      ctx.fillStyle = '#16191d'; rr(ctx, 480, 222, 120, 56, 14); ctx.fill();
      ctx.strokeStyle = C.ai; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(540, 250, 16, 0, TAU); ctx.fillStyle = '#0a2433'; ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    isoLayer(ctx, LAYER_IMGS[0], 540, ys[0], k, { border: rgba(C.ai, 0.95) });
    // labels at the right corner of each layer
    const hw = 520 * Math.cos(Math.PI / 6) * k;
    const lab = (y, txt, sub, col, p) => {
      if (p <= 0) return;
      drawTagAt(ctx, 540 + hw - 10, y + 6, txt, col, p, 'right', { fs: 26, textCol: col === C.ai ? '#03141c' : '#fff' });
      ctx.save(); ctx.globalAlpha = clamp(p * 2 - 0.5);
      setFont(ctx, 600, 22, 'JetBrains Mono', 2); ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(sub, 540 + hw - 14, y + 46);
      ctx.restore();
    };
    lab(ys[0] + hh * 0.2, '2D SURFACE IMAGE', 'captured ✓', C.ai, K(t, t2d, 0.5, E.linear));
    lab(ys[1] + hh * 0.2, 'GILLS UNDER THE CAP', 'never captured', C.red, K(t, tCap - 0.1, 0.5, E.linear) * clamp(expl * 2));
    lab(ys[2] + hh * 0.2, 'BURIED BASE', 'never captured', C.red, K(t, tCap + 0.2, 0.5, E.linear) * clamp(expl * 2));
    // big "2D"
    const p2 = K(t, t2d - 0.05, 0.4, E.outExpo) * (1 - K(t, tSurf + 0.4, 0.4));
    if (p2 > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(p2 * 2);
      setFont(ctx, 400, 260, 'Anton', 0);
      ctx.textBaseline = 'middle';
      ctx.translate(540, 830); ctx.scale(lerp(1.5, 1, p2), lerp(1.5, 1, p2));
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 50;
      ctx.fillStyle = C.ink; fillTextC(ctx, '2D', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  },
};

// ---------------- Scene G: the guess ----------------
const NET = (() => {
  const rows = [
    { y: 640, n: 5 }, { y: 830, n: 6 }, { y: 990, n: 4 },
  ];
  const nodes = rows.map(r => Array.from({ length: r.n }, (_, i) => ({ x: lerp(150, 930, r.n === 1 ? 0.5 : i / (r.n - 1)), y: r.y })));
  return { rows, nodes };
})();
const INPUTS = [['CAP', 'SHAPE', true], ['CAP', 'COLOR', true], ['GILLS', '', false], ['VOLVA', '', false], ['SPORE', 'PRINT', false]];

function ecg(ctx, x0, x1, y, t, amp, col, speed = 1) {
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 3) {
    const ph = ((x - x0) / 260 - t * speed) % 1;
    const p = ph < 0 ? ph + 1 : ph;
    let v = 0;
    if (p > 0.40 && p < 0.44) v = -0.15 * Math.sin((p - 0.40) / 0.04 * Math.PI);
    else if (p > 0.48 && p < 0.50) v = 0.25 * (p - 0.48) / 0.02;
    else if (p >= 0.50 && p < 0.53) v = lerp(0.25, -1.0, (p - 0.5) / 0.03);
    else if (p >= 0.53 && p < 0.56) v = lerp(-1.0, 0.35, (p - 0.53) / 0.03);
    else if (p >= 0.56 && p < 0.58) v = lerp(0.35, 0, (p - 0.56) / 0.02);
    else if (p > 0.66 && p < 0.74) v = -0.22 * Math.sin((p - 0.66) / 0.08 * Math.PI);
    const fade = Math.min(1, (x - x0) / 80, (x1 - x) / 80);
    x === x0 ? ctx.moveTo(x, y + v * amp * fade) : ctx.lineTo(x, y + v * amp * fade);
  }
  ctx.stroke();
  ctx.restore();
}

const SceneG = {
  draw(ctx, t) {
    const t0 = T('s11') - 0.12, tInfer = T('s11', 'infer'), tFeat = T('s11', 'features'), tSee = T('s11', 'see');
    const tLife = T('s11', 'life-or-death'), tGuess = T('s11', 'guesses'), tDec = T('s11', 'deceptive'), tCam = T('s11', 'camouflage');
    const end = T('s12') - 0.12;
    const out = K(t, end - 0.3, 0.3, E.inCubic);
    const inP = K(t, t0, 0.7, E.outExpo);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    // thumbnail
    const th = K(t, t0, 0.6, E.outBack);
    ctx.save();
    ctx.translate(540, 390); ctx.scale(th, th);
    ctx.beginPath(); ctx.arc(0, 0, 110, 0, TAU); ctx.save(); ctx.clip();
    ctx.drawImage(THUMB, -110, -110, 220, 220);
    // camouflage shimmer
    const cam = win(t, tDec - 0.1, end, 0.3, 0.3);
    if (cam > 0) {
      ctx.globalAlpha = cam * 0.55;
      const rng = mulberry32(Math.floor(t * 8));
      for (let i = 0; i < 18; i++) drawLeaf(ctx, (rng() - 0.5) * 220, (rng() - 0.5) * 220, 14 + rng() * 14, rng() * TAU, LEAF_COLS[i % 8], 0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = C.ai; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = (1 - out) * K(t, t0 + 0.2, 0.4);
    setFont(ctx, 600, 22, 'JetBrains Mono', 4); ctx.fillStyle = C.dim; ctx.textBaseline = 'middle';
    fillTextC(ctx, 'INPUT PHOTO', 540, 525);
    ctx.restore();
    if (cam > 0) drawTagAt(ctx, 660, 300, 'CAMOUFLAGED', C.amber, cam, 'left', { fs: 24 });

    // edges
    const ep = K(t, t0 + 0.2, 0.8, E.outCubic);
    ctx.save();
    ctx.globalAlpha = (1 - out) * ep;
    for (let l = 0; l < NET.nodes.length; l++) {
      const from = l === 0 ? [{ x: 540, y: 500 }] : NET.nodes[l - 1];
      for (let j = 0; j < NET.nodes[l].length; j++) {
        const to = NET.nodes[l][j];
        for (let i = 0; i < from.length; i++) {
          const f = from[i];
          const dead = l === 1 && !INPUTS[i][2];
          ctx.strokeStyle = dead ? 'rgba(255,45,66,0.12)' : 'rgba(56,225,255,0.16)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        }
      }
    }
    // to output
    for (const n of NET.nodes[2]) { ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(540, 1110); ctx.strokeStyle = 'rgba(56,225,255,0.16)'; ctx.stroke(); }
    ctx.restore();
    // pulses
    if (ep > 0.5) {
      ctx.save(); ctx.globalAlpha = 1 - out;
      for (let l = 1; l < NET.nodes.length + 1; l++) {
        const from = NET.nodes[l - 1];
        const to = l < NET.nodes.length ? NET.nodes[l] : [{ x: 540, y: 1110 }];
        for (let i = 0; i < from.length; i++) {
          if (l === 1 && !INPUTS[i][2]) continue;
          for (let j = 0; j < to.length; j++) {
            const ph = (t * 1.3 + hash2(i + l * 10, j)) % 1;
            const x = lerp(from[i].x, to[j].x, ph), y = lerp(from[i].y, to[j].y, ph);
            ctx.fillStyle = C.ai; ctx.globalAlpha = (1 - out) * 0.8 * Math.sin(ph * Math.PI);
            ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
          }
        }
      }
      ctx.restore();
    }
    // nodes
    for (let l = 0; l < NET.nodes.length; l++) {
      NET.nodes[l].forEach((n, i) => {
        const p = K(t, t0 + 0.2 + l * 0.15 + i * 0.04, 0.4, E.outBack);
        if (p <= 0) return;
        ctx.save(); ctx.globalAlpha = 1 - out;
        ctx.translate(n.x, n.y); ctx.scale(p, p);
        if (l === 0) {
          const ok = INPUTS[i][2];
          const flash = !ok ? win(t, tInfer - 0.1, end, 0.2, 0.3) : 0;
          ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU);
          if (ok) { ctx.fillStyle = rgba(C.ai, 0.2); ctx.fill(); ctx.strokeStyle = C.ai; ctx.lineWidth = 4; ctx.shadowColor = C.ai; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0; drawCheck(ctx, 0, 0, 40, C.ai, 1, 6); }
          else {
            ctx.fillStyle = 'rgba(10,12,14,0.9)'; ctx.fill();
            ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 30;
            ctx.strokeStyle = flash > 0 ? rgba(C.red, 0.5 + 0.5 * Math.abs(Math.sin(t * 8))) : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
            setFont(ctx, 800, 40, 'Inter', 0); ctx.fillStyle = flash > 0 ? C.red : 'rgba(255,255,255,0.4)'; ctx.textBaseline = 'middle';
            fillTextC(ctx, flash > 0 && (Math.floor(t * 4) % 2) ? '?' : '∅', 0, 2);
          }
          setFont(ctx, 700, 20, 'JetBrains Mono', 2); ctx.fillStyle = ok ? C.ink : (flash > 0 ? C.red : C.dim); ctx.textBaseline = 'top';
          fillTextC(ctx, INPUTS[i][0], 0, 60);
          if (INPUTS[i][1]) fillTextC(ctx, INPUTS[i][1], 0, 84);
        } else {
          ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU);
          ctx.fillStyle = '#0d1418'; ctx.fill();
          const act = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7 + l);
          ctx.strokeStyle = rgba(C.ai, 0.4 + 0.6 * act); ctx.lineWidth = 3; ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 9 * act, 0, TAU); ctx.fillStyle = rgba(C.ai, 0.8); ctx.fill();
        }
        ctx.restore();
      });
    }
    // missing-feature tag
    const mf = K(t, tFeat - 0.05, 0.5, E.linear) * (1 - out);
    if (mf > 0) {
      ctx.save(); ctx.globalAlpha = 1 - out;
      ctx.strokeStyle = rgba(C.red, 0.8); ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      const x0 = NET.nodes[0][2].x - 70, x1 = NET.nodes[0][4].x + 70;
      ctx.strokeRect(x0, 570, (x1 - x0) * E.outCubic(clamp(mf * 1.5)), 150);
      ctx.restore();
      drawTagAt(ctx, x1 - 4, 562, "CAN'T SEE · CAN'T INFER", C.red, mf, 'right', { fs: 22, textCol: '#fff' });
    }
    // output slot
    const op = K(t, t0 + 0.6, 0.5, E.outExpo);
    if (op > 0) {
      const bx = 540 - 280, by = 1110, bw = 560, bh = 150;
      ctx.save(); ctx.globalAlpha = (1 - out) * op;
      ctx.fillStyle = '#0a0e10'; rr(ctx, bx, by, bw, bh, 22); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; ctx.stroke();
      setFont(ctx, 600, 20, 'JetBrains Mono', 4); ctx.fillStyle = C.dim; ctx.textBaseline = 'middle';
      fillTextC(ctx, 'OUTPUT', 540, by - 22);
      // reel
      const sStart = tLife - 0.15, sStop = tCam + 0.2;
      let pos;
      if (t < sStart) pos = 0;
      else if (t < sStop) {
        const u = invlerp(sStart, sStop, t);
        pos = 14 * E.outCubic(u);
      } else pos = 14;
      const words = ['EDIBLE', 'LETHAL'];
      ctx.save(); rr(ctx, bx + 4, by + 4, bw - 8, bh - 8, 18); ctx.clip();
      setFont(ctx, 400, 104, 'Anton', 4);
      for (let k2 = Math.floor(pos) - 1; k2 <= Math.floor(pos) + 1; k2++) {
        const yy = by + bh / 2 + (k2 - pos) * bh;
        const w = words[((k2 % 2) + 2) % 2];
        const col = w === 'EDIBLE' ? C.safe : C.red;
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 24;
        if (t < sStart) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.shadowBlur = 0; fillTextC(ctx, '· · ·', 540, by + bh / 2 + 6); break; }
        fillTextC(ctx, w, 540, yy + 6);
      }
      ctx.restore();
      // motion blur bars
      ctx.restore();
      const gp = K(t, tGuess - 0.05, 0.4, E.linear) * (1 - out);
      if (gp > 0) drawStamp(ctx, 830, by - 20, 'GUESS', C.amber, gp, { fs: 54, rot: 0.12 });
    }
    // ECG
    const ep2 = K(t, tLife - 0.2, 0.5) * (1 - out);
    if (ep2 > 0) {
      ctx.save(); ctx.globalAlpha = ep2;
      ecg(ctx, 120, 960, 1345, t, 70, mixHex(C.safe, C.red, 0.5 + 0.5 * Math.sin(t * 6)), 1.4);
      ctx.restore();
    }
    ctx.restore();
  },
};

// ---------------- Scene H: the verdict ----------------
const SceneH = {
  draw(ctx, t, frame) {
    const t0 = T('s12') - 0.12, tDeadly = T('s12', 'deadly'), tMiss = T('s12', 'missing'), tBur = T('s12', 'buried');
    const tGill = T('s12', 'hidden'), tAI = T('s12', 'ai'), tConf = T('s12', 'confidently'), tLabels = T('s12', 'labels');
    const tLethal = T('s12', 'lethal'), tHaz = T('s12', 'hazard'), tSafe = T('s12', 'safe');
    const inP = K(t, t0, 0.8, E.outExpo);
    const PX = 540, PY = 835 + (1 - inP) * 1300, PW = 560, PH = 1140;
    const xray = win(t, tLethal - 0.05, tSafe - 0.08, 0.06, 0.12);
    const safeP = K(t, tSafe - 0.04, 0.3, E.linear);
    const phoneDim = K(t, tSafe, 0.4);
    ctx.save();
    ctx.globalAlpha = 1 - phoneDim * 0.55;
    drawPhone(ctx, PX, PY, PW, PH, (c, x, y, w, h) => {
      if (xray > 0.5) {
        // truth: red x-ray of the full mushroom
        c.fillStyle = '#16020a'; c.fillRect(x, y, w, h);
        c.save(); c.translate(x + w / 2, y + h * 0.74); c.scale(0.74, 0.74);
        drawDeathCap(c, { silhouette: 'rgba(255,45,66,0.18)', noShadow: true });
        c.lineWidth = 3; c.strokeStyle = C.red; c.shadowColor = C.red; c.shadowBlur = 20;
        capPath(c); c.stroke(); stemPath(c); c.stroke(); ringPath(c); c.stroke(); gillPath(c); c.stroke();
        c.lineWidth = 6; volvaFrontPath(c); c.stroke();
        c.restore();
        drawSkull(c, x + w / 2, y + h * 0.15, 90, C.red);
        setFont(c, 400, 70, 'Anton', 4); c.fillStyle = C.red; c.textBaseline = 'middle';
        fillTextC(c, 'LETHAL', x + w / 2, y + h * 0.245);
      } else {
        topDownView(c, x, y, w, h, t, { r: 150, still: true });
        // analyzing ring
        const an = K(t, t0 + 0.3, 1.5, E.inOutCubic);
        const cx = x + w / 2, cy = y + h * 0.45;
        if (t < tMiss) {
          c.save();
          c.strokeStyle = C.ai; c.lineWidth = 6; c.shadowColor = C.ai; c.shadowBlur = 16;
          c.beginPath(); c.arc(cx, cy, 190, -Math.PI / 2, -Math.PI / 2 + TAU * an); c.stroke();
          c.restore();
          drawTagAt(c, cx - 150, cy - 230, 'ANALYZING ' + Math.round(an * 100) + '%', C.ai, K(t, t0 + 0.3, 0.4, E.linear), 'left', { fs: 24 });
        } else {
          const col = t > tConf ? C.safe : C.ai;
          drawBBox(c, cx - 175, cy - 175, 350, 350, K(t, tMiss, 0.5, E.linear), col, { label: t > tConf ? 'EDIBLE' : 'CLASSIFYING', fs: 24 });
        }
        featureList(c, x + 60, y + h * 0.6, [
          ['CAP SHAPE', 'ok', t0 + 0.5], ['CAP COLOR', 'ok', t0 + 0.7],
          ['BURIED ROOT', 'NOT SEEN', tBur - 0.1], ['WHITE GILLS', 'NOT SEEN', tGill - 0.1],
        ], t, C.safe);
        // confidence bar at the top of screen
        drawConfBar(c, x + 50, y + h * 0.2, w - 100, 0.97, K(t, tConf - 0.1, 1.2, E.linear), C.safe);
      }
      drawViewfinderUI(c, x, y, w, h, t, {});
      if (xray > 0) { c.fillStyle = `rgba(255,30,60,${0.25 * xray})`; c.fillRect(x, y, w, h); }
    });
    ctx.restore();
    if (xray > 0) {
      FXREQ.glitch = Math.max(FXREQ.glitch, 0.6 * win(t, tLethal - 0.05, tLethal + 0.25, 0.05, 0.15) + 0.4 * win(t, tSafe - 0.25, tSafe - 0.02, 0.05, 0.1));
    }

    // ---- SAFE TO EAT ----
    if (safeP > 0) {
      const e = E.outExpo(safeP);
      const sc = lerp(2.6, 1, e);
      const hold = t - tSafe;
      // red truth flickers through near the end
      const flick = hold > 1.2 && (hash1(Math.floor(t * 14)) > 0.82) ? 1 : 0;
      const isLethal = flick && hold > 1.6;
      ctx.save();
      // dark wash
      ctx.fillStyle = `rgba(2,10,5,${0.72 * clamp(safeP * 3)})`; ctx.fillRect(0, 0, W, H);
      ctx.translate(540, 840); ctx.scale(sc, sc);
      ctx.globalAlpha = clamp(safeP * 3);
      const col = isLethal ? C.red : C.safe;
      // badge
      ctx.save();
      ctx.translate(0, -300);
      ctx.shadowColor = col; ctx.shadowBlur = 60;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 110, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      if (isLethal) drawSkull(ctx, 0, 6, 120, '#1a0206');
      else drawCheck(ctx, 0, 0, 110, '#03180b', clamp((hold + 0.1) / 0.35), 18);
      ctx.restore();
      setFont(ctx, 400, 230, 'Anton', 4);
      ctx.textBaseline = 'middle';
      const word1 = isLethal ? 'LETHAL' : 'SAFE TO';
      const word2 = isLethal ? 'HAZARD' : 'EAT';
      if (flick) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#00e1ff'; fillTextC(ctx, word1, -8, -20); fillTextC(ctx, word2, -8, 190);
        ctx.fillStyle = '#ff0033'; fillTextC(ctx, word1, 8, -20); fillTextC(ctx, word2, 8, 190);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.shadowColor = col; ctx.shadowBlur = 50; ctx.fillStyle = col;
      fillTextC(ctx, word1, 0, -20);
      fillTextC(ctx, word2, 0, 190);
      ctx.shadowBlur = 0;
      setFont(ctx, 700, 34, 'JetBrains Mono', 6);
      ctx.fillStyle = isLethal ? C.red : C.ink;
      fillTextC(ctx, isLethal ? 'ACTUAL: AMANITA PHALLOIDES' : 'AI CONFIDENCE  97%', 0, 345);
      ctx.restore();
      if (flick) FXREQ.glitch = Math.max(FXREQ.glitch, 0.55);
      if (hold >= 0 && hold < 0.3) { FXREQ.shake = Math.max(FXREQ.shake, 22 * (1 - hold / 0.3)); FXREQ.flash = 0.35 * (1 - hold / 0.3); FXREQ.flashCol = C.safe; }
    }
  },
};
