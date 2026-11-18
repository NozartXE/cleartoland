// Type fitting for CLEAR TO LAND: one draw call that shrinks a string's font
// until it fits its box, so no label ever spills — the rule that keeps the
// chart legible at contact-sheet size. All in-game text goes through here.
(function () {
  const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

  function setFont(ctx, size, bold) {
    ctx.font = (bold ? '800 ' : '600 ') + size + 'px ' + FONT;
  }

  // Draw text centred on (x, y) vertically; returns the size used.
  function draw(ctx, text, x, y, size, color, align, bold, maxWidth) {
    let s = size;
    setFont(ctx, s, bold);
    if (maxWidth) {
      while (s > 9 && ctx.measureText(text).width > maxWidth) { s -= 1; setFont(ctx, s, bold); }
    }
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    return s;
  }

  function width(ctx, text, size, bold) {
    setFont(ctx, size, bold);
    return ctx.measureText(text).width;
  }

  // Word-wrap into lines of at most maxWidth at the given size.
  function wrap(ctx, text, size, maxWidth, bold) {
    setFont(ctx, size, bold);
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const trial = line ? line + ' ' + w : w;
      if (ctx.measureText(trial).width > maxWidth && line) { lines.push(line); line = w; }
      else line = trial;
    }
    if (line) lines.push(line);
    return lines;
  }

  globalThis.CTL_Fit = { draw, width, wrap, setFont, FONT };
})();
