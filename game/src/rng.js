// Seeded randomness for CLEAR TO LAND: one mulberry32 core, named streams so a
// run's traffic, weather, orders and draft never steal numbers from each other.
// The same seed replays the same run in the browser and headlessly in Node.
(function () {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Hash a string seed ("clear-to-land:traffic:3") into a uint32 stream seed.
  function hashSeed(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function stream(runSeed, name) {
    return mulberry32(hashSeed('clear-to-land:' + runSeed + ':' + name));
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
  function int(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  globalThis.CTL_Rng = { mulberry32, hashSeed, stream, pick, range, int };
})();
