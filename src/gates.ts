import type { GateSpec } from './types.ts'

// Each gate costs the patient more dignity and buys the clinic more fiction.
// The seal notes borrow the shell's voice: the record is not incomplete, it is
// classified, and only your body can declassify it.
export const GATES: readonly GateSpec[] = [
  {
    id: 'touch',
    title: 'Section sealed — dermal signature required',
    blurb: 'Federal rules oblige us to confirm you are you before releasing your own medication history to you. Touch the sensor.',
    cta: 'Authenticate fingerprint',
    unlocksLabel: '§3 presenting complaint, medications, allergies',
    sealNote: 'CREDENTIALS INSUFFICIENT · 45 CFR §164.508',
  },
  {
    id: 'retina',
    title: 'Section sealed — ocular verification required',
    blurb: 'Diagnoses are protected at a higher tier. Look directly into the camera and hold still while we pretend to read your retina.',
    cta: 'Begin retinal scan',
    unlocksLabel: '§4 active diagnoses and surgical history',
    sealNote: 'TIER 2 PHI · BIOMETRIC BINDING REQUIRED',
  },
  {
    id: 'pulse',
    title: 'Section sealed — cardiac baseline required',
    blurb: 'Family history is inferred from your surname, which we can only justify once we have a pulse on file. Find yours and tap along with it.',
    cta: 'Record cardiac baseline',
    unlocksLabel: '§5 family and social history',
    sealNote: 'AWAITING LIVE SUBJECT CONFIRMATION',
  },
]
