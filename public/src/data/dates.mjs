// A deliberately small prop calendar, not a range of every possible birthday.
const dates = ['1995-05-26'];
for (let i = 0; dates.length < 100; i++) {
  const year = 1935 + (i * 17) % 75;
  const month = 1 + (i * 5) % 12;
  const day = 1 + (i * 11) % 28;
  const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!dates.includes(value)) dates.push(value);
}

const candidates = dates.map(dob => ({ id: `dob-${dob}`, value: { dob } }));
const parts = candidate => candidate.value.dob.split('-').map(Number);
const questions = [];
function clue(id, text, predicate) {
  questions.push({ id: `dob-${id}`, text, yesIds: candidates.filter(c => predicate(...parts(c))).map(c => c.id) });
}

clue('century', 'Does your birth certificate have that vintage “19” at the front of the year?', year => year < 2000);
clue('first-half', 'Did your birthday claim a seat in the first half of the calendar—January through June?', (_, month) => month <= 6);
clue('late-month', 'Does your birthday make the month sweat a little—waiting until after the 15th to show up?', (_, __, day) => day > 15);
clue('spring-summer', 'Did you schedule your grand entrance for April through September, the calendar’s sunnier half?', (_, month) => month >= 4 && month <= 9);
clue('even-year', 'Does your birth year end in an even digit? Even numbers have been suspiciously cooperative.', year => year % 2 === 0);
clue('long-month', 'Did you choose one of the roomy, 31-day months for your debut?', (_, month) => [1, 3, 5, 7, 8, 10, 12].includes(month));
clue('weekend', 'Were you born on a Saturday or Sunday? A weekend entrance. Very theatrical.', (year, month, day) => [0, 6].includes(new Date(Date.UTC(year, month - 1, day)).getUTCDay()));
clue('early-month', 'Were you already blowing out candles before the month reached day 8?', (_, __, day) => day <= 7);
clue('last-week', 'Does your birthday lurk near the exit of the month—on the 23rd or later?', (_, __, day) => day >= 23);
clue('leap-year', 'Was your birth year a leap year? The calendar apparently needed an extra day to prepare.', year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));

const eras = [
  [1930, 'the thirties'], [1940, 'the forties'], [1950, 'the fifties'],
  [1960, 'the sixties'], [1970, 'the seventies'], [1980, 'the eighties'],
  [1990, 'the nineties'], [2000, 'the two-thousands'],
];
for (const [start, title] of eras) {
  clue(`era-${start}`, `Was your origin story a ${title} production (${start}–${start + 9})?`, year => year >= start && year < start + 10);
}

const monthClues = [
  'Does your birthday crash the New Year’s cleanup crew—in January?',
  'Did you pick February, the suspiciously short month, for your entrance?',
  'Does your birthday march in during March? I have investigated this pun thoroughly.',
  'Did your birthday sign the April guestbook? I promise this is not an April Fools’ sting.',
  'May I ask whether your birthday is in May? Legally, that was only one question.',
  'Is June the month that has been harboring your birthday?',
  'Does your birthday have a July reservation? The calendar refuses to name its accomplices.',
  'Is your birthday an August arrival? Very distinguished. Very difficult to spell in a hurry.',
  'Does your birthday show up in September, carrying a suspiciously new notebook?',
  'Is your birthday hiding in October, among all those perfectly legal disguises?',
  'Is November your birthday’s safe house?',
  'Does your birthday squeeze into December before the calendar closes the books?',
];
monthClues.forEach((text, index) => clue(`month-${index + 1}`, text, (_, month) => month === index + 1));

// Date-of-month clues are used only if the broader calendar leads leave a tie.
for (const [limit, text] of [
  [10, 'Does your birthday get a single-digit date or a 10? The calendar’s opening act.'],
  [20, 'Does your birthday show up by the 20th? I am checking its alibi.'],
  [25, 'Does your birthday arrive by the 25th, before the month starts packing its bags?'],
]) clue(`day-by-${limit}`, text, (_, __, day) => day <= limit);

export const dobDeck = { candidates, questions };
