// Story engine: loads story.json, walks the scene graph, renders the current node.
// Mechanics beyond the base spec: letter budget, typed answers, {vars}, and records that build the ending report.
const $ = id => document.getElementById(id);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const FLIP_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
let story, S, typing, past, justBurnt = [];

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const lettersOf = t => t.toLowerCase().match(/[a-z]/g) || [];
const costOf = t => lettersOf(t).reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});
const lettersOn = () => story.letterBudget && S.lettersOn;
const affordable = t => !story.letterBudget || Object.entries(costOf(t)).every(([c, n]) => S.letters[c] >= n);
const lettersLeft = () => Object.values(S.letters).reduce((a, b) => a + b, 0);
const fill = t => t.replace(/\{(\w+)\}/g, (_, k) => k === 'day' ? S.day : S.vars[k] ?? '');
const inRange = (v, r) => (!('above' in r) || v > r.above) && (!('below' in r) || v < r.below) && (!('equals' in r) || v === r.equals);

function test(c) {
  if (!c) return true;
  const day = c.day === undefined || (Array.isArray(c.day) ? c.day.includes(S.day) : inRange(S.day, typeof c.day === 'number' ? { equals: c.day } : c.day));
  return day
    && (!c.stat || inRange(S.stats[c.stat].value, c))
    && (!c.lettersLeft || inRange(lettersLeft(), c.lettersLeft))
    && (!c.lettersOut || inRange(Object.values(S.letters).filter(n => !n).length, c.lettersOut))
    && (c.items || []).every(i => S.items.has(i))
    && (c.flags || []).every(f => S.flags.has(f))
    && !(c.not || []).some(f => S.flags.has(f));
}

function draw(edge) {
  const bag = S.bags[edge.random.join('|')] ??= { queue: [], n: 0, last: null };
  const pin = edge.pin?.[++bag.n];
  if (pin) bag.queue = bag.queue.filter(x => x !== pin);
  else if (!bag.queue.length) {
    bag.queue = [...edge.random].sort(() => Math.random() - 0.5);
    if (bag.queue.length > 1 && bag.queue[0] === bag.last) bag.queue.push(bag.queue.shift());
  }
  return bag.last = pin || bag.queue.shift();
}

const resolve = next => {
  const edge = next.find(e => test(e.if));
  return edge.random ? draw(edge) : edge.node;
};

// Applies everything a choice (or typed answer) carries, then moves on.
function act(c, spoken = '') {
  past.push({ spoken, state: structuredClone(S) });
  lettersOf(spoken).forEach(ch => S.letters[ch]--);
  justBurnt = [...new Set(lettersOf(spoken))].filter(ch => !S.letters[ch]);
  for (const [k, d] of Object.entries(c.effects || {})) {
    const s = S.stats[k];
    s.value = Math.min(s.max, Math.max(s.min, s.value + d));
  }
  Object.assign(S.vars, c.set);
  (c.addItems || []).forEach(i => S.items.add(i));
  (c.removeItems || []).forEach(i => S.items.delete(i));
  (c.setFlags || []).forEach(f => S.flags.add(f));
  (c.removeFlags || []).forEach(f => S.flags.delete(f));
  if (c.record) S.records.push({ topic: c.record.topic, label: fill(c.record.label), value: fill(c.record.value) });
  if (c.endsDay) S.day++;
  const go = () => render(resolve(c.next));
  if (c.response) show({ text: c.response, image: c.image }, [button('Okay.', go)]);
  else go();
}

const button = (label, onclick, props = {}) => el('button', { textContent: label, onclick, ...props });

// Restores the state from before the last answer, which also refunds its letters.
function back() {
  S = past.pop().state;
  $('ending').hidden = true;
  render(S.node);
}

function backLabel() {
  const { spoken } = past.at(-1);
  return (story.backLabel || 'Back') + (spoken ? `: “${spoken}”` : '');
}

function preview(cost, blocked = new Set()) {
  for (const tile of $('letters').children) {
    tile.dataset.cost = cost[tile.dataset.letter] ? '-' + cost[tile.dataset.letter] : '';
    tile.classList.toggle('shake', blocked.has(tile.dataset.letter));
  }
}

// One row per meaning, one pill per wording, so the player picks the wording they can afford.
function choiceRow(c) {
  const pills = [].concat(c.text).map(fill).map(label => {
    const b = button(label, () => act(c, label), { disabled: !affordable(label) });
    b.onpointerenter = b.onfocus = () => preview(costOf(label));
    b.onpointerleave = b.onblur = () => preview({});
    return b;
  });
  return el('div', { className: 'row' }, ...pills);
}

function burn(chars) {
  if (!chars.length) return;
  const flames = Array.from({ length: 28 }, () => {
    const f = el('span', { textContent: '🔥' });
    f.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * .6}s;font-size:${1.5 + Math.random() * 3}rem`;
    return f;
  });
  const fire = el('div', { className: 'fire' }, ...flames, el('b', { textContent: `No more ${chars.join(' or ').toUpperCase()}!` }));
  document.body.append(fire);
  setTimeout(() => fire.remove(), 2400);
}

function inputBox(inp) {
  const field = el('input', { placeholder: inp.placeholder || '', maxLength: inp.max || 40, autocomplete: 'off' });
  // Drop any letter the bag can't pay for. Covers typing, paste, and phone keyboards.
  field.oninput = () => {
    const left = { ...S.letters };
    const blocked = new Set();
    field.value = [...field.value].filter(ch => {
      const k = ch.toLowerCase();
      const ok = !(k in left) || left[k]-- > 0;
      if (!ok) blocked.add(k);
      return ok;
    }).join('');
    preview(costOf(field.value), blocked);
  };
  const say = () => {
    if (!field.value.trim()) return;
    S.vars.input = field.value.trim();
    preview({});
    act(inp, field.value);
  };
  field.onkeydown = e => e.key === 'Enter' && say();
  return el('div', { className: 'typed' }, field, button(inp.button || 'Say it', say));
}

function renderHud() {
  $('clock').textContent = `${story.dayLabel || 'Day'} ${S.day}`;
  $('stats').replaceChildren(...Object.values(S.stats).map(statBar));
  $('items').replaceChildren(...[...S.items].map(i => el('span', { className: 'chip', textContent: i })));
  $('items').hidden = !S.items.size;
  $('letters').hidden = !lettersOn();
  $('letters').replaceChildren(...Object.entries(S.letters).map(([c, n]) => {
    const tile = el('span', { className: `tile${n ? '' : ' burnt'}${justBurnt.includes(c) ? ' burning' : ''}` }, c.toUpperCase(), el('small', { textContent: n }));
    tile.dataset.letter = c;
    return tile;
  }));
  if (lettersOn()) burn(justBurnt);
  justBurnt = [];
}

const statBar = s => {
  const bar = el('div', { className: 'bar' }, el('i'));
  bar.firstChild.style.cssText = `width:${100 * (s.value - s.min) / (s.max - s.min)}%;background:${s.color}`;
  return el('label', {}, s.label, bar);
};

function flip() {
  if (!FLIP_MS || !$('text').textContent) return;
  const leaf = $('page').cloneNode(true);
  leaf.removeAttribute('id');
  leaf.classList.add('leaf');
  $('page').after(leaf);
  setTimeout(() => leaf.remove(), FLIP_MS);
}

function show(node, controls) {
  flip();
  renderHud();
  $('image').src = fill(node.image || '');
  $('image').hidden = !node.image;
  $('choices').replaceChildren();
  const full = fill(node.text);
  let i = 0;
  clearInterval(typing);
  const finish = () => {
    clearInterval(typing);
    $('text').textContent = full;
    $('choices').replaceChildren(...controls);
    $('page').onclick = null;
  };
  $('text').textContent = '';
  $('page').onclick = finish;
  setTimeout(() => {
    typing = setInterval(() => ($('text').textContent = full.slice(0, ++i), i >= full.length && finish()), 18);
  }, FLIP_MS);
}

function render(id) {
  const node = story.nodes[id];
  if (node.ending) return end(node);
  S.node = id;
  if (node.showLetters) S.lettersOn = true;
  const controls = (node.choices || []).filter(c => test(c.condition)).map(choiceRow);
  if (node.input) controls.unshift(inputBox(node.input));
  if (node.skip) controls.push(button(story.skipLabel || 'Skip', () => act(node.skip), { className: 'skip' }));
  if (lettersOn() && past.length) {
    const stuck = controls.some(c => c.querySelector(':disabled'));
    controls.push(button(backLabel(), back, { className: stuck ? 'back urgent' : 'back' }));
  }
  show(node, controls);
}

function sparkline({ label, points }) {
  const max = Math.max(...points.map(p => p.value));
  const xy = points.map((p, i) => `${10 + i * 280 / (points.length - 1)},${70 - 60 * p.value / max}`).join(' ');
  const fig = el('figure');
  fig.innerHTML = `<figcaption>${label}: ${points[0].value} on ${points[0].date}, ${points.at(-1).value} on ${points.at(-1).date}</figcaption>
    <svg viewBox="0 0 300 80"><polyline points="${xy}" fill="none" stroke="#d8432e" stroke-width="3"/></svg>`;
  return fig;
}

function reportView(report) {
  const topics = report.topics.map(t => {
    const rows = S.records.filter(r => r.topic === t.id);
    const body = rows.length
      ? el('ul', {}, ...rows.map(r => el('li', {}, el('b', { textContent: r.label + ': ' }), r.value)))
      : el('p', { className: 'missing', textContent: report.missingText });
    return el('section', {}, el('h4', { textContent: t.title }), body);
  });
  const known = el('section', {}, el('h4', { textContent: report.knownTitle }), el('ul', {}, ...report.known.map(k => el('li', { textContent: k }))));
  return [el('h3', { textContent: report.title }), ...topics, known, ...(report.series ? [sparkline(report.series)] : [])];
}

function end(node) {
  renderHud();
  $('endTitle').textContent = node.endingTitle;
  $('endText').textContent = fill(node.text);
  $('ending').className = node.endingType || '';
  $('endStats').replaceChildren(...Object.values(S.stats).map(statBar));
  $('report').replaceChildren(...(story.report ? reportView(story.report) : []));
  $('back').textContent = lettersOn() && past.length ? backLabel() : '';
  $('back').hidden = !(lettersOn() && past.length);
  $('ending').hidden = false;
}

function start() {
  past = [];
  S = {
    day: 1, items: new Set(), flags: new Set(), vars: {}, records: [], bags: {},
    stats: structuredClone(story.stats),
    letters: Object.fromEntries([...ALPHABET].map(c => [c, story.letterBudget || 0])),
    lettersOn: false,
  };
  $('letters').hidden = true;
  $('ending').hidden = true;
  $('title').textContent = document.title = story.title;
  $('text').textContent = '';
  render(story.startNode);
}

$('again').onclick = start;
$('back').onclick = back;
fetch('story.json').then(r => r.json()).then(j => { story = j; start(); });
