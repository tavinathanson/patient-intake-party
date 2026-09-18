// Easter eggs. The five synthetic patients from this repo, keyed by name and
// birthday. Fig and Plum have real intake-form.json files with these exact
// details; Mango, Kiwi and Papaya only had first names and ages on file, so
// their surnames and birthdays are minted here to match.
//
// Typing one of these into the form makes the receipt screen show what the
// patient would actually have told you, next to what we invented.

export interface KnownPatient {
  name: string
  dob: string
  folder: string
  filledOutBy: string
  truths: readonly string[]
}

export const KNOWN_PATIENTS: readonly KnownPatient[] = [
  {
    name: 'Plum Kohlrabi',
    dob: '1943-06-02',
    folder: 'patients/glaucoma',
    filledOutBy: 'His daughter Cherry, at the front desk. He cannot read the form.',
    truths: [
      'Stopped his timolol drops a year ago on his own. It made him wheeze. He never told the eye clinic.',
      'Has COPD and uses an inhaler. His daughter left every past-conditions box blank.',
      'The third bottle on the sink is a brimonidine from 2021.',
      'Bumped into doorframes twice last month. Fell once in 2025.',
      'Says his eyes are fine.',
    ],
  },
  {
    name: 'Fig Turnip',
    dob: '1965-03-14',
    folder: 'patients/persistent-pain',
    filledOutBy: 'His wife Olive. He has stopped answering questions himself.',
    truths: [
      'Stopped sertraline months ago. Nobody at the clinic knows.',
      'Keeps every pill in one bottle and cannot tell them apart.',
      'Skips gabapentin on the days it makes him foggy.',
      'Not sleeping.',
      '9 visits, 5 doctors, 18 months.',
    ],
  },
  {
    name: 'Papaya Endive',
    dob: '1988-02-19',
    folder: 'patients/glp1',
    filledOutBy: 'Nobody. A portal message she sent in June was forwarded and never answered.',
    truths: [
      'Dropped herself back to 0.5 mg semaglutide in June after vomiting on 1 mg.',
      'Is injecting a pen her cousin mailed from overseas. Not sure it is the same dose.',
      'Missed two weeks in August to a pharmacy backorder.',
      'Planning to try for a baby in the spring and does not know if she should stop.',
    ],
  },
  {
    name: 'Kiwi Parsnip',
    dob: '1982-05-30',
    folder: 'patients/strained-back',
    filledOutBy: 'Nobody. Walk-in, blank chart, booked online last night.',
    truths: [
      'Hurt his back moving a couch on Saturday. Lower right side.',
      'Right foot has felt tingly since Tuesday. Has not thought it worth mentioning.',
      'Takes lisinopril from a different doctor entirely.',
      'Wears a watch and would hand over the data if anyone asked.',
    ],
  },
  {
    name: 'Mango Radicchio',
    dob: '2000-04-11',
    folder: 'patients/eczema',
    filledOutBy: 'Nobody. He texted a photo on the 18th. No one has replied.',
    truths: [
      'Rash is back inside both elbows, worse than last time.',
      'Was prescribed triamcinolone in March 2025 and never refilled it.',
      'Allergic to penicillin.',
      'Is using an old tube of hydrocortisone from the back of a drawer.',
    ],
  },
]

export function findKnownPatient(name: string, dob: string): KnownPatient | null {
  const needle = name.trim().toLowerCase()
  return KNOWN_PATIENTS.find((patient) => patient.name.toLowerCase() === needle && patient.dob === dob) ?? null
}
