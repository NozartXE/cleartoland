// The almanac: the tower's reference card — every plane class with its
// numbers, every upgrade, every order kind, and the weather book. Reached
// from the title; drawn over the chart so the field stays in view.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;

  function draw(ctx, view) {
    ctx.fillStyle = 'rgba(239,230,207,0.82)'; ctx.fillRect(0, 0, C.W, C.H);
    Fit().draw(ctx, 'TOWER ALMANAC', 640, 52, C.TYPE.xxl, P.ink, 'center', true);
    Fit().draw(ctx, 'ESC — BACK', 640, 88, C.TYPE.s, P.inkSoft, 'center', true);

    // plane classes with live silhouettes
    L().panel(ctx, 48, 112, 560, 300);
    Fit().draw(ctx, 'THE TRAFFIC', 72, 140, C.TYPE.l, P.ink, 'left', true);
    C.CLASS_ORDER.forEach((id, i) => {
      const spec = C.CLASSES[id];
      const y = 176 + i * 46;
      ctx.save(); ctx.translate(96, y); ctx.rotate(-0.3);
      globalThis.CTL_RenderPlanes.body(ctx, { cls: id, spec, rotor: 2 });
      ctx.restore();
      Fit().draw(ctx, spec.full.toUpperCase(), 140, y - 7, C.TYPE.s, P.ink, 'left', true);
      Fit().draw(ctx, 'speed ' + spec.speed + ' · turn ' + spec.turn + '°/s · lands +' + spec.points, 140, y + 13, C.TYPE.tiny, P.inkSoft, 'left', false);
    });

    // weather book
    L().panel(ctx, 632, 112, 600, 300);
    Fit().draw(ctx, 'THE WEATHER BOOK', 656, 140, C.TYPE.l, P.ink, 'left', true);
    const rows = [
      'WIND — pushes every plane, all the time. Draw upwind of your target.',
      'GUST FRONT — a moving line of extra push. It passes; routes bend.',
      'FOG BANK — warnings go quiet inside. The collisions do not.',
      'THE GALE WALL — shift 9. The west closes; land them before it arrives.',
      'FUEL — the arc on the ring. Empty means a gliding MAYDAY: clear a path.',
    ];
    rows.forEach((r, i) => {
      const lines = Fit().wrap(ctx, r, C.TYPE.s, 540, false);
      lines.forEach((ln, li) => Fit().draw(ctx, ln, 656, 176 + i * 46 + li * 17, C.TYPE.s, P.ink, 'left', false));
    });

    // upgrades
    L().panel(ctx, 48, 436, 560, 300);
    Fit().draw(ctx, 'TOWER FITTINGS (DRAFT POOL)', 72, 464, C.TYPE.l, P.ink, 'left', true);
    C.UPGRADES.forEach((u, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 72 + col * 272, y = 496 + row * 40;
      Fit().draw(ctx, u.name, x, y, C.TYPE.s, P.ink, 'left', true, 250);
      Fit().draw(ctx, u.tag, x, y + 16, C.TYPE.tiny, P.gold, 'left', true);
    });

    // orders
    L().panel(ctx, 632, 436, 600, 300);
    Fit().draw(ctx, 'TOWER ORDERS', 656, 464, C.TYPE.l, P.ink, 'left', true);
    globalThis.CTL_Orders.KINDS.forEach((k, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 656 + col * 292, y = 496 + row * 48;
      Fit().draw(ctx, k.name, x, y, C.TYPE.s, P.ink, 'left', true, 270);
      Fit().draw(ctx, 'pays ' + k.pay + ' · ' + k.dur + 's', x, y + 17, C.TYPE.tiny, P.inkSoft, 'left', false);
    });
  }

  globalThis.CTL_Almanac = { draw };
})();
