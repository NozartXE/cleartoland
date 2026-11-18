// Small pictograms drawn in code for CLEAR TO LAND's panels and digests: a
// plane, a fuel drop, a warning triangle, a wind arrow, an order scroll, a
// star flag and the class silhouettes' badges. One stroke weight throughout.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;

  function plane(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(2, 5); ctx.lineTo(-6, 5); ctx.lineTo(-11, 11); ctx.lineTo(-13, 11);
    ctx.lineTo(-10, 3); ctx.lineTo(-12, 0); ctx.lineTo(-10, -3); ctx.lineTo(-13, -11); ctx.lineTo(-11, -11);
    ctx.lineTo(-6, -5); ctx.lineTo(2, -5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drop(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.7, -s * 0.1, s * 0.8, s * 0.3, 0, s * 0.85);
    ctx.bezierCurveTo(-s * 0.8, s * 0.3, -s * 0.7, -s * 0.1, 0, -s);
    ctx.fill();
    ctx.restore();
  }

  function warn(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.8); ctx.lineTo(-s, s * 0.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.ink;
    ctx.fillRect(-1.6, -s * 0.25, 3.2, s * 0.55);
    ctx.fillRect(-1.6, s * 0.48, 3.2, 3.2);
    ctx.restore();
  }

  function windArrow(ctx, x, y, ang, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
    ctx.moveTo(s - 7, -6); ctx.lineTo(s, 0); ctx.lineTo(s - 7, 6); ctx.stroke();
    ctx.restore();
  }

  function scroll(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = color;
    globalThis.CTL_Layout.rr(ctx, -s * 0.7, -s, s * 1.4, s * 2, 4); ctx.fill();
    ctx.fillStyle = 'rgba(34,48,58,0.55)';
    ctx.fillRect(-s * 0.42, -s * 0.45, s * 0.84, 3);
    ctx.fillRect(-s * 0.42, 0, s * 0.84, 3);
    ctx.fillRect(-s * 0.42, s * 0.45, s * 0.6, 3);
    ctx.restore();
  }

  function heli(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s, -s * 0.55); ctx.lineTo(s, -s * 0.55); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(s * 0.4, -2, s * 0.75, 4);
    ctx.restore();
  }

  function draw(ctx, name, x, y, s, color) {
    if (name === 'plane') plane(ctx, x, y, s, color);
    else if (name === 'drop') drop(ctx, x, y, s, color);
    else if (name === 'warn') warn(ctx, x, y, s, color);
    else if (name === 'scroll') scroll(ctx, x, y, s, color);
    else if (name === 'heli') heli(ctx, x, y, s, color);
  }

  globalThis.CTL_Icons = { draw, plane, drop, warn, windArrow, scroll, heli };
})();
