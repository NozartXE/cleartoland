// The Kestrel Field chart: gates, runways, landing zones and the fixed terrain
// the renderer draws. Pure data and geometry helpers — no state, no DOM — so
// the sim's landing checks and the renderer's chart can never disagree.
(function () {
  const C = globalThis.CTL_Config;

  // Entry/exit gates on the chart edges, named like real reporting points.
  const GATES = [
    { id: 'BALIN', x: 150, y: 74 }, { id: 'CORSA', x: 480, y: 74 },
    { id: 'DUVAN', x: 820, y: 74 }, { id: 'ELMAR', x: 1130, y: 74 },
    { id: 'FJORD', x: 1206, y: 300 }, { id: 'GALEN', x: 1206, y: 560 },
    { id: 'HAVIK', x: 1050, y: 726 }, { id: 'INNIS', x: 640, y: 726 },
    { id: 'JARRO', x: 230, y: 726 }, { id: 'KOVAC', x: 74, y: 540 },
    { id: 'LOMAR', x: 74, y: 280 },
  ];

  // Runway A: the main strip, landed west-to-east (heading 90 deg = +x).
  // threshold = where a landing plane must cross, at LOW, roughly aligned.
  const RUNWAY_A = { x1: 330, y1: 560, x2: 990, y2: 560, threshold: { x: 330, y: 560 }, heading: 0, len: 660, name: 'A' };
  // Runway B: the short cross strip (props, seaplanes-on-wheels, helis; jumbos
  // only with the WIDE-BODY BAY upgrade), landed south-to-north.
  const RUNWAY_B = { x1: 1085, y1: 640, x2: 1085, y2: 400, threshold: { x: 1085, y: 640 }, heading: -Math.PI / 2, len: 240, name: 'B' };
  // The water strip for seaplanes, on the south bay, landed west-to-east.
  const WATER = { x1: 180, y1: 668, x2: 700, y2: 668, threshold: { x: 180, y: 668 }, heading: 0, len: 520, name: 'W' };
  // The helipad on the north-east point.
  const PAD = { x: 1150, y: 170, r: 34, name: 'PAD' };

  function landingZoneFor(plane, upgrades) {
    if (plane.cls === 'heli') return { kind: 'pad', pad: PAD };
    if (plane.cls === 'sea') return { kind: 'runway', rw: WATER };
    if (plane.cls === 'jumbo' && !(upgrades && upgrades.widebay)) return { kind: 'runway', rw: RUNWAY_A };
    return { kind: 'any' }; // either runway may serve
  }

  // The final cone before a threshold: a plane inside it, at LOW, roughly
  // aligned with the strip, is on final and lands. Returns 0..1 alignment.
  function inFinalCone(plane, rw, upgrades) {
    const wide = upgrades && upgrades.longfinal ? 1.5 : 1;
    const back = 300 * wide, halfW = 64 * wide;
    const dx = plane.x - rw.threshold.x, dy = plane.y - rw.threshold.y;
    const hx = Math.cos(rw.heading), hy = Math.sin(rw.heading);
    const along = -(dx * hx + dy * hy);            // distance before threshold
    const cross = Math.abs(-dx * hy + dy * hx);    // sideways offset
    if (along < 6 || along > back || cross > halfW * (0.35 + 0.65 * (along / back))) return 0;
    let dh = Math.atan2(Math.sin(plane.hdg - rw.heading), Math.cos(plane.hdg - rw.heading));
    if (Math.abs(dh) > 0.62) return 0;
    return 1 - Math.abs(dh) / 0.62;
  }

  // Fixed chart decoration: coastline bays, contour rings around the peak,
  // towns, forest blocks. Hand-placed so every frame of every run agrees.
  const TERRAIN = {
    bays: [
      [{ x: 0, y: 620 }, { x: 140, y: 640 }, { x: 260, y: 700 }, { x: 420, y: 726 }, { x: 760, y: 726 }, { x: 900, y: 690 }, { x: 1020, y: 726 }, { x: 1280, y: 726 }, { x: 1280, y: 800 }, { x: 0, y: 800 }],
      [{ x: 1180, y: 0 }, { x: 1230, y: 90 }, { x: 1210, y: 190 }, { x: 1280, y: 240 }, { x: 1280, y: 0 }],
    ],
    contours: [26, 52, 84, 122],
    peak: { x: 190, y: 170, r: 130 },
    towns: [
      { x: 420, y: 210, n: 'Alder' }, { x: 700, y: 150, n: 'Bexhill' }, { x: 950, y: 250, n: 'Corby' },
      { x: 560, y: 330, n: 'Dunmore' }, { x: 240, y: 420, n: 'Elswick' }, { x: 880, y: 430, n: 'Farleigh' },
    ],
    forests: [
      { x: 300, y: 120, w: 130, h: 70 }, { x: 1020, y: 90, w: 110, h: 60 },
      { x: 150, y: 300, w: 90, h: 110 }, { x: 640, y: 420, w: 120, h: 60 },
      { x: 420, y: 640, w: 90, h: 40 },
    ],
    lake: { x: 790, y: 330, rx: 74, ry: 30 },
    // field patchwork: farmed rectangles with hedgerow edges
    fields: [
      { x: 60, y: 96, w: 120, h: 62, c: '#d8cf9a' }, { x: 330, y: 96, w: 140, h: 58, c: '#bcc47f' },
      { x: 486, y: 92, w: 118, h: 66, c: '#e0d194' }, { x: 620, y: 96, w: 150, h: 54, c: '#aeb877' },
      { x: 800, y: 96, w: 128, h: 60, c: '#d8cf9a' }, { x: 950, y: 250, w: 130, h: 66, c: '#bcc47f' },
      { x: 950, y: 330, w: 110, h: 58, c: '#e0d194' }, { x: 60, y: 440, w: 128, h: 64, c: '#aeb877' },
      { x: 60, y: 516, w: 110, h: 58, c: '#d8cf9a' }, { x: 380, y: 380, w: 128, h: 62, c: '#e0d194' },
      { x: 524, y: 386, w: 104, h: 56, c: '#bcc47f' }, { x: 700, y: 470, w: 140, h: 58, c: '#d8cf9a' },
      { x: 856, y: 470, w: 118, h: 62, c: '#aeb877' }, { x: 240, y: 250, w: 110, h: 56, c: '#e0d194' },
    ],
    // gravel roads linking the towns
    roads: [
      [{ x: 420, y: 210 }, { x: 560, y: 330 }, { x: 700, y: 150 }, { x: 950, y: 250 }],
      [{ x: 240, y: 420 }, { x: 560, y: 330 }, { x: 880, y: 430 }, { x: 1085, y: 470 }],
      [{ x: 420, y: 210 }, { x: 350, y: 420 }, { x: 240, y: 420 }],
    ],
  };

  function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function angNorm(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function angLerp(a, b, t) { return a + angNorm(b - a) * t; }

  globalThis.CTL_Field = { GATES, RUNWAY_A, RUNWAY_B, WATER, PAD, TERRAIN, landingZoneFor, inFinalCone, dist, angNorm, angLerp };
})();
