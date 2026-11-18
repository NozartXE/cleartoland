// Screenshot staging for CLEAR TO LAND (?shot=play|title|draft|results&seed=…).
// Every staged frame is a real state of the real simulation, reached by the
// relief bot flying a seeded run: the play cover is found by a two-pass scout
// (pass 1 scores every tick for busyness, pass 2 replays the same seed to the
// winning tick and freezes), the draft is the moment shift 1 honestly clears,
// and the results plaque is the end of a run the bot honestly lost or held.
// Nothing is drawn by hand; the renderer renders whatever the sim reached.
(function () {
  const q = new URLSearchParams(globalThis.location ? globalThis.location.search : '');
  const shot = q.get('shot');
  if (!shot) return;
  const seed = q.get('seed') || 'show';
  const S = globalThis.CTL_Sim;
  const B = globalThis.CTL_Bot;
  const STEP = globalThis.CTL_Config.STEP;

  function fly(run, steps, onTick) {
    for (let i = 0; i < steps; i++) {
      if (run.screen === 'draft') { S.pickDraft(run, run.draftOffers[0].id); continue; }
      if (run.over) break;
      B.control(run);
      S.step(run);
      if (onTick) onTick(run, i);
      if (run.screen === 'results') break;
    }
    return run;
  }

  function busyness(run) {
    const air = run.planes.filter(p => !p.dead && (p.state === 'air' || p.state === 'final'));
    const routed = air.filter(p => p.path.length > 0).length;
    const warned = air.some(p => p.warned) ? 5 : 0;
    const finals = air.filter(p => p.state === 'final').length * 2;
    // spread: a sky with planes in every corner reads busier than a clump
    let spread = 0;
    for (let i = 0; i < air.length; i++) for (let j = i + 1; j < air.length; j++) {
      spread += Math.min(300, globalThis.CTL_Field.dist(air[i].x, air[i].y, air[j].x, air[j].y)) / 300;
    }
    return air.length * 2 + routed * 1.6 + warned + finals + run.orders.length * 3 +
      Math.min(run.streak, 4) + run.depQueue.length + spread * 0.35;
  }

  function stagePlay() {
    // Scout a small deterministic list of seeds; stage the busiest tick of
    // the best run found (the bot's luck varies by seed — the frame must be
    // a genuinely crowded moment of a genuinely played run).
    const seeds = [seed, 'gate-2', 'gate-3', 'harbour', 'vector', 'kestrel'];
    let best = null;
    for (const sd of seeds) {
      let probe = S.createRun(sd, 'busy', false);
      let bt = 0, bs = -1, bAir = 0;
      fly(probe, 60 * 1500, (r, i) => {
        if (r.time > 55 && r.screen === 'play') {
          const air = r.planes.filter(p => !p.dead && (p.state === 'air' || p.state === 'final'));
          if (air.length < 5) return;
          let sc = busyness(r);
          if (r.fxEvents.some(e => e.type === 'score')) sc += 4; // a floater is being born
          if (sc > bs) { bs = sc; bt = i; bAir = air.length; }
        }
      });
      if (!best || bs > best.bs) best = { sd, bt, bs, bAir };
      if (bAir >= 8 && bs > 34) break; // crowded enough — stop scouting
    }
    // replay the winning seed to its winning tick and freeze
    let run = S.createRun(best.sd, 'busy', false);
    fly(run, best.bt, null);
    // select the routed plane nearest the middle of the chart
    const air = run.planes.filter(p => !p.dead && p.state === 'air' && p.path.length);
    air.sort((a, b) => Math.abs(a.x - 640) + Math.abs(a.y - 420) - (Math.abs(b.x - 640) + Math.abs(b.y - 420)));
    if (air.length) run.selectedId = air[0].id;
    globalThis.CTL_Fx.drain(run);
    return { screen: 'play', run };
  }

  function stageTitle() {
    let run = S.createRun('title-' + seed, 'busy', false);
    let guard = 0;
    while (guard++ < 60 * 300) {
      B.control(run); S.step(run);
      const air = run.planes.filter(p => !p.dead && p.state === 'air').length;
      if (run.time > 40 && air >= 8) break;
      if (run.screen !== 'play') { S.pickDraft(run, run.draftOffers[0].id); }
    }
    run.fxEvents = [];
    return { screen: 'title', run };
  }

  function stageDraft() {
    let run = S.createRun(seed, 'busy', false);
    let guard = 0;
    while (guard++ < 60 * 900 && run.screen !== 'draft' && !run.over) {
      B.control(run); S.step(run);
    }
    return { screen: 'draft', run };
  }

  function stageResults() {
    let run = S.createRun(seed, 'busy', false);
    fly(run, 60 * 3600, null);
    return { screen: 'results', run };
  }

  const staged = shot === 'play' ? stagePlay()
    : shot === 'title' ? stageTitle()
    : shot === 'draft' ? stageDraft()
    : stageResults();
  globalThis.__CTL_STAGE = staged;
  globalThis.__CTL_READY = true;
})();
