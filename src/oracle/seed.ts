// Everything downstream of here is deterministic: the same name and birthday
// always produce the same medical history. That matters for demos (you can
// rehearse a result) and it makes the lie feel authoritative, which is funnier
// than randomness.

export function hashString(input: string): number {
  // FNV-1a. Small, fast, no dependency, good enough spread for our purposes.
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// mulberry32: a tiny seeded PRNG. Returns a function that yields 0..1 like
// Math.random, except the sequence is fixed by the seed.
export function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Returns undefined for an empty list rather than pretending. Call sites use
// `?? fallback`, which keeps us honest without reaching for a type assertion.
export function pick<T>(random: () => number, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(random() * items.length)]
}

export function pickSome<T>(random: () => number, items: readonly T[], count: number): T[] {
  const pool = [...items]
  const chosen: T[] = []
  while (chosen.length < count && pool.length > 0) {
    const [taken] = pool.splice(Math.floor(random() * pool.length), 1)
    if (taken !== undefined) chosen.push(taken)
  }
  return chosen
}
