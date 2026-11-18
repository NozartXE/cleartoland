// Weather over Kestrel Field: a steady wind that pushes every plane, gust
// fronts that sweep the chart, drifting fog banks that swallow separation
// warnings, and — on the last shift — THE GALE WALL, a storm front that eats
// the field from the west. All of it runs off the run's weather stream, so a
// seed's weather replays exactly.
(function () {
  const C = globalThis.CTL_Config;
  const R = globalThis.CTL_Rng;

  function create(run, shift) {
    const rng = run.rngWeather;
    const w = {
      windDir: R.range(rng, 0, Math.PI * 2),
      windBase: shift.wind * run.windMul,
      gustT: R.range(rng, 14, 26), gusts: [],
      fogs: [], gale: !!shift.gale, galeX: -340, galeSpeed: 13.5,
    };
    for (let i = 0; i < shift.fog; i++) {
      w.fogs.push({
        x: R.range(rng, 200, 1080), y: R.range(rng, 140, 640),
        r: R.range(rng, 95, 150), vx: R.range(rng, -7, 7), vy: R.range(rng, -4, 4),
      });
    }
    return w;
  }

  function step(run, dt) {
    const w = run.weather, rng = run.rngWeather;
    // gusts: a front is a moving line; crossing it shoves planes sideways
    w.gustT -= dt;
    if (w.gustT <= 0 && run.shiftDef.gusts > 0) {
      w.gustT = R.range(rng, 16, 30);
      w.gusts.push({ x: -60, speed: R.range(rng, 55, 85), dir: R.range(rng, -0.5, 0.5), born: run.time });
    }
    for (const g of w.gusts) g.x += g.speed * dt;
    w.gusts = w.gusts.filter(g => g.x < C.W + 80);
    for (const f of w.fogs) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < 80 || f.x > C.W - 80) f.vx *= -1;
      if (f.y < 110 || f.y > C.H - 110) f.vy *= -1;
    }
    if (w.gale) w.galeX += w.galeSpeed * dt;
  }

  // The wind vector at a point: steady wind plus any gust front near it.
  function vectorAt(run, x, y) {
    const w = run.weather;
    let vx = Math.cos(w.windDir) * w.windBase;
    let vy = Math.sin(w.windDir) * w.windBase;
    for (const g of w.gusts) {
      const d = Math.abs(x - g.x);
      if (d < 60) {
        const push = (1 - d / 60) * 26;
        vx += Math.cos(g.dir) * push; vy += Math.sin(g.dir) * push + 6;
      }
    }
    return { x: vx, y: vy };
  }

  function inFog(run, x, y) {
    for (const f of run.weather.fogs) {
      const dx = x - f.x, dy = y - f.y;
      if (dx * dx + dy * dy < f.r * f.r) return true;
    }
    return false;
  }

  function inGale(run, x) { return run.weather.gale && x < run.weather.galeX; }

  globalThis.CTL_Weather = { create, step, vectorAt, inFog, inGale };
})();
