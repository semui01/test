// Scene C (s3 + s4a): death cap reveal, lookalike comparison, surface-pixel view.
// Scene D (s4b): top-down smartphone photo.
'use strict';

let STAGE, STAGE_SMALL, FLOOR_TOP;
function initAssets() {
  STAGE = makeCanvas(W, H);
  STAGE_SMALL = makeCanvas(W, H);
  STAGE_SMALL.getContext('2d', { willReadFrequently: true });
  FLOOR_TOP = makeForestFloor(700, 1400, 3, 1.2);
  if (typeof initAssets2 === 'function') initAssets2();
}

function nameCard(ctx, x, y, p, o = {}) {
  if (p <= 0) return;
  ctx.save();
  const e = E.outExpo(clamp(p));
  ctx.globalAlpha = clamp(p * 2.5) * (o.alpha ?? 1);
  setFont(ctx, 400, o.fs || 150, 'Anton', 3);
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y - (o.fs || 150) * 1.05, W, (o.fs || 150) * 1.15); ctx.clip();
  ctx.translate(0, (1 - e) * (o.fs || 150));
  ctx.shadowColor = rgba(C.red, 0.7); ctx.shadowBlur = 40;
  ctx.fillStyle = C.red;
  fillTextC(ctx, o.title || 'DEATH CAP', x, y);
  ctx.restore();
  const p2 = K(p, 0.25, 0.75, E.outCubic);
  setFont(ctx, 400, o.sub || 58, 'Instrument Serif', 0);
  ctx.font = `italic 400 ${o.sub || 58}px "Instrument Serif"`;
  ctx.globalAlpha *= p2;
  ctx.fillStyle = C.ink;
  fillTextC(ctx, o.latin || 'Amanita phalloides', x, y + 70 + (1 - p2) * 20);
  ctx.restore();
}

// leader-line callout: from anchor (ax,ay) to label at (lx,ly)
function callout(ctx, ax, ay, lx, ly, text, col, p, o = {}) {
  if (p <= 0) return;
  ctx.save();
  const e = E.outCubic(clamp(p * 1.6));
  ctx.globalAlpha = clamp(p * 4) * (o.alpha ?? 1);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ax, ay, 8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, 8 + 10 * ((o.t || 0) * 1.5 % 1), 0, TAU);
  ctx.globalAlpha *= 1 - ((o.t || 0) * 1.5 % 1); ctx.stroke();
  ctx.globalAlpha = clamp(p * 4) * (o.alpha ?? 1);
  const mx = lerp(ax, lx, 0.5), my = ly;
  ctx.beginPath(); ctx.moveTo(ax, ay);
  const ex = lerp(ax, lx, e), ey = lerp(ay, ly, e);
  if (e < 0.5) ctx.lineTo(lerp(ax, mx, e * 2), lerp(ay, my, e * 2));
  else { ctx.lineTo(mx, my); ctx.lineTo(lerp(mx, lx, (e - 0.5) * 2), ly); }
  ctx.stroke();
  const lp = clamp((p - 0.45) * 2.2);
  if (lp > 0) {
    const right = lx >= ax;
    drawTagAt(ctx, right ? lx + 6 : lx - 6, ly, text, col, lp, right ? 'left' : 'right', o);
  }
  ctx.restore();
}
function drawTagAt(ctx, x, y, label, col, p, align = 'left', o = {}) {
  const fs = o.fs || 30;
  ctx.save();
  setFont(ctx, 800, fs, 'JetBrains Mono', 1);
  const tw = textW(ctx, label) + fs * 0.9, th = fs * 1.55;
  const x0 = align === 'left' ? x : x - tw;
  const e = E.outExpo(p);
  ctx.beginPath();
  if (align === 'left') ctx.rect(x0, y - th / 2, tw * e, th); else ctx.rect(x0 + tw * (1 - e), y - th / 2, tw * e, th);
  ctx.fillStyle = col; ctx.fill();
  ctx.clip();
  ctx.fillStyle = o.textCol || '#05080a'; ctx.textBaseline = 'middle';
  ctx.fillText(typeText(label, clamp(p * 1.3), label.length), x0 + fs * 0.45, y + 2);
  ctx.restore();
}

const SceneC = {
  draw(ctx, t, frame) {
    const t0 = T('s3') - 0.12, tDeath = T('s3', 'death'), tHigh = T('s3', 'highly'), tAI = T('s3', 'ai');
    const tMist = T('s3', 'mistakes'), tHarm = T('s3', 'harmless');
    const t4 = T('s4a') - 0.12, tRel = T('s4a', 'relies'), tSurf = T('s4a', 'surface'), tPix = T('s4a', 'pixels');
    const end = T('s4b') - 0.12;

    // ---- mushroom placement ----
    const rise = K(t, t0, 0.9, E.outExpo);
    const cmpIn = K(t, tAI - 0.25, 0.8, E.inOutCubic);
    const cmpOut = K(t, t4 - 0.25, 0.6, E.inOutCubic);
    const cmp = cmpIn * (1 - cmpOut);
    const mx = lerp(540, 300, cmp), my = 1230 + (1 - rise) * 500, ms = lerp(1.12, 0.8, cmp) * lerp(0.85, 1, rise);

    // draw stage (mushroom + lookalike) into STAGE so it can be pixelated
    const sctx = STAGE.getContext('2d');
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, W, H);
    // spotlight cone
    const spot = rise;
    sctx.save();
    sctx.globalAlpha = spot * 0.9;
    const sg = sctx.createRadialGradient(mx, my - 300 * ms, 20, mx, my - 300 * ms, 600 * ms);
    sg.addColorStop(0, 'rgba(210,220,160,0.20)'); sg.addColorStop(1, 'rgba(210,220,160,0)');
    sctx.fillStyle = sg; sctx.fillRect(0, 0, W, H);
    sctx.restore();
    sctx.save();
    sctx.translate(mx, my); sctx.scale(ms, ms);
    drawDeathCap(sctx, { capGlow: 0 });
    sctx.restore();
    // lookalike
    const lx = lerp(1400, 790, cmpIn) + cmpOut * 700;
    if (cmp > 0.001) {
      sctx.save(); sctx.translate(lx, 1230); sctx.scale(0.8, 0.8);
      drawLookalike(sctx);
      sctx.restore();
    }

    // pixelation amount
    const pixP = K(t, tRel - 0.1, 1.1, E.inOutCubic);
    const pixOut = K(t, end - 0.45, 0.45, E.inCubic);
    let block = Math.round(Math.exp(lerp(Math.log(1), Math.log(40), pixP)));
    if (block > 1) {
      const sw = Math.ceil(W / block), sh = Math.ceil(H / block);
      const small = STAGE_SMALL.getContext('2d');
      small.setTransform(1, 0, 0, 1, 0, 0);
      small.clearRect(0, 0, W, H);
      small.imageSmoothingEnabled = true;
      small.drawImage(STAGE, 0, 0, sw, sh);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1 - pixOut;
      ctx.drawImage(STAGE_SMALL, 0, 0, sw, sh, 0, 0, sw * block, sh * block);
      ctx.restore();
      // grid
      const gp = K(t, tSurf - 0.1, 0.4);
      if (gp > 0) {
        ctx.save();
        ctx.globalAlpha = gp * 0.5 * (1 - pixOut);
        ctx.strokeStyle = rgba(C.ai, 0.5); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= W; x += block) { ctx.moveTo(x + 0.5, 240); ctx.lineTo(x + 0.5, 1400); }
        for (let y = 240 - (240 % block); y <= 1400; y += block) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
        ctx.stroke();
        ctx.restore();
        // pixel value readouts on a few cells over the mushroom
        const img = small.getImageData(0, 0, sw, sh).data;
        const rng = mulberry32(17);
        ctx.save();
        setFont(ctx, 600, 13, 'JetBrains Mono', 0);
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 70; i++) {
          const cx = Math.floor(rng() * sw), cy = Math.floor(lerp(14, 31, rng()));
          const k = (cy * sw + cx) * 4;
          if (img[k + 3] < 200) continue;
          const appear = K(t, tSurf + rng() * 0.8, 0.15);
          if (appear <= 0) continue;
          ctx.globalAlpha = appear * (1 - pixOut) * 0.95;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(cx * block + 2, cy * block + 2, block - 4, block - 4);
          ctx.fillStyle = '#ffffff';
          fillTextC(ctx, String(img[k]), cx * block + block / 2, cy * block + block * 0.32);
          ctx.fillStyle = '#9dffa8'; fillTextC(ctx, String(img[k + 1]), cx * block + block / 2, cy * block + block * 0.55);
          ctx.fillStyle = '#9ad8ff'; fillTextC(ctx, String(img[k + 2]), cx * block + block / 2, cy * block + block * 0.78);
        }
        ctx.restore();
      }
      // scanning cursor + readout
      const scanP = K(t, tSurf, 1.2, E.linear);
      if (scanP > 0 && pixOut < 1) {
        const cx = Math.floor(lerp(6, sw - 7, (scanP * 3) % 1)), cy = Math.floor(lerp(13, 30, Math.floor(scanP * 3) / 3 + 0.1));
        ctx.save();
        ctx.globalAlpha = 1 - pixOut;
        ctx.strokeStyle = C.ai; ctx.lineWidth = 4; ctx.shadowColor = C.ai; ctx.shadowBlur = 16;
        ctx.strokeRect(cx * block, cy * block, block, block);
        ctx.restore();
      }
      // headline
      const hp = K(t, tSurf - 0.05, 0.5, E.outExpo);
      if (hp > 0) {
        ctx.save();
        ctx.globalAlpha = (1 - pixOut) * clamp(hp * 2);
        ctx.fillStyle = 'rgba(3,10,14,0.82)';
        rr(ctx, 120, 280, 840, 150, 20); ctx.fill();
        ctx.strokeStyle = rgba(C.ai, 0.6); ctx.lineWidth = 2; ctx.stroke();
        setFont(ctx, 600, 26, 'JetBrains Mono', 6);
        ctx.fillStyle = C.ai; ctx.textBaseline = 'middle';
        fillTextC(ctx, 'INPUT  =  RGB VALUES', 540, 322);
        setFont(ctx, 400, 78, 'Anton', 3);
        ctx.fillStyle = C.ink;
        fillTextC(ctx, typeText('SURFACE PIXELS ONLY', hp, 9), 540, 384);
        ctx.restore();
      }
    } else {
      ctx.drawImage(STAGE, 0, 0);
    }

    // ---- overlays for s3 ----
    const ncP = K(t, tDeath - 0.1, 0.8, E.linear);
    const ncOut = K(t, tAI - 0.4, 0.4, E.inCubic);
    nameCard(ctx, 540, 400, ncP, { alpha: 1 - ncOut });
    // toxic callout
    const toxP = K(t, tHigh - 0.05, 0.8, E.linear) * (1 - ncOut);
    if (toxP > 0) {
      callout(ctx, mx + 120 * ms, my - 520 * ms, 830, my - 640 * ms, 'HIGHLY TOXIC', C.red, toxP, { textCol: '#fff', t, fs: 28 });
      callout(ctx, mx - 30 * ms, my - 300 * ms, 230, my - 250 * ms, 'α-AMANITIN', C.red, K(t, tHigh + 0.35, 0.8, E.linear) * (1 - ncOut), { textCol: '#fff', t, fs: 28 });
    }
    // comparison overlays
    if (cmp > 0.01) {
      const a = cmp;
      // AI detection box on death cap
      const bp = K(t, tMist - 0.1, 0.6, E.linear) * (1 - cmpOut);
      const lab = t < tHarm + 0.1 ? 'SCANNING…' : 'EDIBLE ✓';
      const col = t < tHarm + 0.1 ? C.ai : C.safe;
      drawBBox(ctx, mx - 175, my - 520, 350, 540, bp, col, { label: lab, fs: 28 });
      // truth labels under each
      ctx.save();
      ctx.globalAlpha = a;
      setFont(ctx, 800, 30, 'JetBrains Mono', 2);
      ctx.textBaseline = 'middle';
      const lp = K(t, tAI, 0.6) * (1 - cmpOut);
      ctx.globalAlpha = lp;
      ctx.fillStyle = C.red; fillTextC(ctx, 'DEATH CAP', mx, 1300);
      ctx.fillStyle = C.safe; fillTextC(ctx, 'EDIBLE SPECIES', lx, 1300);
      setFont(ctx, 600, 22, 'JetBrains Mono', 2);
      ctx.fillStyle = C.dim;
      fillTextC(ctx, 'lethal', mx, 1340); fillTextC(ctx, 'harmless', lx, 1340);
      ctx.restore();
      // match meter between
      const mp = K(t, tHarm - 0.1, 0.6, E.linear) * (1 - cmpOut);
      if (mp > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(mp * 3);
        const cx = 545, cy = 520;
        ctx.fillStyle = 'rgba(3,10,14,0.85)';
        rr(ctx, cx - 150, cy - 70, 300, 140, 20); ctx.fill();
        ctx.strokeStyle = rgba(C.safe, 0.7); ctx.lineWidth = 2; ctx.stroke();
        setFont(ctx, 600, 22, 'JetBrains Mono', 4);
        ctx.fillStyle = C.dim; ctx.textBaseline = 'middle';
        fillTextC(ctx, 'AI MATCH', cx, cy - 34);
        setFont(ctx, 400, 70, 'Anton', 2);
        ctx.fillStyle = C.safe; ctx.shadowColor = C.safe; ctx.shadowBlur = 20;
        fillTextC(ctx, Math.round(94 * E.outCubic(clamp(mp * 1.3))) + '%', cx, cy + 18);
        ctx.restore();
        // connection dashes
        ctx.save(); ctx.globalAlpha = clamp(mp * 3) * 0.8;
        ctx.strokeStyle = C.safe; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 60;
        ctx.beginPath(); ctx.moveTo(mx + 120, 650); ctx.lineTo(cx - 150, cy + 20); ctx.moveTo(cx + 150, cy + 20); ctx.lineTo(lx - 110, 700); ctx.stroke();
        ctx.restore();
      }
    }
    // s4a: "relies strictly" — AI eye tag
    const eyeP = K(t, tRel - 0.2, 0.5) * (1 - pixOut);
    if (eyeP > 0 && block <= 2) {
      drawBBox(ctx, mx - 220, my - 640, 440, 660, eyeP, C.ai, { label: 'AI INPUT', fs: 28 });
    }
  },
};

// ---------------- Scene D: top-down phone photo ----------------
function topDownView(ctx, x, y, w, h, t, o = {}) {
  // forest floor + cap seen from above, with hand jitter
  const jx = (o.still ? 0 : noise1(t * 0.9) * 10), jy = (o.still ? 0 : noise1(t * 0.8 + 4) * 10);
  const zoom = o.zoom || 1;
  ctx.save();
  ctx.translate(x + w / 2 + jx, y + h * 0.45 + jy);
  ctx.scale(zoom, zoom);
  ctx.drawImage(FLOOR_TOP, -FLOOR_TOP.width / 2, -FLOOR_TOP.height / 2);
  drawCapTop(ctx, 0, 0, o.r || 150, {});
  // some leaves over the cap edge for realism
  const rng = mulberry32(77);
  for (let i = 0; i < 5; i++) {
    const a = rng() * TAU, d = (o.r || 150) * (0.95 + rng() * 0.25);
    drawLeaf(ctx, Math.cos(a) * d, Math.sin(a) * d, 22 + rng() * 14, rng() * TAU, LEAF_COLS[i + 1], 0, 0.2);
  }
  ctx.restore();
  // lens vignette
  const vg = ctx.createRadialGradient(x + w / 2, y + h * 0.45, h * 0.2, x + w / 2, y + h * 0.45, h * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
}

function featureList(ctx, x, y, items, t, col) {
  // items: [label, status('ok'|'miss'), appearTime]
  ctx.save();
  for (let i = 0; i < items.length; i++) {
    const [label, st, ta] = items[i];
    const p = K(t, ta, 0.35, E.outCubic);
    if (p <= 0) continue;
    ctx.globalAlpha = clamp(p * 2);
    const yy = y + i * 58;
    ctx.save(); ctx.translate((1 - p) * 40, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, x, yy - 24, 420, 48, 12); ctx.fill();
    setFont(ctx, 700, 26, 'JetBrains Mono', 1);
    ctx.fillStyle = C.ink; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 62, yy + 1);
    const c = st === 'ok' ? C.safe : C.red;
    if (st === 'ok') drawCheck(ctx, x + 30, yy, 26, c, clamp(p * 1.5), 6);
    else drawCross(ctx, x + 30, yy, 20, c, clamp(p * 1.5), 6);
    if (st !== 'ok') { setFont(ctx, 800, 22, 'JetBrains Mono', 1); ctx.fillStyle = c; ctx.textAlign = 'right'; ctx.fillText(st, x + 405, yy + 1); ctx.textAlign = 'left'; }
    ctx.restore();
  }
  ctx.restore();
}

const SceneD = {
  draw(ctx, t, frame) {
    const t0 = T('s4b') - 0.12, tTop = T('s4b', 'top-down'), tPhoto = T('s4b', 'photo'), tShape = T('s4b', 'shape');
    const tPerf = T('s4b', 'perfectly'), tInn = T('s4b', 'innocent');
    const end = T('s5a') - 0.12;
    const inP = K(t, t0, 0.7, E.outExpo);
    const outP = K(t, end - 0.4, 0.4, E.inCubic);
    const PX = 540, PY = 835 + (1 - inP) * 1200 + outP * 1300, PW = 560, PH = 1140;
    const shot = t >= tPhoto;
    drawPhone(ctx, PX, PY, PW, PH, (c, x, y, w, h) => {
      topDownView(c, x, y, w, h, shot ? tPhoto : t, { r: 150 });
      if (!shot) {
        // focus reticle
        drawReticle(c, x + w / 2, y + h * 0.45, 60 + 8 * Math.sin(t * 6), t * 0.5, '#ffd34d', 0.9);
      }
      // TOP-DOWN chip
      const tp = K(t, tTop - 0.1, 0.4);
      if (tp > 0) {
        c.save(); c.globalAlpha = tp;
        c.fillStyle = 'rgba(0,0,0,0.6)'; rr(c, x + w / 2 - 150, y + h * 0.115, 300, 54, 27); c.fill();
        setFont(c, 700, 24, 'JetBrains Mono', 3); c.fillStyle = '#ffd34d'; c.textBaseline = 'middle';
        fillTextC(c, '▼ TOP-DOWN 90°', x + w / 2, y + h * 0.115 + 28);
        c.restore();
      }
      // AI scan after the shot
      if (shot) {
        const sp = K(t, tPhoto + 0.2, 0.7, E.inOutCubic);
        if (sp > 0 && sp < 1) {
          const sy = y + h * 0.1 + sp * h * 0.7;
          const g = c.createLinearGradient(0, sy - 120, 0, sy);
          g.addColorStop(0, rgba(C.ai, 0)); g.addColorStop(1, rgba(C.ai, 0.4));
          c.fillStyle = g; c.fillRect(x, sy - 120, w, 120);
          c.fillStyle = C.ai; c.fillRect(x, sy - 2, w, 3);
        }
        const bp = K(t, tPhoto + 0.6, 0.5, E.linear);
        const lab = t < tShape ? 'ANALYZING' : 'EDIBLE · 94%';
        drawBBox(c, x + w / 2 - 175, y + h * 0.45 - 175, 350, 350, bp, t < tShape ? C.ai : C.safe, { label: lab, fs: 26 });
        featureList(c, x + 60, y + h * 0.66, [
          ['CAP SHAPE', 'ok', tShape - 0.2], ['CAP COLOR', 'ok', tShape + 0.1], ['SURFACE', 'ok', tShape + 0.4],
        ], t, C.safe);
      }
      drawViewfinderUI(c, x, y, w, h, t, { press: win(t, tPhoto - 0.05, tPhoto + 0.2, 0.05, 0.15) });
      // shutter flash
      const fl = t >= tPhoto ? Math.pow(1 - clamp((t - tPhoto) / 0.35), 2) : 0;
      if (fl > 0) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(x, y, w, h); }
    });
    // innocent badge
    const ip = K(t, tPerf, 0.5, E.linear) * (1 - outP);
    if (ip > 0) {
      ctx.save();
      const e = E.outBack(clamp(ip * 1.4));
      ctx.translate(PX + 250, PY - 300); ctx.scale(e, e); ctx.rotate(0.12);
      ctx.shadowColor = C.safe; ctx.shadowBlur = 40;
      ctx.fillStyle = C.safe; ctx.beginPath(); ctx.arc(0, 0, 88, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      drawCheck(ctx, 0, -8, 80, '#04140a', clamp(ip * 2 - 0.3), 14);
      setFont(ctx, 800, 19, 'JetBrains Mono', 2); ctx.fillStyle = '#04140a'; ctx.textBaseline = 'middle';
      fillTextC(ctx, 'LOOKS SAFE', 0, 50);
      ctx.restore();
    }
  },
};
