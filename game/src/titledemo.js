// The title demo: a real run on a fixed seed, flown by the relief bot behind
// the title screen — the chart the player sees first is the game itself, not
// an illustration of it. When the demo run ends or drifts too far, it quietly
// starts over.
(function () {
  let run = null;

  function ensure() {
    if (!run) {
      run = globalThis.CTL_Sim.createRun('title-demo', 'busy', false);
      run.screen = 'play';
    }
    return run;
  }

  function tick(dt) {
    const r = ensure();
    let acc = tick.acc = (tick.acc || 0) + dt;
    let guard = 0;
    while (acc >= globalThis.CTL_Config.STEP && guard++ < 8) {
      globalThis.CTL_Bot.control(r);
      globalThis.CTL_Sim.step(r);
      acc -= globalThis.CTL_Config.STEP;
      if (r.over || r.screen !== 'play') { run = null; return ensure(); }
    }
    // the demo never shows floaters from its own scoring
    r.fxEvents = r.fxEvents.filter(e => e.type === 'sound' ? false : true);
    r.fxEvents = [];
    return r;
  }

  globalThis.CTL_TitleDemo = { tick, ensure };
})();
