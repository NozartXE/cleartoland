// The HUD: everything the tower watches while flying. Top bar — shift and its
// name, the WIN/LOSE objective line, score and best, the star row (the field's
// lives), the streak multiplier, wind readout and the shift progress. Right
// rail — live orders with countdowns, the departure queue with its LAUNCH
// button, and the selected plane's card (class, band, fuel, its buttons).
// Bottom — the controls line, always visible, always true.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const F = globalThis.CTL_Field;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;
  const I = () => globalThis.CTL_Icons;

  function topBar(ctx, run, save) {
    ctx.fillStyle = P.ink; ctx.fillRect(0, 0, C.W, C.TOPBAR);
    Fit().draw(ctx, 'CLEAR TO LAND', 16, 24, C.TYPE.l, P.white, 'left', true);
    Fit().draw(ctx, 'SHIFT ' + run.shift + ' — ' + run.shiftDef.name, 16, 48, C.TYPE.s, '#ffd98a', 'left', true);
    // objective
    const obj = run.endless ? 'HOLD THE FIELD — SURVIVE THE NIGHT' :
      (run.shift >= 9 ? 'WIN: LAND THEM ALL BEFORE THE WALL' : 'WIN: CLEAR ALL ' + 9 + ' SHIFTS · LOSE: 0 STARS');
    Fit().draw(ctx, obj, 300, 24, C.TYPE.s, P.white, 'left', true);
    const t = run.traffic;
    const prog = run.endless ? (run.stats.landedTotal + ' LANDED')
      : 'TRAFFIC LEFT ' + (t.arrLeft + t.depLeft + run.planes.filter(p => !p.dead).length + run.depQueue.length);
    Fit().draw(ctx, prog, 300, 48, C.TYPE.s, '#9fc6d8', 'left', true);
    // stars
    for (let i = 0; i < run.maxStars; i++) L().star(ctx, 700 + i * 30, 32, 12, i < run.stars);
    // streak
    if (run.streak >= 2) {
      L().chip(ctx, 806, 14, 118, 36, '#ffe9a8');
      Fit().draw(ctx, 'STREAK x' + Math.min(run.streak, 8), 865, 33, C.TYPE.m, P.ink, 'center', true);
    }
    // wind
    const wv = globalThis.CTL_Weather.vectorAt(run, 640, 400);
    const wsp = Math.round(Math.sqrt(wv.x * wv.x + wv.y * wv.y));
    I().windArrow(ctx, 968, 32, Math.atan2(wv.y, wv.x), 13, '#9fc6d8');
    Fit().draw(ctx, 'WIND ' + wsp, 992, 33, C.TYPE.s, P.white, 'left', true);
    // score
    Fit().draw(ctx, 'SCORE ' + run.score.toLocaleString('en-US'), C.W - 16, 24, C.TYPE.l, P.white, 'right', true);
    Fit().draw(ctx, 'BEST ' + Math.max(save.best, run.score).toLocaleString('en-US'), C.W - 16, 48, C.TYPE.s, '#9fc6d8', 'right', true);
  }

  function ordersPanel(ctx, run) {
    if (!run.orders.length) return;
    const x = C.W - 316, y = 76;
    L().panel(ctx, x, y, 300, 30 + run.orders.length * 52);
    I().scroll(ctx, x + 22, y + 24, 11, P.gold);
    Fit().draw(ctx, 'TOWER ORDERS', x + 42, y + 24, C.TYPE.s, P.ink, 'left', true);
    run.orders.forEach((o, i) => {
      const oy = y + 58 + i * 52;
      const left = Math.max(0, Math.ceil(o.dur - o.t));
      Fit().draw(ctx, o.kind.name, x + 14, oy, C.TYPE.s, P.ink, 'left', true);
      const prog = o.kind.count ? ' ' + o.done + '/' + o.kind.count : '';
      Fit().draw(ctx, '+' + o.pay + prog + ' · ' + left + 's', x + 286, oy, C.TYPE.s, P.gold, 'right', true);
      // countdown bar
      ctx.fillStyle = 'rgba(34,48,58,0.15)'; ctx.fillRect(x + 14, oy + 13, 272, 6);
      ctx.fillStyle = left < 15 ? P.danger : P.good;
      ctx.fillRect(x + 14, oy + 13, 272 * Math.max(0, 1 - o.t / o.dur), 6);
    });
  }

  function queuePanel(ctx, run, view) {
    const x = C.W - 316, y = C.H - C.BOTBAR - 128;
    L().panel(ctx, x, y, 300, 116);
    Fit().draw(ctx, 'DEPARTURES', x + 14, y + 20, C.TYPE.s, P.ink, 'left', true);
    if (run.depQueue.length) {
      const q = run.depQueue[0];
      Fit().draw(ctx, 'NEXT: ' + q.callsign + ' ' + q.spec.name + ' → ' + q.exitGate.id, x + 14, y + 44, C.TYPE.s, P.inkSoft, 'left', false, 272);
      Fit().draw(ctx, run.depQueue.length + ' WAITING · +' + C.DEPART_POINTS + ' EACH', x + 14, y + 64, C.TYPE.tiny, P.inkSoft, 'left', true);
    } else {
      Fit().draw(ctx, 'QUEUE EMPTY', x + 14, y + 44, C.TYPE.s, P.inkSoft, 'left', false);
    }
    view.buttons.launch = L().button(ctx, x + 14, y + 76, 272, 30, 'SPACE — LAUNCH NEXT', { size: C.TYPE.s, hover: view.hover === 'launch' });
  }

  function selectedCard(ctx, run, view) {
    const p = globalThis.CTL_Sim.selected(run);
    const x = 16, y = 76;
    L().panel(ctx, x, y, 292, p ? 148 : 64);
    if (!p) {
      Fit().draw(ctx, 'NO PLANE SELECTED', x + 14, y + 22, C.TYPE.s, P.ink, 'left', true);
      Fit().draw(ctx, 'Click a plane, then drag its route.', x + 14, y + 44, C.TYPE.tiny, P.inkSoft, 'left', false);
      return;
    }
    Fit().draw(ctx, p.callsign, x + 14, y + 22, C.TYPE.m, P.ink, 'left', true);
    Fit().draw(ctx, p.spec.full.toUpperCase() + (p.kind === 'dep' ? ' · OUT TO ' + (p.exitGate ? p.exitGate.id : '') : ''), x + 278, y + 22, C.TYPE.tiny, P.inkSoft, 'right', true);
    // band buttons
    C.BANDS.forEach((b, i) => {
      const bx = x + 14 + i * 62;
      const active = Math.round(p.alt) === i;
      view.buttons['band' + i] = L().button(ctx, bx, y + 38, 56, 30, b.name, {
        size: C.TYPE.s, fill: active ? b.ring : P.panel, hover: view.hover === 'band' + i,
      });
      if (active) Fit().draw(ctx, b.name, bx + 28, y + 54, C.TYPE.s, P.white, 'center', true);
    });
    Fit().draw(ctx, 'KEYS 1 2 3', x + 210, y + 54, C.TYPE.tiny, P.inkSoft, 'left', true);
    // fuel bar
    if (p.kind === 'arr') {
      const frac = Math.max(0, p.fuel / p.maxFuel);
      I().drop(ctx, x + 20, y + 88, 8, frac < 0.25 ? P.danger : P.sky);
      ctx.fillStyle = 'rgba(34,48,58,0.15)'; ctx.fillRect(x + 36, y + 83, 180, 10);
      ctx.fillStyle = frac < 0.25 ? P.danger : P.good; ctx.fillRect(x + 36, y + 83, 180 * frac, 10);
      Fit().draw(ctx, Math.ceil(p.fuel) + 's', x + 224, y + 89, C.TYPE.s, P.ink, 'left', true);
    } else {
      Fit().draw(ctx, 'FUELLED AND READY', x + 14, y + 89, C.TYPE.s, P.inkSoft, 'left', false);
    }
    // speed + hold buttons
    view.buttons.slow = L().button(ctx, x + 14, y + 104, 84, 30, 'SLOW', { size: C.TYPE.s, fill: p.spdMul < 1 ? '#ffe9a8' : P.panel, hover: view.hover === 'slow' });
    view.buttons.fast = L().button(ctx, x + 106, y + 104, 84, 30, 'FAST', { size: C.TYPE.s, fill: p.spdMul > 1 ? '#ffe9a8' : P.panel, hover: view.hover === 'fast' });
    if (run.upgrades.stack) {
      view.buttons.hold = L().button(ctx, x + 198, y + 104, 80, 30, p.hold ? 'HELD' : 'HOLD', { size: C.TYPE.s, fill: p.hold ? '#ffe9a8' : P.panel, hover: view.hover === 'hold' });
    } else {
      Fit().draw(ctx, 'W S = SPEED', x + 204, y + 120, C.TYPE.tiny, P.inkSoft, 'left', true);
    }
  }

  function controlsLine(ctx, run) {
    ctx.fillStyle = P.ink; ctx.fillRect(0, C.H - C.BOTBAR, C.W, C.BOTBAR);
    const txt = 'CLICK SELECT · DRAG DRAW ROUTE · 1/2/3 ALTITUDE · W/S SPEED · SPACE LAUNCH · TAB NEXT PLANE · P PAUSE · M MUTE';
    Fit().draw(ctx, txt, C.W / 2, C.H - C.BOTBAR / 2 + 1, C.TYPE.s, P.white, 'center', true);
  }

  function draw(ctx, run, view, save) {
    topBar(ctx, run, save);
    ordersPanel(ctx, run);
    queuePanel(ctx, run, view);
    selectedCard(ctx, run, view);
    controlsLine(ctx, run);
    if (run.paused) {
      ctx.fillStyle = 'rgba(34,48,58,0.45)'; ctx.fillRect(0, C.TOPBAR, C.W, C.H - C.TOPBAR - C.BOTBAR);
      Fit().draw(ctx, 'PAUSED — P TO RESUME', C.W / 2, C.H / 2, C.TYPE.xxl, P.white, 'center', true);
    }
  }

  globalThis.CTL_Hud = { draw };
})();
