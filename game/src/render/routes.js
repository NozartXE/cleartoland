// Routes as the player drew them: dashed polylines through each plane's
// waypoints in its class colour, the selected plane's route bold with numbered
// stops, the live drag preview while a route is being drawn, and — with the
// RADAR SWEEP upgrade — a ghost of where each routed plane will be in 6 s.
// The drawn routes are the game's signature: the frame shows the tower's
// decisions, not just its traffic.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const F = globalThis.CTL_Field;

  // Kinematic prediction along the route (no wind): where will it be in t s?
  function predict(p, t) {
    let x = p.x, y = p.y, hdg = p.hdg, left = t;
    const pts = p.path.map(q => ({ x: q.x, y: q.y }));
    const speed = p.spec.speed * p.spdMul;
    const turn = p.spec.turn * Math.PI / 180;
    const dt = 0.25;
    while (left > 0 && pts.length) {
      const wp = pts[0];
      const want = Math.atan2(wp.y - y, wp.x - x);
      const dh = F.angNorm(want - hdg);
      hdg += Math.max(-turn * dt, Math.min(turn * dt, dh));
      x += Math.cos(hdg) * speed * dt; y += Math.sin(hdg) * speed * dt;
      if (F.dist(x, y, wp.x, wp.y) < Math.max(17, speed * 0.32)) pts.shift();
      left -= dt;
    }
    return { x, y, hdg };
  }

  function drawRoute(ctx, p, selected) {
    if (!p.path.length || p.state !== 'air') return;
    ctx.save();
    ctx.strokeStyle = p.spec.color;
    ctx.globalAlpha = selected ? 0.95 : 0.55;
    ctx.lineWidth = selected ? 4 : 2.5;
    ctx.setLineDash(selected ? [] : [9, 7]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (const wp of p.path) ctx.lineTo(wp.x, wp.y);
    ctx.stroke();
    ctx.setLineDash([]);
    p.path.forEach((wp, i) => {
      ctx.beginPath(); ctx.arc(wp.x, wp.y, selected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = P.white; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = p.spec.color; ctx.stroke();
      if (selected) globalThis.CTL_Fit.draw(ctx, String(i + 1), wp.x, wp.y + 0.5, 10, p.spec.color, 'center', true);
    });
    ctx.restore();
  }

  function draw(ctx, run, view) {
    for (const p of run.planes) {
      if (p.dead || p.state === 'queued') continue;
      drawRoute(ctx, p, run.selectedId === p.id);
    }
    // radar ghosts
    if (run.upgrades.radar) {
      for (const p of run.planes) {
        if (p.dead || p.state !== 'air' || !p.path.length) continue;
        const g = predict(p, 6);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = p.spec.color; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(g.x, g.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(g.x, g.y, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    // live drag preview: the route being drawn right now
    if (view && view.drag && view.drag.points.length) {
      const pts = view.drag.points;
      ctx.save();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3.5; ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(view.drag.fromX, view.drag.fromY);
      for (const q of pts) ctx.lineTo(q.x, q.y);
      ctx.lineTo(view.mouse.x, view.mouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = P.danger;
      ctx.beginPath(); ctx.arc(view.mouse.x, view.mouse.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  globalThis.CTL_Routes = { draw, predict };
})();
