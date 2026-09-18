// The pseudoscience tables. Every entry here is real folk belief (medieval
// melothesia, Pythagorean numerology, biorhythm theory) applied to a medical
// form, which is exactly the kind of thing nobody should ever do.

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]

interface SignLore {
  rules: string // the body part, per medieval melothesia
  condition: string // which checkbox on the intake form that implies
  medication: string
  tell: string
}

export const SIGN_LORE = {
  Aries: { rules: 'the head and the brain', condition: 'Seizures', medication: 'Sumatriptan 50 mg as needed', tell: 'will describe the pain as a colour' },
  Taurus: { rules: 'the throat and the thyroid', condition: 'Thyroid disease', medication: 'Levothyroxine 75 mcg daily', tell: 'will not stop talking about their neck' },
  Gemini: { rules: 'the lungs and the airways', condition: 'COPD / emphysema', medication: 'Albuterol inhaler, as needed', tell: 'gives two different answers to the same question' },
  Cancer: { rules: 'the chest and the stomach', condition: 'Asthma', medication: 'Omeprazole 20 mg daily', tell: 'brings their mother' },
  Leo: { rules: 'the heart and the spine', condition: 'Heart disease', medication: 'Atorvastatin 20 mg nightly', tell: 'insists they feel fine' },
  Virgo: { rules: 'the pancreas and the gut', condition: 'Diabetes', medication: 'Metformin 500 mg twice daily', tell: 'has already made a spreadsheet' },
  Libra: { rules: 'the kidneys and the lower back', condition: 'Kidney disease', medication: 'Lisinopril 10 mg daily', tell: 'agrees with the last thing you said' },
  Scorpio: { rules: 'the reproductive and excretory systems', condition: 'Cancer', medication: 'Tamsulosin 0.4 mg nightly', tell: 'withholds one important fact until the door' },
  Sagittarius: { rules: 'the liver, hips and thighs', condition: 'High cholesterol', medication: 'Meloxicam 15 mg daily', tell: 'underreports alcohol by a factor of three' },
  Capricorn: { rules: 'the bones, joints and skin', condition: 'Arthritis', medication: 'Vitamin D 2000 IU daily', tell: 'waited eight months before booking' },
  Aquarius: { rules: 'the ankles and the circulation', condition: 'High blood pressure', medication: 'Amlodipine 5 mg daily', tell: 'read something online and it was wrong' },
  Pisces: { rules: 'the feet and the immune system', condition: 'Depression / anxiety', medication: 'Sertraline 50 mg daily', tell: 'stopped the last prescription without telling anyone' },
} as const satisfies Record<ZodiacSign, SignLore>

// month * 100 + day, so 321 is March 21st. Last entry at or below the key wins.
const SIGN_CUTOFFS = [
  { from: 101, sign: 'Capricorn' },
  { from: 120, sign: 'Aquarius' },
  { from: 219, sign: 'Pisces' },
  { from: 321, sign: 'Aries' },
  { from: 420, sign: 'Taurus' },
  { from: 521, sign: 'Gemini' },
  { from: 621, sign: 'Cancer' },
  { from: 723, sign: 'Leo' },
  { from: 823, sign: 'Virgo' },
  { from: 923, sign: 'Libra' },
  { from: 1023, sign: 'Scorpio' },
  { from: 1122, sign: 'Sagittarius' },
  { from: 1222, sign: 'Capricorn' },
] as const satisfies readonly { from: number; sign: ZodiacSign }[]

export function zodiacFor(month: number, day: number): ZodiacSign {
  const key = month * 100 + day
  let match: ZodiacSign = 'Capricorn'
  for (const cutoff of SIGN_CUTOFFS) {
    if (key >= cutoff.from) match = cutoff.sign
  }
  return match
}

export const LIFE_PATHS: Record<number, { name: string; inference: string }> = {
  1: { name: 'the Leader', inference: 'underreports pain by roughly two points' },
  2: { name: 'the Mediator', inference: 'defers to whoever drove them here' },
  3: { name: 'the Performer', inference: 'will tell a long story about a different symptom' },
  4: { name: 'the Builder', inference: 'takes medication exactly as prescribed, which is suspicious' },
  5: { name: 'the Restless', inference: 'poor medication adherence' },
  6: { name: 'the Caretaker', inference: 'mentions everyone else in the household first' },
  7: { name: 'the Seeker', inference: 'has already diagnosed themselves and is testing you' },
  8: { name: 'the Executive', inference: 'will not be mentioning the alcohol' },
  9: { name: 'the Humanitarian', inference: 'describes a relative’s condition instead of their own' },
  11: { name: 'the Channel', inference: 'symptoms will be described metaphorically' },
  22: { name: 'the Architect', inference: 'brings printouts' },
  33: { name: 'the Teacher', inference: 'will explain your own job to you' },
}

export const CHINESE_ANIMALS = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
] as const

// Insurers, invented. The animal picks the plan, obviously.
export const ANIMAL_INSURERS: Record<string, string> = {
  Rat: 'Thrifty Mutual, Bronze',
  Ox: 'Meridian Health, Gold',
  Tiger: 'Apex PPO, Platinum',
  Rabbit: 'Quietfield HMO',
  Dragon: 'Imperial Select, Platinum',
  Snake: 'Coilworth Basic',
  Horse: 'Longrun Health, Silver',
  Goat: 'Pastoral Care Collective',
  Monkey: 'Brightline Flex, Silver',
  Rooster: 'First Light HMO',
  Dog: 'Loyal Family Plan, Gold',
  Pig: 'Harvest Benefit, Bronze',
}

// Pythagorean letter values, the basis of "destiny number" numerology.
export function destinyNumber(name: string): number {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '')
  let total = 0
  for (const letter of letters) {
    total += ((letter.charCodeAt(0) - 65) % 9) + 1
  }
  return reduceToRoot(total)
}

export function reduceToRoot(value: number): number {
  let current = value
  while (current > 9 && current !== 11 && current !== 22 && current !== 33) {
    current = String(current).split('').reduce((sum, digit) => sum + Number(digit), 0)
  }
  return current
}

export const DESTINY_ALLERGENS: Record<number, string> = {
  1: 'Penicillin',
  2: 'Latex',
  3: 'Shellfish',
  4: 'Sulfa',
  5: 'Contrast dye',
  6: 'Adhesive tape',
  7: 'Codeine',
  8: 'Iodine',
  9: 'None reported',
  11: 'Bee stings',
  22: 'Nickel',
  33: 'Unspecified, but strongly felt',
}

export const CONDITION_CHECKLIST = [
  'Arthritis', 'Asthma', 'Cancer', 'COPD / emphysema', 'Depression / anxiety',
  'Diabetes', 'Glaucoma', 'Heart disease', 'High blood pressure',
  'High cholesterol', 'Kidney disease', 'Seizures', 'Stroke', 'Thyroid disease',
] as const

export const SURNAME_ORIGINS = [
  'Old Norse, coastal',
  'Bengali, Kayastha lineage',
  'Occitan, vine-growing',
  'Anglo-Saxon, marshland',
  'Gaelic, cattle-keeping',
  'Iberian, seafaring',
  'Levantine, merchant class',
  'Alpine, goat-adjacent',
  'Ashkenazi, Vilna region',
  'Yoruba, royal court',
] as const

export const FAMILY_CONDITIONS = [
  'heart disease (father)',
  'diabetes (mother)',
  'stroke (both grandparents)',
  'glaucoma (maternal line)',
  'cancer (unspecified, an aunt)',
  'high blood pressure (everyone)',
] as const

export const SURGERY_POOL = [
  'appendectomy',
  'wisdom teeth',
  'knee arthroscopy',
  'tonsillectomy',
  'gallbladder',
  'rotator cuff repair',
  'cataract, one eye',
] as const

export const STREETS = [
  'Orchard Lane', 'Garden Row', 'Bellwether Street', 'Kestrel Way',
  'Old Mill Road', 'Pennyroyal Court', 'Thistledown Avenue', 'Harrow Close',
] as const

export const RELATIONSHIPS = ['sister', 'son', 'neighbour', 'wife', 'husband', 'daughter', 'former roommate'] as const

export const FIRST_NAMES = ['Cherry', 'Olive', 'Bramble', 'Juniper', 'Rowan', 'Clementine', 'Hazel', 'Sorrel'] as const
