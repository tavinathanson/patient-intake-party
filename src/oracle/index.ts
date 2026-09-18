import type { Biorhythms, Dossier, SearchResponse, Section } from '../types.ts'
import { hashString, makeRandom, pick, pickSome } from './seed.ts'
import {
  ANIMAL_INSURERS, CHINESE_ANIMALS, CONDITION_CHECKLIST, DESTINY_ALLERGENS,
  FAMILY_CONDITIONS, FIRST_NAMES, LIFE_PATHS, RELATIONSHIPS, SIGN_LORE,
  STREETS, SURGERY_POOL, SURNAME_ORIGINS, destinyNumber, reduceToRoot, zodiacFor,
} from './lore.ts'

const MS_PER_DAY = 86_400_000

// Biorhythm theory: three sine waves running from the moment you were born,
// 23/28/33 days long. Invented in the 1890s, thoroughly debunked, still the
// prettiest chart you can draw from a single date.
function biorhythmsFor(daysAlive: number): Biorhythms {
  return {
    physical: Math.sin((2 * Math.PI * daysAlive) / 23),
    emotional: Math.sin((2 * Math.PI * daysAlive) / 28),
    intellectual: Math.sin((2 * Math.PI * daysAlive) / 33),
  }
}

function lowestCycle(rhythms: Biorhythms): keyof Biorhythms {
  const entries = [
    ['physical', rhythms.physical],
    ['emotional', rhythms.emotional],
    ['intellectual', rhythms.intellectual],
  ] as const
  let lowest: keyof Biorhythms = 'physical'
  let lowestValue = Number.POSITIVE_INFINITY
  for (const [name, value] of entries) {
    if (value < lowestValue) {
      lowest = name
      lowestValue = value
    }
  }
  return lowest
}

const COMPLAINTS: Record<keyof Biorhythms, string> = {
  physical: 'Fatigue, worse in the mornings',
  emotional: 'Low mood, "not feeling like myself"',
  intellectual: 'Brain fog, losing words mid-sentence',
}

function lifePathFor(dob: string): number {
  const digits = dob.replace(/\D/g, '')
  const total = digits.split('').reduce((sum, digit) => sum + Number(digit), 0)
  return reduceToRoot(total)
}

// If the real search found something, we cite it. The citation is real; the
// value it supposedly supports is not. That gap is the joke.
function citation(search: SearchResponse, index: number): string | null {
  const result = search.results[index]
  if (!result) return null
  let host = result.link
  try {
    host = new URL(result.link).hostname.replace(/^www\./, '')
  } catch {
    host = 'the open web'
  }
  const snippet = result.snippet.slice(0, 90)
  return snippet ? `Cross-referenced with ${host}: "${snippet}…"` : `Cross-referenced with ${host}.`
}

export function buildDossier(name: string, dob: string, search: SearchResponse): Dossier {
  const random = makeRandom(hashString(`${name.trim().toLowerCase()}|${dob}`))
  const [yearText = '1990', monthText = '01', dayText = '01'] = dob.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  const sign = zodiacFor(month, day)
  const lore = SIGN_LORE[sign]
  const lifePath = lifePathFor(dob)
  const lifePathLore = LIFE_PATHS[lifePath] ?? { name: 'the Unnumbered', inference: 'resists classification' }
  const destiny = destinyNumber(name)
  const animal = CHINESE_ANIMALS[(((year - 4) % 12) + 12) % 12] ?? 'Rat'
  const daysAlive = Math.max(0, Math.floor((Date.now() - Date.parse(dob)) / MS_PER_DAY))
  const rhythms = biorhythmsFor(daysAlive)
  const trough = lowestCycle(rhythms)

  const surname = name.trim().split(/\s+/).slice(1).join(' ') || name.trim()
  const origin = SURNAME_ORIGINS[hashString(surname) % SURNAME_ORIGINS.length] ?? 'undetermined'

  // Life path decides how many boxes get ticked. No reason. That is the point.
  const extraCount = lifePath % 3
  const extras = pickSome(random, CONDITION_CHECKLIST.filter((item) => item !== lore.condition), extraCount)
  const conditions = [lore.condition, ...extras]

  const identity: Section = {
    id: 'identity',
    title: 'Identity',
    gate: null,
    fields: [
      {
        id: 'filled_out_by', label: 'Filled out by', value: '23andGuess inference engine',
        provenance: 'vibes', reasoning: 'No human was involved in completing this form.',
      },
      {
        id: 'date', label: 'Date', value: new Date().toISOString().slice(0, 10),
        provenance: 'record', reasoning: 'System clock. One of the two things on this page we are sure about.',
      },
      {
        id: 'name', label: 'Name', value: name,
        provenance: 'record', reasoning: 'You typed this. The other thing we are sure about.',
      },
      {
        id: 'date_of_birth', label: 'Date of birth', value: dob,
        provenance: 'record', reasoning: 'You typed this too, and then we built everything below out of it.',
      },
      {
        id: 'address', label: 'Address',
        value: `${10 + Math.floor(random() * 180)} ${pick(random, STREETS) ?? 'Orchard Lane'}`,
        provenance: search.results.length > 0 ? 'record' : 'vibes',
        reasoning: citation(search, 0) ?? 'No public record found, so we picked a street that sounded residential.',
      },
      {
        id: 'phone', label: 'Phone',
        value: `555-0${String(100 + Math.floor(random() * 899))}`,
        provenance: search.results.length > 1 ? 'record' : 'vibes',
        reasoning: citation(search, 1) ?? 'Invented. Please do not call it.',
      },
      {
        id: 'insurance', label: 'Insurance',
        value: ANIMAL_INSURERS[animal] ?? 'Thrifty Mutual, Bronze',
        provenance: 'astrological',
        reasoning: `Born in the year of the ${animal}. ${animal}s carry this plan.`,
      },
      {
        id: 'member_id', label: 'Member ID',
        value: `${animal.slice(0, 2).toUpperCase()}${String(Math.floor(random() * 9e7) + 1e7)}`,
        provenance: 'vibes', reasoning: 'Generated. It has the right number of digits, which is most of the battle.',
      },
      {
        id: 'emergency_contact', label: 'Emergency contact',
        value: `${pick(random, FIRST_NAMES) ?? 'Cherry'} ${surname}, ${pick(random, RELATIONSHIPS) ?? 'sister'}, 555-0${String(100 + Math.floor(random() * 899))}`,
        provenance: 'vibes',
        reasoning: 'The person whose name would appear most often beside yours, if we had checked.',
      },
    ],
  }

  const presenting: Section = {
    id: 'presenting',
    title: 'Reason for visit, medications, allergies',
    gate: 'touch',
    fields: [
      {
        id: 'reason_for_visit', label: 'Reason for visit', value: COMPLAINTS[trough],
        provenance: 'numerological',
        reasoning: `Your ${trough} biorhythm is at ${rhythms[trough].toFixed(2)} on day ${daysAlive.toLocaleString()}. That is a trough.`,
      },
      {
        id: 'current_medications', label: 'Current medications',
        value: `${lore.medication}. Adherence: partial.`,
        provenance: 'astrological',
        reasoning: `${sign} rules ${lore.rules}. Life Path ${lifePath}, ${lifePathLore.name}, ${lifePathLore.inference}.`,
      },
      {
        id: 'allergies', label: 'Allergies',
        value: DESTINY_ALLERGENS[destiny] ?? 'None reported',
        provenance: 'numerological',
        reasoning: `The letters in "${name}" reduce to Destiny Number ${destiny}.`,
      },
    ],
  }

  const history: Section = {
    id: 'history',
    title: 'Past conditions and surgeries',
    gate: 'retina',
    fields: [
      {
        id: 'past_conditions', label: 'Past conditions', value: conditions.join(', '),
        provenance: 'astrological',
        reasoning: `${sign} rules ${lore.rules}, which gives ${lore.condition}.${extras.length > 0 ? ` Life Path ${lifePath} adds ${extras.length} more.` : ''}`,
      },
      {
        id: 'past_surgeries', label: 'Past surgeries',
        value: `${pick(random, SURGERY_POOL) ?? 'appendectomy'} (${year + 20 + Math.floor(random() * 30)})`,
        provenance: 'vibes',
        reasoning: 'Most people have had one of these. Statistically we are probably fine.',
      },
    ],
  }

  const social: Section = {
    id: 'social',
    title: 'Family and social history',
    gate: 'pulse',
    fields: [
      {
        id: 'family_history', label: 'Family history',
        value: pickSome(random, FAMILY_CONDITIONS, 2).join('; '),
        provenance: 'vibes',
        reasoning: `Surname "${surname}" reads as ${origin}. We extrapolated from there.`,
      },
      {
        id: 'tobacco', label: 'Tobacco',
        value: random() > 0.6 ? 'Former (quit, year unclear)' : 'Never',
        provenance: 'astrological', reasoning: `Saturn was doing something at your birth. ${lore.tell}.`,
      },
      {
        id: 'alcohol', label: 'Alcohol', value: random() > 0.5 ? 'Occasional' : 'None',
        provenance: 'vibes', reasoning: 'Everyone says occasional. We said it for you.',
      },
      {
        id: 'drugs', label: 'Recreational drugs', value: 'No',
        provenance: 'vibes', reasoning: 'Nobody has ever ticked yes on a paper form.',
      },
    ],
  }

  const trace = buildTrace({ name, sign, lore: lore.rules, lifePath, lifePathLore: lifePathLore.name, animal, daysAlive, trough, rhythms, search })

  return {
    name, dob, sign, signRules: lore.rules, lifePath, lifePathName: lifePathLore.name,
    chineseAnimal: animal, daysAlive, biorhythms: rhythms, search, trace,
    sections: [identity, presenting, history, social],
  }
}

interface TraceInput {
  name: string
  sign: string
  lore: string
  lifePath: number
  lifePathLore: string
  animal: string
  daysAlive: number
  trough: keyof Biorhythms
  rhythms: Biorhythms
  search: SearchResponse
}

// The lines that stream past during the "search". Real results first so the
// fabrication rides in on the back of something true.
function buildTrace(input: TraceInput): string[] {
  const lines: string[] = [`Querying open web for "${input.name}"…`]

  if (!input.search.configured) {
    lines.push('Search unavailable — no key configured. Switching to inference.')
  } else if (input.search.error) {
    lines.push(`Search failed (${input.search.error}). Switching to inference.`)
  } else if (input.search.results.length === 0) {
    lines.push('0 public records found.')
    lines.push('No digital footprint. Confidence increased.')
  } else {
    lines.push(`${input.search.results.length} public records matched.`)
    for (const result of input.search.results.slice(0, 3)) {
      lines.push(`✓ ${result.title.slice(0, 70)}`)
    }
  }

  lines.push(`Natal chart cast — birth time assumed 12:00.`)
  lines.push(`${input.sign} rules ${input.lore}.`)
  lines.push(`Year of the ${input.animal}. Plan matched.`)
  lines.push(`Life Path ${input.lifePath} — ${input.lifePathLore}.`)
  lines.push(`Day ${input.daysAlive.toLocaleString()} of life. ${input.trough} cycle at ${input.rhythms[input.trough].toFixed(2)}.`)
  lines.push('9 fields recovered. Biometric verification required for the remaining 9.')
  return lines
}
