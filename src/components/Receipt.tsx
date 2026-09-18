import type { Dossier } from '../types.ts'
import type { KnownPatient } from '../patients.ts'

// The fields that are actually true, because the patient typed them or a clock did.
export const TRUSTED_FIELD_IDS = ['name', 'date_of_birth', 'day_of_life'] as const

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
    <div className="record-page">
      <article className="record receipt">
        <header className="record-head">
          <div>
            <span className="verified addendum">⬡ ADDENDUM A — DISCLOSURE OF METHOD</span>
            <h1>Filed with your care team</h1>
            <p className="record-meta">{dossier.recordId} · {dossier.mrn} · all three biometric checks passed</p>
          </div>
        </header>

        <p className="receipt-lede">
          <b>{allFields.length}</b> fields transmitted. You confirmed <b>{confirmedCount}</b>.
          We invented <b>{invented.length}</b>.
        </p>

        <section className="record-section">
          <h2><span className="sec-num">§A</span> Fields we made up</h2>
          <ul className="receipt-list">
            {invented.map((field) => (
              <li key={field.id}>
                <b>{field.label}</b>
                <span>{field.value}</span>
                <i>{field.reasoning}</i>
              </li>
            ))}
          </ul>
        </section>

        <section className="record-section">
          {knownPatient ? (
            <>
              <h2><span className="sec-num">§B</span> What {knownPatient.name.split(' ')[0]} would have told you</h2>
              <p className="truth-source">
                The real form was filled out by: {knownPatient.filledOutBy} · <code>{knownPatient.folder}</code>
              </p>
              <ul className="truth-list">
                {knownPatient.truths.map((truth) => (
                  <li key={truth}>{truth}</li>
                ))}
              </ul>
              <p className="truth-kicker">None of that is on the record. A human filled that one out.</p>
            </>
          ) : (
            <>
              <h2><span className="sec-num">§B</span> For comparison</h2>
              <p className="truth-body">
                Plum Kohlrabi is 83 and has glaucoma. His daughter filled out his paper intake form at
                the front desk and left every past-conditions box blank. He has COPD, and a year ago he
                quietly stopped one of his two eye drops because it made him wheeze.
              </p>
              <p className="truth-kicker">A human filled that one out.</p>
            </>
          )}
        </section>

        <footer className="record-foot">
          <span>⎘ Retention: indefinite</span>
          <span>This addendum is not normally shown to the patient.</span>
        </footer>
      </article>

      <button type="button" className="primary wide" onClick={onRestart}>Locate someone else</button>
    </div>
  )
}
