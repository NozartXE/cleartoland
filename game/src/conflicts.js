// Separation: the tower's one hard law. Two planes in the same altitude band
// that close inside WARN_DIST raise a warning; inside HIT_DIST they collide —
// unless the tower separates them again first, which pays a SAVE. Fog hides
// warnings (not collisions) unless the FOG BEACON upgrade is held; CALM VOICE
// grants a short grace before closeness becomes an incident.
(function () {
  const C = globalThis.CTL_Config;
  const F = globalThis.CTL_Field;

  function step(run, dt, events) {
    const ps = run.planes.filter(p => !p.dead && (p.state === 'air' || p.state === 'final'));
    // refresh fog flags first: warnings depend on them
    for (const p of ps) p.inFog = globalThis.CTL_Weather.inFog(run, p.x, p.y);
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (Math.abs(a.alt - b.alt) > 0.5) continue;
        const d = F.dist(a.x, a.y, b.x, b.y);
        const hidden = (a.inFog || b.inFog) && !run.upgrades.beacon;
        if (d < C.HIT_DIST) {
          const grace = run.upgrades.calmvoice ? 0.8 : 0;
          a.hitT = (a.hitT || 0) + dt; b.hitT = a.hitT;
          if (a.hitT > grace) {
            a.dead = true; b.dead = true;
            events.push({ type: 'incident', a, b });
          }
        } else if (d < C.WARN_DIST) {
          if (!hidden) {
            if (!a.warned || !b.warned) events.push({ type: 'warn-start', a, b });
            a.warned = true; b.warned = true;
            a.warnT = Math.max(a.warnT, 0.001); b.warnT = Math.max(b.warnT, 0.001);
          }
        }
      }
    }
    // warnings decay; a warning that fully decays after being real is a save
    for (const p of ps) {
      if (p.warned) {
        p.warnT += dt;
        let stillClose = false;
        for (const q of ps) {
          if (q !== p && Math.abs(q.alt - p.alt) <= 0.5 && F.dist(p.x, p.y, q.x, q.y) < C.WARN_DIST + 14) { stillClose = true; break; }
        }
        if (!stillClose) {
          if (p.warnT > 1.2) events.push({ type: 'save', plane: p });
          p.warned = false; p.warnT = 0; p.hitT = 0;
        }
      } else p.hitT = 0;
    }
  }

  globalThis.CTL_Conflicts = { step };
})();
