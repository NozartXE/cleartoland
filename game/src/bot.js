// The relief controller: a deliberately ordinary bot that flies the field the
// way a careful player would — route arrivals to a downwind fix, drop them to
// LOW on final, climb departures out their gates, and change one plane's band
// when a warning sounds. It stages the title demo and the screenshots, and it
// proves headlessly that every shift can be cleared. It is not a good player:
// it never uses orders, holds or speed control.
(function () {
  const C = globalThis.CTL_Config;
  const F = globalThis.CTL_Field;
  const P = globalThis.CTL_Planes;

  function approachFix(run, p) {
    const zone = F.landingZoneFor(p, run.upgrades);
    if (zone.kind === 'pad') return { x: zone.pad.x, y: zone.pad.y, pad: true };
    const rw = zone.kind === 'runway' ? zone.rw : bestRunway(run, p);
    return {
      rw,
      fix: { x: rw.threshold.x - Math.cos(rw.heading) * 300, y: rw.threshold.y - Math.sin(rw.heading) * 300 },
      thr: { x: rw.threshold.x + Math.cos(rw.heading) * 60, y: rw.threshold.y + Math.sin(rw.heading) * 60 },
    };
  }

  function bestRunway(run, p) {
    // whichever threshold the plane can line up on with the gentler turn
    const a = turnCost(p, F.RUNWAY_A), b = turnCost(p, F.RUNWAY_B);
    return a <= b ? F.RUNWAY_A : F.RUNWAY_B;
  }
  function turnCost(p, rw) {
    const fx = rw.threshold.x - Math.cos(rw.heading) * 300, fy = rw.threshold.y - Math.sin(rw.heading) * 300;
    const want = Math.atan2(fy - p.y, fx - p.x);
    return Math.abs(F.angNorm(want - p.hdg)) * 300 + F.dist(p.x, p.y, fx, fy);
  }

  function control(run) {
    const bot = run.bot || (run.bot = { cool: {}, launchT: 0 });
    bot.launchT -= C.STEP;
    if (bot.launchT <= 0) {
      bot.launchT = 2.5;
      if (run.depQueue.length) globalThis.CTL_Sim.launchNext(run);
    }
    for (const p of run.planes) {
      if (p.dead || p.state !== 'air') continue;
      bot.cool[p.id] = (bot.cool[p.id] || 0) - C.STEP;
      // separation first: a warned plane changes band at once and sidesteps
      if (p.warned && bot.cool[p.id] <= 0) {
        p.targetBand = p.alt > 1.5 ? 1 : 2;
        if (p.path.length) {
          const wp = p.path[0];
          const dx = wp.x - p.x, dy = wp.y - p.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const side = (p.callsign.charCodeAt(0) % 2 === 0) ? 1 : -1;
          p.path.unshift({ x: p.x + dx * 0.4 - (dy / len) * 74 * side, y: p.y + dy * 0.4 + (dx / len) * 74 * side });
        }
        bot.cool[p.id] = 2;
        continue;
      }
      if (bot.cool[p.id] > 0) continue;
      bot.cool[p.id] = 1.4;
      if (p.kind === 'dep') {
        p.targetBand = 2;
        if (!p.path.length) P.setPath(p, [{ x: p.exitGate.x, y: p.exitGate.y }]);
        continue;
      }
      const ap = approachFix(run, p);
      if (ap.pad) {
        p.targetBand = F.dist(p.x, p.y, ap.x, ap.y) < 260 ? 0 : 1;
        if (!p.path.length) P.setPath(p, [{ x: ap.x, y: ap.y }]);
        continue;
      }
      const dFix = F.dist(p.x, p.y, ap.fix.x, ap.fix.y);
      // cruise stacked by entry gate (north/east high, south/west mid) until final
      const gi = F.GATES.indexOf(p.entryGate);
      p.targetBand = dFix > 430 ? (gi % 2 === 0 ? 2 : 1) : 0;
      if (!p.path.length) {
        // wide point first if the fix is behind us, else straight to it
        const want = Math.atan2(ap.fix.y - p.y, ap.fix.x - p.x);
        const pts = [];
        if (Math.abs(F.angNorm(want - p.hdg)) > 1.9) {
          pts.push({ x: p.x + Math.cos(p.hdg) * 190, y: p.y + Math.sin(p.hdg) * 190 });
        }
        pts.push(ap.fix, ap.thr);
        P.setPath(p, pts);
      }
    }
  }

  globalThis.CTL_Bot = { control, approachFix };
})();
