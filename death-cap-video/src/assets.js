// Illustrated assets: death cap, lookalike, top-down cap, dog, leaves, phone, HUD.
'use strict';

// ---------------- DEATH CAP (side view) ----------------
// local coords: stem base at (0,0), up is -y. Height ~ 600 units.
const DC = {
  capTop: [0, -602], capRimL: [-200, -470], capRimR: [200, -470],
  ring: [0, -400], stemTop: -452, stemMid: [0, -260], volva: [0, -62], gills: [0, -452],
};

function capPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-200, -470);
  ctx.bezierCurveTo(-206, -548, -118, -604, 0, -604);
  ctx.bezierCurveTo(118, -604, 206, -548, 200, -470);
  ctx.bezierCurveTo(120, -478, -120, -478, -200, -470);
  ctx.closePath();
}
function gillPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-200, -470);
  ctx.bezierCurveTo(-120, -478, 120, -478, 200, -470);
  ctx.bezierCurveTo(150, -444, 70, -434, 0, -434);
  ctx.bezierCurveTo(-70, -434, -150, -444, -200, -470);
  ctx.closePath();
}
function stemPath(ctx, inset = 0) {
  ctx.beginPath();
  ctx.moveTo(-23 + inset, -458);
  ctx.bezierCurveTo(-26 + inset, -360, -30 + inset, -220, -32 + inset, -160);
  ctx.bezierCurveTo(-36 + inset, -110, -54 + inset, -70, -50 + inset, -30);
  ctx.quadraticCurveTo(-46, -6, 0, -4);
  ctx.quadraticCurveTo(46, -6, 50 - inset, -30);
  ctx.bezierCurveTo(54 - inset, -70, 36 - inset, -110, 32 - inset, -160);
  ctx.bezierCurveTo(30 - inset, -220, 26 - inset, -360, 23 - inset, -458);
  ctx.closePath();
}
function ringPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-24, -430);
  ctx.bezierCurveTo(-34, -418, -50, -398, -52, -372);
  const pts = [[-52, -372], [-36, -364], [-22, -371], [-8, -362], [8, -370], [22, -362], [36, -370], [52, -364]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 3, x1, y1);
  }
  ctx.bezierCurveTo(50, -396, 34, -418, 24, -430);
  ctx.closePath();
}
function volvaFrontPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-74, -116);
  ctx.bezierCurveTo(-96, -82, -92, -22, -54, -4);
  ctx.quadraticCurveTo(0, 10, 54, -4);
  ctx.bezierCurveTo(92, -22, 96, -82, 76, -112);
  const pts = [[76, -112], [58, -96], [46, -118], [28, -98], [12, -110], [-6, -94], [-22, -112], [-38, -98], [-52, -120], [-62, -104], [-74, -116]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    ctx.quadraticCurveTo((x0 + x1) / 2 + (i % 2 ? 3 : -3), (y0 + y1) / 2 + 4, x1, y1);
  }
  ctx.closePath();
}

// opts: { hideVolva, volvaGlow, ringGlow, capGlow, outline, silhouette, ghostVolva }
function drawDeathCap(ctx, o = {}) {
  ctx.save();
  const sil = o.silhouette; // color string → flat silhouette
  // ground shadow
  if (!o.noShadow) {
    ctx.save();
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 170);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.scale(1, 0.16); ctx.beginPath(); ctx.arc(0, 0, 170, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const showVolva = !o.hideVolva;
  // volva back (inner) ellipse
  if (showVolva) {
    ctx.save();
    ctx.fillStyle = sil || '#7d7462';
    ctx.beginPath(); ctx.ellipse(0, -108, 72, 15, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // stem
  stemPath(ctx);
  if (sil) ctx.fillStyle = sil;
  else {
    const g = ctx.createLinearGradient(-50, 0, 50, 0);
    g.addColorStop(0, '#b9b09a'); g.addColorStop(0.28, '#f7f3ea'); g.addColorStop(0.62, '#e9e2d1'); g.addColorStop(1, '#a89f88');
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (!sil) {
    // faint snakeskin chevrons
    ctx.save(); stemPath(ctx); ctx.clip();
    ctx.strokeStyle = 'rgba(120,126,80,0.13)'; ctx.lineWidth = 2;
    for (let y = -440; y < -120; y += 26) {
      ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(-10, y + 8); ctx.lineTo(0, y + 2); ctx.lineTo(14, y + 9); ctx.lineTo(40, y); ctx.stroke();
    }
    // shadow under cap & under ring
    let sg = ctx.createLinearGradient(0, -458, 0, -420);
    sg.addColorStop(0, 'rgba(40,36,20,0.55)'); sg.addColorStop(1, 'rgba(40,36,20,0)');
    ctx.fillStyle = sg; ctx.fillRect(-60, -460, 120, 42);
    sg = ctx.createLinearGradient(0, -368, 0, -330);
    sg.addColorStop(0, 'rgba(40,36,20,0.35)'); sg.addColorStop(1, 'rgba(40,36,20,0)');
    ctx.fillStyle = sg; ctx.fillRect(-60, -366, 120, 40);
    ctx.restore();
  }
  // gills
  gillPath(ctx);
  if (sil) ctx.fillStyle = sil;
  else {
    const g = ctx.createLinearGradient(0, -478, 0, -434);
    g.addColorStop(0, '#9c947f'); g.addColorStop(1, '#efe9da');
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (!sil) {
    ctx.save(); gillPath(ctx); ctx.clip();
    ctx.strokeStyle = 'rgba(120,110,88,0.55)'; ctx.lineWidth = 1.4;
    for (let i = -24; i <= 24; i++) {
      const a = i / 24;
      ctx.beginPath(); ctx.moveTo(a * 18, -452); ctx.lineTo(a * 205, -436 - 30 * (1 - Math.abs(a))); ctx.stroke();
    }
    ctx.restore();
  }
  // stem top re-draw over gills (stem enters cap)
  ctx.save();
  ctx.beginPath(); ctx.rect(-40, -458, 80, 30); ctx.clip();
  stemPath(ctx);
  if (sil) ctx.fillStyle = sil; else {
    const g = ctx.createLinearGradient(-30, 0, 30, 0);
    g.addColorStop(0, '#a99f88'); g.addColorStop(0.3, '#e6dfcd'); g.addColorStop(1, '#a1977f');
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.restore();
  // ring
  ringPath(ctx);
  if (sil) ctx.fillStyle = sil; else {
    const g = ctx.createLinearGradient(-64, 0, 64, 0);
    g.addColorStop(0, '#c3baa3'); g.addColorStop(0.3, '#fbf8f0'); g.addColorStop(0.7, '#ece5d4'); g.addColorStop(1, '#b0a790');
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (!sil) {
    ctx.strokeStyle = 'rgba(140,128,100,0.45)'; ctx.lineWidth = 1.5;
    for (const x of [-34, -17, 0, 17, 34]) { ctx.beginPath(); ctx.moveTo(x * 0.5, -424); ctx.quadraticCurveTo(x * 0.9, -400, x * 1.05, -368); ctx.stroke(); }
  }
  // cap
  capPath(ctx);
  if (sil) ctx.fillStyle = sil; else {
    const g = ctx.createRadialGradient(-70, -585, 10, -20, -520, 260);
    g.addColorStop(0, C.cap1); g.addColorStop(0.42, C.cap2); g.addColorStop(0.85, C.cap3); g.addColorStop(1, C.cap4);
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (!sil) {
    ctx.save(); capPath(ctx); ctx.clip();
    // radial fibrils
    const rng = mulberry32(7);
    for (let i = 0; i < 70; i++) {
      const a = lerp(-1, 1, i / 69) + (rng() - 0.5) * 0.02;
      ctx.strokeStyle = `rgba(48,54,24,${0.08 + rng() * 0.14})`;
      ctx.lineWidth = 1 + rng() * 1.6;
      ctx.beginPath();
      ctx.moveTo(a * 20, -604);
      ctx.quadraticCurveTo(a * 150, -590 + Math.abs(a) * 40, a * 205, -470);
      ctx.stroke();
    }
    // rim light band
    ctx.strokeStyle = 'rgba(230,230,190,0.35)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-200, -470); ctx.bezierCurveTo(-120, -478, 120, -478, 200, -470); ctx.stroke();
    // highlight
    const hg = ctx.createRadialGradient(-80, -580, 0, -80, -580, 120);
    hg.addColorStop(0, 'rgba(255,255,230,0.38)'); hg.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = hg; ctx.fillRect(-220, -620, 440, 160);
    ctx.restore();
  }
  // volva front
  if (showVolva) {
    volvaFrontPath(ctx);
    if (sil) ctx.fillStyle = sil; else {
      const g = ctx.createRadialGradient(-26, -70, 10, 0, -56, 110);
      g.addColorStop(0, '#f5efe0'); g.addColorStop(0.6, '#ddd3bb'); g.addColorStop(1, '#a99d82');
      ctx.fillStyle = g;
    }
    ctx.fill();
    if (!sil) {
      ctx.save(); volvaFrontPath(ctx); ctx.clip();
      ctx.strokeStyle = 'rgba(130,118,90,0.45)'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) {
        const x = -60 + i * 20;
        ctx.beginPath(); ctx.moveTo(x, -104); ctx.bezierCurveTo(x * 1.1, -70, x * 0.9, -30, x * 0.6, -2); ctx.stroke();
      }
      ctx.restore();
    }
  }
  // glows / highlights
  if (o.volvaGlow > 0) glowOutline(ctx, volvaFrontPath, o.volvaColor || C.amber, o.volvaGlow);
  if (o.ringGlow > 0) glowOutline(ctx, ringPath, o.ringColor || C.amber, o.ringGlow);
  if (o.gillGlow > 0) glowOutline(ctx, gillPath, o.gillColor || C.amber, o.gillGlow);
  if (o.capGlow > 0) glowOutline(ctx, capPath, o.capColor || C.ai, o.capGlow);
  if (o.ghostVolva > 0) {
    ctx.save();
    ctx.globalAlpha = o.ghostVolva;
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -(o.dashOff || 0);
    ctx.strokeStyle = o.ghostColor || C.amber; ctx.lineWidth = 4;
    volvaFrontPath(ctx); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function glowOutline(ctx, pathFn, col, amt) {
  ctx.save();
  ctx.globalAlpha = clamp(amt);
  ctx.shadowColor = col; ctx.shadowBlur = 30;
  ctx.strokeStyle = col; ctx.lineWidth = 5;
  pathFn(ctx); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = clamp(amt) * 0.6;
  pathFn(ctx); ctx.stroke();
  ctx.restore();
}

// --------------- EDIBLE LOOKALIKE (side) ---------------
function lookCapPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-195, -440);
  ctx.bezierCurveTo(-200, -500, -130, -528, -40, -522);
  ctx.quadraticCurveTo(0, -512, 40, -522);
  ctx.bezierCurveTo(130, -528, 200, -500, 195, -440);
  ctx.bezierCurveTo(120, -450, -120, -450, -195, -440);
  ctx.closePath();
}
function drawLookalike(ctx, o = {}) {
  ctx.save();
  const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
  sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.fillStyle = sg; ctx.scale(1, 0.16); ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.fill(); ctx.restore();
  // stem: straight, no ring, no volva
  ctx.beginPath();
  ctx.moveTo(-34, -444); ctx.bezierCurveTo(-38, -300, -42, -80, -40, -14);
  ctx.quadraticCurveTo(0, 6, 40, -14);
  ctx.bezierCurveTo(42, -80, 38, -300, 34, -444); ctx.closePath();
  const g = ctx.createLinearGradient(-42, 0, 42, 0);
  g.addColorStop(0, '#bdb5a2'); g.addColorStop(0.3, '#f8f5ee'); g.addColorStop(0.7, '#ebe6da'); g.addColorStop(1, '#aaa290');
  ctx.fillStyle = g; ctx.fill();
  // gills
  ctx.beginPath();
  ctx.moveTo(-195, -440); ctx.bezierCurveTo(-120, -450, 120, -450, 195, -440);
  ctx.bezierCurveTo(140, -416, 60, -410, 0, -410); ctx.bezierCurveTo(-60, -410, -140, -416, -195, -440);
  ctx.fillStyle = '#ece7da'; ctx.fill();
  // cap
  lookCapPath(ctx);
  const cg = ctx.createRadialGradient(-60, -510, 10, 0, -480, 240);
  cg.addColorStop(0, '#b9cc8a'); cg.addColorStop(0.5, '#86a05a'); cg.addColorStop(1, '#4c6233');
  ctx.fillStyle = cg; ctx.fill();
  ctx.save(); lookCapPath(ctx); ctx.clip();
  const rng = mulberry32(31);
  ctx.fillStyle = 'rgba(40,60,25,0.12)';
  for (let i = 0; i < 46; i++) {
    const x = (rng() - 0.5) * 380, y = -520 + rng() * 80;
    ctx.beginPath(); ctx.ellipse(x, y, 8 + rng() * 16, 4 + rng() * 6, rng() * 3, 0, TAU); ctx.fill();
  }
  const hg = ctx.createRadialGradient(-70, -505, 0, -70, -505, 110);
  hg.addColorStop(0, 'rgba(255,255,230,0.32)'); hg.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.fillStyle = hg; ctx.fillRect(-200, -540, 400, 120);
  ctx.restore();
  ctx.restore();
}

// --------------- TOP-DOWN CAP ---------------
function drawCapTop(ctx, x, y, r, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  // drop shadow
  const sh = ctx.createRadialGradient(r * 0.12, r * 0.16, r * 0.6, r * 0.12, r * 0.16, r * 1.22);
  sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(r * 0.12, r * 0.16, r * 1.22, 0, TAU); ctx.fill();
  // body
  ctx.beginPath();
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const rr2 = r * (1 + 0.025 * Math.sin(a * 5 + 1) + 0.015 * Math.sin(a * 11));
    i ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.05, -r * 0.05, 0, 0, 0, r);
  g.addColorStop(0, '#5d6634'); g.addColorStop(0.25, '#7f8a48'); g.addColorStop(0.7, '#a9b06d'); g.addColorStop(0.93, '#cfcf98'); g.addColorStop(1, '#b9b884');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  const rng = mulberry32(11);
  for (let i = 0; i < 220; i++) {
    const a = rng() * TAU;
    const r0 = r * (0.08 + rng() * 0.2), r1 = r * (0.85 + rng() * 0.15);
    ctx.strokeStyle = `rgba(52,58,26,${0.06 + rng() * 0.16})`;
    ctx.lineWidth = 0.8 + rng() * 1.8;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.quadraticCurveTo(Math.cos(a + 0.06) * (r0 + r1) / 2, Math.sin(a + 0.06) * (r0 + r1) / 2, Math.cos(a + 0.03) * r1, Math.sin(a + 0.03) * r1);
    ctx.stroke();
  }
  const hg = ctx.createRadialGradient(-r * 0.38, -r * 0.42, 0, -r * 0.38, -r * 0.42, r * 0.7);
  hg.addColorStop(0, 'rgba(255,255,235,0.32)'); hg.addColorStop(1, 'rgba(255,255,235,0)');
  ctx.fillStyle = hg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  const eg = ctx.createRadialGradient(0, 0, r * 0.82, 0, 0, r * 1.02);
  eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(30,30,10,0.35)');
  ctx.fillStyle = eg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  ctx.restore();
}

// --------------- LEAVES ---------------
const LEAF_COLS = ['#c8642b', '#a8451e', '#d89a3a', '#7a4a22', '#b5772d', '#8c3a1a', '#6a3d1c', '#c7852f'];
function drawLeaf(ctx, x, y, s, rot, col, type = 0, curl = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.scale(1, 1 - curl * 0.5);
  ctx.beginPath();
  const wd = type === 1 ? 0.32 : 0.58;
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s * wd, -s * 0.6, s * wd, s * 0.45, 0, s);
  ctx.bezierCurveTo(-s * wd, s * 0.45, -s * wd, -s * 0.6, 0, -s);
  const g = ctx.createLinearGradient(-s * 0.5, -s, s * 0.5, s);
  g.addColorStop(0, mixHex(col, '#ffffff', 0.12)); g.addColorStop(1, mixHex(col, '#000000', 0.35));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = mixHex(col, '#000000', 0.45); ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, s * 1.25); ctx.stroke();
  ctx.lineWidth = Math.max(0.6, s * 0.025);
  for (let i = -3; i <= 3; i++) {
    if (!i) continue;
    const yy = i * s * 0.22;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(Math.sign(i) * 0 + s * wd * 0.75, yy - s * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(-s * wd * 0.75, yy - s * 0.25); ctx.stroke();
  }
  ctx.restore();
}

// static forest floor texture (top-down)
function makeForestFloor(w, h, seed = 3, density = 1) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#2a2016'); bg.addColorStop(1, '#1c150f');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const rng = mulberry32(seed);
  // soil specks
  for (let i = 0; i < 2500 * density; i++) {
    g.fillStyle = `rgba(${90 + rng() * 60},${70 + rng() * 40},${40 + rng() * 30},${0.15 + rng() * 0.25})`;
    g.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 3);
  }
  // moss patches
  for (let i = 0; i < 40 * density; i++) {
    const x = rng() * w, y = rng() * h, r = 10 + rng() * 40;
    const mg = g.createRadialGradient(x, y, 0, x, y, r);
    mg.addColorStop(0, 'rgba(70,95,40,0.55)'); mg.addColorStop(1, 'rgba(70,95,40,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // twigs
  for (let i = 0; i < 14 * density; i++) {
    g.strokeStyle = `rgba(${60 + rng() * 40},${45 + rng() * 25},${30},0.9)`;
    g.lineWidth = 2 + rng() * 4; g.lineCap = 'round';
    const x = rng() * w, y = rng() * h, a = rng() * TAU, l = 40 + rng() * 120;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.3) * l / 2, y + Math.sin(a + 0.3) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // leaves
  for (let i = 0; i < 160 * density; i++) {
    const col = LEAF_COLS[Math.floor(rng() * LEAF_COLS.length)];
    g.save(); g.globalAlpha = 0.55 + rng() * 0.45;
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
    drawLeaf(g, rng() * w, rng() * h, 18 + rng() * 34, rng() * TAU, col, rng() < 0.3 ? 1 : 0, rng() * 0.4);
    g.restore();
  }
  return c;
}

// --------------- DOG (front, stylised husky) ---------------
function drawDog(ctx, o = {}) {
  ctx.save();
  const blink = o.blink || 0;
  // chest
  ctx.beginPath();
  ctx.moveTo(-230, 330); ctx.bezierCurveTo(-210, 180, -120, 110, 0, 110); ctx.bezierCurveTo(120, 110, 210, 180, 230, 330); ctx.closePath();
  let g = ctx.createLinearGradient(0, 110, 0, 330);
  g.addColorStop(0, '#d9dce1'); g.addColorStop(1, '#a7adb6');
  ctx.fillStyle = g; ctx.fill();
  // neck ruff (gray sides)
  ctx.beginPath();
  ctx.moveTo(-230, 330); ctx.bezierCurveTo(-225, 200, -190, 120, -150, 80); ctx.lineTo(-90, 150); ctx.bezierCurveTo(-140, 200, -170, 260, -170, 330); ctx.closePath();
  ctx.moveTo(230, 330); ctx.bezierCurveTo(225, 200, 190, 120, 150, 80); ctx.lineTo(90, 150); ctx.bezierCurveTo(140, 200, 170, 260, 170, 330); ctx.closePath();
  ctx.fillStyle = '#5c6470'; ctx.fill();
  // ears
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 168, -96); ctx.quadraticCurveTo(s * 150, -230, s * 112, -292); ctx.quadraticCurveTo(s * 100, -300, s * 88, -286);
    ctx.quadraticCurveTo(s * 60, -230, s * 40, -150); ctx.closePath();
    ctx.fillStyle = '#3d434d'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 140, -120); ctx.quadraticCurveTo(s * 128, -210, s * 108, -258); ctx.quadraticCurveTo(s * 80, -210, s * 70, -150); ctx.closePath();
    ctx.fillStyle = '#d8cfcb'; ctx.fill();
  }
  // head
  ctx.beginPath();
  ctx.moveTo(0, -180);
  ctx.bezierCurveTo(95, -182, 168, -118, 182, -12);
  ctx.bezierCurveTo(192, 70, 120, 150, 0, 168);
  ctx.bezierCurveTo(-120, 150, -192, 70, -182, -12);
  ctx.bezierCurveTo(-168, -118, -95, -182, 0, -180);
  g = ctx.createRadialGradient(-40, -120, 10, 0, -40, 230);
  g.addColorStop(0, '#7a8391'); g.addColorStop(1, '#474e59');
  ctx.fillStyle = g; ctx.fill();
  // white mask
  ctx.beginPath();
  ctx.moveTo(0, -150);
  ctx.bezierCurveTo(12, -112, 16, -84, 34, -66);
  ctx.bezierCurveTo(84, -84, 136, -50, 158, 14);
  ctx.bezierCurveTo(160, 92, 100, 152, 0, 164);
  ctx.bezierCurveTo(-100, 152, -160, 92, -158, 14);
  ctx.bezierCurveTo(-136, -50, -84, -84, -34, -66);
  ctx.bezierCurveTo(-16, -84, -12, -112, 0, -150);
  g = ctx.createLinearGradient(0, -150, 0, 164);
  g.addColorStop(0, '#f4f5f7'); g.addColorStop(1, '#d4d8de');
  ctx.fillStyle = g; ctx.fill();
  // eyebrow spots
  ctx.fillStyle = '#f7f8fa';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 62, -88, 20, 12, s * 0.3, 0, TAU); ctx.fill(); }
  // eyes
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 72, -24);
    ctx.rotate(s * -0.12);
    ctx.scale(1, 1 - blink * 0.92);
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 21, 0, 0, TAU); ctx.fillStyle = '#20232a'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, 0, 0, TAU);
    const ig = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    ig.addColorStop(0, '#bfeeff'); ig.addColorStop(0.6, '#5ec2f2'); ig.addColorStop(1, '#2a6f9a');
    ctx.fillStyle = ig; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU); ctx.fillStyle = '#0c0d10'; ctx.fill();
    ctx.beginPath(); ctx.arc(-7, -6, 4.5, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }
  // muzzle shading
  ctx.beginPath(); ctx.ellipse(0, 78, 82, 62, 0, 0, TAU);
  g = ctx.createRadialGradient(0, 70, 10, 0, 80, 90);
  g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fill();
  // nose
  ctx.beginPath();
  ctx.moveTo(-32, 48); ctx.quadraticCurveTo(0, 36, 32, 48); ctx.quadraticCurveTo(34, 64, 0, 82); ctx.quadraticCurveTo(-34, 64, -32, 48);
  ctx.fillStyle = '#16181c'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-8, 50, 10, 5, -0.2, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  // mouth
  ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 82); ctx.lineTo(0, 104);
  ctx.quadraticCurveTo(-16, 120, -38, 110); ctx.moveTo(0, 104); ctx.quadraticCurveTo(16, 120, 38, 110); ctx.stroke();
  // tongue
  ctx.beginPath(); ctx.moveTo(-16, 113); ctx.quadraticCurveTo(0, 150, 16, 113); ctx.quadraticCurveTo(0, 120, -16, 113);
  ctx.fillStyle = '#e8737d'; ctx.fill();
  ctx.restore();
}

// --------------- PHONE ---------------
function drawPhone(ctx, x, y, w, h, contentFn, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  const r = w * 0.13;
  // shadow
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  rr(ctx, -w / 2, -h / 2, w, h, r); ctx.fillStyle = '#0d0f12'; ctx.fill(); ctx.restore();
  // metallic frame
  rr(ctx, -w / 2, -h / 2, w, h, r);
  const fg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  fg.addColorStop(0, '#5a6068'); fg.addColorStop(0.3, '#1d2026'); fg.addColorStop(0.7, '#2b2f36'); fg.addColorStop(1, '#6c727a');
  ctx.lineWidth = 6; ctx.strokeStyle = fg; ctx.stroke();
  // screen
  const b = w * 0.035;
  rr(ctx, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, r - b);
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#000'; ctx.fillRect(-w / 2, -h / 2, w, h);
  if (contentFn) contentFn(ctx, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b);
  // glass sheen
  const sg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  sg.addColorStop(0, 'rgba(255,255,255,0.10)'); sg.addColorStop(0.35, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = sg; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
  // dynamic island
  rr(ctx, -w * 0.14, -h / 2 + b + h * 0.014, w * 0.28, h * 0.032, h * 0.016);
  ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
}

// camera viewfinder chrome inside a phone screen
function drawViewfinderUI(ctx, x, y, w, h, t, o = {}) {
  ctx.save();
  // thirds grid
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + w * i / 3, y + h * 0.1); ctx.lineTo(x + w * i / 3, y + h * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.1 + h * 0.7 * i / 3); ctx.lineTo(x + w, y + h * 0.1 + h * 0.7 * i / 3); ctx.stroke();
  }
  // top bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h * 0.1);
  setFont(ctx, 600, Math.round(w * 0.04), 'JetBrains Mono');
  ctx.fillStyle = '#ffd34d'; ctx.textBaseline = 'middle';
  ctx.fillText('HDR', x + w * 0.08, y + h * 0.065);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('1×', x + w * 0.82, y + h * 0.065);
  // bottom bar
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
  setFont(ctx, 700, Math.round(w * 0.038), 'Inter', 1);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  fillTextC(ctx, 'VIDEO', x + w * 0.3, y + h * 0.83);
  ctx.fillStyle = '#ffd34d';
  fillTextC(ctx, 'PHOTO', x + w * 0.5, y + h * 0.83);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  fillTextC(ctx, 'PORTRAIT', x + w * 0.72, y + h * 0.83);
  // shutter
  const sx = x + w / 2, sy = y + h * 0.91, sr = w * 0.085;
  const press = o.press || 0;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.012; ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy, sr * (0.8 - press * 0.12), 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
}

// --------------- HUD ---------------
// detection box with corner brackets. p: 0..1 intro progress
function drawBBox(ctx, x, y, w, h, p, col, o = {}) {
  if (p <= 0) return;
  ctx.save();
  const e = E.outExpo(clamp(p));
  const pad = (1 - e) * 60;
  const x0 = x - pad, y0 = y - pad, x1 = x + w + pad, y1 = y + h + pad;
  const L = Math.min(w, h) * 0.2;
  ctx.globalAlpha = clamp(p * 3) * (o.alpha ?? 1);
  ctx.strokeStyle = col; ctx.lineWidth = o.lw || 6; ctx.lineCap = 'square';
  ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
  ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
  ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
  ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha *= 0.35 * clamp((p - 0.4) * 3);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
  if (o.label) drawTag(ctx, x0, y0 - 12, o.label, col, clamp((p - 0.3) * 2), o);
}

// label tag (anchored bottom-left at x,y)
function drawTag(ctx, x, y, label, col, p, o = {}) {
  if (p <= 0) return;
  ctx.save();
  const fs = o.fs || 34;
  setFont(ctx, 800, fs, 'JetBrains Mono', 1);
  const txt = typeText(label, clamp(p * 1.4), label.length);
  const tw = textW(ctx, label) + fs * 0.9;
  const th = fs * 1.6;
  const e = E.outExpo(p);
  ctx.globalAlpha = clamp(p * 4);
  ctx.beginPath(); ctx.rect(x, y - th, tw * e, th); ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y - th, tw * e, th); ctx.clip();
  ctx.fillStyle = o.textCol || '#05080a'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x + fs * 0.45, y - th / 2 + 2);
  ctx.restore();
  ctx.restore();
}

// confidence bar
function drawConfBar(ctx, x, y, w, val, p, col, label = 'CONFIDENCE') {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(p * 3);
  setFont(ctx, 600, 26, 'JetBrains Mono', 2);
  ctx.fillStyle = C.dim; ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, y - 16);
  const v = val * E.outCubic(clamp(p));
  setFont(ctx, 800, 26, 'JetBrains Mono', 0);
  ctx.fillStyle = col; ctx.textAlign = 'right';
  ctx.fillText(Math.round(v * 100) + '%', x + w, y - 16);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14;
  ctx.fillRect(x, y, w * v, 10);
  // ticks
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (let i = 1; i < 20; i++) ctx.fillRect(x + w * i / 20 - 1, y, 2, 10);
  ctx.restore();
}

// crosshair reticle
function drawReticle(ctx, x, y, r, rot, col, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  ctx.strokeStyle = col; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(0, 0, r, i * TAU / 4 + 0.2, (i + 1) * TAU / 4 - 0.2); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-r * 1.3, 0); ctx.lineTo(-r * 0.6, 0); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 1.3, 0);
  ctx.moveTo(0, -r * 1.3); ctx.lineTo(0, -r * 0.6); ctx.moveTo(0, r * 0.6); ctx.lineTo(0, r * 1.3);
  ctx.stroke();
  ctx.restore();
}

// skull glyph (simple vector)
function drawSkull(ctx, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-42, 10); ctx.bezierCurveTo(-52, -40, -30, -62, 0, -62); ctx.bezierCurveTo(30, -62, 52, -40, 42, 10);
  ctx.lineTo(30, 22); ctx.lineTo(28, 44); ctx.lineTo(-28, 44); ctx.lineTo(-30, 22); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.ellipse(-18, -8, 13, 15, 0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, -8, 13, 15, -0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(-7, 22); ctx.lineTo(7, 22); ctx.closePath(); ctx.fill();
  for (const xx of [-14, 0, 14]) ctx.fillRect(xx - 2, 30, 4, 14);
  ctx.restore();
}

function drawCheck(ctx, x, y, s, col, p = 1, lw = 10) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = [[-0.5, 0.02], [-0.15, 0.36], [0.52, -0.36]];
  const l1 = Math.hypot(0.35, 0.34), l2 = Math.hypot(0.67, 0.72), tot = l1 + l2;
  const d = p * tot;
  ctx.beginPath(); ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
  if (d <= l1) { const k = d / l1; ctx.lineTo(lerp(pts[0][0], pts[1][0], k) * s, lerp(pts[0][1], pts[1][1], k) * s); }
  else { ctx.lineTo(pts[1][0] * s, pts[1][1] * s); const k = (d - l1) / l2; ctx.lineTo(lerp(pts[1][0], pts[2][0], k) * s, lerp(pts[1][1], pts[2][1], k) * s); }
  ctx.stroke(); ctx.restore();
}
function drawCross(ctx, x, y, s, col, p = 1, lw = 10) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const a = clamp(p * 2), b = clamp(p * 2 - 1);
  ctx.beginPath(); ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(lerp(-s / 2, s / 2, a), lerp(-s / 2, s / 2, a));
  if (b > 0) { ctx.moveTo(s / 2, -s / 2); ctx.lineTo(lerp(s / 2, -s / 2, b), lerp(-s / 2, s / 2, b)); }
  ctx.stroke(); ctx.restore();
}

// stamp (rotated boxed word)
function drawStamp(ctx, x, y, word, col, p, o = {}) {
  if (p <= 0) return;
  ctx.save();
  const e = E.outBack(clamp(p));
  const sc = lerp(2.4, 1, E.outExpo(clamp(p))) ;
  ctx.translate(x, y); ctx.rotate(o.rot ?? -0.12); ctx.scale(sc, sc);
  ctx.globalAlpha = clamp(p * 3);
  const fs = o.fs || 110;
  setFont(ctx, 400, fs, 'Anton', 4);
  const tw = textW(ctx, word);
  const pw = tw + fs * 0.5, ph = fs * 1.3;
  ctx.strokeStyle = col; ctx.lineWidth = fs * 0.07;
  ctx.shadowColor = col; ctx.shadowBlur = 30;
  rr(ctx, -pw / 2, -ph / 2, pw, ph, fs * 0.08); ctx.stroke();
  ctx.fillStyle = col; ctx.textBaseline = 'middle';
  fillTextC(ctx, word, 0, fs * 0.04);
  ctx.restore();
}
