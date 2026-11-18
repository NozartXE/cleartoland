// The title screen: live demo traffic flown by the relief bot behind the
// wordmark, a quantified scope strip, a six-row rules digest with icons, and
// the way in — PLAY, three difficulties, the endless NIGHT FREQUENCY line, and
// the side doors (how to play, options, almanac).
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;
  const I = () => globalThis.CTL_Icons;

  const RULES = [
    ['plane', 'DRAG a route for every plane — your drawing is the flying'],
    ['drop', 'Land arrivals LOW on the cone · launch departures HIGH'],
    ['warn', 'Same band + close = warning · closer = an incident, a star'],
    ['scroll', 'Tower orders pay for the plane that matters most'],
    ['plane', 'Wind, gusts and fog bend every route you draw'],
    ['warn', 'Shift 9: THE GALE WALL eats the field from the west'],
  ];

  function draw(ctx, view, demo, save) {
    // demo chart behind everything (terrain + planes, no HUD)
    globalThis.CTL_Terrain.draw(ctx, demo);
    globalThis.CTL_Routes.draw(ctx, demo, null);
    globalThis.CTL_RenderPlanes.draw(ctx, demo);
    ctx.fillStyle = 'rgba(239,230,207,0.22)'; ctx.fillRect(0, 0, C.W, C.H);

    // wordmark: one focal point, the whole top band
    L().panel(ctx, 140, 26, 1000, 118, P.accent || '#ffd98a');
    Fit().draw(ctx, 'CLEAR TO LAND', 640, 74, C.TYPE.wordmark, P.ink, 'center', true);
    Fit().draw(ctx, 'YOU ARE THE TOWER — DRAW THEM HOME', 640, 122, C.TYPE.m, P.ink, 'center', true);

    // quantified scope strip
    L().panel(ctx, 140, 158, 1000, 44);
    Fit().draw(ctx, '5 PLANE CLASSES · 11 GATES · 9 SHIFTS · 12 UPGRADES · 10 ORDERS · 3 SKIES', 640, 181, C.TYPE.m, P.ink, 'center', true, 960);

    // rules digest, left
    L().panel(ctx, 64, 224, 560, 330);
    RULES.forEach((row, i) => {
      const y = 224 + 34 + i * 50;
      I().draw(ctx, row[0], 108, y, 17, i % 2 ? P.sky : P.danger);
      Fit().draw(ctx, row[1], 140, y + 1, C.TYPE.s, P.ink, 'left', false, 460);
    });
    Fit().draw(ctx, 'WIN: HOLD ALL 9 SHIFTS — LOSE: 3 INCIDENTS CLOSE THE FIELD', 344, 530, C.TYPE.s, P.ink, 'center', true, 530);

    // the way in, right
    L().panel(ctx, 656, 224, 560, 330);
    view.buttons.play = L().button(ctx, 688, 248, 496, 70, '▶  TAKE THE TOWER', { size: C.TYPE.xl, hover: view.hover === 'play' });
    Fit().draw(ctx, 'BEST ' + save.best + (save.bestGrade && save.bestGrade !== '-' ? ' · GRADE ' + save.bestGrade : '') +
      ' · FEATS ' + globalThis.CTL_Feats.count(save) + '/12', 936, 344, C.TYPE.m, P.ink, 'center', true);
    C.DIFFICULTIES.forEach((d, i) => {
      const x = 688 + i * 168;
      const sel = view.difficulty === d.id;
      view.buttons['diff' + i] = L().button(ctx, x, 366, 152, 52, d.name, {
        fill: sel ? '#ffd98a' : P.panel, size: C.TYPE.s, hover: view.hover === 'diff' + i,
      });
    });
    const endlessLabel = view.endless ? 'NIGHT FREQUENCY: ON — ENDLESS' : 'NIGHT FREQUENCY: OFF';
    view.buttons.endless = L().button(ctx, 688, 434, 496, 46, endlessLabel, {
      fill: view.endless ? P.sky : P.panel, size: C.TYPE.s, hover: view.hover === 'endless',
    });
    if (view.endless) Fit().draw(ctx, 'NIGHT FREQUENCY', 936, 456, C.TYPE.s, P.white, 'center', true);
    view.buttons.howto = L().button(ctx, 688, 496, 152, 40, 'HOW TO PLAY', { size: C.TYPE.s, hover: view.hover === 'howto' });
    view.buttons.options = L().button(ctx, 856, 496, 152, 40, 'OPTIONS', { size: C.TYPE.s, hover: view.hover === 'options' });
    view.buttons.almanac = L().button(ctx, 1024, 496, 160, 40, 'ALMANAC', { size: C.TYPE.s, hover: view.hover === 'almanac' });

    // featured strip: what the game is, in one line under the panels
    Fit().draw(ctx, 'Every route on this chart was drawn by a hand. Yours, in a moment.', 640, 592, C.TYPE.m, P.inkSoft, 'center', false);

    // controls footer
    ctx.fillStyle = P.ink; ctx.fillRect(0, 752, C.W, 48);
    Fit().draw(ctx, 'CLICK SELECT · DRAG DRAW ROUTE · 1/2/3 ALTITUDE · W/S SPEED · SPACE LAUNCH · TAB NEXT PLANE · P PAUSE · M MUTE', 640, 777, C.TYPE.m, P.white, 'center', true);
  }

  globalThis.CTL_Title = { draw };
})();
