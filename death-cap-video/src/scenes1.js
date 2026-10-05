// Scene A (s1): dog vs mushroom detection cards. Scene B (s2): visual occlusion intro.
'use strict';

function drawCardBG(ctx, x, y, w, h, alpha = 1, tint = null) {
  ctx.save();
  ctx.globalAlpha = alpha;
  rr(ctx, x, y, w, h, 34);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(24,30,32,0.92)'); g.addColorStop(1, 'rgba(12,15,17,0.92)');
  ctx.fillStyle = g; ctx.fill();
  if (tint) { ctx.fillStyle = tint; ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function infoRow(ctx, x, y, label, value, p, col, o = {}) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(p * 3);
  setFont(ctx, 600, 23, 'JetBrains Mono', 3);
  ctx.fillStyle = C.dim; ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, y);
  setFont(ctx, 800, o.fs || 42, o.fam || 'Inter', -0.5);
  ctx.fillStyle = col;
  ctx.fillText(typeText(value, clamp(p * 1.3), value.length + 3), x, y + (o.fs || 42) + 8);
  ctx.restore();
}

function riskMeter(ctx, x, y, w, level, p, col) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(p * 3);
  setFont(ctx, 600, 23, 'JetBrains Mono', 3);
  ctx.fillStyle = C.dim; ctx.fillText('RISK', x, y);
  const n = 10, gap = 6, bw = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const on = i < Math.round(level * n * E.outCubic(clamp(p * 1.4)));
    ctx.fillStyle = on ? col : 'rgba(255,255,255,0.08)';
    if (on) { ctx.shadowColor = col; ctx.shadowBlur = 12; } else ctx.shadowBlur = 0;
    ctx.fillRect(x + i * (bw + gap), y + 14, bw, 22);
  }
  ctx.restore();
}

const SceneA = {
  draw(ctx, t) {
    const tHarm = T('s1', 'harmless'), tBut = T('s1', 'but'), tFalse = T('s1', 'false'), tToxic = T('s1', 'toxic'), tFatal = T('s1', 'fatal');
    const end = T('s2') - 0.12;
    const out = K(t, end - 0.35, 0.35, E.inCubic);

    // ---- card A (dog) ----
    const aIn = K(t, 0.05, 0.7, E.outExpo);
    const fatalP = K(t, tFatal - 0.02, 0.25, E.outCubic);
    const ax = lerp(-1000, 60, aIn), ay = 248;
    const cw = 960, ch = 540;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    const dimA = lerp(1, 0.35, fatalP);
    ctx.globalAlpha *= dimA;
    drawCardBG(ctx, ax, ay, cw, ch);
    // panel
    const px = ax + 24, py = ay + 24, ps = 492;
    ctx.save();
    rr(ctx, px, py, ps, ps, 22); ctx.clip();
    const pg = ctx.createRadialGradient(px + ps * 0.5, py + ps * 0.35, 20, px + ps * 0.5, py + ps * 0.5, ps * 0.8);
    pg.addColorStop(0, '#34404c'); pg.addColorStop(1, '#10151a');
    ctx.fillStyle = pg; ctx.fillRect(px, py, ps, ps);
    ctx.save();
    ctx.translate(px + ps / 2, py + ps / 2 + 26);
    const bob = Math.sin(t * 2.2) * 3;
    ctx.translate(0, bob);
    ctx.scale(0.74, 0.74);
    const blink = Math.max(win(t, 1.95, 2.13, 0.06, 0.08), win(t, 4.1, 4.28, 0.06, 0.08));
    drawDog(ctx, { blink });
    ctx.restore();
    // scanline
    const sp = K(t, 0.55, 0.8, E.inOutCubic);
    if (sp > 0 && sp < 1) {
      const sy = py + sp * ps;
      const sg = ctx.createLinearGradient(0, sy - 80, 0, sy);
      sg.addColorStop(0, rgba(C.ai, 0)); sg.addColorStop(1, rgba(C.ai, 0.35));
      ctx.fillStyle = sg; ctx.fillRect(px, sy - 80, ps, 80);
      ctx.fillStyle = C.ai; ctx.fillRect(px, sy - 2, ps, 3);
    }
    ctx.restore();
    drawBBox(ctx, px + 70, py + 70, ps - 140, ps - 120, K(t, 1.0, 0.6, E.linear), C.ai, { label: 'DOG', fs: 26 });
    // info column
    const ix = ax + 560, iw = 370;
    infoRow(ctx, ix, ay + 74, 'PREDICTION', 'Siberian Husky', K(t, 1.15, 0.6, E.linear), C.ink);
    drawConfBar(ctx, ix, ay + 190, iw, 0.88, K(t, 1.3, 0.9, E.linear), C.ai);
    infoRow(ctx, ix, ay + 262, 'ACTUALLY', 'Alaskan Malamute', K(t, tHarm - 0.55, 0.55, E.linear), C.amber, { fs: 36 });
    riskMeter(ctx, ix, ay + 370, iw, 0.1, K(t, tHarm, 0.5, E.linear), C.safe);
    drawStamp(ctx, ix + iw / 2, ay + 470, 'HARMLESS', C.safe, K(t, tHarm + 0.05, 0.35, E.linear), { fs: 58, rot: -0.06 });
    ctx.restore();

    // ---- card B (mushroom) ----
    const bIn = K(t, tBut - 0.12, 0.7, E.outExpo);
    if (bIn > 0) {
      const bx = lerp(1100, 60, bIn), by = 828;
      const shake = fatalP > 0 && fatalP < 1 ? (1 - fatalP) * 18 : 0;
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate(noise1(t * 40) * shake, noise1(t * 40 + 9) * shake);
      const toxicTint = K(t, tToxic, 0.5);
      drawCardBG(ctx, bx, by, cw, ch, 1, toxicTint > 0 ? `rgba(120,10,24,${0.25 * toxicTint})` : null);
      const qx = bx + 24, qy = by + 24;
      ctx.save();
      rr(ctx, qx, qy, ps, ps, 22); ctx.clip();
      const qg = ctx.createRadialGradient(qx + ps * 0.5, qy + ps * 0.3, 20, qx + ps * 0.5, qy + ps * 0.5, ps * 0.8);
      qg.addColorStop(0, '#2f3524'); qg.addColorStop(1, '#0e110b');
      ctx.fillStyle = qg; ctx.fillRect(qx, qy, ps, ps);
      // ground
      ctx.fillStyle = '#21180f'; ctx.fillRect(qx, qy + ps - 92, ps, 92);
      ctx.save();
      ctx.translate(qx + ps / 2, qy + ps - 80);
      ctx.scale(0.62, 0.62);
      drawDeathCap(ctx, {});
      ctx.restore();
      // leaves on ground
      const rng = mulberry32(5);
      for (let i = 0; i < 16; i++) {
        drawLeaf(ctx, qx + 20 + rng() * (ps - 40), qy + ps - 86 + rng() * 60, 16 + rng() * 14, rng() * TAU, LEAF_COLS[i % LEAF_COLS.length], rng() < 0.3 ? 1 : 0);
      }
      const sp2 = K(t, tBut + 0.35, 0.8, E.inOutCubic);
      if (sp2 > 0 && sp2 < 1) {
        const sy = qy + sp2 * ps;
        const sg = ctx.createLinearGradient(0, sy - 80, 0, sy);
        sg.addColorStop(0, rgba(C.ai, 0)); sg.addColorStop(1, rgba(C.ai, 0.35));
        ctx.fillStyle = sg; ctx.fillRect(qx, sy - 80, ps, 80);
        ctx.fillStyle = C.ai; ctx.fillRect(qx, sy - 2, ps, 3);
      }
      ctx.restore();
      const boxCol = t < tToxic ? C.safe : C.red;
      drawBBox(ctx, qx + 90, qy + 60, ps - 180, ps - 110, K(t, tBut + 0.55, 0.6, E.linear), boxCol, { label: t < tToxic ? 'EDIBLE' : 'DEATH CAP', fs: 26 });
      const ix2 = bx + 560;
      infoRow(ctx, ix2, by + 74, 'PREDICTION', 'Edible mushroom', K(t, tBut + 0.6, 0.6, E.linear), C.ink);
      drawConfBar(ctx, ix2, by + 190, iw, 0.94, K(t, tBut + 0.75, 0.9, E.linear), C.safe);
      // FALSE POSITIVE flag
      const fp = K(t, tFalse + 0.05, 0.3, E.linear);
      if (fp > 0) {
        const blinkOn = (t - tFalse) % 0.5 < 0.36 || t > tToxic;
        ctx.save(); ctx.globalAlpha = (blinkOn ? 1 : 0.35) * (1 - out);
        drawTag(ctx, ix2, by + 255, 'FALSE POSITIVE', C.red, fp, { fs: 26, textCol: '#fff' });
        ctx.restore();
      }
      infoRow(ctx, ix2, by + 300, 'ACTUALLY', 'Death cap', K(t, tToxic, 0.5, E.linear), C.red, { fs: 40 });
      riskMeter(ctx, ix2, by + 420, iw, 1.0, K(t, tToxic + 0.3, 0.9, E.linear), C.red);
      ctx.restore();
    }

    // ---- FATAL slam ----
    if (fatalP > 0) {
      const p = K(t, tFatal - 0.02, 0.32, E.outExpo);
      const sc = lerp(3.2, 1, p);
      const a = clamp((t - tFatal + 0.02) / 0.08) * (1 - out);
      const jitter = (1 - clamp((t - tFatal) / 0.5)) * 14;
      ctx.save();
      ctx.globalAlpha = a;
      // dark wash
      ctx.fillStyle = 'rgba(30,0,6,0.55)'; ctx.fillRect(0, 0, W, H);
      ctx.translate(540, 1020); ctx.scale(sc, sc);
      setFont(ctx, 400, 330, 'Anton', 6);
      ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#00d8ff'; fillTextC(ctx, 'FATAL', -jitter - 6, noise1(t * 30) * jitter);
      ctx.fillStyle = '#ff0030'; fillTextC(ctx, 'FATAL', jitter + 6, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowColor = C.red; ctx.shadowBlur = 60;
      ctx.fillStyle = '#ff2d42'; fillTextC(ctx, 'FATAL', 0, 0);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a * K(t, tFatal + 0.15, 0.3);
      drawSkull(ctx, 540, 760, 150 * lerp(0.6, 1, E.outBack(K(t, tFatal + 0.15, 0.4, E.linear))), C.red);
      ctx.restore();
    }
  },
};

// ---------------- Scene B: the trap ----------------
function drawLens(ctx, x, y, r, open, t, col = C.ai, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
  // housing
  ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, TAU);
  const hg = ctx.createLinearGradient(-r, -r, r, r);
  hg.addColorStop(0, '#2a3036'); hg.addColorStop(1, '#0b0d10');
  ctx.fillStyle = hg; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = rgba(col, 0.6); ctx.stroke();
  // rings
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(0, 0, r * (1.05 - i * 0.12), 0, TAU);
    ctx.strokeStyle = rgba(col, 0.25 + i * 0.1); ctx.lineWidth = 2; ctx.stroke();
  }
  // glass
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU);
  const gg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 2, 0, 0, r * 0.75);
  gg.addColorStop(0, '#2f6b86'); gg.addColorStop(0.5, '#0d2433'); gg.addColorStop(1, '#03080c');
  ctx.fillStyle = gg; ctx.fill();
  // aperture blades
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU); ctx.clip();
  const ap = lerp(0.05, 0.42, open) * r;
  for (let i = 0; i < 7; i++) {
    const a0 = i * TAU / 7 + t * 0.2;
    ctx.save(); ctx.rotate(a0);
    ctx.beginPath();
    ctx.moveTo(ap, -r); ctx.lineTo(ap + r * 0.9, -r * 0.2); ctx.lineTo(ap * 0.95, r * 0.35); ctx.closePath();
    ctx.fillStyle = 'rgba(8,10,12,0.92)'; ctx.fill();
    ctx.strokeStyle = 'rgba(80,90,100,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // pupil glow
  const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, ap * 1.2);
  pg.addColorStop(0, rgba(col, 0.9)); pg.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, ap * 1.2, 0, TAU); ctx.fill();
  // highlight
  ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.18, r * 0.09, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  ctx.restore();
}

function hazardBar(ctx, x, y, w, h, off = 0) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#16181a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.amber;
  for (let i = -2; i < w / 40 + 4; i++) {
    const xx = x + i * 40 + (off % 40);
    ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx + 20, y); ctx.lineTo(xx + 20 - h, y + h); ctx.lineTo(xx - h, y + h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function occluderSlab(ctx, x, y, w, h, t, a = 1) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = -10;
  ctx.fillStyle = '#121416'; ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  hazardBar(ctx, x, y, w, 16, t * 60);
  ctx.restore();
}

const SceneB = {
  draw(ctx, t) {
    const t0 = T('s2') - 0.12, end = T('s3') - 0.12;
    const tFail = T('s2', 'fails'), tTrap = T('s2', 'physical'), tVis = T('s2', 'visual'), tOcc = T('s2', 'occlusion');
    const inP = K(t, t0, 0.6, E.outExpo);
    const out = K(t, end - 0.3, 0.3, E.inCubic);
    const LX = 540, LY = 400;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    // label
    ctx.save();
    ctx.globalAlpha *= K(t, t0 + 0.3, 0.4);
    setFont(ctx, 600, 26, 'JetBrains Mono', 4);
    ctx.fillStyle = C.ai; ctx.textBaseline = 'middle';
    ctx.fillText(typeText('COMPUTER', K(t, t0 + 0.3, 0.4, E.linear), 3), LX + 180, LY - 22);
    ctx.fillText(typeText('VISION', K(t, t0 + 0.45, 0.4, E.linear), 4), LX + 180, LY + 16);
    ctx.fillStyle = rgba(C.ai, 0.5);
    ctx.fillRect(LX + 150, LY - 40, 3, 74);
    ctx.restore();

    // target silhouette
    const OX = 540, OY = 1010, OS = 0.5;
    const blockP = K(t, tTrap - 0.05, 0.55, E.outExpo);
    ctx.save();
    ctx.translate(OX, OY); ctx.scale(OS, OS);
    ctx.globalAlpha *= K(t, t0 + 0.5, 0.5) * lerp(1, 0.35, blockP);
    drawDeathCap(ctx, { silhouette: 'rgba(56,225,255,0.10)', noShadow: true });
    ctx.lineWidth = 4 / OS; ctx.strokeStyle = rgba(C.ai, 0.85);
    ctx.setLineDash(blockP > 0.5 ? [14, 12] : []);
    capPath(ctx); ctx.stroke(); stemPath(ctx); ctx.stroke(); volvaFrontPath(ctx); ctx.stroke(); ringPath(ctx); ctx.stroke();
    ctx.restore();

    // rays
    const rayP = K(t, t0 + 0.7, 0.7, E.outCubic);
    const fail = win(t, tFail, tFail + 0.9, 0.05, 0.3);
    const wallY = 640;
    if (rayP > 0) {
      const targets = [-200, -150, -100, -50, 0, 50, 100, 150, 200];
      ctx.save();
      for (let i = 0; i < targets.length; i++) {
        const tx = OX + targets[i] * OS * 1.05, ty = OY - 470 * OS;
        const sx = LX + (i - 4) * 9, sy = LY + 110;
        let ex = lerp(sx, tx, rayP), ey = lerp(sy, ty, rayP);
        if (blockP > 0) {
          const k = (wallY - sy) / (ty - sy);
          const bx = lerp(sx, tx, k);
          const wallLeft = lerp(-900, 120, blockP);
          if (bx < wallLeft + 840 && bx > wallLeft && ey > wallY) { ex = bx; ey = wallY; }
        }
        const flick = fail > 0 ? (hash1(i * 7 + Math.floor(t * 24)) > 0.5 ? 1 : 0.2) : 1;
        const col = fail > 0.3 ? C.red : C.ai;
        ctx.globalAlpha = (1 - out) * 0.75 * flick;
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.setLineDash([18, 10]); ctx.lineDashOffset = -t * 120;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU); ctx.fill();
        // impact sparks on wall
        if (ey === wallY && blockP > 0.2) {
          ctx.globalAlpha = (1 - out) * (0.5 + 0.5 * Math.sin(t * 30 + i));
          ctx.fillStyle = '#ffffff';
          for (let k2 = 0; k2 < 3; k2++) {
            const a = -Math.PI / 2 + (hash1(i * 13 + k2 + Math.floor(t * 20)) - 0.5) * 2.2;
            const d = 10 + hash1(i * 3 + k2 + Math.floor(t * 20)) * 26;
            ctx.fillRect(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 4, 4);
          }
        }
      }
      ctx.restore();
    }
    // ERROR tags while failing
    if (fail > 0) {
      ctx.save(); ctx.globalAlpha = fail * (1 - out);
      drawTag(ctx, 160, 820, 'ERR: NO MATCH', C.red, clamp((t - tFail) / 0.3), { fs: 24, textCol: '#fff' });
      drawTag(ctx, 640, 880, 'SIGNAL LOST', C.red, clamp((t - tFail - 0.2) / 0.3), { fs: 24, textCol: '#fff' });
      ctx.restore();
    }

    // wall
    if (blockP > 0) {
      const wx = lerp(-900, 120, blockP);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
      ctx.fillStyle = '#121416'; ctx.fillRect(wx, wallY, 840, 90);
      ctx.shadowBlur = 0;
      hazardBar(ctx, wx, wallY, 840, 22, t * 60);
      setFont(ctx, 800, 30, 'JetBrains Mono', 8);
      ctx.fillStyle = C.amber; ctx.textBaseline = 'middle';
      fillTextC(ctx, 'PHYSICAL BARRIER', wx + 420, wallY + 58);
      ctx.restore();
    }

    // lens on top
    drawLens(ctx, LX, LY, 110 * lerp(0.6, 1, E.outBack(K(t, t0, 0.6, E.linear))), lerp(0.2, 1, K(t, t0 + 0.2, 0.8)) * (fail > 0 ? 0.6 + 0.4 * Math.sin(t * 40) : 1), t, fail > 0.3 ? C.red : C.ai, inP);

    // title
    const vp = K(t, tVis - 0.05, 0.5, E.outExpo);
    if (vp > 0) {
      ctx.save();
      setFont(ctx, 400, 170, 'Anton', 4);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.ink;
      const y1 = 1290;
      ctx.globalAlpha = (1 - out) * clamp(vp * 2);
      ctx.save(); ctx.translate(0, (1 - vp) * 60);
      fillTextC(ctx, 'VISUAL', 540, y1 - 160);
      ctx.restore();
      const op = K(t, tOcc - 0.05, 0.5, E.outExpo);
      ctx.save(); ctx.globalAlpha = (1 - out) * clamp(op * 2);
      ctx.translate(0, (1 - op) * 60);
      ctx.shadowColor = C.ai; ctx.shadowBlur = 30; ctx.fillStyle = C.ai;
      fillTextC(ctx, 'OCCLUSION', 540, y1 + 20);
      ctx.restore();
      // occluding slab slides across lower part of OCCLUSION
      const bp = K(t, tOcc + 0.35, 0.6, E.inOutCubic);
      if (bp > 0) occluderSlab(ctx, 1080 - 1080 * bp, y1 - 34, 1100, 110, t, 1 - out);
      ctx.restore();
    }
    ctx.restore();
  },
};
