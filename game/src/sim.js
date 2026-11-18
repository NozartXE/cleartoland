// The tower itself: run state, the fixed-step orchestration of traffic,
// planes, weather, conflicts and orders, all scoring, and the shift → draft →
// shift flow that makes a run. Rendering and input live elsewhere; this file
// only decides what is true.
(function () {
  const C = globalThis.CTL_Config;
  const R = globalThis.CTL_Rng;
  const P = globalThis.CTL_Planes;
  const W = globalThis.CTL_Weather;
  const T = globalThis.CTL_Traffic;
  const D = globalThis.CTL_Draft;
  const O = globalThis.CTL_Orders;
  const CF = globalThis.CTL_Conflicts;

  function createRun(seedText, difficultyId, endless) {
    const difficulty = C.DIFFICULTIES.find(d => d.id === difficultyId) || C.DIFFICULTIES[1];
    const run = {
      seed: seedText, time: 0, screen: 'play', paused: false, over: false,
      difficulty, endless: !!endless, shift: 1, shiftDef: null, weather: null,
      rngTraffic: R.stream(seedText, 'traffic'), rngWeather: R.stream(seedText, 'weather'),
      rngOrders: R.stream(seedText, 'orders'), rngDraft: R.stream(seedText, 'draft'),
      fuelMul: difficulty.fuelMul, windMul: difficulty.windMul,
      nextPlaneId: 1,
      planes: [], depQueue: [], orders: [], upgrades: D.freshUpgrades(), draftPicks: [],
      score: 0, shiftScore: 0, stars: C.MAX_STARS, maxStars: C.MAX_STARS,
      streak: 0, streakT: 0, lastLandT: -99, warnedThisShift: 0, orderQuietBase: 0,
      selectedId: null, log: [], fxEvents: [], banner: null, bannerT: 0,
      draftOffers: [], draftRerolled: false, forecast: null, result: null, newFeats: [],
      shiftScores: [], lastShiftClean: false, startedAt: Date.now(),
      stats: {
        landedTotal: 0, depTotal: 0, incidents: 0, saves: 0, ordersTotal: 0,
        bestStreak: 0, maxAirborne: 0, maydaySaves: 0, shiftsCleared: 0,
        landedThisShift: 0, jumbosThisShift: 0, savesThisShift: 0, ordersThisShift: 0,
        incidentsThisShift: 0, bestShiftScore: 0, galeCleared: false,
      },
    };
    run.turbulence = p => W.inGale(run, p.x);
    startShift(run, 1);
    return run;
  }

  function startShift(run, n) {
    run.shift = n;
    run.shiftDef = run.endless ? endlessDef(run) : C.SHIFTS[n - 1];
    run.planes = run.planes.filter(p => !p.dead && p.state === 'taxi');
    run.depQueue = [];
    run.orders = [];
    run.weather = W.create(run, run.shiftDef);
    run.shiftScore = 0;
    run.warnedThisShift = 0;
    run.stats.landedThisShift = 0; run.stats.jumbosThisShift = 0;
    run.stats.savesThisShift = 0; run.stats.ordersThisShift = 0; run.stats.incidentsThisShift = 0;
    T.create(run);
    log(run, 'SHIFT ' + n + ' — ' + run.shiftDef.name);
    if (run.shiftDef.gale) log(run, 'THE GALE WALL IS COMING FROM THE WEST');
  }

  function endlessDef(run) {
    const base = C.SHIFTS[7];
    return Object.assign({}, base, { name: 'NIGHT FREQUENCY', arr: 9999, dep: 9999, gale: false });
  }

  function log(run, text) {
    run.log.unshift({ t: run.time, text });
    run.log = run.log.slice(0, 3);
  }

  function fx(run, ev) { run.fxEvents.push(ev); if (run.fxEvents.length > 24) run.fxEvents.shift(); }

  function addScore(run, pts, x, y, label, big) {
    run.score = Math.max(0, run.score + pts);
    run.shiftScore = Math.max(0, run.shiftScore + pts);
    if (label) fx(run, { type: 'score', x, y, text: label, big: !!big });
  }

  // ---- one fixed step ----
  function step(run) {
    if (run.paused || run.over || run.screen !== 'play') return;
    const dt = C.STEP;
    run.time += dt;
    const events = [];
    W.step(run, dt);
    T.step(run, dt, events);
    for (const p of run.planes) {
      if (p.dead) continue;
      const wv = W.vectorAt(run, p.x, p.y);
      P.step(run, p, dt, wv.x, wv.y, events);
    }
    CF.step(run, dt, events);
    const orderEvents = [];
    O.step(run, dt, events, orderEvents);
    for (const e of orderEvents) events.push(e);
    for (const e of events) scoreEvent(run, e);
    run.planes = run.planes.filter(p => !p.dead);
    const airborne = run.planes.filter(p => p.state === 'air' || p.state === 'final').length;
    if (airborne > run.stats.maxAirborne) run.stats.maxAirborne = airborne;
    if (run.streakT > 0) { run.streakT -= dt; if (run.streakT <= 0) run.streak = 0; }
    if (run.bannerT > 0) run.bannerT -= dt;

    if (!run.endless && T.shiftDone(run)) shiftCleared(run);
  }

  function scoreEvent(run, e) {
    const s = run.stats;
    switch (e.type) {
      case 'landed': {
        const p = e.plane;
        run.streak = (run.time - run.lastLandT <= C.SAVE_WINDOW) ? run.streak + 1 : 1;
        run.lastLandT = run.time; run.streakT = C.SAVE_WINDOW;
        if (run.streak > s.bestStreak) s.bestStreak = run.streak;
        const mult = Math.min(run.streak, 8);
        let pts = p.spec.points * mult;
        if (p.emergency) { pts += 250; s.maydaySaves++; fx(run, { type: 'score', x: p.x, y: p.y - 30, text: 'MAYDAY SAVE +250', big: true }); }
        addScore(run, pts, p.x, p.y - 16, '+' + pts + (mult > 1 ? ' STREAK x' + mult : ''), mult >= 3);
        s.landedTotal++; s.landedThisShift++;
        if (p.cls === 'jumbo') s.jumbosThisShift++;
        log(run, p.callsign + ' LANDED +' + pts);
        fx(run, { type: 'sound', name: 'land' });
        O.step(run, 0, [{ type: 'streak', streak: run.streak }], []);
        break;
      }
      case 'departed': {
        const pts = C.DEPART_POINTS + (run.upgrades.handoff ? 40 : 0);
        addScore(run, pts, e.plane.x, e.plane.y, '+' + pts + ' OUT', false);
        s.depTotal++;
        fx(run, { type: 'sound', name: 'depart' });
        break;
      }
      case 'departed-far': addScore(run, 40, e.plane.x, e.plane.y, '+40 OUT', false); s.depTotal++; break;
      case 'lost-arrival':
        addScore(run, -50, e.plane.x, e.plane.y, 'LEFT AIRSPACE -50', false);
        log(run, e.plane.callsign + ' LEFT UNCONTROLLED');
        break;
      case 'incident': {
        run.stars--; s.incidents++; s.incidentsThisShift++; run.streak = 0;
        addScore(run, -300, (e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2, 'INCIDENT -300', true);
        fx(run, { type: 'shake', mag: 14 });
        fx(run, { type: 'sound', name: 'incident' });
        fx(run, { type: 'burst', x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2, n: 26, color: '#d8492e' });
        log(run, 'INCIDENT — ' + e.a.callsign + ' / ' + e.b.callsign);
        if (run.stars <= 0) endRun(run, false);
        break;
      }
      case 'forced-down': {
        run.stars--; s.incidents++; s.incidentsThisShift++; run.streak = 0;
        fx(run, { type: 'score', x: e.plane.x, y: e.plane.y, text: 'DOWN IN THE FIELD', big: true });
        fx(run, { type: 'shake', mag: 10 });
        fx(run, { type: 'sound', name: 'incident' });
        log(run, e.plane.callsign + ' CAME DOWN IN THE FIELD');
        if (run.stars <= 0) endRun(run, false);
        break;
      }
      case 'warn-start':
        run.warnedThisShift++;
        fx(run, { type: 'sound', name: 'warn' });
        break;
      case 'save':
        addScore(run, 50, e.plane.x, e.plane.y - 14, 'SAVE +50', false);
        s.saves++; s.savesThisShift++;
        break;
      case 'mayday':
        fx(run, { type: 'score', x: e.plane.x, y: e.plane.y - 20, text: 'MAYDAY — FUEL GONE', big: true });
        fx(run, { type: 'sound', name: 'mayday' });
        log(run, e.plane.callsign + ' IS GLIDING — CLEAR ITS PATH');
        break;
      case 'order-new':
        run.banner = 'NEW ORDER: ' + e.order.kind.name; run.bannerT = 3.2;
        fx(run, { type: 'sound', name: 'order' });
        break;
      case 'order-paid':
        addScore(run, e.order.pay, C.W / 2, 120, e.order.kind.name + ' +' + e.order.pay, true);
        s.ordersTotal++; s.ordersThisShift++;
        fx(run, { type: 'sound', name: 'paid' });
        log(run, 'ORDER PAID: ' + e.order.kind.name);
        break;
      case 'order-failed':
        log(run, 'ORDER LAPSED: ' + e.order.kind.name);
        break;
      case 'on-final': log(run, e.plane.callsign + ' ON FINAL'); break;
      case 'airborne': break;
    }
  }

  function shiftCleared(run) {
    const s = run.stats;
    s.shiftsCleared++;
    s.bestShiftScore = Math.max(s.bestShiftScore, run.shiftScore);
    run.lastShiftClean = run.warnedThisShift === 0;
    run.shiftScores.push(run.shiftScore);
    if (run.shiftDef.gale) s.galeCleared = true;
    run.stars = Math.min(run.maxStars, run.stars + 1);
    log(run, 'SHIFT ' + run.shift + ' CLEAR — +' + run.shiftScore);
    if (run.shift >= 9) { endRun(run, true); return; }
    run.screen = 'draft';
    run.draftOffers = D.offers(run);
    run.draftRerolled = false;
    run.forecast = D.forecast(run, run.shift + 1);
    fx(run, { type: 'sound', name: 'draft' });
  }

  function pickDraft(run, upgradeId) {
    D.apply(run, upgradeId);
    log(run, 'TOWER FITTED: ' + D.byId(upgradeId).name);
    run.screen = 'play';
    startShift(run, run.shift + 1);
  }

  function rerollDraft(run) {
    if (run.draftRerolled || run.score < 150) return false;
    run.score -= 150; run.draftRerolled = true;
    run.draftOffers = D.offers(run);
    return true;
  }

  function launchNext(run) {
    const busy = run.planes.some(p => !p.dead && (p.state === 'rollout' ||
      (p.state === 'final' && p.strip === globalThis.CTL_Field.RUNWAY_A)));
    if (busy || !run.depQueue.length) { fx(run, { type: 'sound', name: 'click' }); return false; }
    const p = run.depQueue[0];
    P.launchDeparture(run, p);
    log(run, p.callsign + ' ROLLING — ROUTE IT TO ' + p.exitGate.id);
    return true;
  }

  function endRun(run, won) {
    run.over = true; run.screen = 'results';
    const total = run.score;
    const grade = (C.GRADES.find(g => total >= g.min) || { grade: 'D' }).grade;
    run.result = {
      won, score: total, grade, shifts: run.stats.shiftsCleared,
      landed: run.stats.landedTotal, departed: run.stats.depTotal,
      incidents: run.stats.incidents, orders: run.stats.ordersTotal,
      bestStreak: run.stats.bestStreak, time: run.time,
      difficulty: run.difficulty.name, seed: run.seed, endless: run.endless,
      result: won ? 'FIELD HELD' : 'FIELD CLOSED',
    };
    const save = globalThis.CTL_Save.load();
    run.newFeats = globalThis.CTL_Feats.check(run, save);
    globalThis.CTL_Save.recordRun(save, {
      score: total, grade, result: run.result.result,
      difficulty: run.difficulty.name, endless: run.endless,
    });
    if (run.newFeats.length) fx(run, { type: 'sound', name: 'feat' });
  }

  function selected(run) {
    return run.planes.find(p => p.id === run.selectedId && !p.dead) || null;
  }

  globalThis.CTL_Sim = { createRun, step, pickDraft, rerollDraft, launchNext, selected, startShift };
})();
