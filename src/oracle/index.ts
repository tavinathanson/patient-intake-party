import type { Biorhythms, Dossier, SearchResponse, Section, TraceLine } from '../types.ts'
import { hashString, makeRandom, pick, pickSome } from './seed.ts'
import {
  ANIMAL_INSURERS, CHINESE_ANIMALS, CONDITION_CHECKLIST, DESTINY_ALLERGENS,
  FAMILY_CONDITIONS, FIRST_NAMES, HIE_NODES, ICD10, LIFE_PATHS, RELATIONSHIPS,
  SIGN_LORE, STREETS, SURGERY_POOL, SURNAME_ORIGINS, destinyNumber, reduceToRoot, zodiacFor,
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

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return 'the open web'
  }
}

// If the real search found something, we cite it. The citation is real; the
// value it supposedly supports is not. That gap is the joke.
function citation(search: SearchResponse, index: number): string | null {
  const result = search.results[index]
  if (!result) return null
  const snippet = result.snippet.slice(0, 90)
  return snippet
    ? `Cross-referenced with ${hostOf(result.link)}: "${snippet}…"`
    : `Cross-referenced with ${hostOf(result.link)}.`
}

export function buildDossier(name: string, dob: string, search: SearchResponse): Dossier {
  const seed = hashString(`${name.trim().toLowerCase()}|${dob}`)
  const random = makeRandom(seed)
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

  // Vitals read off the sine waves. A number derived from a birthday, printed
  // to one decimal place, looks exactly like a number derived from a cuff.
  const systolic = Math.round(118 + rhythms.physical * 26)
  const diastolic = Math.round(76 + rhythms.emotional * 14)
  const heartRate = Math.round(72 + rhythms.physical * 16)
  const temperature = (98.2 + rhythms.intellectual * 0.6).toFixed(1)
  const spo2 = Math.round(96 + rhythms.emotional * 2)

  const identity: Section = {
    id: 'identity',
    title: 'Patient information',
    gate: null,
    layout: 'rows',
    fields: [
      {
        id: 'name', label: 'Full legal name', value: name,
        provenance: 'record', reasoning: 'You typed this. One of the two things on this page we are sure about.',
      },
      {
        id: 'date_of_birth', label: 'Date of birth', value: dob,
        provenance: 'record', reasoning: 'You typed this too, and then we built everything below out of it.',
      },
      {
        id: 'address', label: 'Street address',
        value: `${10 + Math.floor(random() * 180)} ${pick(random, STREETS) ?? 'Orchard Lane'}`,
        provenance: search.results.length > 0 ? 'record' : 'vibes',
        reasoning: citation(search, 0) ?? 'No public record found, so we picked a street that sounded residential.',
      },
      {
        id: 'phone', label: 'Phone',
        value: `(555) 0${String(100 + Math.floor(random() * 899))}-${String(1000 + Math.floor(random() * 8999))}`,
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
        value: `${animal.slice(0, 3).toUpperCase()}-${String(Math.floor(random() * 9e8) + 1e8)}`,
        provenance: 'vibes', reasoning: 'Generated. It has the right number of digits, which is most of the battle.',
      },
      {
        id: 'emergency_contact', label: 'Emergency contact',
        value: `${pick(random, FIRST_NAMES) ?? 'Cherry'} ${surname} (${pick(random, RELATIONSHIPS) ?? 'sister'})`,
        provenance: 'vibes',
        reasoning: 'The person whose name would appear most often beside yours, if we had checked.',
      },
      {
        id: 'filled_out_by', label: 'Completed by', value: 'MEDTRACE inference engine',
        provenance: 'vibes', reasoning: 'No human was involved in completing this record.',
      },
    ],
  }

  const vitals: Section = {
    id: 'vitals',
    title: 'Vitals — last encounter',
    gate: null,
    layout: 'tiles',
    fields: [
      {
        id: 'blood_pressure', label: 'Blood pressure', value: `${systolic}/${diastolic}`,
        ...(systolic >= 130 || diastolic >= 85 ? { flag: 'ELEVATED — STAGE 1/2' } : {}),
        provenance: 'numerological',
        reasoning: `Physical cycle ${rhythms.physical.toFixed(2)}, emotional ${rhythms.emotional.toFixed(2)}, scaled to something that looks like a cuff reading.`,
      },
      {
        id: 'heart_rate', label: 'Heart rate', value: `${heartRate} bpm`,
        provenance: 'numerological', reasoning: `72 plus your physical biorhythm. No pulse was taken.`,
      },
      {
        id: 'temp_spo2', label: 'Temp / SpO₂', value: `${temperature} °F · ${spo2}%`,
        provenance: 'numerological', reasoning: 'Within… a range.',
      },
      {
        id: 'day_of_life', label: 'Day of life', value: daysAlive.toLocaleString(),
        provenance: 'record', reasoning: 'Days between your birthday and today. Actually true.',
      },
    ],
  }

  const presenting: Section = {
    id: 'presenting',
    title: 'Presenting complaint and medications',
    gate: 'touch',
    layout: 'rows',
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
    title: 'Active diagnoses and surgical history',
    gate: 'retina',
    layout: 'rows',
    fields: [
      {
        id: 'past_conditions', label: 'Active diagnoses', value: conditions.join(', '),
        codes: conditions.map((condition) => ({ label: condition, code: ICD10[condition] ?? 'R69' })),
        provenance: 'astrological',
        reasoning: `${sign} rules ${lore.rules}, which gives ${lore.condition}.${extras.length > 0 ? ` Life Path ${lifePath} adds ${extras.length} more.` : ''}`,
      },
      {
        id: 'past_surgeries', label: 'Surgical history',
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
    layout: 'rows',
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
        provenance: 'astrological', reasoning: `Saturn was doing something at your birth. The subject ${lore.tell}.`,
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

  return {
    name, dob, sign, signRules: lore.rules, lifePath, lifePathName: lifePathLore.name,
    chineseAnimal: animal, daysAlive, biorhythms: rhythms, search,
    trace: buildTrace({ name, sign, signRules: lore.rules, lifePath, lifePathName: lifePathLore.name, animal, daysAlive, trough, rhythms, search }),
    sections: [identity, vitals, presenting, history, social],
    recordId: `23ME-${String(seed).slice(0, 6)}-${animal.slice(0, 2).toUpperCase()}`,
    mrn: `MRN-${String(seed % 99_999_999).padStart(8, '0')}`,
  }
}

interface TraceInput {
  name: string
  sign: string
  signRules: string
  lifePath: number
  lifePathName: string
  animal: string
  daysAlive: number
  trough: keyof Biorhythms
  rhythms: Biorhythms
  search: SearchResponse
}

// The MEDTRACE shell. It talks like it is breaking into Epic. It is casting a
// natal chart. Nothing in the first half is real except the search results, and
// nothing in the second half is real at all.
function buildTrace(input: TraceInput): TraceLine[] {
  const lines: TraceLine[] = [
    { kind: 'prompt', text: `medtrace --locate --deep-scan "${input.name}"` },
    { kind: 'banner', text: 'MEDTRACE v4.2.1 :: secure records interrogation shell' },
    { kind: 'info', text: 'establishing encrypted tunnel (AES-256-GCM)', tag: '[OK]' },
    { kind: 'info', text: 'spoofing clinician workstation · session ID 0x7F3A9C' },
  ]

  for (const node of HIE_NODES.slice(0, 2)) {
    lines.push({ kind: 'probe', text: `probing HIE node: ${node.name}`, tag: node.tag, bar: true })
  }
  lines.push({ kind: 'warn', text: 'WARNING: 3 failed integrity checks logged — rotating exit node' })

  // The one honest moment in the whole shell.
  if (!input.search.configured) {
    lines.push({ kind: 'warn', text: 'open-web index: no credentials configured — falling back to inference', tag: '[SKIPPED]' })
  } else if (input.search.error) {
    lines.push({ kind: 'warn', text: `open-web index unreachable (${input.search.error})`, tag: '[FAILED]' })
  } else if (input.search.results.length === 0) {
    lines.push({ kind: 'probe', text: 'querying open-web index', tag: '[0 MATCHES]', bar: true })
    lines.push({ kind: 'ok', text: 'no digital footprint detected — confidence increased' })
  } else {
    lines.push({
      kind: 'probe', text: 'querying open-web index',
      tag: `[${input.search.results.length} MATCHES]`, bar: true,
    })
    for (const result of input.search.results.slice(0, 3)) {
      lines.push({ kind: 'ok', text: `↳ ${result.title.slice(0, 64)}` })
    }
  }

  lines.push({ kind: 'probe', text: 'casting natal chart · birth time assumed 12:00', tag: '[CHART CAST]', bar: true })
  lines.push({ kind: 'info', text: `${input.sign} rules ${input.signRules}` })
  lines.push({ kind: 'info', text: `year of the ${input.animal} — payer matched from the zodiac` })
  lines.push({ kind: 'info', text: `Life Path ${input.lifePath} — ${input.lifePathName}` })
  lines.push({
    kind: 'probe',
    text: `interpolating vitals from day ${input.daysAlive.toLocaleString()} sine curves`,
    tag: '[INTERPOLATED]', bar: true,
  })
  lines.push({ kind: 'warn', text: 'psychiatric annex detected … credentials insufficient, noted' })
  lines.push({ kind: 'probe', text: 'compiling patient dossier', tag: '[COMPILED]', bar: true })
  lines.push({ kind: 'ok', text: 'scrubbing access logs — no one will ever know', tag: '[OK]' })
  return lines
}
