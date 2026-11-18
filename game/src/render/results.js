// The results screen: the run's whole story on one plaque — headline, grade,
// score, stat tiles, the grade ladder, the last three runs with their losses
// in red, the tower's fittings, feats earned, the next goal, and a per-shift
// score graph — with a landed jumbo as hero art and RUN AGAIN dominant.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;
  const D = () => globalThis.CTL_Draft;

  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function draw(ctx, run, view, save) {
    globalThis.CTL_Terrain.draw(ctx, run);
    ctx.fillStyle = 'rgba(239,230,207,0.45)'; ctx.fillRect(0, 0, C.W, C.H);
    const res = run.result;
    const isBest = res.score >= save.best && res.score > 0;

    L().panel(ctx, 48, 40, 716, 720);
    Fit().draw(ctx, res.result, 88, 84, C.TYPE.xxl, res.won ? P.good : P.danger, 'left', true, 560);
    if (isBest) {
      L().chip(ctx, 560, 58, 168, 44, '#ffe9a8');
      Fit().draw(ctx, 'NEW BEST', 644, 81, C.TYPE.m, P.ink, 'center', true);
    }
    // grade + score
    L().chip(ctx, 88, 124, 120, 120, '#ffe9a8');
    Fit().draw(ctx, res.grade, 148, 186, 92, P.ink, 'center', true);
    Fit().draw(ctx, 'SCORE', 232, 146, C.TYPE.s, P.ink, 'left', true);
    Fit().draw(ctx, String(res.score), 232, 184, C.TYPE.huge, P.ink, 'left', true);
    Fit().draw(ctx, res.difficulty + ' · SEED ' + res.seed + ' · TIME ' + fmtTime(res.time) + (res.endless ? ' · NIGHT FREQUENCY' : ''), 232, 224, C.TYPE.s, P.ink, 'left', false);

    // stat tiles
    const tiles = [
      ['LANDED', String(res.landed)], ['DEPARTED', String(res.departed)],
      ['SHIFTS', res.shifts + '/9'], ['INCIDENTS', String(res.incidents)],
    ];
    tiles.forEach((t, i) => {
      const x = 88 + i * 164;
      L().chip(ctx, x, 264, 148, 76, '#fdf6e0');
      Fit().draw(ctx, t[0], x + 74, 286, C.TYPE.s, P.ink, 'center', true);
      Fit().draw(ctx, t[1], x + 74, 318, C.TYPE.xl, res.incidents && t[0] === 'INCIDENTS' ? P.danger : P.ink, 'center', true);
    });
    Fit().draw(ctx, 'ORDERS PAID ' + res.orders + ' · BEST STREAK x' + Math.min(res.bestStreak, 8), 88, 364, C.TYPE.m, P.ink, 'left', true);

    // grade ladder
    const ladder = C.GRADES.map(g => g.grade + ' ' + g.min + (res.score >= g.min ? ' ✓' : ' ✗')).join('    ');
    Fit().draw(ctx, ladder, 88, 396, C.TYPE.m, P.ink, 'left', true, 640);

    // last three runs, losses in red
    Fit().draw(ctx, 'LAST 3 RUNS', 88, 432, C.TYPE.s, P.ink, 'left', true);
    const hist = save.history.length ? save.history : [{ score: res.score, grade: res.grade, result: res.result, difficulty: res.difficulty }];
    hist.slice(0, 3).forEach((h, i) => {
      const y = 460 + i * 36;
      const ok = h.result === 'FIELD HELD';
      L().chip(ctx, 88, y - 14, 128, 28, ok ? '#dff0dd' : '#f6d9cf');
      Fit().draw(ctx, h.result, 152, y + 1, C.TYPE.s, ok ? P.ink : P.danger, 'center', true, 120);
      Fit().draw(ctx, h.score + ' pts · grade ' + h.grade + ' · ' + h.difficulty, 232, y + 1, C.TYPE.s, P.ink, 'left', false);
    });

    // the tower's fittings
    Fit().draw(ctx, 'THE TOWER YOU BUILT — ' + run.draftPicks.length + ' FITTINGS', 88, 584, C.TYPE.s, P.ink, 'left', true);
    const names = run.draftPicks.map(id => D().byId(id).name);
    Fit().draw(ctx, names.length ? names.join(' · ') : 'NONE — THE TOWER RAN BARE', 88, 610, C.TYPE.s, P.ink, 'left', false, 640);

    // feats row
    C.FEATS.forEach((f, i) => {
      const earned = !!save.feats[f.id];
      const x = 88 + (i % 6) * 108, y = 640 + Math.floor(i / 6) * 40;
      L().chip(ctx, x, y, 100, 32, earned ? '#ffe9a8' : '#e2d9c2');
      Fit().draw(ctx, f.name.split(' ')[0], x + 50, y + 17, C.TYPE.tiny, earned ? P.ink : P.inkSoft, 'center', true, 92);
    });
    if (run.newFeats.length) {
      Fit().draw(ctx, 'NEW FEAT: ' + run.newFeats.map(id => globalThis.CTL_Feats.byId(id).name).join(' · '), 88, 738, C.TYPE.s, P.gold, 'left', true, 640);
    }

    // hero art: a jumbo on final over the chart, right side
    ctx.save();
    ctx.translate(992, 268); ctx.rotate(0.12); ctx.scale(2.0, 2.0);
    ctx.strokeStyle = C.BANDS[0].ring; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
    globalThis.CTL_RenderPlanes.body(ctx, { cls: 'jumbo', spec: C.CLASSES.jumbo, rotor: 0 });
    ctx.restore();
    Fit().draw(ctx, 'THE LAST ONE HOME', 992, 348, C.TYPE.s, P.inkSoft, 'center', true);

    // per-shift graph
    if (run.shiftScores.length > 1) {
      Fit().draw(ctx, 'PER SHIFT', 816, 470, C.TYPE.s, P.ink, 'left', true);
      const max = Math.max.apply(null, run.shiftScores.concat([1]));
      run.shiftScores.forEach((sc, i) => {
        const bh = Math.max(4, (sc / max) * 120);
        const x = 816 + i * 44;
        ctx.fillStyle = P.sky; ctx.fillRect(x, 610 - bh, 32, bh);
        ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.strokeRect(x, 610 - bh, 32, bh);
        Fit().draw(ctx, String(i + 1), x + 16, 626, C.TYPE.tiny, P.ink, 'center', true);
      });
    }

    view.buttons.again = L().button(ctx, 816, 648, 416, 72, 'R — TAKE THE TOWER AGAIN', { size: C.TYPE.l, hover: view.hover === 'again' });
    view.buttons.title = L().button(ctx, 816, 728, 416, 40, 'ESC — TITLE', { size: C.TYPE.s, fill: P.panel, hover: view.hover === 'title' });
  }

  globalThis.CTL_Results = { draw };
})();
