import type { GateSpec } from './types.ts'

// Each gate costs the patient more dignity and buys the clinic more fiction.
export const GATES: readonly GateSpec[] = [
  {
    id: 'touch',
    title: 'Confirm it is really you',
    blurb: 'Touch the sensor. We use your fingerprint to confirm your identity before releasing your medication history.',
    cta: 'Scan fingerprint',
    unlocksLabel: 'reason for visit, medications, allergies',
  },
  {
    id: 'retina',
    title: 'Ocular verification',
    blurb: 'Look directly into the camera and hold still. Required before we can display your past conditions.',
    cta: 'Begin retinal scan',
    unlocksLabel: 'past conditions and surgeries',
  },
  {
    id: 'pulse',
    title: 'Resting cardiac baseline',
    blurb: 'Find your pulse and tap along with it. Six taps. This calibrates your family history.',
    cta: 'Tap your pulse',
    unlocksLabel: 'family and social history',
  },
]
