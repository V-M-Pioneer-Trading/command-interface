/**
 * Deterministic hashing and pseudo-randomness shared by the map modules.
 *
 * Both used to exist in three places at once — `hash32` in `sprites/pixel.js`
 * and again as `hashString` in `systemLayout.js`, `mulberry32` in
 * `sprites/pixel.js` and again inline in the dev harness. They are the same
 * two functions, and the map's determinism guarantees (a waypoint always draws
 * the same sprite variant, a ring never reshuffles between renders) depend on
 * every caller agreeing on them, so they live in one place.
 *
 * Neither is cryptographic. They exist so the map is reproducible.
 */

/** FNV-1a, 32-bit. Stable across runs and platforms. */
export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small fast PRNG. Same seed, same sequence — that is the whole point. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
