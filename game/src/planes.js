// Planes: the aircraft themselves — spawning, steering along player-drawn
// routes, altitude bands, fuel, finals, takeoffs and removals. Pure simulation:
// no DOM, no rendering; every outcome is a returned event the orchestrator
// scores. A plane is flown by its route: an ordered list of waypoints the
// player drew, followed with the class's real turn rate, so a badly drawn
// route flies badly — that is the game.
(function () {
  const C = globalThis.CTL_Config;
  const F = globalThis.CTL_Field;
  const R = globalThis.CTL_Rng;

  // Plane ids are per-run (run.nextPlaneId): a seed must replay identically
  // no matter what ran before it in the same process.
  function basePlane(run, cls, kind) {
    const spec = C.CLASSES[cls];
    const cs = R.pick(run.rngTraffic, C.CALLSIGNS) + ' ' + R.int(run.rngTraffic, 11, 989);
    return {
      id: run.nextPlaneId++, cls, kind, spec, callsign: cs,
      x: 0, y: 0, hdg: 0, alt: 2, targetBand: 2, spdMul: 1,
      path: [], state: 'air', fuel: spec.fuel * run.fuelMul * (run.upgrades.fueltruck ? 1.4 : 1),
      maxFuel: spec.fuel * run.fuelMul * (run.upgrades.fueltruck ? 1.4 : 1),
      emergency: false, glideT: 0, warned: false, warnT: 0, inFog: false,
      hold: false, holdCx: 0, holdCy: 0, exitGate: null, entryGate: null,
      strip: null, rollT: 0, taxiT: 0, born: run.time, selected: false,
      trail: [], orders: null, dead: false,
    };
  }

  function spawnArrival(run, cls, gateIdx) {
    const p = basePlane(run, cls, 'arr');
    const g = F.GATES[gateIdx % F.GATES.length];
    p.entryGate = g;
    p.x = g.x; p.y = g.y;
    // Aim into the field: toward a jittered point near the centre.
    const cx = C.W / 2 + R.range(run.rngTraffic, -140, 140);
    const cy = 400 + R.range(run.rngTraffic, -90, 90);
    p.hdg = Math.atan2(cy - g.y, cx - g.x);
    p.alt = 2; p.targetBand = 2;
    if (cls === 'heli') { p.alt = 1; p.targetBand = 1; }
    run.planes.push(p);
    return p;
  }

  function queueDeparture(run, cls, gateIdx) {
    const p = basePlane(run, cls === 'jumbo' ? 'jet' : cls, 'dep'); // jumbos never depart the short field's queue
    p.exitGate = F.GATES[gateIdx % F.GATES.length];
    p.state = 'queued';
    p.x = F.RUNWAY_A.x1 - 46 - run.depQueue.length * 52;
    p.y = F.RUNWAY_A.y1 + 44;
    p.hdg = 0; p.alt = 0; p.targetBand = 0;
    p.fuel = p.maxFuel; // departures wait fuelled
    run.depQueue.push(p);
    return p;
  }

  function launchDeparture(run, p) {
    p.state = 'rollout'; p.rollKind = 'takeoff';
    p.x = F.RUNWAY_A.x1; p.y = F.RUNWAY_A.y1; p.hdg = 0; p.rollV = 12;
    run.depQueue.splice(run.depQueue.indexOf(p), 1);
    run.planes.push(p); // from here the sim steps it like any other aircraft
    run.depQueue.forEach((q, i) => { q.x = F.RUNWAY_A.x1 - 46 - i * 52; });
    return p;
  }

  // Steer the plane toward a point with its turn rate; returns the heading.
  function steer(p, tx, ty, dt, turnMul) {
    const want = Math.atan2(ty - p.y, tx - p.x);
    const maxTurn = (p.spec.turn * turnMul * Math.PI / 180) * dt;
    const dh = F.angNorm(want - p.hdg);
    p.hdg += Math.max(-maxTurn, Math.min(maxTurn, dh));
    return Math.abs(dh);
  }

  function speedOf(p, run) {
    let s = p.spec.speed * p.spdMul;
    if (p.emergency) s *= 0.8;
    return s;
  }

  // Advance one plane one fixed step. wx/wy = wind vector (px/s at full push).
  function step(run, p, dt, wx, wy, events) {
    if (p.dead) return;
    const turnMul = run.upgrades.coffee ? 1.2 : 1;
    const windMul = run.upgrades.tailwind ? 0.6 : 1;

    if (p.state === 'queued') return;

    if (p.state === 'rollout') {
      stepRollout(run, p, dt, events);
      return;
    }
    if (p.state === 'taxi') {
      p.taxiT -= dt;
      p.x += Math.cos(p.hdg) * 14 * dt; p.y += Math.sin(p.hdg) * 14 * dt;
      if (p.taxiT <= 0) { p.dead = true; events.push({ type: p.kind === 'arr' ? 'landed-done' : 'gone', plane: p }); }
      return;
    }

    // --- airborne states: 'air' and 'final' ---
    // altitude drifts toward the ordered band
    const altRate = 0.55 * dt;
    if (p.alt < p.targetBand) p.alt = Math.min(p.targetBand, p.alt + altRate);
    else if (p.alt > p.targetBand) p.alt = Math.max(p.targetBand, p.alt - altRate);

    // fuel and the emergency glide
    if (p.kind === 'arr' && p.state === 'air') {
      p.fuel -= dt;
      if (p.fuel <= 0 && !p.emergency) {
        p.emergency = true; p.glideT = 22; p.targetBand = 0;
        events.push({ type: 'mayday', plane: p });
      }
      if (p.emergency) {
        p.glideT -= dt;
        if (p.glideT <= 0) { p.dead = true; events.push({ type: 'forced-down', plane: p }); return; }
      }
    }

    // steering: final glide, holding orbit, route, or straight on
    if (p.state === 'final') {
      const rw = p.strip;
      const tx = rw.threshold.x + Math.cos(rw.heading) * rw.len * 0.72;
      const ty = rw.threshold.y + Math.sin(rw.heading) * rw.len * 0.72;
      steer(p, tx, ty, dt, turnMul * 1.5);
      // crossing the threshold plane starts the rollout
      const dx = p.x - rw.threshold.x, dy = p.y - rw.threshold.y;
      const along = dx * Math.cos(rw.heading) + dy * Math.sin(rw.heading);
      if (along > 4) {
        p.state = 'rollout'; p.rollKind = 'landing'; p.rollV = speedOf(p, run) * 0.9;
        p.y = rw.threshold.y + (rw.heading !== 0 ? (p.x - rw.threshold.x) * 0 : 0);
        if (rw.heading === 0) p.y = rw.y1; else p.x = rw.x1;
        p.hdg = rw.heading;
        events.push({ type: 'touchdown', plane: p });
      }
    } else if (p.hold) {
      const ang = Math.atan2(p.y - p.holdCy, p.x - p.holdCx) + 0.9;
      steer(p, p.holdCx + Math.cos(ang) * 74, p.holdCy + Math.sin(ang) * 74, dt, turnMul);
    } else if (p.path.length) {
      const wp = p.path[0];
      steer(p, wp.x, wp.y, dt, turnMul);
      const capR = Math.max(17, speedOf(p, run) * 0.32);
      if (F.dist(p.x, p.y, wp.x, wp.y) < capR) p.path.shift();
    }

    // turbulence from the gale wall shakes the heading a little
    if (run.turbulence && run.turbulence(p)) p.hdg += (run.rngWeather() - 0.5) * 0.9 * dt;

    // move: own thrust plus the wind's push
    const s = speedOf(p, run);
    p.x += (Math.cos(p.hdg) * s + wx * windMul) * dt;
    p.y += (Math.sin(p.hdg) * s + wy * windMul) * dt;

    // contrail samples for the renderer (kept short and cheap)
    if (run.time - (p.trailT || 0) > 0.22) {
      p.trailT = run.time;
      p.trail.push({ x: p.x, y: p.y, t: run.time });
      if (p.trail.length > 14) p.trail.shift();
    }

    // landing capture (arrivals, low, not already on final)
    if (p.kind === 'arr' && p.state === 'air' && p.alt < 0.4) tryCapture(run, p, events);

    // departures score by leaving through their gate, high
    if (p.kind === 'dep' && p.state === 'air') {
      if (p.exitGate && F.dist(p.x, p.y, p.exitGate.x, p.exitGate.y) < 52 && p.alt > 1.5) {
        p.dead = true; events.push({ type: 'departed', plane: p }); return;
      }
    }

    // leaving the chart uncontrolled
    if (p.x < -70 || p.x > C.W + 70 || p.y < -70 || p.y > C.H + 70) {
      p.dead = true;
      events.push({ type: p.kind === 'arr' ? 'lost-arrival' : 'departed-far', plane: p });
    }
  }

  function tryCapture(run, p, events) {
    const zone = F.landingZoneFor(p, run.upgrades);
    if (zone.kind === 'pad') {
      if (F.dist(p.x, p.y, zone.pad.x, zone.pad.y) < zone.pad.r + 8) {
        p.state = 'rollout'; p.rollKind = 'landing'; p.strip = null; p.rollV = 8;
        events.push({ type: 'touchdown', plane: p });
      }
      return;
    }
    const strips = zone.kind === 'runway' ? [zone.rw] : [F.RUNWAY_A, F.RUNWAY_B];
    for (const rw of strips) {
      if (F.inFinalCone(p, rw, run.upgrades) > 0) {
        p.state = 'final'; p.strip = rw; p.path = [];
        events.push({ type: 'on-final', plane: p });
        return;
      }
    }
  }

  function stepRollout(run, p, dt, events) {
    if (p.rollKind === 'landing') {
      const rw = p.strip;
      const decel = rw ? 60 : 30;
      p.rollV = Math.max(0, p.rollV - decel * dt);
      const dir = rw ? rw.heading : p.hdg;
      p.x += Math.cos(dir) * p.rollV * dt;
      p.y += Math.sin(dir) * p.rollV * dt;
      if (p.rollV <= 0.5) {
        p.state = 'taxi'; p.taxiT = 1.1;
        events.push({ type: 'landed', plane: p });
      }
    } else { // takeoff roll
      p.rollV += 95 * dt;
      p.x += p.rollV * dt;
      const liftoff = p.spec.speed * 0.82;
      if (p.rollV >= liftoff || p.x > F.RUNWAY_A.x2 - 30) {
        p.state = 'air'; p.alt = 0.05; p.targetBand = run.upgrades.secondfreq ? 2 : 0;
        p.hdg = 0;
        events.push({ type: 'airborne', plane: p });
      }
    }
  }

  // Give a plane a freshly drawn route (waypoints already simplified).
  function setPath(p, points) {
    p.path = points.map(q => ({ x: q.x, y: q.y }));
    p.hold = false;
  }

  function engageHold(p) {
    p.hold = true;
    p.holdCx = p.x + Math.cos(p.hdg) * 74;
    p.holdCy = p.y + Math.sin(p.hdg) * 74;
    p.path = [];
  }

  globalThis.CTL_Planes = { spawnArrival, queueDeparture, launchDeparture, step, setPath, engageHold, speedOf };
})();
