// The whole "AI". No model, no API, no network: hand-written answer banks plus a
// PRNG seeded off the photograph's bytes. Same photo in, same form out.

import identity from './data/identity.json';
import clinical from './data/clinical.json';
import social from './data/social.json';
import reasoning from './data/reasoning.json';
import tokens from './data/tokens.json';
import { FIELDS, PAST_CONDITIONS, type FieldKey } from './intake-form.model';
import type { PhotoSignals } from './image-read';

export type Chaos = 1 | 2 | 3;
const TIERS = ['mild', 'spicy', 'unhinged'] as const;

export interface Guess {
  key: FieldKey;
  value: string;
  /** past_conditions only: the boxes we decided to tick */
  conditions?: string[];
  confidence: number;
  why: string;
}

interface Bank {
  mild?: string[];
  spicy?: string[];
  unhinged?: string[];
  why?: string[];
  other?: string[];
}

const BANKS = { ...identity, ...clinical, ...social } as Record<string, Bank>;
const TOKENS = tokens as Record<string, string[]>;

/** mulberry32 — small, fast, and deterministic, which is the only requirement. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(next: () => number, list: readonly T[]): T => list[Math.floor(next() * list.length)]!;
const int = (next: () => number, min: number, max: number) =>
  min + Math.floor(next() * (max - min + 1));

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve {tokens} in a bank entry. Repeats of the same token inside one string
 * resolve to the same value — "{firstName}, on behalf of {firstName}" is only
 * funny if it's the same person. Use {firstName2} when you want a second one.
 */
function fill(template: string, next: () => number, signals: PhotoSignals): string {
  const memo = new Map<string, string>();
  const today = new Date();
  const dobYear = int(next, 1938, 1972);
  const oldYear = int(next, 1985, 2012);

  const resolve = (token: string): string => {
    const base = token.replace(/\d+$/, '');
    if (TOKENS[base]) return pick(next, TOKENS[base]);

    switch (token) {
      case 'num':
        return String(int(next, 2, 99));
      case 'num3':
        return String(int(next, 100, 999));
      case 'id':
        return `${int(next, 1000, 9999)}-${int(next, 1000, 9999)}-${pick(next, [...'ABCDEFHJKLMNPRTVWXY'])}`;
      case 'today':
        return iso(today);
      case 'weekday':
        return pick(next, [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ]);
      case 'oldYear':
        return String(oldYear);
      case 'oldYear2':
        return String(Math.min(2015, oldYear + int(next, 1, 9)));
      case 'dobYear':
        return String(dobYear);
      case 'dob':
        return iso(new Date(Date.UTC(dobYear, int(next, 0, 11), int(next, 1, 28))));
      case 'hex':
        return signals.hex;
      case 'hueName':
        return signals.hueName;
      case 'brightness':
        return String(signals.brightness);
      case 'contrast':
        return String(signals.contrast);
      case 'ratio':
        return signals.ratio;
      case 'orientation':
        return signals.orientation;
      case 'w':
        return String(signals.w);
      case 'h':
        return String(signals.h);
      case 'kb':
        return String(signals.kb);
      default:
        return token;
    }
  };

  return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
    if (!memo.has(token)) memo.set(token, resolve(token));
    return memo.get(token)!;
  });
}

/**
 * Derangement escalates down the page — the header is merely invented, the
 * signature line has lost the plot — and the chaos slider shifts the whole curve.
 */
function tierFor(index: number, chaos: Chaos): (typeof TIERS)[number] {
  const bump = index < 9 ? 0 : index < 15 ? 1 : 2;
  return TIERS[Math.min(2, chaos - 1 + bump)]!;
}

function tieredOptions(bank: Bank, tier: (typeof TIERS)[number]): string[] {
  // Walk down to a tier that actually has entries, so a thin bank still answers.
  for (let i = TIERS.indexOf(tier); i >= 0; i--) {
    const options = bank[TIERS[i]!];
    if (options?.length) return options;
  }
  return ['(the photograph declined to comment)'];
}

function tickConditions(next: () => number, bank: Bank, tier: string): string[] {
  const count =
    tier === 'mild' ? int(next, 0, 2) : tier === 'spicy' ? int(next, 1, 4) : int(next, 3, 7);
  const pool = [...PAST_CONDITIONS];
  const ticked: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    ticked.push(...pool.splice(Math.floor(next() * pool.length), 1));
  }
  if (bank.other?.length && next() < (tier === 'unhinged' ? 0.8 : 0.3)) {
    ticked.push(pick(next, bank.other));
  }
  // Back into printed order, so the grid reads like the paper form. "Other" last.
  const order = (label: string) =>
    label.startsWith('Other') ? 99 : (PAST_CONDITIONS as readonly string[]).indexOf(label);
  return ticked.sort((a, b) => order(a) - order(b));
}

/**
 * `nonce` re-rolls a single field without disturbing its neighbours — each field
 * draws from its own branch of the seed.
 */
export function guessField(
  key: FieldKey,
  signals: PhotoSignals,
  chaos: Chaos,
  nonce = 0,
): Guess {
  const index = FIELDS.findIndex((field) => field.key === key);
  const next = rng((signals.seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(nonce, 0x85ebca6b)) >>> 0);
  const bank = BANKS[key] ?? {};
  const tier = tierFor(index, chaos);

  const why = fill(
    next() < 0.55 && bank.why?.length ? pick(next, bank.why) : pick(next, reasoning.generic),
    next,
    signals,
  );
  // Always high. That is the entire joke.
  const confidence = next() < 0.08 ? 100 : Math.round((91 + next() * 8.9) * 10) / 10;

  if (key === 'past_conditions') {
    const conditions = tickConditions(next, bank, tier);
    return {
      key,
      value: conditions.join(', ') || 'none ticked, which is itself a finding',
      conditions,
      confidence,
      why,
    };
  }

  return { key, value: fill(pick(next, tieredOptions(bank, tier)), next, signals), confidence, why };
}

export function guessAll(
  signals: PhotoSignals,
  chaos: Chaos,
  nonces: Partial<Record<FieldKey, number>> = {},
): Guess[] {
  return FIELDS.map((field) => guessField(field.key, signals, chaos, nonces[field.key] ?? 0));
}

/** Same key order as the filled-out forms in `patients/`, so the output is diffable. */
export function toIntakeJson(guesses: readonly Guess[]): string {
  const form: Record<string, string | string[]> = {};
  for (const guess of guesses) {
    form[guess.key] = guess.conditions
      ? guess.conditions.map((condition) => condition.toLowerCase())
      : guess.value;
  }
  return JSON.stringify(form, null, 2);
}
