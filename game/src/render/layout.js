// Layout primitives for CLEAR TO LAND's chart-table look: paper panels with
// ink edges, chips, and buttons. Every screen draws through these so the whole
// game shares one visual grammar.
(function () {
  const C = globalThis.CTL_Config;
  const P = C.PALETTE;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(ctx, x, y, w, h, fill) {
    ctx.fillStyle = 'rgba(34,48,58,0.18)';
    rr(ctx, x + 3, y + 4, w, h, 10); ctx.fill();
    ctx.fillStyle = fill || P.panel;
    rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = P.ink; ctx.stroke();
  }

  function chip(ctx, x, y, w, h, fill) {
    ctx.fillStyle = fill;
    rr(ctx, x, y, w, h, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
  }

  function button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const fill = opts.fill || P.panel;
    ctx.fillStyle = 'rgba(34,48,58,0.20)';
    rr(ctx, x + 2, y + 3, w, h, 8); ctx.fill();
    ctx.fillStyle = opts.hover ? '#ffe9a8' : fill;
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = P.ink; ctx.stroke();
    globalThis.CTL_Fit.draw(ctx, label, x + w / 2, y + h / 2 + 1, opts.size || C.TYPE.m, P.ink, 'center', true, w - 14);
    return { x, y, w, h };
  }

  function star(ctx, cx, cy, r, filled) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? '#e79a17' : 'rgba(34,48,58,0.15)';
    ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = P.ink; ctx.stroke();
  }

  globalThis.CTL_Layout = { rr, panel, chip, button, star };
})();
