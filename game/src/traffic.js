// Traffic: the shift scheduler. It deals arrivals at the gates and departures
// into the queue at a seeded pace, scaled by difficulty, and offers tower
// orders as the shift matures. It owns quotas only — flying is planes.js.
(function () {
  const C = globalThis.CTL_Config;
  const R = globalThis.CTL_Rng;
  const P = globalThis.CTL_Planes;

  function weightedClass(run) {
    const mix = run.shiftDef.mix;
    let total = 0;
    for (const k in mix) total += mix[k];
    let roll = run.rngTraffic() * total;
    for (const k in mix) { roll -= mix[k]; if (roll <= 0) return k; }
    return 'prop';
  }

  function create(run) {
    const d = run.difficulty;
    run.traffic = {
      arrLeft: Math.round(run.shiftDef.arr * d.traffic),
      depLeft: Math.round(run.shiftDef.dep * d.traffic),
      nextArr: 1.2, nextDep: 9, orderT: 26,
      spawnedArr: 0, spawnedDep: 0,
    };
    // two planes are already working the field when the shift opens
    spawnArr(run); spawnArr(run);
  }

  function spawnArr(run) {
    const t = run.traffic;
    // fairness: do not deal two arrivals out of the same gate back to back —
    // pick any gate that has been quiet for a few seconds when one exists
    const recent = t.gateUse || (t.gateUse = {});
    let gate = R.int(run.rngTraffic, 0, 10);
    for (let tries = 0; tries < 4; tries++) {
      if (run.time - (recent[gate] || -99) > 6) break;
      gate = R.int(run.rngTraffic, 0, 10);
    }
    recent[gate] = run.time;
    const p = P.spawnArrival(run, weightedClass(run), gate);
    t.spawnedArr++;
    return p;
  }

  function spawnDep(run) {
    const t = run.traffic;
    const p = P.queueDeparture(run, weightedClass(run), R.int(run.rngTraffic, 0, 10));
    t.spawnedDep++;
    return p;
  }

  function step(run, dt, events) {
    const t = run.traffic;
    if (t.arrLeft > 0) {
      t.nextArr -= dt;
      if (t.nextArr <= 0) {
        const gap = R.range(run.rngTraffic, run.shiftDef.gap[0], run.shiftDef.gap[1]);
        t.nextArr = gap;
        t.arrLeft--;
        const p = spawnArr(run);
        events.push({ type: 'spawn', plane: p });
      }
    }
    if (t.depLeft > 0) {
      t.nextDep -= dt;
      if (t.nextDep <= 0 && run.depQueue.length < 3) {
        t.nextDep = R.range(run.rngTraffic, 12, 20);
        t.depLeft--;
        spawnDep(run);
      }
    }
    t.orderT -= dt;
    if (t.orderT <= 0) {
      t.orderT = R.range(run.rngOrders, 34, 52);
      const o = globalThis.CTL_Orders.offer(run);
      if (o) {
        run.orderQuietBase = run.warnedThisShift;
        events.push({ type: 'order-new', order: o });
      }
    }
  }

  // A shift is done when everything it dealt has been dealt with.
  function shiftDone(run) {
    const t = run.traffic;
    if (run.endless) return false;
    if (run.shiftDef.gale && run.weather.galeX > 1120) return run.planes.every(p => p.dead) || run.weather.galeX > 1240;
    return t.arrLeft <= 0 && t.depLeft <= 0 && run.depQueue.length === 0 &&
      run.planes.every(p => p.dead || p.state === 'taxi');
  }

  globalThis.CTL_Traffic = { create, step, shiftDone, weightedClass };
})();
