// Input for CLEAR TO LAND: the mouse draws, the keys command. Pointer down on
// a plane selects it and starts a route drag; the drag is simplified into
// waypoints as it moves; release commits the route to the sim. Buttons are
// hit-tested against the rectangles the renderers registered in view.buttons.
// Everything routes through here, so a click means the same thing in the
// browser, in tests, and in the screenshot staging.
(function () {
  const C = globalThis.CTL_Config;
  const F = globalThis.CTL_Field;
  const P = globalThis.CTL_Planes;

  function planeAt(run, x, y) {
    let best = null, bd = 1e9;
    for (const p of run.planes) {
      if (p.dead || p.state === 'queued') continue;
      const d = F.dist(x, y, p.x, p.y);
      if (d < Math.max(30, p.spec.len + 14) && d < bd) { best = p; bd = d; }
    }
    return best;
  }

  function simplify(points, minGap) {
    const out = [];
    for (const q of points) {
      if (!out.length || F.dist(q.x, q.y, out[out.length - 1].x, out[out.length - 1].y) >= minGap) out.push(q);
    }
    return out.slice(0, 14);
  }

  function attach(canvas, view, api) {
    const rect = () => canvas.getBoundingClientRect();
    const toGame = e => {
      const r = rect();
      return { x: (e.clientX - r.left) * (C.W / r.width), y: (e.clientY - r.top) * (C.H / r.height) };
    };

    canvas.addEventListener('pointermove', e => {
      const m = toGame(e);
      view.mouse = m;
      view.hover = hitButton(view, m) || null;
      if (view.drag) {
        view.drag.points.push({ x: m.x, y: m.y });
        view.drag.points = simplify(view.drag.points, 26);
      }
    });

    canvas.addEventListener('pointerdown', e => {
      const m = toGame(e);
      globalThis.CTL_Audio.ensure(api.save());
      const btn = hitButton(view, m);
      if (btn) { api.button(btn); return; }
      if (api.screen() !== 'play') return;
      const run = api.run();
      const p = planeAt(run, m.x, m.y);
      if (p) {
        run.selectedId = p.id;
        globalThis.CTL_Audio.sfx.select();
        if (p.state === 'air') {
          view.drag = { planeId: p.id, fromX: p.x, fromY: p.y, points: [] };
        }
      } else {
        run.selectedId = null;
      }
    });

    window.addEventListener('pointerup', e => {
      if (!view.drag) return;
      const run = api.run();
      const p = run.planes.find(q => q.id === view.drag.planeId);
      const pts = simplify(view.drag.points.concat([{ x: view.mouse.x, y: view.mouse.y }]), 30);
      if (p && !p.dead && pts.length) {
        P.setPath(p, pts);
        globalThis.CTL_Audio.sfx.route();
      }
      view.drag = null;
    });

    canvas.addEventListener('wheel', e => {
      if (api.screen() !== 'play') return;
      const p = globalThis.CTL_Sim.selected(api.run());
      if (!p) return;
      e.preventDefault();
      p.targetBand = Math.max(0, Math.min(2, p.targetBand + (e.deltaY > 0 ? -1 : 1)));
      globalThis.CTL_Audio.sfx.band();
    }, { passive: false });

    window.addEventListener('keydown', e => {
      api.key(e.key, e);
    });
  }

  function hitButton(view, m) {
    const names = Object.keys(view.buttons || {});
    for (let i = names.length - 1; i >= 0; i--) {
      const b = view.buttons[names[i]];
      if (b && m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) return names[i];
    }
    return null;
  }

  globalThis.CTL_Input = { attach, planeAt, simplify, hitButton };
})();
