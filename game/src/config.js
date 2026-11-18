// CLEAR TO LAND configuration: every tuning number, name table and palette in
// one place. The sim reads only this file for balance; the renderer reads the
// palette and type scale, so a frame and the simulation can never disagree
// about what a colour or a size means.
(function () {
  const C = {};

  // ---- world geometry (the chart is 1280x800, fixed) ----
  C.W = 1280; C.H = 800;
  C.STEP = 1 / 60;                    // fixed simulation step, seconds
  C.TOPBAR = 64;                      // HUD band across the top of the chart
  C.BOTBAR = 40;                      // controls line across the bottom

  // ---- altitude bands: 0 LOW, 1 MID, 2 HIGH ----
  C.BANDS = [
    { id: 'low', name: 'LOW', key: '1', ring: '#d8492e' },
    { id: 'mid', name: 'MID', key: '2', ring: '#e79a17' },
    { id: 'high', name: 'HIGH', key: '3', ring: '#1e7fa8' },
  ];
  C.WARN_DIST = 92;                   // same-band distance that raises a warning
  C.HIT_DIST = 46;                    // same-band distance that is an incident
  C.SAVE_WINDOW = 6;                  // seconds: landing streak window
  C.MAX_STARS = 3;                    // incidents that close the field

  // ---- plane classes ----
  // speed px/s, turn deg/s, fuel seconds of burn, points for a landing.
  C.CLASSES = {
    prop:  { id: 'prop',  name: 'PROP',  full: 'Prop trainer',   speed: 41,  turn: 100,  fuel: 150, points: 100, len: 24, color: '#2e7d4f' },
    jet:   { id: 'jet',   name: 'JET',   full: 'Regional jet',   speed: 71, turn: 55,  fuel: 120, points: 150, len: 30, color: '#2456a6' },
    jumbo: { id: 'jumbo', name: 'JUMBO', full: 'Wide-body jumbo', speed: 84, turn: 40, fuel: 110, points: 250, len: 40, color: '#7030a0' },
    sea:   { id: 'sea',   name: 'SEA',   full: 'Seaplane',       speed: 49,  turn: 84,  fuel: 140, points: 120, len: 27, color: '#0f8b8d' },
    heli:  { id: 'heli',  name: 'HELI',  full: 'Helicopter',     speed: 36,  turn: 135, fuel: 130, points: 130, len: 22, color: '#c22525' },
  };
  C.CLASS_ORDER = ['prop', 'jet', 'jumbo', 'sea', 'heli'];
  C.DEPART_POINTS = 80;

  // ---- shifts: the nine working days of Kestrel Field ----
  // arr/dep quotas, spawn gap range (s), class weights, weather script.
  C.SHIFTS = [
    { n: 1, name: 'FIRST WATCH',   arr: 7,  dep: 2, gap: [7.5, 11], mix: { prop: 5, jet: 2, sea: 1, heli: 1 }, wind: 6,  gusts: 0, fog: 0 },
    { n: 2, name: 'MORNING PUSH',  arr: 10, dep: 3, gap: [6, 9], mix: { prop: 4, jet: 4, sea: 1, heli: 1 }, wind: 8,  gusts: 1, fog: 0 },
    { n: 3, name: 'FERRY TRAFFIC', arr: 12, dep: 4, gap: [5, 8],  mix: { prop: 3, jet: 4, sea: 3, heli: 1 }, wind: 10, gusts: 1, fog: 1 },
    { n: 4, name: 'JUMBO SEASON',  arr: 13, dep: 4, gap: [4.5, 7.5],  mix: { prop: 3, jet: 4, jumbo: 2, sea: 1, heli: 1 }, wind: 11, gusts: 2, fog: 0 },
    { n: 5, name: 'CROSSWIND',     arr: 14, dep: 5, gap: [4.2, 7],  mix: { prop: 3, jet: 5, jumbo: 2, sea: 2, heli: 1 }, wind: 16, gusts: 2, fog: 1 },
    { n: 6, name: 'THE LONG DAY',  arr: 16, dep: 5, gap: [3.8, 6.5],  mix: { prop: 3, jet: 5, jumbo: 3, sea: 2, heli: 2 }, wind: 13, gusts: 3, fog: 1 },
    { n: 7, name: 'FOG BANK',      arr: 15, dep: 5, gap: [4.2, 7],  mix: { prop: 3, jet: 5, jumbo: 2, sea: 2, heli: 2 }, wind: 9,  gusts: 2, fog: 3 },
    { n: 8, name: 'DOUBLE RUSH',   arr: 19, dep: 6, gap: [3.2, 5.5],    mix: { prop: 3, jet: 6, jumbo: 3, sea: 2, heli: 2 }, wind: 15, gusts: 3, fog: 1 },
    { n: 9, name: 'THE GALE WALL', arr: 13, dep: 4, gap: [4, 6.5], mix: { prop: 2, jet: 5, jumbo: 3, sea: 1, heli: 2 }, wind: 22, gusts: 5, fog: 0, gale: true },
  ];

  C.DIFFICULTIES = [
    { id: 'calm', name: 'CALM', traffic: 0.8, windMul: 0.6, fuelMul: 1.3 },
    { id: 'busy', name: 'BUSY', traffic: 1.0, windMul: 1.0, fuelMul: 1.0 },
    { id: 'storm', name: 'STORMFRONT', traffic: 1.2, windMul: 1.45, fuelMul: 0.85 },
  ];

  // ---- tower upgrades: the between-shift draft pool (12) ----
  C.UPGRADES = [
    { id: 'radar', name: 'RADAR SWEEP', text: 'Ghosts show where each routed plane will be in 6 s.', tag: 'SEE AHEAD' },
    { id: 'stack', name: 'HOLDING STACK', text: 'Press H: the selected plane flies a safe holding orbit.', tag: 'BUY TIME' },
    { id: 'longfinal', name: 'LONG FINAL', text: 'The landing cone is half again as wide and long.', tag: 'EASIER LANDINGS' },
    { id: 'fueltruck', name: 'FUEL TRUCK', text: 'Every plane arrives with 40% more fuel.', tag: 'MORE TIME' },
    { id: 'beacon', name: 'FOG BEACON', text: 'Separation warnings still sound inside fog banks.', tag: 'FOG SIGHT' },
    { id: 'calmvoice', name: 'CALM VOICE', text: 'Crews get 0.8 s of grace before a conflict turns incident.', tag: 'GRACE' },
    { id: 'coffee', name: 'TOWER COFFEE', text: 'Every plane turns 20% tighter.', tag: 'SHARPER TURNS' },
    { id: 'secondfreq', name: 'SECOND FREQUENCY', text: 'Departures climb to HIGH on their own once airborne.', tag: 'LESS WORK' },
    { id: 'widebay', name: 'WIDE-BODY BAY', text: 'Jumbos may also land on the short strip.', tag: 'MORE OPTIONS' },
    { id: 'extrastar', name: 'SPARE STAR', text: 'The field can survive one extra incident.', tag: 'INSURANCE' },
    { id: 'tailwind', name: 'TAILWIND CHARTS', text: 'Wind pushes every plane 40% less.', tag: 'CALMER SKIES' },
    { id: 'handoff', name: 'EARLY HANDOFF', text: 'Departures pay +40 when they leave through their gate.', tag: 'MORE PAY' },
  ];

  // ---- feats (12) ----
  C.FEATS = [
    { id: 'firstday', name: 'FIRST DAY', text: 'Clear a shift.' },
    { id: 'streak5', name: 'HOT HAND', text: 'Land 5 planes inside one streak window chain.' },
    { id: 'saver3', name: 'SAVIOUR', text: 'Resolve 3 separation warnings in one shift.' },
    { id: 'mayday', name: 'MAYDAY SAVE', text: 'Land a plane that ran dry.' },
    { id: 'perfect', name: 'CLEAN SHEET', text: 'Clear a shift with no warning at all.' },
    { id: 'jumbo3', name: 'HEAVY METAL', text: 'Land 3 jumbos in one shift.' },
    { id: 'orders3', name: 'CONTRACTOR', text: 'Complete 3 tower orders in one shift.' },
    { id: 'galewall', name: 'WALL RIDER', text: 'Clear THE GALE WALL.' },
    { id: 'rich', name: 'FOUR FIGURES', text: 'Score 4,000 in one shift.' },
    { id: 'night', name: 'NIGHT OWL', text: 'Land 10 planes in NIGHT FREQUENCY.' },
    { id: 'fullhouse', name: 'FULL HOUSE', text: 'Hold 12 planes in the air at once.' },
    { id: 'career', name: 'CAREER TOWER', text: 'Clear all 9 shifts in one run.' },
  ];

  // ---- grades for the results plaque ----
  C.GRADES = [
    { grade: 'S', min: 12000 }, { grade: 'A', min: 9000 }, { grade: 'B', min: 6500 },
    { grade: 'C', min: 4000 }, { grade: 'D', min: 0 },
  ];

  // ---- palette: a bright paper aeronautical chart ----
  C.PALETTE = {
    paper: '#efe6cf', paperDim: '#e4d7b8', ink: '#22303a', inkSoft: '#46586a',
    land: '#cfd3a0', landDark: '#b3ba85', water: '#7fc4bd', waterDeep: '#5da8b4',
    runway: '#5a6672', runwayEdge: '#f3ead2', strip: '#8a94a0',
    grass: '#bcc47f', town: '#d9a066', forest: '#7d9b5e', peak: '#9aa3a8',
    warn: '#e79a17', danger: '#d8492e', good: '#2e7d4f', gold: '#c9920e',
    panel: '#f7efdb', panelEdge: '#22303a', sky: '#1e7fa8', white: '#fffdf4',
    fog: '#e8e4da', gale: '#4a4a58',
  };

  // ---- type scale (px), one family, weight does the talking ----
  C.TYPE = { tiny: 11, s: 13, m: 16, l: 21, xl: 28, xxl: 40, huge: 58, wordmark: 74 };

  // ---- callsign pieces ----
  C.CALLSIGNS = ['KESTREL', 'FALCON', 'OTTER', 'HERON', 'BISON', 'MAPLE', 'CORAL', 'PIKE',
    'SABLE', 'TUNDRA', 'VESPER', 'WILLOW', 'ZEPHYR', 'BRACKEN', 'COBALT', 'DUNLIN'];

  globalThis.CTL_Config = C;
})();
