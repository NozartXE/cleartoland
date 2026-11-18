// The draft screen: one choice fills the frame. Three upgrade roundels with
// names, tags and honest effect text; the next shift's forecast computed from
// the shift table (traffic mix, weather note, quotas); the tower's current
// fittings along the bottom; one paid reroll.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;
  const D = () => globalThis.CTL_Draft;

  function draw(ctx, run, view) {
    globalThis.CTL_Terrain.draw(ctx, run);
    ctx.fillStyle = 'rgba(239,230,207,0.55)'; ctx.fillRect(0, 0, C.W, C.H);

    Fit().draw(ctx, 'SHIFT ' + run.shift + ' CLEAR — FIT THE TOWER', 640, 66, C.TYPE.xxl, P.ink, 'center', true);
    Fit().draw(ctx, 'PICK 1 OF 3 — IT FLIES WITH YOU FOR THE REST OF THE RUN', 640, 104, C.TYPE.m, P.inkSoft, 'center', true);

    // the three offers
    run.draftOffers.forEach((up, i) => {
      const x = 84 + i * 384, y = 140, w = 352, h = 300;
      const hover = view.hover === 'offer' + i;
      L().panel(ctx, x, y, w, h, hover ? '#ffe9a8' : P.panel);
      L().chip(ctx, x + 24, y + 22, 120, 30, P.sky);
      Fit().draw(ctx, up.tag, x + 84, y + 38, C.TYPE.s, P.white, 'center', true);
      Fit().draw(ctx, String(i + 1), x + w - 40, y + 38, C.TYPE.xl, P.inkSoft, 'center', true);
      const lines = Fit().wrap(ctx, up.name, C.TYPE.xl, w - 48, true);
      lines.forEach((ln, li) => Fit().draw(ctx, ln, x + w / 2, y + 96 + li * 36, C.TYPE.xl, P.ink, 'center', true));
      const body = Fit().wrap(ctx, up.text, C.TYPE.m, w - 56, false);
      body.forEach((ln, li) => Fit().draw(ctx, ln, x + w / 2, y + 196 + li * 24, C.TYPE.m, P.ink, 'center', false));
      Fit().draw(ctx, 'PRESS ' + (i + 1), x + w / 2, y + h - 26, C.TYPE.s, P.inkSoft, 'center', true);
      view.buttons['offer' + i] = { x, y, w, h };
    });

    // forecast for the next shift, honestly from the table
    const fc = run.forecast;
    if (fc) {
      L().panel(ctx, 84, 470, 728, 108);
      Fit().draw(ctx, 'NEXT: SHIFT ' + fc.shift.n + ' — ' + fc.shift.name, 108, 500, C.TYPE.l, P.ink, 'left', true);
      Fit().draw(ctx, fc.shift.arr + ' ARRIVALS · ' + fc.shift.dep + ' DEPARTURES · ' + fc.mixNames, 108, 532, C.TYPE.m, P.inkSoft, 'left', false);
      Fit().draw(ctx, fc.note, 108, 560, C.TYPE.m, fc.shift.gale ? P.danger : P.ink, 'left', true);
    }
    // reroll
    const canReroll = !run.draftRerolled && run.score >= 150;
    view.buttons.reroll = L().button(ctx, 836, 470, 360, 52, run.draftRerolled ? 'REROLL SPENT' : 'X — REROLL · 150 PTS', {
      size: C.TYPE.m, fill: canReroll ? P.panel : '#ddd3b8', hover: view.hover === 'reroll' && canReroll,
    });
    Fit().draw(ctx, 'SCORE ' + run.score.toLocaleString('en-US') + ' · STARS ' + run.stars + '/' + run.maxStars, 1016, 548, C.TYPE.m, P.ink, 'center', true);

    // fittings so far
    L().panel(ctx, 84, 606, 1112, 84);
    Fit().draw(ctx, 'FITTED SO FAR', 108, 630, C.TYPE.s, P.inkSoft, 'left', true);
    const owned = run.draftPicks.map(id => D().byId(id).name);
    Fit().draw(ctx, owned.length ? owned.join(' · ') : 'NONE — THE TOWER RUNS BARE', 108, 662, C.TYPE.m, P.ink, 'left', true, 1060);
  }

  globalThis.CTL_DraftScreen = { draw };
})();
