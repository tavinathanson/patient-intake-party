// Transcribed from example-intake-form.md. Field keys and their order match the
// filled-out copies in patients/*/intake-form.json, so "Copy as JSON" produces
// something you can diff straight against Fig's and Plum's forms.

export type FieldKey =
  | 'filled_out_by'
  | 'date'
  | 'name'
  | 'date_of_birth'
  | 'address'
  | 'phone'
  | 'insurance'
  | 'member_id'
  | 'emergency_contact'
  | 'reason_for_visit'
  | 'current_medications'
  | 'allergies'
  | 'past_conditions'
  | 'past_surgeries'
  | 'family_history'
  | 'tobacco'
  | 'alcohol'
  | 'drugs'
  | 'signature';

export interface FieldDef {
  key: FieldKey;
  label: string;
  hint?: string;
  /** line = one-line input, block = textarea, conditions = the checkbox grid */
  kind: 'line' | 'block' | 'conditions';
}

/** The 15 boxes on the paper form, in the order they're printed. */
export const PAST_CONDITIONS = [
  'Arthritis',
  'Asthma',
  'Cancer',
  'COPD / emphysema',
  'Depression / anxiety',
  'Diabetes',
  'Glaucoma',
  'Heart disease',
  'High blood pressure',
  'High cholesterol',
  'Kidney disease',
  'Seizures',
  'Stroke',
  'Thyroid disease',
] as const;

export const FIELDS: readonly FieldDef[] = [
  { key: 'filled_out_by', label: 'Filled out by', hint: 'if not the patient', kind: 'line' },
  { key: 'date', label: 'Date', kind: 'line' },
  { key: 'name', label: 'Name', kind: 'line' },
  { key: 'date_of_birth', label: 'Date of birth', kind: 'line' },
  { key: 'address', label: 'Address', kind: 'line' },
  { key: 'phone', label: 'Phone', kind: 'line' },
  { key: 'insurance', label: 'Insurance', kind: 'line' },
  { key: 'member_id', label: 'Member ID', kind: 'line' },
  {
    key: 'emergency_contact',
    label: 'Emergency contact',
    hint: 'name, relationship, phone',
    kind: 'line',
  },
  { key: 'reason_for_visit', label: 'Reason for visit', kind: 'block' },
  {
    key: 'current_medications',
    label: 'Current medications',
    hint: 'include over-the-counter, vitamins, eye drops, inhalers',
    kind: 'block',
  },
  { key: 'allergies', label: 'Allergies', kind: 'line' },
  { key: 'past_conditions', label: 'Past conditions', hint: 'check all that apply', kind: 'conditions' },
  { key: 'past_surgeries', label: 'Past surgeries', hint: 'procedure and year', kind: 'line' },
  {
    key: 'family_history',
    label: 'Family history',
    hint: 'parents, siblings, children: cancer, diabetes, heart disease, stroke, glaucoma',
    kind: 'block',
  },
  { key: 'tobacco', label: 'Tobacco', hint: 'Never / Former / Current', kind: 'line' },
  { key: 'alcohol', label: 'Alcohol', hint: 'None / Occasional / Daily', kind: 'line' },
  { key: 'drugs', label: 'Recreational drugs', hint: 'No / Yes', kind: 'line' },
  {
    key: 'signature',
    label: 'Signature',
    hint: 'if not the patient, relationship',
    kind: 'line',
  },
];
