// The tower logbook: best score, run history (losses included, honestly), feats
// and settings, kept in localStorage. In Node (tests) it quietly keeps an
// in-memory copy instead, so the sim never depends on a browser.
(function () {
  const KEY = 'cleartoland.save.v1';
  let memory = null;

  function blank() {
    return { best: 0, bestGrade: '-', history: [], feats: {}, music: 0.7, sfx: 0.9, runs: 0 };
  }

  function load() {
    if (memory) return memory;
    try {
      const raw = globalThis.localStorage && globalThis.localStorage.getItem(KEY);
      memory = raw ? Object.assign(blank(), JSON.parse(raw)) : blank();
    } catch (e) { memory = blank(); }
    return memory;
  }

  function store() {
    try { if (globalThis.localStorage) globalThis.localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) {}
  }

  function recordRun(save, entry) {
    save.runs++;
    if (entry.score > save.best) { save.best = entry.score; save.bestGrade = entry.grade; }
    save.history.unshift(entry);
    save.history = save.history.slice(0, 3);
    store();
  }

  globalThis.CTL_Save = { load, store, recordRun, blank };
})();
