// Tower orders: timed contracts the field is offered mid-shift. Each order
// names a job — land the medevac fast, land two jumbos, keep a clean sheet
// for a minute — with a pay line and a deadline. Orders are the game's
// second decision layer: they tell the tower which plane matters most, and
// chasing one always costs attention somewhere else.
(function () {
  const C = globalThis.CTL_Config;
  const R = globalThis.CTL_Rng;

  const KINDS = [
    { id: 'medevac', name: 'MEDEVAC PRIORITY', text: 'Land the marked HELI within %ds', pay: 320, dur: 75, needs: 'heli' },
    { id: 'vip', name: 'VIP ARRIVAL', text: 'Land the marked JET within %ds', pay: 260, dur: 70, needs: 'jet' },
    { id: 'heavies', name: 'HEAVY PAIR', text: 'Land 2 JUMBOs within %ds', pay: 380, dur: 150, needs: 'count', cls: 'jumbo', count: 2 },
    { id: 'cleanair', name: 'CLEAN AIR', text: 'No separation warning for %ds', pay: 240, dur: 60, needs: 'quiet' },
    { id: 'rushhour', name: 'RUSH HOUR', text: 'Land 4 planes within %ds', pay: 300, dur: 110, needs: 'landcount', count: 4 },
    { id: 'ferryman', name: 'FERRYMAN', text: 'Land 2 SEAPLANEs within %ds', pay: 260, dur: 130, needs: 'count', cls: 'sea', count: 2 },
    { id: 'quickturn', name: 'QUICK TURN', text: 'Depart 3 planes within %ds', pay: 270, dur: 120, needs: 'depcount', count: 3 },
    { id: 'streak', name: 'STREAK BONUS', text: 'Reach a x5 landing streak within %ds', pay: 280, dur: 120, needs: 'streak', count: 5 },
    { id: 'fullsky', name: 'FULL SKY', text: 'Hold 10 planes airborne at once within %ds', pay: 250, dur: 90, needs: 'airborne', count: 10 },
    { id: 'calmhands', name: 'CALM HANDS', text: 'Land 3 planes with no incident within %ds', pay: 240, dur: 140, needs: 'landcount', count: 3 },
  ];

  function offer(run) {
    if (run.orders.length >= 2) return null;
    const rng = run.rngOrders;
    const kind = R.pick(rng, KINDS);
    const o = {
      kind, t: 0, dur: kind.dur, pay: kind.pay, done: 0,
      targetId: null, failed: false, text: kind.text.replace('%d', kind.dur),
    };
    if (kind.needs === 'heli' || kind.needs === 'jet') {
      const cls = kind.needs;
      let target = run.planes.find(p => !p.dead && p.kind === 'arr' && p.cls === cls && p.state === 'air');
      if (!target) target = globalThis.CTL_Planes.spawnArrival(run, cls, R.int(rng, 0, 10));
      o.targetId = target.id;
      target.orderMarked = true;
    }
    run.orders.push(o);
    return o;
  }

  // The orchestrator calls this on scoring events; returns pay events.
  function step(run, dt, events, out) {
    for (const o of run.orders) {
      o.t += dt;
      const k = o.kind;
      if (k.needs === 'quiet' && run.warnedThisShift > run.orderQuietBase) o.failed = true;
      if (k.needs === 'airborne') {
        const n = run.planes.filter(p => !p.dead && (p.state === 'air' || p.state === 'final')).length;
        if (n >= k.count) complete(run, o, out);
      }
      if (!o.failed && o.t >= o.dur) { o.failed = true; out.push({ type: 'order-failed', order: o }); }
    }
    run.orders = run.orders.filter(o => !o.failed && !o.paid);
    for (const ev of events) {
      for (const o of run.orders) {
        const k = o.kind;
        if (ev.type === 'landed') {
          if ((k.needs === 'heli' || k.needs === 'jet') && ev.plane.id === o.targetId) complete(run, o, out);
          else if (k.needs === 'count' && ev.plane.cls === k.cls) { o.done++; if (o.done >= k.count) complete(run, o, out); }
          else if (k.needs === 'landcount') { o.done++; if (o.done >= k.count) complete(run, o, out); }
        }
        if (ev.type === 'departed' && k.needs === 'depcount') { o.done++; if (o.done >= k.count) complete(run, o, out); }
        if (ev.type === 'streak' && k.needs === 'streak' && ev.streak >= k.count) complete(run, o, out);
      }
    }
    run.orders = run.orders.filter(o => !o.failed && !o.paid);
  }

  function complete(run, o, out) {
    if (o.paid || o.failed) return;
    o.paid = true;
    out.push({ type: 'order-paid', order: o });
  }

  globalThis.CTL_Orders = { KINDS, offer, step };
})();
