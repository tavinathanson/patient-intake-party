// Story engine: loads story.json, walks the scene graph, renders the current node.
// Mechanics beyond the base spec: letter budget, typed answers, {vars}, and records that build the ending report.
const $ = id => document.getElementById(id);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const FLIP_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
let story, S, typing;

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const lettersOf = t => t.toLowerCase().match(/[a-z]/g) || [];
const costOf = t => lettersOf(t).reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});
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
  lettersOf(spoken).forEach(ch => S.letters[ch]--);
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

function preview(cost) {
  for (const tile of $('letters').children) tile.dataset.cost = cost[tile.dataset.letter] ? '-' + cost[tile.dataset.letter] : '';
}

function choiceButton(c) {
  const variants = [].concat(c.text).map(fill);
  const label = variants.find(affordable);
  const b = button(label || variants[0], () => act(c, label), { disabled: !label });
  if (!label) b.title = 'Not enough letters left in the bag';
  b.onpointerenter = b.onfocus = () => preview(costOf(label || ''));
  b.onpointerleave = b.onblur = () => preview({});
  return b;
}

function inputBox(inp) {
  const field = el('input', { placeholder: inp.placeholder || '', maxLength: inp.max || 40, autocomplete: 'off' });
  // Drop any letter the bag can't pay for. Covers typing, paste, and phone keyboards.
  field.oninput = () => {
    const left = { ...S.letters };
    field.value = [...field.value].filter(ch => {
      const k = ch.toLowerCase();
      return !(k in left) || left[k]-- > 0;
    }).join('');
    preview(costOf(field.value));
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
  $('letters').replaceChildren(...Object.entries(S.letters).map(([c, n]) => {
    const tile = el('span', { className: n ? 'tile' : 'tile burnt' }, c.toUpperCase(), el('small', { textContent: n }));
    tile.dataset.letter = c;
    return tile;
  }));
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
  const controls = (node.choices || []).filter(c => test(c.condition)).map(choiceButton);
  if (node.input) controls.unshift(inputBox(node.input));
  if (node.skip) controls.push(button(story.skipLabel || 'Skip', () => act(node.skip), { className: 'skip' }));
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
  $('ending').hidden = false;
}

function start() {
  S = {
    day: 1, items: new Set(), flags: new Set(), vars: {}, records: [], bags: {},
    stats: structuredClone(story.stats),
    letters: Object.fromEntries([...ALPHABET].map(c => [c, story.letterBudget || 0])),
  };
  $('letters').hidden = !story.letterBudget;
  $('ending').hidden = true;
  $('title').textContent = document.title = story.title;
  $('text').textContent = '';
  render(story.startNode);
}

$('again').onclick = start;
fetch('story.json').then(r => r.json()).then(j => { story = j; start(); });
