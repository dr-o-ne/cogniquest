/**
 * Randomness is passed in explicitly instead of being taken from Math.random
 * directly. That is what makes exercise generators reproducible in tests and
 * keeps the core pure (A1).
 */
export type Random = () => number

/** Ordinary randomness for the game. */
export const systemRandom: Random = Math.random

/**
 * Reproducible randomness for tests (mulberry32).
 * Same seed, same sequence.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** An integer from [min, max], both ends included. */
export function randomInt(random: Random, min: number, max: number): number {
  if (min > max) throw new RangeError(`Empty range: ${min}–${max}`)
  return min + Math.floor(random() * (max - min + 1))
}

export function pick<T>(random: Random, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('Nothing to pick from an empty list')
  return items[randomInt(random, 0, items.length - 1)]!
}
