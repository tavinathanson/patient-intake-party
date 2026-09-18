// Where a value on the form came from. This is the whole point of the app:
// the form is always 100% full, and the only interesting question is who or
// what filled each box.
export type Provenance =
  | 'record' // came out of the one real web search
  | 'astrological' // came out of the natal chart
  | 'numerological' // came out of the numbers in your name or birthday
  | 'vibes' // came out of nowhere
  | 'confirmed' // a human actually looked at it and said yes

// The biometric checkpoints. Passing one unlocks more invented content,
// which is the joke: ceremony goes up, accuracy goes down.
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

export interface Field {
  id: string
  label: string
  value: string
  provenance: Provenance
  reasoning: string
}

export interface Section {
  id: string
  title: string
  gate: GateId | null // null means it is visible from the start
  fields: Field[]
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
  trace: string[]
  sections: Section[]
}

export interface GateSpec {
  id: GateId
  title: string
  blurb: string
  cta: string
  unlocksLabel: string
}
