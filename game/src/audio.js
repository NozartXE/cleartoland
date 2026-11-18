// Sound for CLEAR TO LAND: all synthesized WebAudio, no samples. Short radio
// blips for selections and route orders, a two-note chime for landings, a soft
// alarm while a separation warning is live, and a slow pentatonic music loop
// that is just scheduled sine notes — the tower room at work. In Node the
// whole module is a no-op, so headless replays never touch an audio device.
(function () {
  let ctx = null, musicGain = null, sfxGain = null, musicTimer = 0, noteIdx = 0;
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3]; // minor pentatonic walk
  const BASE = 220;

  function ensure(save) {
    if (ctx || typeof globalThis.AudioContext === 'undefined') return;
    try {
      ctx = new globalThis.AudioContext();
      musicGain = ctx.createGain(); musicGain.gain.value = (save ? save.music : 0.7) * 0.16;
      sfxGain = ctx.createGain(); sfxGain.gain.value = (save ? save.sfx : 0.9) * 0.5;
      musicGain.connect(ctx.destination); sfxGain.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfxGain); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(sfxGain); src.start();
  }

  const sfx = {
    select() { tone(880, 0.06, 'square', 0.06); },
    route() { tone(660, 0.05, 'square', 0.05); tone(990, 0.07, 'square', 0.05, 0.05); },
    band() { tone(520, 0.06, 'triangle', 0.1); },
    land() { tone(523, 0.12, 'sine', 0.16); tone(784, 0.18, 'sine', 0.16, 0.09); },
    depart() { tone(392, 0.1, 'sine', 0.12); tone(587, 0.16, 'sine', 0.12, 0.08); },
    warn() { tone(1175, 0.09, 'square', 0.07); tone(1175, 0.09, 'square', 0.07, 0.14); },
    incident() { noise(0.5, 0.5, 500); tone(110, 0.5, 'sawtooth', 0.2, 0, 55); },
    mayday() { tone(740, 0.12, 'square', 0.1); tone(587, 0.12, 'square', 0.1, 0.13); tone(740, 0.12, 'square', 0.1, 0.26); },
    order() { tone(1047, 0.08, 'triangle', 0.12); tone(1319, 0.12, 'triangle', 0.12, 0.07); },
    paid() { tone(784, 0.09, 'triangle', 0.13); tone(988, 0.09, 'triangle', 0.13, 0.08); tone(1175, 0.15, 'triangle', 0.13, 0.16); },
    draft() { tone(659, 0.1, 'sine', 0.12); tone(880, 0.14, 'sine', 0.12, 0.09); },
    feat() { tone(880, 0.1, 'sine', 0.12); tone(1109, 0.16, 'sine', 0.12, 0.09); },
    click() { tone(440, 0.04, 'square', 0.04); },
  };

  // The music loop: one pentatonic note every 0.42 s, called from the frame
  // loop with real time; deterministic content, human timing.
  function musicTick(dt, active) {
    if (!ctx || !active) return;
    musicTimer -= dt;
    if (musicTimer <= 0) {
      musicTimer = 0.42;
      const st = SCALE[noteIdx % SCALE.length]; noteIdx++;
      const f = BASE * Math.pow(2, st / 12);
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 0.45);
      if (noteIdx % 4 === 0) { // a soft bass every fourth note
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = BASE / 2;
        g2.gain.setValueAtTime(0.0001, t0);
        g2.gain.exponentialRampToValueAtTime(0.35, t0 + 0.03);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
        o2.connect(g2); g2.connect(musicGain); o2.start(t0); o2.stop(t0 + 0.85);
      }
    }
  }

  function setVolumes(save) {
    if (!ctx) return;
    musicGain.gain.value = save.music * 0.16;
    sfxGain.gain.value = save.sfx * 0.5;
  }

  globalThis.CTL_Audio = { ensure, sfx, musicTick, setVolumes };
})();
