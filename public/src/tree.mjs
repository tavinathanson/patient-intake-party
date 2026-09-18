// Each answer chooses a branch of the local clue tree. Unknown answers preserve
// both branches. Replaying the transcript makes retries deterministic.
export function getEvidence(deck, history) {
  let remaining = [...deck.candidates];
  const askedClues = new Set();
  const triedGuesses = new Set();
  const byId = new Map(deck.questions.map(question => [question.id, question]));
  for (const entry of history) {
    if (entry.clueId) {
      askedClues.add(entry.clueId);
      const clue = byId.get(entry.clueId);
      if (clue && ['yes', 'no'].includes(entry.answer)) {
        const yes = new Set(clue.yesIds);
        remaining = remaining.filter(candidate => yes.has(candidate.id) === (entry.answer === 'yes'));
      }
    }
    if (entry.candidateId) {
      triedGuesses.add(entry.candidateId);
      if (entry.answer === 'no') remaining = remaining.filter(candidate => candidate.id !== entry.candidateId);
    }
  }
  return { remaining, askedClues, triedGuesses };
}

const composed = [
  'One hundred suspects. One magnificent hat. Let us begin.',
  'I have connected two dots. Neither has requested legal counsel.',
  'A clue with an alibi. My favorite kind.',
  'The plot thickens. The paperwork was already quite thick.',
  'I am writing this down in my extremely official little notebook.',
];
const fraying = [
  'The red string has formed a knot. I am calling it a breakthrough.',
  'I have narrowed it down to a situation.',
  'My notebook now contains three theories and a drawing of a sandwich.',
  'Every clue is useful. Some are simply being difficult about it.',
  'The evidence board is full. The confidence remains entirely unearned.',
];
const desperate = [
  'I have removed my hat. This is now a very serious hatless investigation.',
  'The typewriter is judging me. I can hear it not typing.',
  'I am one clue away from calling this an administrative misunderstanding.',
  'The paperwork has started filling itself out in protest.',
  'Last question. My pension is mostly theoretical at this point.',
];
const shrugs = [
  'A maybe. The witness has entered the fog. I shall try another street.',
  'I will file that under “magnificently inconclusive.” Nobody leaves the suspect board.',
  'No certainty? No problem. I have brought an unreasonable number of questions.',
  'The clue declined to comment. I respect its commitment to the bit.',
];
const holdingQuestions = [
  'Would you say this case has more loose ends than my trench coat?',
  'Should I suspect that the answer slipped out the back of my little suspect list?',
  'Would a less dramatic receptionist have finished by now?',
  'Do you suspect my magnifying glass is mostly decorative?',
  'Is the evidence board starting to look like a very anxious spider made it?',
  'Would you describe your patience as an unusually valuable piece of evidence?',
  'Should I stop interrogating the stationery?',
  'Do you think the answer is enjoying watching me work?',
  'Would you believe this is still going precisely according to my plan?',
  'Is “the detective tried his best” a statement you could sign?',
  'Would you consider this a good time for a dramatically unnecessary coffee?',
  'Has this case earned the right to its own filing cabinet?',
  'Should the next detective bring fewer theories and a normal form?',
  'Would it help morale if I said “elementary” with more conviction?',
  'Is my confidence currently the least reliable witness in the room?',
  'Would you agree that this investigation has been impressively thorough?',
  'Do you think the red string is getting paid more than I am?',
  'Should I list my hat as a co-investigator?',
  'Would you like the record to reflect that I looked very busy?',
  'Can we agree that revealing the ordinary form is a daring investigative technique?',
];

function asideFor(asked, history) {
  const last = history.at(-1);
  if (last?.candidateId && last.answer === 'no') return 'A devastating blow to a theory I had held for several whole seconds. Moving on.';
  if (last?.answer === 'maybe') return shrugs[(asked - 1) % shrugs.length];
  const lines = asked > 15 ? desperate : asked > 7 ? fraying : composed;
  return lines[(asked - 1) % lines.length];
}

function guessQuestion(value) {
  if (value.firstName) return `The aliases, the clues, the impeccable hunch. Is your first name ${value.firstName}?`;
  if (value.reason) return `I believe I have the case title: “${value.reason}.” Is that your primary reason for visiting?`;
  if (value.dob) {
    const date = new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value.dob}T00:00:00Z`));
    return `I have dusted the calendar for fingerprints. Were you born on ${date}?`;
  }
  return `The stakeout ends here: ${value.pharmacyName}, ${value.pharmacyAddress}. Is that your pharmacy?`;
}

export function generateFromDeck(deck, { asked, history }) {
  const { remaining, askedClues, triedGuesses } = getEvidence(deck, history);
  let best = null;
  let bestSplit = 0;
  for (const clue of deck.questions) {
    if (askedClues.has(clue.id)) continue;
    const yes = new Set(clue.yesIds);
    const matching = remaining.filter(candidate => yes.has(candidate.id)).length;
    const split = Math.min(matching, remaining.length - matching);
    if (split > bestSplit) { best = clue; bestSplit = split; }
  }
  if (best && remaining.length > 1) {
    return {kind:'question',question:best.text,aside:asideFor(asked,history),guess:null,clueId:best.id,candidateId:null};
  }
  const candidate = remaining.find(item => !triedGuesses.has(item.id));
  if (candidate) {
    return {kind:'guess',question:guessQuestion(candidate.value),aside:candidate.reveal || asideFor(asked,history),guess:{...candidate.value},clueId:null,candidateId:candidate.id};
  }
  // No confirmed candidate is available. Keep the original twenty-question
  // bargain, but never resurrect excluded suspects or invent a value.
  return {
    kind:'question',question:holdingQuestions[(asked - 1) % holdingQuestions.length],
    aside:remaining.length ? 'The surviving suspects refuse to confess. At question 20, I reluctantly hand you the ordinary form.' : 'Every name on my suspect board has an alibi. At question 20, I will let you write the missing answer.',
    guess:null,clueId:`holding-${asked}`,candidateId:null,
  };
}
