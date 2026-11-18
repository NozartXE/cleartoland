// The chart itself: Kestrel Field drawn as a bright paper aeronautical chart —
// coast and bays, contour rings around the peak, towns, forests, the lake,
// both runways with their markings, the water strip and the helipad, entry
// gates with their names, and range rings around the field. The static chart
// is painted once onto an offscreen canvas and blitted every frame; only the
// landing cones breathe with the game.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const F = globalThis.CTL_Field;
  const Fit = () => globalThis.CTL_Fit;
  let chartCache = null;

  function paintChart(ctx) {
    const T = F.TERRAIN;
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, C.W, C.H);
    // landmass wash with a slightly greener south
    ctx.fillStyle = P.land; ctx.fillRect(0, 0, C.W, C.H);
    const grad = ctx.createLinearGradient(0, 0, 0, C.H);
    grad.addColorStop(0, 'rgba(255,252,235,0.35)');
    grad.addColorStop(1, 'rgba(120,140,70,0.18)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, C.W, C.H);

    // range rings around the field centre
    ctx.strokeStyle = 'rgba(70,88,106,0.20)'; ctx.lineWidth = 1.5;
    for (const r of [150, 280, 410]) { ctx.beginPath(); ctx.arc(620, 420, r, 0, Math.PI * 2); ctx.stroke(); }

    // field patchwork with hedgerow edges, then a deterministic speckle so
    // the land has grain at chart scale
    for (const f of T.fields) {
      ctx.fillStyle = f.c; ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = 'rgba(90,104,60,0.65)'; ctx.lineWidth = 2; ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = 'rgba(90,104,60,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(f.x, f.y + f.h / 2); ctx.lineTo(f.x + f.w, f.y + f.h / 2); ctx.stroke();
    }
    {
      let s = 1234567;
      const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      ctx.fillStyle = 'rgba(90,104,60,0.20)';
      for (let i = 0; i < 900; i++) {
        const x = rnd() * C.W, y = 84 + rnd() * (C.H - 170);
        ctx.fillRect(x, y, 2.4, 2.4);
      }
    }
    // roads between the towns
    ctx.lineCap = 'round';
    for (const road of T.roads) {
      ctx.strokeStyle = 'rgba(120,100,70,0.55)'; ctx.lineWidth = 7;
      ctx.beginPath(); road.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)); ctx.stroke();
      ctx.strokeStyle = 'rgba(243,234,210,0.8)'; ctx.lineWidth = 3.4;
      ctx.beginPath(); road.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)); ctx.stroke();
    }

    // water: the bays, then the lake
    ctx.fillStyle = P.water;
    for (const bay of T.bays) {
      ctx.beginPath();
      bay.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(T.lake.x, T.lake.y, T.lake.rx, T.lake.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.waterDeep; ctx.lineWidth = 2; ctx.stroke();
    // wave ticks on the south bay
    ctx.strokeStyle = 'rgba(255,253,244,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = 90 + i * 82, y = 706 + (i % 3) * 16;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 5, x + 18, y); ctx.stroke();
    }

    // contour rings around the peak
    ctx.strokeStyle = 'rgba(122,110,84,0.55)'; ctx.lineWidth = 1.6;
    for (const r of T.contours) { ctx.beginPath(); ctx.arc(T.peak.x, T.peak.y, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = P.peak;
    ctx.beginPath();
    ctx.moveTo(T.peak.x - 22, T.peak.y + 14); ctx.lineTo(T.peak.x, T.peak.y - 20); ctx.lineTo(T.peak.x + 22, T.peak.y + 14);
    ctx.closePath(); ctx.fill();
    Fit().draw(ctx, 'MT KESTREL 2,140', T.peak.x, T.peak.y + 34, C.TYPE.tiny, P.inkSoft, 'center', true);

    // forests: little tree triangles in blocks
    ctx.fillStyle = P.forest;
    for (const f of T.forests) {
      for (let x = f.x + 8; x < f.x + f.w; x += 17) {
        for (let y = f.y + 10; y < f.y + f.h; y += 17) {
          ctx.beginPath();
          ctx.moveTo(x - 5, y + 5); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y + 5); ctx.closePath(); ctx.fill();
        }
      }
    }
    // towns: house blocks with a name
    for (const t of T.towns) {
      ctx.fillStyle = P.town;
      const offs = [[0, 0], [14, -6], [-12, 8], [8, 12], [-4, -13]];
      for (const [ox, oy] of offs) ctx.fillRect(t.x + ox - 5, t.y + oy - 4, 10, 8);
      ctx.strokeStyle = 'rgba(34,48,58,0.5)'; ctx.lineWidth = 1;
      for (const [ox, oy] of offs) ctx.strokeRect(t.x + ox - 5, t.y + oy - 4, 10, 8);
      Fit().draw(ctx, t.n, t.x, t.y + 26, C.TYPE.tiny, P.inkSoft, 'center', true);
    }

    drawStrip(ctx, F.RUNWAY_A, '09 · A', true);
    drawStrip(ctx, F.RUNWAY_B, 'B', false);
    // water strip markings
    ctx.fillStyle = 'rgba(255,253,244,0.75)';
    for (let x = F.WATER.x1 + 14; x < F.WATER.x2 - 10; x += 44) ctx.fillRect(x, F.WATER.y1 - 2, 22, 4);
    Fit().draw(ctx, 'WATER', F.WATER.x1 + 40, F.WATER.y1 - 16, C.TYPE.tiny, P.inkSoft, 'left', true);

    // helipad
    ctx.beginPath(); ctx.arc(F.PAD.x, F.PAD.y, F.PAD.r, 0, Math.PI * 2);
    ctx.fillStyle = P.strip; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.runwayEdge; ctx.stroke();
    Fit().draw(ctx, 'H', F.PAD.x, F.PAD.y + 1, C.TYPE.xl, P.white, 'center', true);

    // gates: a diamond and a name at every reporting point
    for (const g of F.GATES) {
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = P.panel; ctx.fillRect(-7, -7, 14, 14);
      ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
      const lx = Math.max(34, Math.min(C.W - 34, g.x));
      const ly = g.y < 100 ? g.y + 24 : (g.y > C.H - 100 ? g.y - 22 : g.y + 24);
      Fit().draw(ctx, g.id, lx, ly, C.TYPE.tiny, P.inkSoft, 'center', true);
    }
  }

  function drawStrip(ctx, rw, label, main) {
    const horiz = rw.heading === 0;
    ctx.save();
    ctx.translate(rw.x1, rw.y1);
    if (!horiz) ctx.rotate(-Math.PI / 2);
    const len = rw.len, wdt = main ? 34 : 26;
    ctx.fillStyle = P.runway;
    ctx.fillRect(0, -wdt / 2, len, wdt);
    ctx.strokeStyle = P.runwayEdge; ctx.lineWidth = 2.5;
    ctx.strokeRect(0, -wdt / 2, len, wdt);
    ctx.fillStyle = P.runwayEdge;
    for (let x = 26; x < len - 16; x += 46) ctx.fillRect(x, -1.5, 24, 3);
    // threshold bars
    for (let i = -3; i <= 3; i++) ctx.fillRect(4, i * (wdt / 8) - 1.5, 16, 3);
    ctx.restore();
    Fit().draw(ctx, label, rw.x1 + (horiz ? 26 : 20), rw.y1 + (horiz ? -30 : 8), C.TYPE.s, P.inkSoft, 'center', true);
  }

  function draw(ctx, run) {
    if (!chartCache) {
      chartCache = document.createElement('canvas');
      chartCache.width = C.W; chartCache.height = C.H;
      paintChart(chartCache.getContext('2d'));
    }
    ctx.drawImage(chartCache, 0, 0);
    // landing cones breathe gently so the eye finds them
    const pulse = 0.10 + 0.05 * Math.sin(run.time * 2.2);
    for (const rw of [F.RUNWAY_A, F.RUNWAY_B]) {
      const wide = run.upgrades && run.upgrades.longfinal ? 1.5 : 1;
      const back = 300 * wide, halfW = 64 * wide;
      ctx.save();
      ctx.translate(rw.threshold.x, rw.threshold.y);
      ctx.rotate(rw.heading);
      ctx.fillStyle = 'rgba(46,125,79,' + pulse + ')';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-back, -halfW); ctx.lineTo(-back, halfW); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // water cone
    ctx.save();
    ctx.translate(F.WATER.threshold.x, F.WATER.threshold.y);
    ctx.fillStyle = 'rgba(15,139,141,' + pulse + ')';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-290, -56); ctx.lineTo(-290, 56); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  globalThis.CTL_Terrain = { draw };
})();
