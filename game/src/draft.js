// The between-shift draft: after each cleared shift the tower picks 1 of 3
// upgrades from the pool of 12 (reroll once for score). Upgrades are flags on
// the run — every other system reads them through run.upgrades — so a pick
// visibly changes how the next shift flies.
(function () {
  const C = globalThis.CTL_Config;
  const R = globalThis.CTL_Rng;

  function freshUpgrades() {
    const u = {};
    for (const up of C.UPGRADES) u[up.id] = false;
    return u;
  }

  // Honest next-shift forecast, computed from the shift table itself.
  function forecast(run, nextShift) {
    const def = C.SHIFTS[nextShift - 1];
    if (!def) return null;
    const mixNames = Object.keys(def.mix).map(k => C.CLASSES[k].name).join(' · ');
    return {
      shift: def, mixNames,
      note: def.gale ? 'THE GALE WALL CLOSES FROM THE WEST'
        : def.fog >= 3 ? 'THICK FOG — WARNINGS GO QUIET'
        : def.arr >= 15 ? 'THE BUSIEST SKY YET' : 'TRAFFIC BUILDS',
    };
  }

  function offers(run) {
    const owned = C.UPGRADES.filter(u => !run.upgrades[u.id]);
    const pool = owned.slice();
    const out = [];
    while (out.length < 3 && pool.length) {
      const i = Math.floor(run.rngDraft() * pool.length) % pool.length;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  function reroll(run) {
    return offers(run); // offers are drawn fresh from the unowned pool
  }

  function apply(run, upgradeId) {
    run.upgrades[upgradeId] = true;
    if (upgradeId === 'extrastar') run.stars = Math.min(run.stars + 1, C.MAX_STARS + 1);
    run.draftPicks.push(upgradeId);
  }

  function byId(id) { return C.UPGRADES.find(u => u.id === id); }

  globalThis.CTL_Draft = { freshUpgrades, forecast, offers, reroll, apply, byId };
})();
