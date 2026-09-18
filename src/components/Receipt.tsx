import type { Dossier } from '../types.ts'
import type { KnownPatient } from '../patients.ts'

// The three fields that are actually true, because the patient typed them.
export const TRUSTED_FIELD_IDS = ['name', 'date_of_birth', 'date'] as const

interface ReceiptProps {
  dossier: Dossier
  corrections: Record<string, string>
  knownPatient: KnownPatient | null
  onRestart: () => void
}

export function Receipt({ dossier, corrections, knownPatient, onRestart }: ReceiptProps) {
  const allFields = dossier.sections.flatMap((section) => section.fields)
  const trusted: readonly string[] = TRUSTED_FIELD_IDS
  const invented = allFields.filter(
    (field) => corrections[field.id] === undefined && !trusted.includes(field.id),
  )
  const confirmedCount = allFields.length - invented.length

  return (
    <section className="receipt">
      <h2>Sent to your care team</h2>
      <p className="receipt-lede">
        {allFields.length} fields. You confirmed {confirmedCount}. We invented {invented.length}.
        All three biometric checks passed.
      </p>

      <h3>What we made up</h3>
      <ul className="receipt-list">
        {invented.map((field) => (
          <li key={field.id}>
            <b>{field.label}</b>
            <span>{field.value}</span>
            <i>{field.reasoning}</i>
          </li>
        ))}
      </ul>

      {knownPatient ? (
        <div className="truth">
          <h3>What {knownPatient.name.split(' ')[0]} would have told you</h3>
          <p className="truth-source">
            Real form filled out by: {knownPatient.filledOutBy} · <code>{knownPatient.folder}</code>
          </p>
          <ul>
            {knownPatient.truths.map((truth) => (
              <li key={truth}>{truth}</li>
            ))}
          </ul>
          <p className="truth-kicker">None of that is on the form. A human filled that one out.</p>
        </div>
      ) : (
        <div className="truth">
          <h3>For comparison</h3>
          <p>
            Plum Kohlrabi is 83 and has glaucoma. His daughter filled out his paper intake form at
            the front desk and left every past-conditions box blank. He has COPD, and a year ago he
            quietly stopped one of his two eye drops because it made him wheeze.
          </p>
          <p className="truth-kicker">A human filled that one out.</p>
        </div>
      )}

      <button type="button" className="primary" onClick={onRestart}>
        Do someone else
      </button>
    </section>
  )
}
