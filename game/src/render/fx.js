// Effects for CLEAR TO LAND: score floaters (capped, prioritised — the
// legibility rule learned from PEGBLOOM), particle bursts, screen shake, and
// the draining of the sim's sound events into the audio module. Presentation
// only: nothing here changes what is true in the sim.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;
  const Fit = () => globalThis.CTL_Fit;

  const state = { floaters: [], parts: [], shake: 0, shakeT: 0 };

  const SHORT = [
    [/^MAYDAY SAVE \+250$/, 'MAYDAY SAVE'],
    [/^ORDER PAID/, 'ORDER PAID'],
  ];
  function displayText(text) {
    for (const [re, out] of SHORT) if (re.test(text)) return out;
    return text;
  }

  // Drain one frame of sim fx events into particles/floaters/sound/shake.
  function drain(run) {
    for (const ev of run.fxEvents) {
      if (ev.type === 'score') {
        state.floaters.push({
          x: ev.x, y: ev.y, text: displayText(ev.text), big: ev.big,
          t: 0, life: ev.big ? 1.9 : 1.5, seed: state.floaters.length * 7 + run.time,
        });
      } else if (ev.type === 'burst') {
        for (let i = 0; i < ev.n; i++) {
          const a = (i / ev.n) * Math.PI * 2 + (i % 5) * 0.37;
          const sp = 40 + (i % 7) * 16;
          state.parts.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.7, color: ev.color });
        }
      } else if (ev.type === 'shake') {
        state.shake = Math.max(state.shake, ev.mag); state.shakeT = 0.45;
      } else if (ev.type === 'sound') {
        const A = globalThis.CTL_Audio;
        if (A && A.sfx[ev.name]) A.sfx[ev.name]();
      }
    }
    run.fxEvents = [];
    // cap floaters: big first, then newest — at most 5 on the chart
    state.floaters.sort((a, b) => (b.big - a.big) || (b.seed - a.seed));
    state.floaters = state.floaters.slice(0, 5);
  }

  function update(dt) {
    for (const f of state.floaters) { f.t += dt; f.y -= 26 * dt; }
    state.floaters = state.floaters.filter(f => f.t < f.life);
    for (const q of state.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 130 * dt; }
    state.parts = state.parts.filter(q => q.t < q.life);
    if (state.shakeT > 0) { state.shakeT -= dt; if (state.shakeT <= 0) state.shake = 0; }
  }

  function shakeOffset(run) {
    if (!state.shake) return { x: 0, y: 0 };
    const m = state.shake * (state.shakeT / 0.45);
    return { x: Math.sin(run.time * 61) * m, y: Math.cos(run.time * 53) * m * 0.7 };
  }

  function draw(ctx) {
    for (const q of state.parts) {
      ctx.globalAlpha = 1 - q.t / q.life;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - 3, q.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    // de-collide: floaters born at the same strip stack vertically instead of
    // printing over each other (the PEGBLOOM lesson, applied to our own sky)
    const sorted = state.floaters.slice().sort((a, b) => a.y - b.y);
    let lastY = -1e9;
    for (const f of sorted) {
      f.drawY = Math.max(f.y, lastY + 37);
      lastY = f.drawY;
    }
    for (const f of state.floaters) {
      const fY = f.drawY !== undefined ? f.drawY : f.y;
      const size = f.big ? 30 : 21;
      const alpha = f.t > f.life - 0.4 ? (f.life - f.t) / 0.4 : 1;
      const w = Fit().width(ctx, f.text, size, true) + 22;
      const x = Math.max(w / 2 + 4, Math.min(C.W - w / 2 - 4, f.x));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = P.panel;
      globalThis.CTL_Layout.rr(ctx, x - w / 2, fY - 17, w, 34, 8); ctx.fill();
      ctx.lineWidth = 2.2; ctx.strokeStyle = P.ink; ctx.stroke();
      Fit().draw(ctx, f.text, x, fY + 1, size, f.text.includes('-') ? P.danger : P.good, 'center', true);
      ctx.restore();
    }
  }

  function reset() { state.floaters = []; state.parts = []; state.shake = 0; }

  globalThis.CTL_Fx = { drain, update, draw, shakeOffset, reset };
})();
