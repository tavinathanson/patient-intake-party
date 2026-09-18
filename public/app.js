import { createGame, answerGame, submitFallback, continueGame } from './src/game.mjs';
import { generateTurn } from './src/local-detective.mjs';

(() => {
  const STORAGE_KEY = 'intake-investigations-game-v1';
  const categories = [
    { key: 'name', label: 'First name', heading: 'A person of interest', subject: 'your first name', fields: [['firstName', 'First name']] },
    { key: 'reason', label: 'Reason for visit', heading: 'What brings you in?', subject: 'your reason for visiting', fields: [['reason', 'Reason for visit']] },
    { key: 'dob', label: 'Date of birth', heading: 'A date with destiny', subject: 'your date of birth', fields: [['dob', 'Date of birth']] },
    { key: 'pharmacy', label: 'Pharmacy', heading: 'The final destination', subject: 'your pharmacy', fields: [['pharmacyName', 'Pharmacy name'], ['pharmacyAddress', 'Pharmacy address / location']] }
  ];
  const main = document.querySelector('#main');
  const status = document.querySelector('#status');
  const dialog = document.querySelector('#transcript-dialog');
  const transcriptToggle = document.querySelector('#transcript-toggle');
  let game = null;
  let busy = false;
  let busyMessage = '';
  let notice = '';
  let error = null;
  let retryAction = null;
  let draft = {};
  let copyMessage = '';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const currentCategory = () => categories[Math.min(game?.categoryIndex ?? 0, 3)];
  const disabled = () => busy ? 'disabled' : '';
  const announce = message => { status.textContent = message; };
  const padded = value => String(value).padStart(2, '0');
  const shortId = () => game ? escape(game.id.slice(0, 8).toUpperCase()) : '';

  function savedGame() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const saved = JSON.parse(stored);
      if (!saved || typeof saved.id !== 'string' || !Number.isInteger(saved.categoryIndex) || saved.categoryIndex < 0 || saved.categoryIndex > 3 || !['question', 'fallback', 'between', 'complete'].includes(saved.phase) || !Number.isInteger(saved.asked) || saved.asked < 1 || saved.asked > 20 || !Array.isArray(saved.history) || !saved.results || typeof saved.results !== 'object') throw new Error('Invalid case file.');
      if (saved.phase === 'question' && (!saved.turn || typeof saved.turn.id !== 'string' || !['question', 'guess'].includes(saved.turn.kind) || typeof saved.turn.question !== 'string' || (saved.turn.kind === 'guess' && !saved.turn.guess))) throw new Error('Invalid question.');
      if ((saved.phase === 'between' && saved.categoryIndex === 3) || (saved.phase === 'complete' && saved.categoryIndex !== 3)) throw new Error('Invalid case progress.');
      const completed = saved.categoryIndex + (['between', 'complete'].includes(saved.phase) ? 1 : 0);
      for (const category of categories.slice(0, completed)) {
        if (!category.fields.every(([key]) => typeof saved.results[category.key]?.value?.[key] === 'string')) throw new Error('Incomplete case file.');
      }
      return saved;
    } catch {
      persistGame(null);
      notice = 'The saved case file could not be reopened. Begin a new investigation below.';
      return null;
    }
  }

  function persistGame(value) {
    try {
      if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* The game still works when browser storage is unavailable. */ }
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  function resultText(category, value = {}, html = false) {
    let lines;
    if (category.key === 'name') lines = [value.firstName || ''];
    else if (category.key === 'reason') lines = [value.reason || ''];
    else if (category.key === 'dob') lines = [formatDate(value.dob)];
    else lines = [value.pharmacyName || '', value.pharmacyAddress || ''];
    return html ? lines.map((line, index) => index ? `<small>${escape(line)}</small>` : escape(line)).join('<br>') : lines.filter(Boolean).join(', ');
  }

  function notices() {
    return `${notice ? `<div class="notice" role="status">${escape(notice)}</div>` : ''}${error ? `<div class="notice error-notice" role="alert"><span>${escape(error)}</span>${retryAction ? `<button type="button" class="text-button" data-action="retry" ${disabled()}>Try again ↗</button>` : ''}</div>` : ''}`;
  }

  function loadingStatus() {
    return `<div class="status-bar" ${busy ? 'aria-busy="true"' : ''}>${busy ? `<span class="spinner" aria-hidden="true"></span><span id="busy-message">${escape(busyMessage)}</span>` : ''}</div>`;
  }

  function landing() {
    return `<section class="landing app-enter" aria-labelledby="landing-title">
      <div class="edition-line"><span class="eyebrow"><span class="status-dot"></span>THE DEPARTMENT OF HIGHLY UNNECESSARY QUESTIONS</span><span class="eyebrow edition-right">CASE NO. 001 — YOU</span></div>
      ${notices()}
      <div class="hero-grid">
        <div class="hero-copy">
          <h1 id="landing-title" tabindex="-1">YOUR INTAKE.<br>HIS BIG<br><span>BREAK.</span></h1>
          <p class="hero-description">Meet <strong>Detective Maybe.</strong> He’ll try to deduce your details using nothing but yes, no, and an unreasonable amount of confidence.</p>
          <button class="primary-button" type="button" data-action="start" ${disabled()}>${busy ? '<span class="spinner" aria-hidden="true"></span> Opening your case…' : 'Begin investigation <span class="arrow" aria-hidden="true">↗</span>'}</button>
          <p class="cta-footnote">Four mysteries. Up to 20 questions each.<br>No typing until he admits defeat.</p>
          ${loadingStatus()}
        </div>
        <div class="hero-art">
          <div class="portrait-stage"><img class="hero-portrait" src="/detective.svg" width="520" height="600" alt="Detective Maybe, in a fedora and trench coat, peers through a magnifying glass."><div class="portrait-note"><b>100% HUNCH.</b><br>0% MEDICAL EXPERTISE.</div></div>
          <div class="detective-nameplate"><div><strong>Detective Maybe</strong><br><span>Intake division · Probably qualified</span></div><span class="number" aria-hidden="true">№ 20</span></div>
          <p class="hero-caption">Everybody’s got a name.<br>I intend to get to the bottom of yours.</p>
        </div>
      </div>
      <div class="how-it-works" aria-label="How the investigation works">
        <div class="rule"><span class="rule-number">01 /</span><div><h2>Four loose ends.</h2><p>Your first name, reason for visiting, birth date, and pharmacy. The usual suspects.</p></div></div>
        <div class="rule"><span class="rule-number">02 /</span><div><h2>Three possible answers.</h2><p>Yes. No. Maybe. That last one still counts as a question. Nice try.</p></div></div>
        <div class="rule"><span class="rule-number">03 /</span><div><h2>One way or another.</h2><p>Twenty questions per mystery. If he’s stumped, you get to fill in the blanks.</p></div></div>
      </div>
      <p class="pool-note"><strong>The bureau’s files:</strong> 100 preset suspects per mystery, with instant local deductions. Outside the file? After 20 questions, you can write it in. The pharmacy file has one NYC CVS demo anchor and 99 fictional U.S. examples.</p>
    </section>`;
  }

  function sidebar() {
    return `<aside class="case-sidebar" aria-label="Case progress and collected details"><div class="sidebar-heading"><h2>The case file</h2><span>${Object.keys(game.results).length} / 4</span></div>
      <ol class="case-phases">${categories.map((category, index) => {
        const result = game.results[category.key];
        const active = !result && index === game.categoryIndex;
        return `<li class="case-phase ${result ? 'finished' : active ? 'active' : ''}" ${active ? 'aria-current="step"' : ''}><span class="phase-number">${padded(index + 1)}</span><div><div class="phase-label">${category.label}<span class="phase-mark" aria-hidden="true">${result ? '✓' : active ? '↗' : '—'}</span></div><div class="phase-detail">${result ? result.method === 'deduced' ? 'DEDUCED' : 'WITNESS CONFIRMED' : active ? 'UNDER INVESTIGATION' : 'AWAITING INQUIRY'}</div>${result ? `<div class="phase-evidence">${resultText(category, result.value, true)}</div>` : ''}</div></li>`;
      }).join('')}</ol>
      <div class="sidebar-detective"><img src="/detective.svg" width="520" height="600" alt="Detective Maybe"><div class="sidebar-detective-label"><strong>Detective Maybe</strong><span>ON THE CASE</span></div><p class="sidebar-quote">“The details are out there.<br>Mostly in your head.”</p></div>
    </aside>`;
  }

  function roundHeading() {
    const category = currentCategory();
    return `<div class="round-heading"><div><span class="eyebrow red">ROUND ${padded(game.categoryIndex + 1)} / ${category.label.toUpperCase()}</span><h1>${category.heading}</h1></div><div class="round-counter"><strong>${padded(game.asked)}<span>/ 20</span></strong><span class="eyebrow">QUESTIONS ${game.phase === 'question' ? 'ON THE CLOCK' : 'ASKED'}</span></div></div>`;
  }

  function questionView() {
    const turn = game.turn;
    const category = currentCategory();
    const guessedFields = turn.kind === 'guess' ? `<dl class="question-guesses">${category.fields.map(([key, label]) => `<div><dt>${label}</dt><dd>${escape(key === 'dob' ? formatDate(turn.guess[key]) : turn.guess[key])}</dd></div>`).join('')}</dl>` : '';
    return `${roundHeading()}
      <div class="question-meter" aria-hidden="true">${Array.from({ length: 20 }, (_, index) => `<span class="${index + 1 < game.asked ? 'spent' : index + 1 === game.asked ? 'current' : ''}"></span>`).join('')}</div>
      <section class="question-card" aria-labelledby="question-title"><span class="eyebrow">${turn.kind === 'guess' ? 'THE DETECTIVE HAS A THEORY' : `A QUESTION FROM DETECTIVE MAYBE`}</span><h2 id="question-title" tabindex="-1">${escape(turn.question)}</h2>${guessedFields}${turn.aside ? `<p class="question-aside">“${escape(turn.aside)}”</p>` : ''}</section>
      <div class="answer-prompt"><span class="eyebrow">YOUR TESTIMONY</span><span>THREE CHOICES. NO PRESSURE.</span></div>
      <div class="answer-choices" aria-label="Answer the detective’s question">
        <button type="button" class="answer-button" data-answer="yes" ${disabled()} aria-keyshortcuts="1 Y"><strong>Yes</strong><span class="key-hint" aria-hidden="true">1</span></button>
        <button type="button" class="answer-button" data-answer="no" ${disabled()} aria-keyshortcuts="2 N"><strong>No</strong><span class="key-hint" aria-hidden="true">2</span></button>
        <button type="button" class="answer-button" data-answer="maybe" ${disabled()} aria-keyshortcuts="3 M"><span><strong>Maybe</strong><small>I DON’T KNOW</small></span><span class="key-hint" aria-hidden="true">3</span></button>
      </div>
      <p class="answer-footnote">${turn.kind === 'guess' ? 'A “Yes” confirms all the details above and closes this round.' : game.asked === 20 ? 'The last question. If he’s still stumped, you can enter the details.' : 'Every answer counts. Even a maybe. He has 20 questions to crack this.'}</p>
      ${notices()}${loadingStatus()}`;
  }

  function fallbackView() {
    const category = currentCategory();
    const field = ([key, label]) => {
      const value = escape(draft[key] || '');
      const control = key === 'reason' ? `<textarea id="field-${key}" name="${key}" required maxlength="500" placeholder="What brings you in today?" ${disabled()}>${value}</textarea>` : `<input id="field-${key}" name="${key}" type="${key === 'dob' ? 'date' : 'text'}" ${key === 'dob' ? `min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}"` : 'maxlength="500"'} value="${value}" required autocomplete="${key === 'firstName' ? 'given-name' : key === 'dob' ? 'bday' : 'off'}" ${disabled()}>`;
      return `<label class="form-field" for="field-${key}"><span>${label}</span>${control}</label>`;
    };
    return `${roundHeading()}<section class="phase-card"><span class="eyebrow red">TWENTY QUESTIONS. ZERO BREAKTHROUGHS.</span><h2 id="phase-title" tabindex="-1">The witness may type.</h2><p>“I was just about to get it. But in the interest of everyone’s afternoon…”</p><p>Help the detective out. Enter ${category.subject} to close this part of the case.</p><form class="fallback-form" id="fallback-form"><div class="${category.key === 'name' ? 'field-grid' : ''}">${category.fields.map(field).join('')}</div><button class="primary-button" type="submit" ${disabled()}>Add to the case file <span class="arrow" aria-hidden="true">↗</span></button></form></section>${notices()}${loadingStatus()}`;
  }

  function betweenView() {
    const category = currentCategory();
    const result = game.results[category.key];
    const next = categories[game.categoryIndex + 1];
    return `${roundHeading()}<section class="phase-card"><span class="resolution-stamp ${result.method === 'confessed' ? 'confessed' : ''}">${result.method === 'deduced' ? 'MYSTERY SOLVED' : 'DETAILS ON RECORD'}</span><h2 id="phase-title" tabindex="-1">${result.method === 'deduced' ? 'Just as I suspected.' : 'A breakthrough.<br>Courtesy of you.'}</h2><p>${result.method === 'deduced' ? '“Elementary. Let’s not dwell on how many questions that took.”' : '“Excellent teamwork. I asked the questions. You supplied all the answers.”'}</p><div class="evidence-result">${resultText(category, result.value, true)}</div><p class="eyebrow">NEXT LEAD: ${next.label}</p><button class="primary-button" type="button" data-action="continue" ${disabled()}>Continue investigation <span class="arrow" aria-hidden="true">↗</span></button></section>${notices()}${loadingStatus()}`;
  }

  function completeView() {
    const deduced = Object.values(game.results).filter(result => result.method === 'deduced').length;
    const questions = Object.values(game.results).reduce((total, result) => total + result.questions, 0);
    return `<section class="investigation app-enter"><div class="case-topline"><span class="eyebrow">THE DEPARTMENT OF HIGHLY UNNECESSARY QUESTIONS</span><span class="case-id">CASE #${shortId()}</span></div><div class="complete-heading"><span class="resolution-stamp">CASE CLOSED</span><h1 id="phase-title" tabindex="-1">You’ve been<br>figured out.</h1><p>“Another baffling case brought to a close.<br>I’ll be in my office, taking most of the credit.”</p></div><section class="summary-sheet" aria-labelledby="summary-title"><div class="summary-heading"><h2 id="summary-title">Your intake, on record.</h2><span>4 OF 4 DETAILS FILED</span></div>${categories.map(category => {
      const result = game.results[category.key];
      return `<div class="summary-row"><span class="summary-label">${category.label}</span><span class="summary-value">${resultText(category, result.value, true)}</span><span class="summary-method ${result.method === 'confessed' ? 'confessed' : ''}">${result.method === 'deduced' ? 'DEDUCED' : 'YOU TOLD HIM'}<br>${result.questions} QUESTIONS</span></div>`;
    }).join('')}</section><p class="summary-stats">${questions} QUESTIONS ASKED · ${deduced} ${deduced === 1 ? 'MYSTERY' : 'MYSTERIES'} DEDUCED · CONFIDENCE INTACT</p><div class="summary-actions"><button class="primary-button" type="button" data-action="copy" ${disabled()}>Copy intake <span class="arrow" aria-hidden="true">↗</span></button><button class="text-button" type="button" data-action="new" ${disabled()}>Open a new investigation</button></div><div class="copy-message" role="status">${escape(copyMessage)}</div>${notices()}${loadingStatus()}</section>`;
  }

  function investigationView() {
    if (game.phase === 'complete') return completeView();
    const content = game.phase === 'fallback' ? fallbackView() : game.phase === 'between' ? betweenView() : questionView();
    return `<section class="investigation app-enter"><div class="case-topline"><span class="eyebrow"><span class="status-dot"></span>AN INVESTIGATION IS UNDERWAY</span><span class="case-id">CASE #${shortId()}</span></div><div class="investigation-grid">${sidebar()}<div class="investigation-main">${content}</div></div></section>`;
  }

  function render(moveFocus = false) {
    document.querySelector('#transcript-count').textContent = game?.history?.length || '0';
    main.setAttribute('aria-busy', String(busy));
    main.innerHTML = game ? investigationView() : landing();
    if (moveFocus) {
      const focusTarget = main.querySelector('#question-title, #phase-title, #landing-title');
      focusTarget?.focus({ preventScroll: true });
    }
  }

  async function runOperation(operation, message, options = {}) {
    if (busy) return;
    busy = true;
    error = null;
    retryAction = null;
    notice = '';
    busyMessage = message;
    announce(message);
    render();
    let succeeded = false;
    try {
      game = await operation();
      persistGame(game);
      draft = {};
      succeeded = true;
      announce(game.phase === 'question' ? `Question ${game.asked} of 20. ${game.turn.question}` : game.phase === 'fallback' ? 'Twenty questions reached. You can now type your details.' : game.phase === 'complete' ? 'Case closed. Your intake is complete.' : 'This round is complete. Continue when you are ready.');
    } catch (failure) {
      error = failure.message || 'The detective lost his place. Please try again.';
      retryAction = failure.status === 400 || failure.status === 409 ? null : () => runOperation(operation, message, options);
      announce(error);
    } finally {
      busy = false;
      render(succeeded);
      if (options.scroll && succeeded) window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function startGame() {
    runOperation(() => createGame(generateTurn), 'The detective is reviewing his first lead…', { scroll: true });
  }

  function answer(value) {
    if (busy || game?.phase !== 'question' || dialog.open) return;
    const turnId = game.turn.id;
    runOperation(() => answerGame(game, turnId, value, generateTurn), 'The detective is connecting the dots…');
  }

  function showTranscript() {
    const entries = game?.history || [];
    document.querySelector('#transcript-content').innerHTML = entries.length ? entries.map(entry => {
      const category = categories.find(item => item.key === entry.category);
      const answerLabel = ({ yes: 'Yes', no: 'No', maybe: 'Maybe / I don’t know' })[entry.answer] || entry.answer;
      return `<article class="transcript-entry"><span class="eyebrow">${escape(category?.label || entry.category)} · QUESTION ${escape(entry.number)}</span><h3>${escape(entry.question)}</h3><span class="transcript-answer">${escape(answerLabel)}</span></article>`;
    }).join('') : '<p class="transcript-empty">The record is clean.<br>Your answers will appear here once the investigation begins.</p>';
    dialog.showModal();
  }

  async function copyIntake() {
    if (!game || game.phase !== 'complete' || busy) return;
    const text = ['Patient intake', ...categories.map(category => `${category.label}: ${resultText(category, game.results[category.key].value)}`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copyMessage = 'Intake copied to clipboard.';
      announce(copyMessage);
    } catch {
      copyMessage = 'Clipboard access was unavailable. Select and copy the intake above.';
      announce(copyMessage);
    }
    const element = main.querySelector('.copy-message');
    if (element) element.textContent = copyMessage;
  }

  main.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || busy) return;
    if (button.dataset.answer) return answer(button.dataset.answer);
    const action = button.dataset.action;
    if (action === 'start' || action === 'new') {
      copyMessage = '';
      startGame();
    } else if (action === 'continue') {
      runOperation(() => continueGame(game, generateTurn), 'Opening the next chapter of the case…', { scroll: true });
    } else if (action === 'retry') retryAction?.();
    else if (action === 'copy') copyIntake();
  });

  main.addEventListener('input', event => {
    if (event.target.closest('#fallback-form')) draft[event.target.name] = event.target.value;
  });

  main.addEventListener('submit', event => {
    if (event.target.id !== 'fallback-form') return;
    event.preventDefault();
    if (busy || game?.phase !== 'fallback') return;
    const value = Object.fromEntries(new FormData(event.target));
    draft = { ...value };
    runOperation(() => submitFallback(game, value), 'Adding your testimony to the case file…');
  });

  document.addEventListener('keydown', event => {
    if (busy || dialog.open || game?.phase !== 'question' || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const value = ({ '1': 'yes', '2': 'no', '3': 'maybe', y: 'yes', n: 'no', m: 'maybe' })[event.key.toLowerCase()];
    if (value) { event.preventDefault(); answer(value); }
  });

  transcriptToggle.addEventListener('click', showTranscript);
  document.querySelector('#close-transcript').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
  game = savedGame();
  render();
})();
