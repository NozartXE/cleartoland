// Weather made visible: drifting fog banks (soft paper-white blobs that hide
// the chart under them), gust fronts (a moving line of wind streaks), and THE
// GALE WALL — a dark storm front with rain that swallows the west of the
// field on the last shift. Drawn over the chart, under the aircraft.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;

  function draw(ctx, run) {
    const w = run.weather;
    if (!w) return;
    // gust fronts
    for (const g of w.gusts) {
      ctx.save();
      ctx.strokeStyle = 'rgba(30,127,168,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let y = 90; y < C.H - 60; y += 54) {
        const sway = Math.sin(y * 0.05 + run.time * 3) * 8;
        ctx.beginPath();
        ctx.moveTo(g.x - 26, y + sway);
        ctx.quadraticCurveTo(g.x, y - 8 + sway, g.x + 30, y + sway);
        ctx.stroke();
      }
      ctx.restore();
    }
    // fog banks: layered soft circles
    for (const f of w.fogs) {
      const grd = ctx.createRadialGradient(f.x, f.y, f.r * 0.2, f.x, f.y, f.r);
      grd.addColorStop(0, 'rgba(238,234,222,0.92)');
      grd.addColorStop(0.75, 'rgba(238,234,222,0.75)');
      grd.addColorStop(1, 'rgba(238,234,222,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(70,88,106,0.5)';
      globalThis.CTL_Fit.draw(ctx, 'FOG', f.x, f.y, C.TYPE.s, 'rgba(70,88,106,0.55)', 'center', true);
    }
    // THE GALE WALL
    if (w.gale && w.galeX > -320) {
      const x = w.galeX;
      const grd = ctx.createLinearGradient(x - 300, 0, x + 30, 0);
      grd.addColorStop(0, 'rgba(52,52,68,0.96)');
      grd.addColorStop(0.85, 'rgba(52,52,68,0.9)');
      grd.addColorStop(1, 'rgba(52,52,68,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, x + 30, C.H);
      // rain streaks inside the wall
      ctx.strokeStyle = 'rgba(190,215,235,0.5)'; ctx.lineWidth = 2;
      const off = (run.time * 260) % 46;
      for (let rx = -40; rx < x; rx += 46) {
        for (let ry = -20; ry < C.H; ry += 64) {
          ctx.beginPath();
          ctx.moveTo(rx + ((ry * 7) % 30), ry + off - 20);
          ctx.lineTo(rx - 8 + ((ry * 7) % 30), ry + off + 2);
          ctx.stroke();
        }
      }
      // the front's ragged edge
      ctx.fillStyle = P.gale;
      for (let y = 0; y < C.H; y += 40) {
        ctx.beginPath();
        ctx.arc(x + Math.sin(y * 0.11 + run.time * 1.4) * 10, y + 20, 24, 0, Math.PI * 2);
        ctx.fill();
      }
      if (x > 60) {
        ctx.save();
        ctx.translate(Math.max(70, x - 120), 420); ctx.rotate(-Math.PI / 2);
        globalThis.CTL_Fit.draw(ctx, 'THE GALE WALL', 0, 0, C.TYPE.xl, 'rgba(255,253,244,0.85)', 'center', true);
        ctx.restore();
      }
    }
  }

  globalThis.CTL_WeatherFx = { draw };
})();
