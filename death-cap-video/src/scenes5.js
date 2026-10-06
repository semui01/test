// Scene I (s9): flip the cap -> pure white gills -> white spore print -> warning sign.
'use strict';

let SPORE_PRINT;
const PRINT_R = 330; // gill radius the spore print canvas was drawn at
function initAssets4() {
  // radial white deposit left by the gills, with a clear hole where the stem stood
  const S = 760;
  const raw = makeCanvas(S, S), g = raw.getContext('2d');
  g.translate(S / 2, S / 2);
  const rng = mulberry32(404);
  // soft chalky base deposit
  const base = g.createRadialGradient(0, 0, PRINT_R * 0.16, 0, 0, PRINT_R * 0.97);
  base.addColorStop(0, 'rgba(250,248,242,0)'); base.addColorStop(0.1, 'rgba(250,248,242,0.55)');
  base.addColorStop(0.75, 'rgba(250,248,242,0.7)'); base.addColorStop(1, 'rgba(250,248,242,0.15)');
  g.fillStyle = base; g.beginPath(); g.arc(0, 0, PRINT_R, 0, TAU); g.fill();
  // denser streaks under each gill edge
  g.lineCap = 'round';
  const N = 300;
  for (let i = 0; i < N; i++) {
    const full = i % 2 === 0;
    const a = (i / N) * TAU + (rng() - 0.5) * 0.008;
    const r0 = PRINT_R * (full ? 0.18 + rng() * 0.03 : 0.5 + rng() * 0.2), r1 = PRINT_R * (0.9 + rng() * 0.07);
    g.strokeStyle = `rgba(255,253,248,${0.25 + rng() * 0.3})`;
    g.lineWidth = 2.5 + rng() * 2;
    g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
  }
  for (let i = 0; i < 9000; i++) {
    const a = rng() * TAU, r = PRINT_R * (0.17 + Math.pow(rng(), 0.6) * 0.86);
    g.fillStyle = `rgba(255,255,252,${0.1 + rng() * 0.3})`;
    g.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.6, 1.6);
  }
  SPORE_PRINT = makeCanvas(S, S);
  const g2 = SPORE_PRINT.getContext('2d');
  g2.filter = 'blur(2.4px)';
  g2.drawImage(raw, 0, 0);
  g2.filter = 'none';
  g2.globalCompositeOperation = 'destination-in';
  const fg = g2.createRadialGradient(S / 2, S / 2, PRINT_R * 0.15, S / 2, S / 2, PRINT_R * 1.02);
  fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.08, 'rgba(0,0,0,0.9)'); fg.addColorStop(0.85, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
  g2.fillStyle = fg; g2.fillRect(0, 0, S, S);
  g2.globalCompositeOperation = 'source-over';
}

// cap seen from below, centred at 0,0: free white gills, skirt-like ring, cut stem
function drawUnderside(ctx, R, o = {}) {
  const gill = o.gill || '#f5f1e7', line = o.line || 'rgba(140,128,104,0.5)';
  ctx.save();
  if (o.rot) ctx.rotate(o.rot);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
  const rg = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R);
  rg.addColorStop(0, '#b9b47c'); rg.addColorStop(1, '#6d743f');
  ctx.fillStyle = rg; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU);
  const gg = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R * 0.95);
  gg.addColorStop(0, mixHex(gill, '#000000', 0.12)); gg.addColorStop(0.35, gill); gg.addColorStop(0.85, gill); gg.addColorStop(1, mixHex(gill, '#000000', 0.18));
  ctx.fillStyle = gg; ctx.fill();
  ctx.save(); ctx.clip();
  // gills and the shorter gills (lamellulae) between them
  const N = 280;
  ctx.strokeStyle = line; ctx.lineWidth = Math.max(0.8, R * 0.0045);
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const r0 = R * (i % 2 === 0 ? 0.21 : i % 4 === 1 ? 0.5 : 0.72), r1 = R * 0.96;
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  ctx.stroke();
  // light sweep across the gill field
  if (o.sweepA > 0) {
    const cg = ctx.createConicGradient(o.sweep, 0, 0);
    cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.05, 'rgba(255,255,255,0.6)'); cg.addColorStop(0.1, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalAlpha *= o.sweepA;
    ctx.fillStyle = cg; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.restore();
  }
  // soft key light from the top left
  const sh = ctx.createLinearGradient(-R, -R, R, R);
  sh.addColorStop(0, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(40,30,10,0.16)');
  ctx.fillStyle = sh; ctx.fillRect(-R, -R, 2 * R, 2 * R);
  // ring (annulus) hanging around the stem
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU, r = R * (0.27 + 0.02 * Math.sin(a * 9 + 1) + 0.012 * Math.sin(a * 23));
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const ringG = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 0.3);
  ringG.addColorStop(0, '#fbf8f1'); ringG.addColorStop(1, '#ddd5c2');
  ctx.fillStyle = ringG; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = R * 0.05; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(150,138,110,0.5)'; ctx.lineWidth = Math.max(1, R * 0.004);
  ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    ctx.moveTo(Math.cos(a) * R * 0.13, Math.sin(a) * R * 0.13); ctx.lineTo(Math.cos(a + 0.05) * R * 0.26, Math.sin(a + 0.05) * R * 0.26);
  }
  ctx.stroke();
  // cut stem
  ctx.beginPath(); ctx.arc(0, 0, R * 0.11, 0, TAU);
  const sg = ctx.createRadialGradient(-R * 0.03, -R * 0.03, 0, 0, 0, R * 0.11);
  sg.addColorStop(0, '#fffdf8'); sg.addColorStop(1, '#e2dacb');
  ctx.fillStyle = sg; ctx.fill();
  ctx.strokeStyle = 'rgba(140,128,100,0.8)'; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R * 0.06, 0, TAU); ctx.strokeStyle = 'rgba(170,160,135,0.35)'; ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// side view of a picked cap (cap, gills, ring, stem cut below the ring); gill plane at 0,0
function drawPickedCap(ctx, k, gillGlow) {
  ctx.save();
  ctx.scale(k, k); ctx.translate(0, 452);
  ctx.save();
  ctx.beginPath(); ctx.rect(-260, -680, 520, 350); ctx.clip();
  drawDeathCap(ctx, { noShadow: true, hideVolva: true, gillGlow });
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, -331, 27, 6, 0, 0, TAU);
  ctx.fillStyle = '#e8e1d0'; ctx.fill();
  ctx.strokeStyle = 'rgba(140,128,100,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function drawPaperCard(ctx, cx, cy, S) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  rr(ctx, cx - S / 2, cy - S / 2, S, S, 18);
  const g = ctx.createLinearGradient(cx - S / 2, cy - S / 2, cx + S / 2, cy + S / 2);
  g.addColorStop(0, '#141417'); g.addColorStop(1, '#08080a');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.stroke();
  setFont(ctx, 600, 20, 'JetBrains Mono', 4);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textBaseline = 'middle';
  ctx.fillText('BLACK PAPER', cx - S / 2 + 26, cy + S / 2 - 28);
  ctx.restore();
}

function timelapseChip(ctx, cx, y, hours, a) {
  if (a <= 0) return;
  const w = 330, x = cx - w / 2;
  ctx.save();
  ctx.globalAlpha *= a;
  rr(ctx, x, y, w, 64, 32); ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
  ctx.strokeStyle = rgba(C.amber, 0.7); ctx.lineWidth = 2; ctx.stroke();
  const ccx = x + 36, ccy = y + 32;
  ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(ccx, ccy, 18, 0, TAU); ctx.stroke();
  const m = hours * TAU, hr = (hours / 12) * TAU;
  ctx.beginPath();
  ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.sin(m) * 14, ccy - Math.cos(m) * 14);
  ctx.moveTo(ccx, ccy); ctx.lineTo(ccx + Math.sin(hr) * 9, ccy - Math.cos(hr) * 9);
  ctx.stroke();
  setFont(ctx, 800, 24, 'JetBrains Mono', 2); ctx.fillStyle = C.amber; ctx.textBaseline = 'middle';
  ctx.fillText('TIME-LAPSE +' + Math.floor(hours) + 'H', x + 68, ccy + 1);
  ctx.restore();
}

const SceneI = {
  draw(ctx, t) {
    const t0 = T('s9') - 0.12, end = T('s10') - 0.12;
    const tFlip = T('s9', 'flipping'), tWhite = T('s9', 'white'), tGills = T('s9', 'gills');
    const tWhich = T('s9', 'which'), tDrop = T('s9', 'drop'), tSpore = T('s9', 'spore'), tPrint = T('s9', 'print');
    const tWarn = T('s9', 'warning');
    const out = K(t, end - 0.3, 0.3, E.inCubic);
    const CX = 540, CY = 740, R = 300;
    const kPrint = R / PRINT_R;
    ctx.save();
    ctx.globalAlpha = 1 - out;

    // black paper slides in under the cap
    const cardP = K(t, tWhich - 0.3, 0.55, E.outExpo);
    const cardY = lerp(2300, CY, cardP);
    if (cardP > 0) drawPaperCard(ctx, CX, cardY, 700);

    // the deposit builds over the time-lapse, hidden under the cap until it lifts
    const tlStart = tDrop + 0.12, tlEnd = tSpore - 0.15;
    const lift = K(t, tlEnd, 0.6, E.inOutCubic);
    if (t >= tDrop) {
      const dep = K(t, tlStart, tlEnd - tlStart, E.linear);
      ctx.save();
      ctx.globalAlpha *= 0.3 + 0.7 * dep;
      ctx.drawImage(SPORE_PRINT, CX - 380 * kPrint, cardY - 380 * kPrint, 760 * kPrint, 760 * kPrint);
      ctx.restore();
      // red warning ring on the finished print
      const wr = K(t, tWarn - 0.05, 0.3) * (0.6 + 0.4 * Math.sin(t * 12));
      if (wr > 0) {
        ctx.save(); ctx.globalAlpha *= wr;
        ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.shadowColor = C.red; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(CX, cardY, R * 1.02, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      // spores drifting out from under the rim during the time-lapse
      if (t < tlEnd + 0.4) {
        ctx.save();
        ctx.fillStyle = '#fbf9f2';
        for (let i = 0; i < 110; i++) {
          const ph = ((t - tlStart) * 1.6 + hash1(i * 3.7)) % 1;
          if (t < tlStart || ph < 0) continue;
          const a = hash1(i * 9.1) * TAU, r = R * (0.97 + 0.12 * ph);
          ctx.globalAlpha = (1 - out) * (1 - ph) * 0.8 * (1 - lift);
          ctx.fillRect(CX + Math.cos(a) * r, cardY + Math.sin(a) * r, 2.5, 2.5);
        }
        ctx.restore();
      }
    }

    // ---- the cap: side view -> underside -> face down on the paper ----
    const th1 = K(t, tFlip + 0.02, 0.7, E.inOutCubic) * Math.PI;
    const th2 = K(t, tWhich - 0.12, 0.55, E.inOutCubic) * Math.PI;
    const rot = (t - tFlip) * 0.12;
    const sweep = K(t, tWhite - 0.1, 0.9, E.inOutCubic);
    const underOpts = { rot, sweep: lerp(-1.2, 5.5, sweep), sweepA: win(t, tWhite - 0.1, tWhite + 0.8, 0.1, 0.2) };
    let sy, edge = 0;
    ctx.save();
    ctx.translate(CX, CY);
    if (th2 <= 0) {
      if (th1 < Math.PI / 2) {
        sy = Math.cos(th1);
        ctx.scale(1, Math.max(0.001, sy));
        drawPickedCap(ctx, R / 200, win(t, t0, tFlip + 0.3, 0.05, 0.3) * (0.7 + 0.3 * Math.sin(t * 8)));
      } else {
        sy = -Math.cos(th1);
        ctx.scale(1, Math.max(0.001, sy));
        drawUnderside(ctx, R, underOpts);
      }
    } else if (th2 < Math.PI / 2) {
      sy = Math.cos(th2);
      ctx.scale(1, Math.max(0.001, sy));
      drawUnderside(ctx, R, underOpts);
    } else {
      sy = -Math.cos(th2);
      // little settle when it lands, then the lift that reveals the print
      const settle = t > tDrop ? Math.sin(clamp((t - tDrop) / 0.25) * Math.PI) * 0.03 : 0;
      ctx.translate(0, cardY - CY - lift * 1150);
      ctx.scale(1 + lift * 0.25, (1 + lift * 0.25) * Math.max(0.001, sy) * (1 - settle));
      ctx.globalAlpha *= 1 - K(lift, 0.55, 0.45);
      drawCapTop(ctx, 0, 0, R, {});
    }
    ctx.restore();
    if (sy < 0.3 && (th1 > 0 && th1 < Math.PI || th2 > 0 && th2 < Math.PI)) edge = 1 - sy / 0.3;
    if (edge > 0) {
      ctx.save(); ctx.globalAlpha *= edge * 0.8;
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
      ctx.fillRect(CX - R, CY - 2, 2 * R, 4);
      ctx.restore();
    }

    // dust puff when the cap lands
    const puff = clamp((t - tDrop) / 0.45);
    if (t >= tDrop && puff < 1) {
      ctx.save();
      ctx.fillStyle = '#d8d2c4';
      for (let i = 0; i < 40; i++) {
        const a = hash1(i * 5.3) * TAU, r = R * (1 + 0.25 * E.outCubic(puff) * (0.5 + hash1(i)));
        ctx.globalAlpha = (1 - out) * (1 - puff) * 0.6;
        ctx.beginPath(); ctx.arc(CX + Math.cos(a) * r, cardY + Math.sin(a) * r, 2 + hash1(i * 2) * 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---- labels ----
    const gp = K(t, tWhite - 0.05, 0.8, E.linear) * (1 - K(t, tWhich - 0.25, 0.25));
    if (gp > 0) {
      const a = -0.9 + rot;
      callout(ctx, CX + Math.cos(a) * R * 0.62, CY + Math.sin(a) * R * 0.62, 700, 345, 'PURE WHITE GILLS', C.amber, gp, { fs: 28, t, alpha: 1 - out });
      // amber rim pulse on the gill field
      const pulse = win(t, tGills - 0.1, tWhich - 0.2, 0.15, 0.25) * (0.6 + 0.4 * Math.sin(t * 9));
      if (pulse > 0) {
        ctx.save(); ctx.globalAlpha *= pulse;
        ctx.strokeStyle = C.amber; ctx.lineWidth = 5; ctx.shadowColor = C.amber; ctx.shadowBlur = 24;
        ctx.beginPath(); ctx.arc(CX, CY, R * 0.95, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
    const hours = 6 * K(t, tlStart, tlEnd - tlStart, E.inOutQuad);
    timelapseChip(ctx, CX, 300, hours, K(t, tDrop, 0.25) * (1 - K(t, tlEnd, 0.2)));
    const pp = K(t, tPrint - 0.1, 0.8, E.linear);
    if (pp > 0) callout(ctx, CX - R * 0.5, cardY - R * 0.5, 560, 335, 'WHITE SPORE PRINT', C.amber, pp, { fs: 28, t, alpha: 1 - out });
    const wp = K(t, tWarn - 0.05, 0.35, E.linear);
    if (wp > 0) {
      drawStamp(ctx, 540, 1215, 'WARNING SIGN', C.red, wp, { fs: 92, rot: -0.05 });
      if (t < tWarn + 0.25) FXREQ.shake = Math.max(FXREQ.shake, 14 * (1 - (t - tWarn) / 0.25));
    }
    ctx.restore();
  },
};
