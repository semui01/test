// Scene E (s5a..s9): one continuous camera over the death cap.
// expert check -> volva -> buried -> line of sight -> deeper -> split stem.
'use strict';

let SOIL_TEX, STAIN_FIELD, STAIN_CAN, STAIN_W, STAIN_H, LEAVES_FALL, GRASS;
function initAssets2() {
  // soil texture: world x [-700,700], depth 0..700 below soil top; 2 px per unit
  SOIL_TEX = makeCanvas(2800, 1400);
  const g = SOIL_TEX.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 1400);
  grd.addColorStop(0, '#4b3523'); grd.addColorStop(0.08, '#3a2819'); grd.addColorStop(0.5, '#24180f'); grd.addColorStop(1, '#120c07');
  g.fillStyle = grd; g.fillRect(0, 0, 2800, 1400);
  const rng = mulberry32(21);
  // strata
  for (let i = 0; i < 9; i++) {
    const y0 = 80 + i * 150 + rng() * 60;
    g.beginPath(); g.moveTo(0, y0);
    for (let x = 0; x <= 2800; x += 40) g.lineTo(x, y0 + noise1(x * 0.004 + i * 10) * 30);
    g.lineTo(2800, y0 + 40); g.lineTo(0, y0 + 40); g.closePath();
    g.fillStyle = `rgba(${rng() < 0.5 ? '120,90,60' : '20,12,6'},${0.08 + rng() * 0.08})`; g.fill();
  }
  // specks
  for (let i = 0; i < 26000; i++) {
    const y = Math.pow(rng(), 1.3) * 1400;
    g.fillStyle = `rgba(${110 + rng() * 80},${85 + rng() * 50},${55 + rng() * 40},${0.1 + rng() * 0.35})`;
    const s = 1 + rng() * 3.5;
    g.fillRect(rng() * 2800, y, s, s);
  }
  // pebbles
  for (let i = 0; i < 260; i++) {
    const x = rng() * 2800, y = 20 + rng() * 1350, rx = 6 + rng() * 22, ry = rx * (0.5 + rng() * 0.4), a = rng() * 3;
    g.save(); g.translate(x, y); g.rotate(a);
    const pg = g.createRadialGradient(-rx * 0.3, -ry * 0.4, 1, 0, 0, rx);
    const base = 70 + rng() * 60;
    pg.addColorStop(0, `rgb(${base + 50},${base + 40},${base + 30})`); pg.addColorStop(1, `rgb(${base - 30},${base - 36},${base - 40})`);
    g.fillStyle = pg; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.restore();
  }
  // rootlets
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = rng() * 2800, y = 10 + rng() * 900;
    g.strokeStyle = `rgba(${170 + rng() * 40},${140 + rng() * 30},${100},${0.18 + rng() * 0.2})`;
    g.lineWidth = 1 + rng() * 2.5;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rng() - 0.5) * 50; y += 10 + rng() * 30; g.lineTo(x, y); }
    g.stroke();
  }

  // stain noise field for the split stem interior (local face coords: x -60..60, y -470..-140)
  // 2 px per world unit
  STAIN_W = 240; STAIN_H = 660;
  STAIN_FIELD = [new Float32Array(STAIN_W * STAIN_H), new Float32Array(STAIN_W * STAIN_H)];
  for (let y = 0; y < STAIN_H; y++) for (let x = 0; x < STAIN_W; x++) {
    const wx = (x - 120) / 2, wy = y / 2;
    for (let k = 0; k < 2; k++) STAIN_FIELD[k][y * STAIN_W + x] = stainValue(wx, wy, k) ;
  }
  STAIN_CAN = [makeCanvas(STAIN_W, STAIN_H), makeCanvas(STAIN_W, STAIN_H)];

  // falling leaves (world coords)
  const r2 = mulberry32(55);
  LEAVES_FALL = [];
  for (let i = 0; i < 34; i++) {
    const x = (r2() - 0.5) * 2 * (i < 14 ? 170 : 420);
    LEAVES_FALL.push({
      x, dx: (r2() - 0.5) * 300, t: r2() * 1.4, dur: 0.8 + r2() * 0.6, s: 16 + r2() * 14,
      rot: r2() * TAU, spin: (r2() - 0.5) * 8, col: LEAF_COLS[Math.floor(r2() * LEAF_COLS.length)], type: r2() < 0.3 ? 1 : 0,
      yOff: -4 - r2() * 26, front: i < 14 || r2() < 0.4,
    });
  }
  GRASS = [];
  for (let i = 0; i < 46; i++) {
    const x = (r2() - 0.5) * 1400;
    if (Math.abs(x) < 70) continue;
    GRASS.push({ x, h: 40 + r2() * 120, lean: (r2() - 0.5) * 0.6, ph: r2() * TAU, w: 3 + r2() * 4, c: r2() < 0.5 ? '#3f5a2a' : '#56703a' });
  }
}

// marbled stain field: ridged, domain-warped noise concentrated in the core
function stainValue(wx, wy, seed) {
  const qx = fbm2(wx * 0.02 + seed * 5.2, wy * 0.012 + 1.3, 3), qy = fbm2(wx * 0.02 + 8.1, wy * 0.012 + seed * 3.7, 3);
  const r = 1 - Math.abs(fbm2(wx * 0.045 + qx * 1.6 + seed * 2, wy * 0.016 + qy * 1.6, 4));
  const spots = fbm2(wx * 0.09 + 30 + seed * 7, wy * 0.05, 3) * 0.5 + 0.5;
  const core = Math.pow(clamp(1 - Math.abs(wx) / 34), 1.2);
  return r * 0.62 + spots * 0.2 + core * 0.28 + 0.05 * (wy / 330);
}

// ---- camera ----
function camTrack(t, keys) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], s: keys[0][3] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const e = (b[4] || E.inOutCubic)(invlerp(a[0], b[0], t));
      // interpolate scale logarithmically for natural zooms
      return { x: lerp(a[1], b[1], e), y: lerp(a[2], b[2], e), s: Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), e)) };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l[1], y: l[2], s: l[3] };
}
const CAM_CX = 540, CAM_CY = 820;
function w2s(cam, x, y, cx = CAM_CX, cy = CAM_CY) { return [cx + (x - cam.x) * cam.s, cy + (y - cam.y) * cam.s]; }
function applyCam(ctx, cam, cx = CAM_CX, cy = CAM_CY) { ctx.translate(cx, cy); ctx.scale(cam.s, cam.s); ctx.translate(-cam.x, -cam.y); }

function soilTopY(x, level) { return level + noise1(x * 0.012 + 3) * 10 + noise1(x * 0.05) * 4; }

function stemHalfW(y) {
  // approximate half-width profile of stemPath (world y)
  if (y < -160) return lerp(23, 32, invlerp(-458, -160, y));
  return lerp(32, 50, invlerp(-160, -40, y));
}

// interior face of split stem; drawn in local coords centred at x=0
function drawInteriorFace(ctx, stainP, mirror, yTop, yBot) {
  ctx.save();
  if (mirror) ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.moveTo(-stemHalfW(yTop) * 0.98, yTop);
  for (let y = yTop; y <= yBot; y += 10) ctx.lineTo(-stemHalfW(y) * 0.98, y);
  for (let y = yBot; y >= yTop; y -= 10) ctx.lineTo(stemHalfW(y) * 0.98, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(-50, 0, 50, 0);
  g.addColorStop(0, '#d8cfbb'); g.addColorStop(0.2, '#f6f1e6'); g.addColorStop(0.5, '#efe7d7'); g.addColorStop(0.8, '#f6f1e6'); g.addColorStop(1, '#d1c7b1');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // fibres
  const rng = mulberry32(3);
  for (let i = 0; i < 26; i++) {
    const x = (rng() - 0.5) * 70;
    ctx.strokeStyle = `rgba(170,155,125,${0.18 + rng() * 0.2})`; ctx.lineWidth = 0.6 + rng() * 0.8;
    ctx.beginPath(); ctx.moveTo(x, yTop);
    for (let y = yTop; y <= yBot; y += 30) ctx.lineTo(x + noise1(y * 0.02 + i) * 3 + (y - yTop) * x * 0.0006, y);
    ctx.stroke();
  }
  // stains
  if (stainP > 0) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(STAIN_CAN[mirror ? 1 : 0], -60, -470, 120, STAIN_H / 2);
  }
  // inner shadow edges
  const eg = ctx.createLinearGradient(-50, 0, 50, 0);
  eg.addColorStop(0, 'rgba(60,50,30,0.35)'); eg.addColorStop(0.15, 'rgba(60,50,30,0)'); eg.addColorStop(0.85, 'rgba(60,50,30,0)'); eg.addColorStop(1, 'rgba(60,50,30,0.35)');
  ctx.fillStyle = eg; ctx.fillRect(-60, yTop, 120, yBot - yTop);
  ctx.restore();
  ctx.strokeStyle = 'rgba(150,140,110,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
}

function updateStains(p) {
  const th = lerp(1.08, 0.80, p);
  for (let f = 0; f < 2; f++) {
    const g = STAIN_CAN[f].getContext('2d');
    const img = g.createImageData(STAIN_W, STAIN_H);
    const d = img.data, F = STAIN_FIELD[f];
    for (let i = 0; i < F.length; i++) {
      const n = F[i];
      const core = clamp((n - th) / 0.035);
      const halo = clamp((n - th + 0.05) / 0.05) * (1 - core);
      const k = i * 4;
      if (core > 0) { d[k] = 38; d[k + 1] = 14; d[k + 2] = 28; d[k + 3] = Math.round(225 * core + 70 * halo); }
      else if (halo > 0) { d[k] = 110; d[k + 1] = 64; d[k + 2] = 62; d[k + 3] = Math.round(80 * halo); }
      else d[k + 3] = 0;
    }
    g.putImageData(img, 0, 0);
  }
}

// magnifying glass in screen space; lens shows magnified world
function drawMagnifier(ctx, sx, sy, r, cam, t, drawWorldFn, a = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // handle
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(0.75);
  ctx.fillStyle = '#3a2410'; rr(ctx, -16, r + 6, 32, r * 1.25, 14); ctx.fill();
  const hg = ctx.createLinearGradient(-16, 0, 16, 0);
  hg.addColorStop(0, '#7a4c22'); hg.addColorStop(0.5, '#c58a45'); hg.addColorStop(1, '#5e3817');
  ctx.fillStyle = hg; rr(ctx, -13, r + 10, 26, r * 1.2, 12); ctx.fill();
  ctx.fillStyle = '#b8902f'; ctx.fillRect(-18, r - 4, 36, 18);
  ctx.restore();
  // lens content
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.clip();
  ctx.fillStyle = '#0b0f0d'; ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
  const wx = (sx - CAM_CX) / cam.s + cam.x, wy = (sy - CAM_CY) / cam.s + cam.y;
  const mcam = { x: wx, y: wy, s: cam.s * 1.75 };
  ctx.save(); applyCam(ctx, mcam, sx, sy); drawWorldFn(ctx); ctx.restore();
  const gl = ctx.createRadialGradient(sx - r * 0.4, sy - r * 0.45, 0, sx, sy, r);
  gl.addColorStop(0, 'rgba(255,240,200,0.28)'); gl.addColorStop(0.5, 'rgba(255,220,150,0.04)'); gl.addColorStop(1, 'rgba(255,182,72,0.25)');
  ctx.fillStyle = gl; ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
  ctx.restore();
  // rim
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
  ctx.lineWidth = 16; ctx.strokeStyle = '#2a2116'; ctx.stroke();
  ctx.lineWidth = 10; const rg = ctx.createLinearGradient(sx - r, sy - r, sx + r, sy + r);
  rg.addColorStop(0, '#ffe1a0'); rg.addColorStop(0.5, '#c8902e'); rg.addColorStop(1, '#6e4a14');
  ctx.strokeStyle = rg; ctx.stroke();
  ctx.shadowColor = C.amber; ctx.shadowBlur = 30; ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.amber, 0.8);
  ctx.beginPath(); ctx.arc(sx, sy, r + 10, 0, TAU); ctx.stroke();
  ctx.restore();
}

function checkerNoData(ctx, x, y, w, h, p, t) {
  if (p <= 0) return;
  ctx.save();
  const cs = 26;
  const cols = Math.ceil(w / cs), rows = Math.ceil(h / cs);
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const on = hash2(i * 3.1, j * 7.7) < p * 1.25;
    if (!on) continue;
    ctx.fillStyle = (i + j) % 2 ? '#3b3f44' : '#24272b';
    ctx.fillRect(x + i * cs, y + j * cs, cs, cs);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = clamp(p * 2);
  ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 40;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

const SceneE = {
  draw(ctx, t, frame) {
    const b = id => T(id) - 0.12;
    const t5 = b('s5a'), tExp = T('s5a', 'experts'), tLook = T('s5a', 'look'), tCap = T('s5a', 'cap');
    const t5b = b('s5b'), tCheck = T('s5b', 'check'), tSack = T('s5b', 'sack-like'), tBase = T('s5b', 'base');
    const t6 = b('s6'), tWild = T('s6', 'wild'), tRoot = T('s6', 'root'), tComp = T('s6', 'completely'), tBur = T('s6', 'buried');
    const tFallen = T('s6', 'fallen'), tLeaves = T('s6', 'leaves');
    const t7 = b('s7'), tLine = T('s7', 'line'), tSight = T('s7', 'sight'), tVis = T('s7', 'visual'), tData = T('s7', 'data'), tExist = T('s7', 'exist');
    const t8 = b('s8'), tDeeper = T('s8', 'deeper'), tDirt = T('s8', 'dirt');
    const t9 = b('s9'), tSplit = T('s9', 'splitting'), tOpen = T('s9', 'open'), tDark = T('s9', 'dark'), tChem = T('s9', 'chemical'), tPoison = T('s9', 'poison');
    const end = b('s10');

    const cam = camTrack(t, [
      [t5, 0, -290, 1.5], [t5 + 0.7, 0, -295, 1.3, E.outCubic], [t5b - 0.2, 0, -305, 1.27],
      [tSack - 0.3, 0, -110, 2.15], [t6, 0, -100, 2.25, E.linear], [t6 + 1.2, 0, -270, 1.3],
      [t7, 0, -262, 1.34, E.linear], [t7 + 1.0, -170, -330, 0.94], [t8, -165, -325, 0.95, E.linear],
      [tDirt + 0.35, 0, -305, 3.2], [end, 0, -300, 3.35, E.linear],
    ]);

    // ---- world state ----
    const capGlow = win(t, t5 + 0.3, tCheck, 0.4, 0.5) * (0.6 + 0.4 * Math.sin(t * 5));
    const volvaGlow = win(t, tSack - 0.15, t6 + 1.7, 0.3, 0.5) * (0.75 + 0.25 * Math.sin(t * 6)) + win(t, tRoot - 0.1, tComp + 0.3, 0.2, 0.3);
    const level = lerp(260, -150, K(t, tComp - 0.25, 1.35, E.inOutCubic));
    const soilOn = t > tComp - 0.3;
    const ghost = win(t, tBur + 0.4, tVis + 0.6, 0.4, 0.5);
    const splitCut = K(t, tSplit, 0.4, E.inOutCubic);
    const open = K(t, tOpen - 0.05, 0.7, E.inOutCubic);
    const stainP = K(t, tDark - 0.35, 1.7, E.inOutQuad);
    if (stainP > 0) updateStains(stainP);
    const leafT0 = tFallen - 0.9;

    const drawWorld = (c) => {
      // grass behind
      if (soilOn) {
        for (const gr of GRASS) {
          if (gr.x > -60 && gr.x < 60) continue;
          const y0 = soilTopY(gr.x, level) + 4;
          const grow = K(t, tComp + 0.3 + Math.abs(gr.x) * 0.0006, 0.8);
          if (grow <= 0) continue;
          const sway = Math.sin(t * 1.4 + gr.ph) * 0.12 + gr.lean;
          c.strokeStyle = gr.c; c.lineWidth = gr.w; c.lineCap = 'round';
          c.beginPath(); c.moveTo(gr.x, y0);
          c.quadraticCurveTo(gr.x + sway * gr.h * 0.3, y0 - gr.h * 0.5 * grow, gr.x + sway * gr.h, y0 - gr.h * grow); c.stroke();
        }
        // back leaves on the soil
        for (const L of LEAVES_FALL) if (!L.front) drawFallingLeaf(c, L, t, leafT0, level);
      }
      // mushroom (possibly split)
      if (open <= 0.001) {
        drawDeathCap(c, { capGlow, volvaGlow, capColor: C.ai, volvaColor: C.amber });
      } else {
        // cap + gills stay; stem region splits into two interior faces
        c.save();
        c.beginPath(); c.rect(-400, -900, 800, 900 - 470 + 12); c.clip();
        drawDeathCap(c, {});
        c.restore();
        const yTop = -452, yBot = level + 6;
        const gap = 36 * open;
        // skin halves fading
        for (const s of [-1, 1]) {
          c.save();
          c.beginPath(); c.rect(s < 0 ? -200 : 0, -460, 200, 470); c.clip();
          c.translate(s * gap * 0.6, 0);
          c.globalAlpha = 1 - open;
          drawDeathCap(c, { noShadow: true });
          c.restore();
          c.save();
          const cx = s * (stemHalfW(-300) + 4) * open;
          c.translate(cx + s * gap * 0.25, 0);
          c.scale(Math.max(0.001, open), 1);
          c.globalAlpha = clamp(open * 1.5);
          drawInteriorFace(c, stainP, s > 0, yTop, yBot);
          c.restore();
        }
      }
      // blade line
      if (splitCut > 0 && open < 1) {
        const y0 = -458, y1 = lerp(-458, level, splitCut);
        c.save();
        c.globalAlpha = 1 - open;
        c.strokeStyle = '#ffffff'; c.lineWidth = 2.2; c.shadowColor = '#ffffff'; c.shadowBlur = 14;
        c.beginPath(); c.moveTo(0, y0); c.lineTo(0, y1); c.stroke();
        if (splitCut < 1) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, y1, 5, 0, TAU); c.fill(); }
        c.restore();
      }
      // soil
      if (soilOn) {
        c.save();
        c.beginPath();
        c.moveTo(-1400, 1600);
        for (let x = -1400; x <= 1400; x += 12) c.lineTo(x, soilTopY(x, level));
        c.lineTo(1400, 1600); c.closePath();
        c.fillStyle = '#1c130c'; c.fill();
        c.clip();
        c.drawImage(SOIL_TEX, -700, level - 12, 1400, 700);
        c.drawImage(SOIL_TEX, -2100, level - 12, 1400, 700);
        c.drawImage(SOIL_TEX, 700, level - 12, 1400, 700);
        // top rim highlight
        c.restore();
        c.save();
        c.strokeStyle = 'rgba(140,105,70,0.6)'; c.lineWidth = 3;
        c.beginPath();
        for (let x = -1400; x <= 1400; x += 12) x === -1400 ? c.moveTo(x, soilTopY(x, level)) : c.lineTo(x, soilTopY(x, level));
        c.stroke();
        c.restore();
        // dirt spray while rising
        const rising = win(t, tComp - 0.2, tComp + 1.2, 0.2, 0.4);
        if (rising > 0) {
          for (let i = 0; i < 60; i++) {
            const ph = (t * 1.6 + hash1(i)) % 1;
            const x = (hash1(i * 3.3) - 0.5) * 700;
            const vy = 120 + hash1(i * 7.1) * 160;
            const y = soilTopY(x, level) - vy * ph + 260 * ph * ph;
            c.globalAlpha = rising * (1 - ph);
            c.fillStyle = i % 3 ? '#6b4c31' : '#3c2a1a';
            c.fillRect(x + (hash1(i) - 0.5) * 60 * ph, y, 4 + hash1(i * 9) * 5, 4 + hash1(i * 5) * 5);
          }
          c.globalAlpha = 1;
        }
        // front leaves
        for (const L of LEAVES_FALL) if (L.front) drawFallingLeaf(c, L, t, leafT0, level);
      }
      if (ghost > 0) drawDeathCapGhost(c, ghost, t);
    };

    ctx.save();
    applyCam(ctx, cam);
    drawWorld(ctx);
    ctx.restore();

    // ---------- screen-space overlays ----------
    // s5a: AI looks at cap
    const aiTag = win(t, t5 + 0.35, tCheck - 0.2, 0.4, 0.4);
    if (aiTag > 0) {
      const [x0, y0] = w2s(cam, -215, -615), [x1, y1] = w2s(cam, 215, -455);
      drawBBox(ctx, x0, y0, x1 - x0, y1 - y0, clamp(aiTag * 1.5), C.ai, { label: 'AI LOOKS HERE', fs: 28, alpha: aiTag });
    }
    // magnifier path (world coords)
    const magA = K(t, tExp - 0.2, 0.5) * (1 - K(t, t6 + 0.6, 0.5));
    if (magA > 0) {
      const path = [
        [tExp - 0.2, 620, -560], [tExp + 0.5, 70, -545], [tLook + 0.3, -70, -540], [tCap + 0.4, 0, -470],
        [tSack - 0.3, 0, -60], [t6 + 0.6, 0, -60], [t6 + 1.1, 700, -40],
      ];
      let px = path[0][1], py = path[0][2];
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], bb = path[i + 1];
        if (t >= a[0] && t <= bb[0]) { const e = E.inOutCubic(invlerp(a[0], bb[0], t)); px = lerp(a[1], bb[1], e); py = lerp(a[2], bb[2], e); }
        if (t > bb[0]) { px = bb[1]; py = bb[2]; }
      }
      const [sx, sy] = w2s(cam, px, py);
      const r = 128;
      drawMagnifier(ctx, sx, sy, r, cam, t, (c) => drawDeathCap(c, {}), magA);
      // label on magnifier
      const lp = K(t, tExp + 0.1, 0.5, E.linear) * (1 - K(t, tSack - 0.4, 0.3));
      if (lp > 0) { ctx.save(); ctx.globalAlpha = magA; drawTagAt(ctx, sx + r * 0.5, sy + r * 1.0, 'HUMAN EXPERT', C.amber, lp, 'left', { fs: 26 }); ctx.restore(); }
    }
    // s5b: volva callout
    const vc = K(t, tSack - 0.05, 0.9, E.linear) * (1 - K(t, t6 + 1.2, 0.4));
    if (vc > 0) {
      const [ax, ay] = w2s(cam, -85, -70);
      callout(ctx, ax, ay, 300, ay - 250, 'VOLVA', C.amber, vc, { fs: 34, t });
      ctx.save();
      ctx.globalAlpha = clamp((vc - 0.4) * 2.5);
      setFont(ctx, 500, 30, 'Inter', 0);
      ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('sack-like cup', 294, ay - 214);
      ctx.fillText('at the stem base', 294, ay - 176);
      ctx.textAlign = 'left';
      ctx.restore();
      // pulse rings around the base
      const pb = K(t, tBase - 0.1, 0.4) * (1 - K(t, t6 + 0.4, 0.4));
      if (pb > 0) {
        const [cx, cy] = w2s(cam, 0, -55);
        for (let k = 0; k < 3; k++) {
          const ph = ((t - tBase) * 0.9 + k / 3) % 1;
          ctx.save(); ctx.globalAlpha = pb * (1 - ph) * 0.8;
          ctx.strokeStyle = C.amber; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(cx, cy, (120 + ph * 160) * cam.s / 2, (50 + ph * 70) * cam.s / 2, 0, 0, TAU); ctx.stroke();
          ctx.restore();
        }
        drawTagAt(ctx, 600, w2s(cam, 0, 40)[1] + 10, 'KEY ID FEATURE', C.amber, pb, 'left', { fs: 26 });
      }
    }
    // s6: crucial root callout
    const cr = K(t, tRoot - 0.1, 0.7, E.linear) * (1 - K(t, tComp + 0.25, 0.3));
    if (cr > 0) {
      const [ax, ay] = w2s(cam, 80, -70);
      callout(ctx, ax, ay, 790, ay - 170, 'CRUCIAL CLUE', C.amber, cr, { fs: 26, t });
    }
    // s6: hidden tag
    if (ghost > 0) {
      const [gx, gy] = w2s(cam, 95, -70);
      ctx.save(); ctx.globalAlpha = ghost;
      drawTagAt(ctx, gx + 20, gy, 'BURIED · HIDDEN', C.red, clamp(ghost * 1.4), 'left', { fs: 26, textCol: '#fff' });
      ctx.restore();
    }
    const wildP = win(t, tWild - 0.2, tRoot + 0.2, 0.3, 0.3);
    if (wildP > 0) {
      ctx.save(); ctx.globalAlpha = wildP;
      setFont(ctx, 600, 26, 'JetBrains Mono', 6);
      ctx.fillStyle = C.amber; ctx.textBaseline = 'middle';
      fillTextC(ctx, typeText('— IN THE WILD —', clamp(wildP * 1.5), 2), 540, 300);
      ctx.restore();
    }

    // s7: phone + line of sight
    const s7a = K(t, t7 + 0.2, 0.7, E.outExpo) * (1 - K(t, t8 + 0.1, 0.5));
    if (s7a > 0) {
      const PX = lerp(-260, 190, s7a), PY = 600, rot = 1.57 + 0.3;
      // lens position (main camera on the back, rotated to face the mushroom)
      const lx = PX + Math.cos(rot) * -49 - Math.sin(rot) * -134, ly = PY + Math.sin(rot) * -49 + Math.cos(rot) * -134;
      drawPhoneBack(ctx, PX, PY, rot, s7a);
      const rp = K(t, tLine - 0.25, 0.7, E.outCubic);
      if (rp > 0) {
        const soilS = w2s(cam, 0, soilTopY(-40, level))[1];
        const targets = [[-170, -540, 0], [-60, -598, 0], [80, -590, 0], [180, -500, 0], [-28, -300, 0], [-40, -200, 0], [-70, -90, 1], [-20, -40, 1], [60, -70, 1]];
        for (let i = 0; i < targets.length; i++) {
          const [wx, wy, blocked] = targets[i];
          const [tx, ty] = w2s(cam, wx, wy);
          const p = K(t, tLine - 0.25 + i * 0.06, 0.6, E.outCubic);
          if (p <= 0) continue;
          let ex = tx, ey = ty;
          if (blocked) { const k = (soilS - ly) / (ty - ly); ex = lerp(lx, tx, k); ey = soilS; }
          const cx = lerp(lx, ex, p), cy = lerp(ly, ey, p);
          ctx.save();
          ctx.globalAlpha = s7a * 0.9;
          ctx.strokeStyle = blocked ? C.red : C.ai; ctx.lineWidth = 3;
          ctx.setLineDash([16, 9]); ctx.lineDashOffset = -t * 100;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(cx, cy); ctx.stroke();
          ctx.setLineDash([]);
          if (p >= 1) {
            if (blocked) {
              drawCross(ctx, ex, ey, 26, C.red, K(t, tLine + 0.4 + i * 0.05, 0.25, E.linear), 6);
              // faint continuation to the hidden target
              ctx.globalAlpha = s7a * 0.3; ctx.setLineDash([4, 10]);
              ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
            } else {
              ctx.fillStyle = C.ai; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.fill();
            }
          }
          ctx.restore();
        }
        // labels
        const lp1 = K(t, tSight - 0.1, 0.5, E.linear) * s7a;
        drawTagAt(ctx, 60, 800, 'LINE OF SIGHT', C.ai, lp1, 'left', { fs: 26 });
      }
      // title: VISUAL OCCLUSION (callback) with soil slab occluding
      const vp = K(t, tVis - 0.05, 0.5, E.outExpo) * s7a;
      if (vp > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(vp * 2) * s7a;
        setFont(ctx, 400, 118, 'Anton', 3);
        ctx.textBaseline = 'alphabetic';
        ctx.translate(0, (1 - vp) * 40);
        ctx.shadowColor = C.ai; ctx.shadowBlur = 30; ctx.fillStyle = C.ai;
        fillTextC(ctx, 'VISUAL OCCLUSION', 540, 380);
        ctx.restore();
        const sp = K(t, tVis + 0.35, 0.5, E.inOutCubic);
        if (sp > 0) {
          ctx.save(); ctx.globalAlpha = s7a;
          ctx.beginPath(); ctx.rect(0, 0, 1080 * sp, H); ctx.clip();
          ctx.save(); ctx.beginPath(); ctx.rect(0, 352, W, 60); ctx.clip();
          ctx.drawImage(SOIL_TEX, 0, 0, 1080, 120, 0, 340, 1080, 120);
          ctx.restore();
          ctx.strokeStyle = 'rgba(140,105,70,0.9)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, 352); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 352 + noise1(x * 0.03) * 4); ctx.stroke();
          ctx.restore();
        }
      }
      // data doesn't exist: checkerboard where the base should be
      const dp = K(t, tData - 0.1, 0.6, E.linear) * s7a;
      if (dp > 0) {
        const [x0, y0] = w2s(cam, -120, -150), [x1, y1] = w2s(cam, 120, 15);
        checkerNoData(ctx, x0, y0, x1 - x0, y1 - y0, dp, t);
        drawTagAt(ctx, x1 + 14, (y0 + y1) / 2 - 26, 'NO DATA', C.red, clamp(dp * 1.4), 'left', { fs: 30, textCol: '#fff' });
        ctx.save(); ctx.globalAlpha = clamp(dp * 1.4 - 0.3);
        setFont(ctx, 600, 24, 'JetBrains Mono', 2); ctx.fillStyle = C.red; ctx.textBaseline = 'middle';
        ctx.fillText('volva = null', x1 + 14, (y0 + y1) / 2 + 22);
        ctx.fillText('pixels = 0', x1 + 14, (y0 + y1) / 2 + 54);
        ctx.restore();
        if (t > tExist && t < tExist + 0.3) FXREQ.glitch = Math.max(FXREQ.glitch, 0.5 * (1 - (t - tExist) / 0.3));
      }
    }

    // s8: deeper than the dirt
    const s8 = win(t, tDeeper - 0.2, tSplit + 0.2, 0.35, 0.35);
    if (s8 > 0) {
      ctx.save();
      ctx.globalAlpha = s8;
      const lines = [['DEEPER', C.ink, tDeeper - 0.1], ['THAN THE', C.ink, T('s8', 'than') - 0.05], ['DIRT', C.amber, tDirt - 0.05]];
      setFont(ctx, 400, 168, 'Anton', 2);
      ctx.textBaseline = 'alphabetic';
      lines.forEach(([s, col, ta], i) => {
        const p = K(t, ta, 0.45, E.outExpo);
        if (p <= 0) return;
        ctx.save();
        ctx.globalAlpha = s8 * clamp(p * 2);
        ctx.translate(540, 560 + i * 170 - (1 - p) * -80);
        const sc = lerp(1.6, 1, p);
        ctx.scale(sc, sc);
        ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 40;
        ctx.fillStyle = col;
        fillTextC(ctx, s, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
    // depth ruler (s8-s9)
    const ruler = K(t, t8, 0.5) * (1 - K(t, end - 0.3, 0.3));
    if (ruler > 0) {
      ctx.save(); ctx.globalAlpha = ruler * 0.85;
      const x = 1010;
      ctx.strokeStyle = rgba(C.ink, 0.5); ctx.fillStyle = rgba(C.ink, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 1380); ctx.stroke();
      setFont(ctx, 600, 18, 'JetBrains Mono', 1); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const off = ((t - t8) * 160) % 40;
      for (let y = 300 - off; y < 1380; y += 40) {
        if (y < 300) continue;
        const idx = Math.round((y + (t - t8) * 160) / 40);
        const major = idx % 5 === 0;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (major ? 24 : 12), y); ctx.stroke();
        if (major) ctx.fillText((idx * 2) + 'mm', x - 30, y);
      }
      ctx.restore();
    }
    // s9 callouts
    if (t > tOpen) {
      const [ax, ay] = w2s(cam, -48, -260), [bx, by] = w2s(cam, 50, -330);
      const c1 = K(t, tDark, 0.8, E.linear) * (1 - K(t, end - 0.3, 0.3));
      callout(ctx, ax, ay, 300, ay - 200, 'DARK STAINS', C.red, c1, { fs: 28, textCol: '#fff', t });
      const c2 = K(t, tChem - 0.05, 0.8, E.linear) * (1 - K(t, end - 0.3, 0.3));
      callout(ctx, bx, by, 780, by + 260, 'CHEMICAL SIGN', C.red, c2, { fs: 28, textCol: '#fff', t });
      const pp = K(t, tPoison - 0.05, 0.35, E.linear) * (1 - K(t, end - 0.3, 0.3));
      if (pp > 0) {
        drawStamp(ctx, 540, 1330, 'POISON', C.red, pp, { fs: 120, rot: -0.05 });
        if (t < tPoison + 0.25) FXREQ.shake = Math.max(FXREQ.shake, 14 * (1 - (t - tPoison) / 0.25));
      }
    }
  },
};

function drawFallingLeaf(c, L, t, t0, level) {
  const ts = t0 + L.t;
  if (t < ts) return;
  const p = clamp((t - ts) / L.dur);
  const yEnd = soilTopY(L.x, level) + L.yOff;
  const y = lerp(-1150, yEnd, E.inQuad(p) * 0.4 + p * 0.6);
  const x = L.x + L.dx * (1 - p) + Math.sin(p * 9 + L.rot) * 40 * (1 - p);
  const rot = L.rot + L.spin * (1 - p);
  c.save();
  if (p >= 1) { c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 6; }
  drawLeaf(c, x, y, L.s, rot + (p >= 1 ? 0 : 0), L.col, L.type, p >= 1 ? 0.55 : 0.2 + 0.2 * Math.sin(p * 12));
  c.restore();
}

function drawDeathCapGhost(c, a, t) {
  c.save();
  c.globalAlpha = a;
  c.setLineDash([12, 10]); c.lineDashOffset = -t * 40;
  c.strokeStyle = C.red; c.lineWidth = 4;
  c.shadowColor = C.red; c.shadowBlur = 16;
  volvaFrontPath(c); c.stroke();
  c.beginPath(); c.moveTo(-32, -160); c.bezierCurveTo(-36, -110, -54, -70, -50, -30); c.moveTo(32, -160); c.bezierCurveTo(36, -110, 54, -70, 50, -30); c.stroke();
  c.restore();
}

function drawPhoneBack(ctx, x, y, rot, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y); ctx.rotate(rot);
  const w = 170, h = 340;
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
  rr(ctx, -w / 2, -h / 2, w, h, 30);
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, '#3b4048'); g.addColorStop(1, '#16191d');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#6a717b'; ctx.lineWidth = 3; ctx.stroke();
  // camera bump
  rr(ctx, -w / 2 + 14, -h / 2 + 14, 84, 84, 20); ctx.fillStyle = '#23272c'; ctx.fill();
  for (const [cx, cy] of [[-w / 2 + 36, -h / 2 + 36], [-w / 2 + 76, -h / 2 + 56], [-w / 2 + 36, -h / 2 + 76]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, TAU); ctx.fillStyle = '#0a0b0d'; ctx.fill();
    ctx.strokeStyle = '#555c66'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fillStyle = '#1f4f6a'; ctx.fill();
  }
  ctx.restore();
}
