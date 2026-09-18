// Intake form rendered as a JRPG command menu. Answers are display-only: the
// only way letters get in is by moving a chess piece.
import { FIELDS, type FieldId, type IntakePanelProps } from './contracts';
import './IntakePanel.css';

const FIELD_LABELS: Record<FieldId, string> = {
  name: 'NAME',
  reason: 'REASON',
  medications: 'MEDS',
  allergies: 'ALLERGIES',
};

export function IntakePanel(props: IntakePanelProps) {
  const { answers, activeField, onSelectField, onSpace, onBackspace, onSubmit, disabled } = props;

  return (
    <section className={`ip jrpg-window${disabled ? ' ip--disabled' : ''}`} aria-labelledby="ip-title">
      <header className="ip-header">
        <h2 id="ip-title" className="ip-title">
          Intake Form
        </h2>
        <span className="ip-now">
          <span className="ip-now-label">{disabled ? 'STATUS' : 'TYPING INTO'}</span>
          <span className="ip-now-field">{disabled ? 'SUBMITTED' : FIELD_LABELS[activeField]}</span>
        </span>
      </header>

      <div className="ip-menu" role="group" aria-label="Form fields: choose where the next letter goes">
        {FIELDS.map(({ id, question }) => {
          const active = id === activeField;
          const answer = answers[id];
          return (
            <button
              key={id}
              type="button"
              className={`ip-row${active ? ' ip-row--active' : ''}`}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelectField(id)}
            >
              <span className="ip-row-cursor" aria-hidden="true">
                {active ? <span className="jrpg-cursor" /> : null}
              </span>
              <span className="ip-row-body">
                <span className="ip-row-question">{question}</span>
                <span className="ip-row-answer">
                  {answer ? (
                    <span className="ip-row-text">{answer}</span>
                  ) : (
                    <span className="ip-row-empty">
                      {active && !disabled ? 'awaiting a legal move…' : '— nothing yet —'}
                    </span>
                  )}
                  {active && !disabled ? (
                    <>
                      {'⁠'}
                      <span className="ip-caret" aria-hidden="true" />
                    </>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="ip-controls">
        <button type="button" className="jrpg-btn" disabled={disabled} onClick={onSpace}>
          Space
        </button>
        <button
          type="button"
          className="jrpg-btn"
          disabled={disabled}
          onClick={onBackspace}
          aria-label="Backspace"
        >
          <span aria-hidden="true">{'⌫'}</span> Bksp
        </button>
        <button
          type="button"
          className="jrpg-btn jrpg-btn--primary ip-submit"
          disabled={disabled}
          onClick={onSubmit}
        >
          Submit
        </button>
      </div>

      <p className="ip-rules">
        Every legal move types the letter on the square you land on. Black&rsquo;s moves type nothing.
        Pick a field, then move a piece. Partial answers are fine.
      </p>
    </section>
  );
}
