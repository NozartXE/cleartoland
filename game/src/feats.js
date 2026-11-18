// Feats: twelve tower commendations, checked against the run's counters after
// every scoring event. A feat is earned once per career and kept in the save;
// the results plaque and the title screen both show the count.
(function () {
  const C = globalThis.CTL_Config;

  function check(run, save) {
    const s = run.stats, earned = [];
    const give = id => { if (!save.feats[id]) { save.feats[id] = true; earned.push(id); } };
    if (s.shiftsCleared >= 1) give('firstday');
    if (s.bestStreak >= 5) give('streak5');
    if (s.savesThisShift >= 3) give('saver3');
    if (s.maydaySaves >= 1) give('mayday');
    if (s.shiftsCleared >= 1 && run.lastShiftClean) give('perfect');
    if (s.jumbosThisShift >= 3) give('jumbo3');
    if (s.ordersThisShift >= 3) give('orders3');
    if (s.galeCleared) give('galewall');
    if (s.bestShiftScore >= 4000) give('rich');
    if (run.endless && s.landedTotal >= 10) give('night');
    if (s.maxAirborne >= 12) give('fullhouse');
    if (s.shiftsCleared >= 9) give('career');
    return earned;
  }

  function byId(id) { return C.FEATS.find(f => f.id === id); }
  function count(save) { return C.FEATS.filter(f => save.feats[f.id]).length; }

  globalThis.CTL_Feats = { check, byId, count };
})();
