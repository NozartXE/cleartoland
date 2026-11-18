// How to play: the whole job on one card — the loop, the bands, the cones,
// the emergencies — with the chart ghosted behind it. Reached from the title.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;
  const L = () => globalThis.CTL_Layout;
  const I = () => globalThis.CTL_Icons;

  function draw(ctx, view) {
    ctx.fillStyle = 'rgba(239,230,207,0.85)'; ctx.fillRect(0, 0, C.W, C.H);
    Fit().draw(ctx, 'HOW TO WORK THE TOWER', 640, 52, C.TYPE.xxl, P.ink, 'center', true);
    Fit().draw(ctx, 'ESC — BACK', 640, 88, C.TYPE.s, P.inkSoft, 'center', true);

    const steps = [
      ['1 · SELECT', 'Click any plane (or TAB through them). Its ring turns dashed ink; its card opens at the top-left.'],
      ['2 · DRAW', 'Drag from the plane to draw its route. It will fly your line with its own turn rate — wide planes need wide curves. Release to set the route.'],
      ['3 · STACK', 'Keys 1 / 2 / 3 set LOW, MID, HIGH. The ring colour is the band. Two planes may share sky, never a band and a place.'],
      ['4 · LAND', 'Bring arrivals down to LOW and cross a green cone lined up with a strip. Helicopters want the H pad; seaplanes the water; jumbos the long A strip.'],
      ['5 · LAUNCH', 'SPACE rolls the next departure. Climb it HIGH and route it out the gate on its card before it wanders off.'],
      ['6 · SURVIVE', 'Warnings pay +50 when you separate them. Incidents cost a star; three close the field. Fuel arcs shrink — a dry plane glides, and only you can clear its way down.'],
    ];
    steps.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 48 + col * 608, y = 118 + row * 168;
      L().panel(ctx, x, y, 584, 152);
      Fit().draw(ctx, s[0], x + 22, y + 28, C.TYPE.l, P.ink, 'left', true);
      const lines = Fit().wrap(ctx, s[1], C.TYPE.m, 540, false);
      lines.forEach((ln, li) => Fit().draw(ctx, ln, x + 22, y + 62 + li * 24, C.TYPE.m, P.inkSoft, 'left', false));
    });

    L().panel(ctx, 48, 640, 1184, 96);
    I().warn(ctx, 84, 688, 15, P.warn);
    Fit().draw(ctx, 'THE ONE RULE', 112, 668, C.TYPE.l, P.ink, 'left', true);
    Fit().draw(ctx, 'Your hands are the autopilot. If you are not drawing, nobody is flying them.', 112, 700, C.TYPE.m, P.inkSoft, 'left', false);
  }

  globalThis.CTL_Howto = { draw };
})();
