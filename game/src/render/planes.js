// The aircraft on the chart: five silhouettes drawn in code (prop, jet, jumbo,
// seaplane, helicopter), each inside its altitude ring — the ring's colour IS
// the band, so separation reads at a glance. Fuel is an arc on the ring;
// warnings pulse amber, emergencies flash red, the selected plane wears an ink
// halo, and only planes that need attention carry a full tag: the chart stays
// readable with a dozen aircraft up.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;

  function body(ctx, p) {
    const s = p.spec.len;
    ctx.fillStyle = p.spec.color;
    ctx.strokeStyle = 'rgba(34,48,58,0.65)'; ctx.lineWidth = 1.4;
    if (p.cls === 'heli') {
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(s * 0.2, -2.2, s * 0.85, 4.4);
      ctx.save(); ctx.rotate(p.rotor || 0);
      ctx.strokeStyle = 'rgba(34,48,58,0.55)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(s * 0.85, 0); ctx.stroke();
      ctx.restore();
      return;
    }
    // fuselage
    ctx.beginPath();
    ctx.moveTo(s * 0.62, 0);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.17, -s * 0.28, -s * 0.15);
    ctx.lineTo(-s * 0.52, -s * 0.1); ctx.lineTo(-s * 0.52, s * 0.1);
    ctx.lineTo(-s * 0.28, s * 0.15);
    ctx.quadraticCurveTo(s * 0.3, s * 0.17, s * 0.62, 0);
    ctx.fill(); ctx.stroke();
    // main wing
    ctx.beginPath();
    const ww = p.cls === 'jumbo' ? s * 0.62 : s * 0.5;
    ctx.moveTo(s * 0.08, -ww); ctx.lineTo(s * 0.24, 0); ctx.lineTo(s * 0.08, ww);
    ctx.lineTo(-s * 0.1, ww * 0.82); ctx.lineTo(-s * 0.02, 0); ctx.lineTo(-s * 0.1, -ww * 0.82);
    ctx.closePath(); ctx.fill();
    // tailplane
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.3); ctx.lineTo(-s * 0.28, 0); ctx.lineTo(-s * 0.4, s * 0.3);
    ctx.lineTo(-s * 0.56, s * 0.2); ctx.lineTo(-s * 0.56, -s * 0.2); ctx.closePath(); ctx.fill();
    if (p.cls === 'sea') { // floats
      ctx.strokeStyle = p.spec.color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.3); ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.moveTo(-s * 0.3, s * 0.3); ctx.lineTo(s * 0.3, s * 0.3); ctx.stroke();
    }
    if (p.cls === 'jumbo') { // four engine dots
      ctx.fillStyle = P.white;
      for (const ey of [-0.34, -0.17, 0.17, 0.34]) { ctx.beginPath(); ctx.arc(s * 0.12, s * ey, 2.4, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function drawOne(ctx, run, p) {
    const band = C.BANDS[Math.round(p.alt)] || C.BANDS[2];
    const ringR = p.spec.len * 0.95 + 7;
    p.rotor = (p.rotor || 0) + 0.9;
    // contrail
    if (p.trail && p.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,253,244,0.65)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      p.trail.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
      ctx.stroke(); ctx.restore();
    }
    const selected = run.selectedId === p.id;
    const urgent = p.warned || p.emergency || (p.kind === 'arr' && p.fuel < p.maxFuel * 0.25 && p.state === 'air');
    // altitude ring
    ctx.save();
    if (p.warned) {
      const pulse = 3.5 + 2 * Math.sin(run.time * 9);
      ctx.strokeStyle = P.warn; ctx.lineWidth = pulse;
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR + 5, 0, Math.PI * 2); ctx.stroke();
    }
    if (selected) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = band.ring; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2); ctx.stroke();
    // fuel arc (arrivals still flying)
    if (p.kind === 'arr' && p.state === 'air') {
      const frac = Math.max(0, p.fuel / p.maxFuel);
      ctx.strokeStyle = frac < 0.25 ? P.danger : 'rgba(34,48,58,0.55)';
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR - 5, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // the aircraft
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.hdg);
    body(ctx, p);
    ctx.restore();
    // band pips: one, two or three dots under the ring
    const bandIdx = Math.round(p.alt);
    for (let i = 0; i <= bandIdx; i++) {
      ctx.beginPath(); ctx.arc(p.x - 10 + i * 10, p.y + ringR + 8, 3, 0, Math.PI * 2);
      ctx.fillStyle = band.ring; ctx.fill();
    }
    if (p.hold) Fit().draw(ctx, 'HOLD', p.x, p.y - ringR - 10, C.TYPE.tiny, P.inkSoft, 'center', true);
    if (p.orderMarked) {
      ctx.fillStyle = P.danger;
      ctx.beginPath(); ctx.arc(p.x + ringR - 2, p.y - ringR + 2, 7, 0, Math.PI * 2); ctx.fill();
      Fit().draw(ctx, '!', p.x + ringR - 2, p.y - ringR + 2.5, 11, P.white, 'center', true);
    }
    // tags: full for the selected and the urgent, a class chip for the rest
    if (selected || urgent) {
      const label = p.callsign + ' · ' + p.spec.name + ' · ' + band.name + (p.emergency ? ' · MAYDAY' : '');
      const w = Fit().width(ctx, label, C.TYPE.s, true) + 18;
      const tx = Math.max(w / 2 + 4, Math.min(C.W - w / 2 - 4, p.x));
      const ty = Math.max(C.TOPBAR + 22, p.y - ringR - 26);
      ctx.fillStyle = p.emergency ? '#f6c9bd' : P.panel;
      globalThis.CTL_Layout.rr(ctx, tx - w / 2, ty - 12, w, 24, 6); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = p.emergency ? P.danger : P.ink; ctx.stroke();
      Fit().draw(ctx, label, tx, ty + 1, C.TYPE.s, P.ink, 'center', true);
    } else if (p.state === 'air' || p.state === 'final') {
      Fit().draw(ctx, p.spec.name, p.x, p.y - ringR - 11, C.TYPE.tiny, P.inkSoft, 'center', true);
    }
  }

  function draw(ctx, run) {
    // queued departures wait by the strip, drawn small with a queue number
    run.depQueue.forEach((p, i) => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(0);
      ctx.globalAlpha = 0.9;
      body(ctx, p);
      ctx.restore();
      Fit().draw(ctx, 'Q' + (i + 1), p.x, p.y + 30, C.TYPE.tiny, P.ink, 'center', true);
    });
    for (const p of run.planes) {
      if (p.dead || p.state === 'queued') continue;
      drawOne(ctx, run, p);
    }
  }

  globalThis.CTL_RenderPlanes = { draw, drawOne, body };
})();
