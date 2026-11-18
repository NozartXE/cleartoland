// The event banner and the tower log: when an order lands or the gale comes,
// one bold line crosses the top of the chart for a few seconds; beneath the
// top bar, the last three log lines keep the run's story readable.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;

  function draw(ctx, run) {
    if (run.banner && run.bannerT > 0) {
      const alpha = Math.min(1, run.bannerT / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      const w = Math.min(880, Fit().width(ctx, run.banner, C.TYPE.l, true) + 60);
      L().chip(ctx, C.W / 2 - w / 2, 76, w, 44, '#ffe9a8');
      Fit().draw(ctx, run.banner, C.W / 2, 99, C.TYPE.l, P.ink, 'center', true, w - 24);
      ctx.restore();
    }
    // tower log, bottom-left above the controls line
    run.log.forEach((line, i) => {
      ctx.save();
      ctx.globalAlpha = 0.92 - i * 0.22;
      Fit().draw(ctx, line.text, 16, C.H - C.BOTBAR - 14 - i * 19, C.TYPE.s, P.ink, 'left', true);
      ctx.restore();
    });
  }

  globalThis.CTL_Banner = { draw };
})();
