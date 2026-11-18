// CLEAR TO LAND bootstrap: the frame loop, the screen machine, and every key
// and button meaning. The sim advances in fixed steps from an accumulator, so
// a slow frame changes nothing about what is true — only about what is drawn.
(function () {
  const C = globalThis.CTL_Config;
  const S = globalThis.CTL_Sim;
  const Save = globalThis.CTL_Save;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const save = Save.load();
  const view = { buttons: {}, mouse: { x: 0, y: 0 }, hover: null, drag: null, difficulty: 'busy', endless: false };
  let screen = 'title';
  let run = null;
  let acc = 0, lastT = 0;

  function startRun() {
    const seed = 'S' + (save.runs + 1) + '-' + view.difficulty;
    run = S.createRun(seed, view.difficulty, view.endless);
    globalThis.CTL_Fx.reset();
    screen = 'play';
    globalThis.CTL_Audio.ensure(save);
  }

  function cycleSelection(dir) {
    const ps = run.planes.filter(p => !p.dead && p.state === 'air');
    if (!ps.length) return;
    let i = ps.findIndex(p => p.id === run.selectedId);
    i = (i + dir + ps.length) % ps.length;
    run.selectedId = ps[i].id;
    globalThis.CTL_Audio.sfx.select();
  }

  const api = {
    save: () => save,
    screen: () => screen === 'play' || screen === 'draft' ? 'play' : screen,
    run: () => run,
    button(name) {
      globalThis.CTL_Audio.sfx.click();
      if (screen === 'title') {
        if (name === 'play') startRun();
        else if (name.startsWith('diff')) view.difficulty = C.DIFFICULTIES[Number(name.slice(4))].id;
        else if (name === 'endless') view.endless = !view.endless;
        else if (name === 'howto') screen = 'howto';
        else if (name === 'almanac') screen = 'almanac';
        else if (name === 'options') toggleOptions();
        return;
      }
      if (screen === 'play' && run) {
        if (name === 'launch') S.launchNext(run);
        else if (name.startsWith('band')) { const p = S.selected(run); if (p) { p.targetBand = Number(name.slice(4)); globalThis.CTL_Audio.sfx.band(); } }
        else if (name === 'slow') { const p = S.selected(run); if (p) p.spdMul = Math.max(0.65, p.spdMul - 0.35); }
        else if (name === 'fast') { const p = S.selected(run); if (p) p.spdMul = Math.min(1.3, p.spdMul + 0.3); }
        else if (name === 'hold') { const p = S.selected(run); if (p && run.upgrades.stack) globalThis.CTL_Planes.engageHold(p); }
        return;
      }
      if (screen === 'draft' && run) {
        if (name.startsWith('offer')) { const up = run.draftOffers[Number(name.slice(5))]; if (up) S.pickDraft(run, up.id); }
        else if (name === 'reroll') S.rerollDraft(run);
        return;
      }
      if (screen === 'results') {
        if (name === 'again') startRun();
        else if (name === 'title') screen = 'title';
      }
    },
    key(key, e) {
      const A = globalThis.CTL_Audio;
      if (key === 'm' || key === 'M') {
        const muted = save.music > 0;
        save.music = muted ? 0 : 0.7; save.sfx = muted ? 0 : 0.9;
        Save.store(); A.setVolumes(save);
        return;
      }
      if (screen === 'title') {
        if (key === 'Enter' || key === ' ') { e.preventDefault(); startRun(); }
        return;
      }
      if (screen === 'howto' || screen === 'almanac') {
        if (key === 'Escape') screen = 'title';
        return;
      }
      if (screen === 'draft' && run) {
        if (['1', '2', '3'].includes(key)) { const up = run.draftOffers[Number(key) - 1]; if (up) S.pickDraft(run, up.id); }
        else if (key === 'x' || key === 'X') S.rerollDraft(run);
        return;
      }
      if (screen === 'results') {
        if (key === 'r' || key === 'R') startRun();
        else if (key === 'Escape') screen = 'title';
        return;
      }
      if (screen === 'play' && run) {
        const p = S.selected(run);
        if (key === 'p' || key === 'P') run.paused = !run.paused;
        else if (key === 'Escape') { screen = 'title'; run = null; }
        else if (key === ' ') { e.preventDefault(); S.launchNext(run); }
        else if (key === 'Tab') { e.preventDefault(); cycleSelection(e.shiftKey ? -1 : 1); }
        else if (['1', '2', '3'].includes(key) && p) { p.targetBand = Number(key) - 1; A.sfx.band(); }
        else if ((key === 'w' || key === 'W') && p) p.spdMul = Math.min(1.3, p.spdMul + 0.3);
        else if ((key === 's' || key === 'S') && p) p.spdMul = Math.max(0.65, p.spdMul - 0.35);
        else if ((key === 'h' || key === 'H') && p && run.upgrades.stack) globalThis.CTL_Planes.engageHold(p);
      }
    },
  };

  // ---- options overlay (the one DOM panel) ----
  let optionsEl = null;
  function toggleOptions() {
    const root = document.getElementById('menu-root');
    if (optionsEl) { optionsEl.remove(); optionsEl = null; return; }
    optionsEl = document.createElement('div');
    optionsEl.className = 'panel';
    optionsEl.innerHTML = '<h3>OPTIONS</h3>' +
      '<label>Music</label><input id="opt-music" type="range" min="0" max="1" step="0.05" value="' + save.music + '">' +
      '<label>Sound</label><input id="opt-sfx" type="range" min="0" max="1" step="0.05" value="' + save.sfx + '">' +
      '<button id="opt-close">DONE</button>';
    root.appendChild(optionsEl);
    optionsEl.querySelector('#opt-music').addEventListener('input', ev => { save.music = Number(ev.target.value); Save.store(); globalThis.CTL_Audio.setVolumes(save); });
    optionsEl.querySelector('#opt-sfx').addEventListener('input', ev => { save.sfx = Number(ev.target.value); Save.store(); globalThis.CTL_Audio.setVolumes(save); });
    optionsEl.querySelector('#opt-close').addEventListener('click', toggleOptions);
  }

  globalThis.CTL_Input.attach(canvas, view, api);

  function render(dt) {
    ctx.save();
    view.buttons = {};
    const stage = globalThis.__CTL_STAGE;
    if (stage) { renderStage(stage); ctx.restore(); return; }
    if (screen === 'title') {
      const demo = globalThis.CTL_TitleDemo.tick(dt);
      globalThis.CTL_Title.draw(ctx, view, demo, save);
    } else if (screen === 'howto') {
      const demo = globalThis.CTL_TitleDemo.tick(dt);
      globalThis.CTL_Terrain.draw(ctx, demo);
      globalThis.CTL_Howto.draw(ctx, view);
    } else if (screen === 'almanac') {
      const demo = globalThis.CTL_TitleDemo.tick(dt);
      globalThis.CTL_Terrain.draw(ctx, demo);
      globalThis.CTL_Almanac.draw(ctx, view);
    } else if (run && screen === 'play') {
      const sh = globalThis.CTL_Fx.shakeOffset(run);
      ctx.translate(sh.x, sh.y);
      globalThis.CTL_Terrain.draw(ctx, run);
      globalThis.CTL_WeatherFx.draw(ctx, run);
      globalThis.CTL_Routes.draw(ctx, run, view);
      globalThis.CTL_RenderPlanes.draw(ctx, run);
      globalThis.CTL_Fx.draw(ctx);
      globalThis.CTL_Banner.draw(ctx, run);
      globalThis.CTL_Hud.draw(ctx, run, view, save);
    } else if (run && screen === 'draft') {
      globalThis.CTL_DraftScreen.draw(ctx, run, view);
    } else if (run && screen === 'results') {
      globalThis.CTL_Results.draw(ctx, run, view, save);
    }
    ctx.restore();
  }

  function renderStage(stage) {
    const r = stage.run;
    if (stage.screen === 'title') {
      globalThis.CTL_Title.draw(ctx, view, r, save);
    } else if (stage.screen === 'draft') {
      globalThis.CTL_DraftScreen.draw(ctx, r, view);
    } else if (stage.screen === 'results') {
      globalThis.CTL_Results.draw(ctx, r, view, save);
    } else {
      globalThis.CTL_Terrain.draw(ctx, r);
      globalThis.CTL_WeatherFx.draw(ctx, r);
      globalThis.CTL_Routes.draw(ctx, r, view);
      globalThis.CTL_RenderPlanes.draw(ctx, r);
      globalThis.CTL_Fx.draw(ctx);
      globalThis.CTL_Banner.draw(ctx, r);
      globalThis.CTL_Hud.draw(ctx, r, view, save);
    }
  }

  function frame(ts) {
    const dt = Math.min(0.1, (ts - lastT) / 1000 || 0);
    lastT = ts;
    if (!globalThis.__CTL_STAGE) {
      if (screen === 'play' && run && !run.paused) {
        acc += dt;
        let guard = 0;
        while (acc >= C.STEP && guard++ < 10) {
          S.step(run);
          acc -= C.STEP;
          if (run.screen === 'draft') { screen = 'draft'; break; }
          if (run.screen === 'results') { screen = 'results'; break; }
        }
        globalThis.CTL_Fx.drain(run);
        globalThis.CTL_Fx.update(dt);
      }
      globalThis.CTL_Audio.musicTick(dt, true);
    }
    render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  globalThis.__CTL_APP = { view, startRun, get screen() { return screen; }, get run() { return run; } };
})();
