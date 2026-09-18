// Where a value on the record came from. This is still the whole point of the
// app: the record is always 100% full, and the only interesting question is who
// or what filled each box. The difference now is that we hide the answer until
// somebody asks for it.
export type Provenance =
  | 'record' // came out of the one real web search
  | 'astrological' // came out of the natal chart
  | 'numerological' // came out of the numbers in your name or birthday
  | 'vibes' // came out of nowhere
  | 'confirmed' // a human actually looked at it and said yes

// The biometric checkpoints. Passing one unseals more invented content, which
// is the joke: ceremony goes up, accuracy goes down.
export type GateId = 'touch' | 'retina' | 'pulse'

export interface SearchResult {
  title: string
  link: string
  snippet: string
}

export interface SearchResponse {
  configured: boolean
  results: SearchResult[]
  error?: string
}

export interface CodedItem {
  label: string
  code: string
}

export interface Field {
  id: string
  label: string
  value: string
  provenance: Provenance
  reasoning: string
  /** Red annotation under a vitals tile, e.g. "ELEVATED — STAGE 1/2". */
  flag?: string
  /** Renders as ICD-10 chips instead of a plain value. */
  codes?: readonly CodedItem[]
}

export interface Section {
  id: string
  title: string
  gate: GateId | null // null means it is unsealed from the start
  layout: 'rows' | 'tiles'
  fields: Field[]
}

// A single line in the MEDTRACE shell. Typed rather than a bare string so the
// terminal can draw progress bars and right-aligned status tags.
export interface TraceLine {
  kind: 'prompt' | 'banner' | 'info' | 'ok' | 'warn' | 'probe'
  text: string
  /** Right-aligned resolution, e.g. "[ACCESS GRANTED]". */
  tag?: string
  /** Draw a progress bar that fills, then resolves to the tag. */
  bar?: boolean
}

export interface Biorhythms {
  physical: number
  emotional: number
  intellectual: number
}

export interface Dossier {
  name: string
  dob: string
  sign: string
  signRules: string
  lifePath: number
  lifePathName: string
  chineseAnimal: string
  daysAlive: number
  biorhythms: Biorhythms
  search: SearchResponse
  trace: TraceLine[]
  sections: Section[]
  /** Cosmetic identifiers for the record header. */
  recordId: string
  mrn: string
}

export interface GateSpec {
  id: GateId
  title: string
  blurb: string
  cta: string
  unlocksLabel: string
  /** The fake reason the section is sealed, in the reference's voice. */
  sealNote: string
}
