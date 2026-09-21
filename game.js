/* Cursed Intake: a side-scrolling patient intake form.
   Fill each block before it scrolls past the player. If the block you're
   focused in passes behind the player, or a required block slips by empty,
   you die and the form resets. */
(() => {
'use strict';

// ---------------------------------------------------------------------------
// Level definition
// ---------------------------------------------------------------------------
const SECTIONS = [
  { world: '1-1', name: 'WHO ARE YOU?',       speedMul: 1.00, gap: 240 },
  { world: '1-2', name: 'MEDICAL STUFF',      speedMul: 1.15, gap: 260 },
  { world: '1-3', name: 'THE HARD QUESTIONS', speedMul: 1.30, gap: 280 },
];

const CONDITIONS = [
  'Arthritis', 'Diabetes', 'Kidney disease',
  'Asthma', 'Glaucoma', 'Seizures',
  'Cancer', 'Heart disease', 'Stroke',
  'COPD / emphysema', 'High blood pressure', 'Thyroid disease',
  'Depression / anxiety', 'High cholesterol', 'Other',
];

const FIELDS = [
  { key: 'name',              section: 0, label: 'Name',              type: 'text',     required: true,  width: 320, placeholder: 'First Last' },
  { key: 'date_of_birth',     section: 0, label: 'Date of birth',     type: 'date',     required: true,  width: 300 },
  { key: 'phone',             section: 0, label: 'Phone',             type: 'tel',      required: true,  width: 300, placeholder: '555-0100' },
  { key: 'address',           section: 0, label: 'Address',           type: 'text',     required: true,  width: 380, placeholder: 'Street, City' },
  { key: 'insurance',         section: 0, label: 'Insurance',         type: 'text',     required: true,  width: 320, placeholder: 'Carrier, or "none"' },
  { key: 'member_id',         section: 0, label: 'Member ID',         type: 'text',     required: false, width: 300 },
  { key: 'emergency_contact', section: 0, label: 'Emergency contact', type: 'contact',  required: true,  width: 400 },
  { key: 'filled_out_by',     section: 0, label: 'Filled out by',     type: 'text',     required: false, width: 320, hint: 'if not the patient' },

  { key: 'reason_for_visit',    section: 1, label: 'Reason for visit',    type: 'textarea', required: true,  width: 420 },
  { key: 'current_medications', section: 1, label: 'Current medications', type: 'textarea', required: true,  width: 440, hint: 'include OTC, vitamins, eye drops, inhalers. "none" is fine' },
  { key: 'allergies',           section: 1, label: 'Allergies',           type: 'allergies', required: true, width: 340, stack: true },
  { key: 'past_conditions',     section: 1, label: 'Past conditions',     type: 'checks',   required: false, width: 660, hint: 'check all that apply', options: CONDITIONS },
  { key: 'past_surgeries',      section: 1, label: 'Past surgeries',      type: 'text',     required: false, width: 360, hint: 'procedure and year', stack: true },
  { key: 'family_history',      section: 1, label: 'Family history',      type: 'textarea', required: false, width: 420, hint: 'parents, siblings, children: cancer, diabetes, heart disease, stroke, glaucoma' },

  { key: 'tobacco',   section: 2, label: 'Tobacco',            type: 'radio', required: true, width: 440, options: ['Never', 'Former', 'Current'], extra: { key: 'tobacco_quit', placeholder: 'quit year (if former)' } },
  { key: 'alcohol',   section: 2, label: 'Alcohol',            type: 'radio', required: true, width: 400, options: ['None', 'Occasional', 'Daily'], stack: true },
  { key: 'drugs',     section: 2, label: 'Recreational drugs', type: 'radio', required: true, width: 320, options: ['No', 'Yes'], stack: true },
  { key: 'signature', section: 2, label: 'Signature',          type: 'text',  required: true, width: 380, hint: 'type your full name to sign', placeholder: 'Your name' },
];

const DIFFICULTY = { easy: 82, normal: 120, hard: 172 }; // base px/sec (1.5x the original 55/80/115)
const RUN_MUL = 3;
const BLOCK_SPEEDUP = 0.035; // each completed block adds 3.5% to the scroll speed (linear, up to about +60% at the end)
const TOTAL_TICKS = 400;
const DANGER_PX = 200;
const STACK_GAP = 28;   // vertical space between stacked blocks
const BASE_LIFT = 48;   // bottom block sits this far above the ground

// ---------------------------------------------------------------------------
// DOM handles
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const stage = $('stage'), world = $('world'), form = $('intake'), props = $('props');
const ground = $('ground'), hills = $('hills'), clouds = $('clouds'), bushes = $('bushes');
const player = $('player'), spriteEl = $('sprite'), danger = $('danger');
const popups = $('popups'), fireworks = $('fireworks');
const hud = {
  score: $('hud-score'), coins: $('hud-coins'), world: $('hud-world'),
  time: $('hud-time'), lives: $('hud-lives'),
};
const screens = { title: $('screen-title'), death: $('screen-death'), clear: $('screen-clear') };

// ---------------------------------------------------------------------------
// Storage (per-viewer conveniences only)
// ---------------------------------------------------------------------------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// ---------------------------------------------------------------------------
// Audio: everything is synthesized, no files
// ---------------------------------------------------------------------------
const audio = (() => {
  let ctx = null, master = null;
  let muted = store.get('ci.muted', false);

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  function resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  // notes: [[freqHz, ms], ...]  freq 0 = rest
  function seq(notes, { type = 'square', vol = 0.18, glide = 0 } = {}) {
    ensure();
    if (!ctx) return;
    let t = ctx.currentTime + 0.01;
    for (const [f, ms] of notes) {
      const d = ms / 1000;
      if (f > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + glide), t + d);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d * 0.95);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + d);
      }
      t += d;
    }
  }

  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494,
              C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988,
              C6: 1047, D6: 1175, E6: 1319, G6: 1568, C7: 2093, E7: 2637 };

  return {
    resume,
    get muted() { return muted; },
    toggle() { muted = !muted; store.set('ci.muted', muted); ensure(); if (master) master.gain.value = muted ? 0 : 0.6; return muted; },
    coin()  { seq([[N.B5, 80], [N.E6, 420]], { vol: 0.14 }); },
    oneUp() { seq([[N.E6, 90], [N.G6, 90], [N.E7, 90], [N.C7, 90], [N.D6 * 2, 90], [N.G6 * 2, 260]], { vol: 0.12 }); },
    hurry() { seq([[N.A5, 60], [0, 60], [N.A5, 60], [0, 60], [N.A5, 60]], { vol: 0.1 }); },
    bump()  { seq([[110, 160]], { type: 'triangle', vol: 0.3, glide: -60 }); },
    death() {
      seq([[N.B4, 110], [N.F5, 110], [0, 110], [N.F5, 110], [N.F5, 130], [N.E5, 130], [N.D5, 130],
           [N.C5, 110], [N.E4, 110], [0, 60], [N.E4, 110], [N.C4, 380]], { vol: 0.2 });
    },
    clear() {
      seq([[N.G4, 100], [N.C5, 100], [N.E5, 100], [N.G5, 100], [N.C6, 100], [N.E6, 100], [N.G6, 320],
           [N.E6, 320], [N.G4 + 23, 100], [N.C5, 100], [N.E5 - 37, 100], [N.G5 + 47, 100], [N.C6, 100], [N.E6, 100], [N.G6, 320], [N.E6 - 74, 320],
           [N.A4 + 26, 100], [N.D5, 100], [N.F5, 100], [N.A5 + 52, 100], [N.D6, 100], [N.F5 * 2, 100], [N.A5 * 2 + 104, 320], [N.F5 * 2, 320]],
          { vol: 0.16 });
    },
    run()   { seq([[N.C5, 40]], { vol: 0.05 }); },
    jump()  { seq([[330, 180]], { vol: 0.08, glide: 500 }); },
  };
})();

// ---------------------------------------------------------------------------
// Pixel sprite (12 x 16), rendered with box-shadow
// ---------------------------------------------------------------------------
const PAL = { R: '#d82800', S: '#f8b878', B: '#1c3cd0', K: '#6c3000', W: '#ffffff', G: '#a0a0a0' };
// Dr. Mario: brown hair, white coat over a red shirt, stethoscope, dark trousers.
const FRAMES = {
  run1: [
    '....KKKKK...', '...KKKKKKKK.', '...KKKSSK.S.', '..KSKSSSKSSS', '..KSKKSSSKSS', '..KKSSSSKKKK',
    '....SSSSSSS.', '...WWRRRWW..', '..WWWGRGWWW.', '.WWWWGRGWWWW', '.SSWWWGWWWSS', '.SSWWWWWWWSS',
    '.SSWWWWWWWSS', '...BBB..BBB.', '..KKK....KKK', '.KKKK....KKK',
  ],
  run2: [
    '....KKKKK...', '...KKKKKKKK.', '...KKKSSK.S.', '..KSKSSSKSSS', '..KSKKSSSKSS', '..KKSSSSKKKK',
    '....SSSSSSS.', '...WWRRRWW..', '..WWWGRGWWW.', '.WWWWGRGWWWW', '.SSWWWGWWWSS', '.SSWWWWWWWSS',
    '..SWWWWWWWS.', '...BBBBBBB..', '...KKKBBB...', '..KKKK......',
  ],
  dead: [
    '....KKKKK...', '...KKKKKKKK.', '...KKKSSK.S.', '..KSKSSSKSSS', '..KSKKSSSKSS', '..KKSSSSKKKK',
    '....SSSSSSS.', 'SS.WWRRRW.SS', 'SSWWWGRGWWSS', '.SWWWGRGWWS.', '..WWWWGWWWW.', '...WWWWWWW..',
    '..WWWWWWWWW.', '..BBB...BBB.', '.KKKK...KKKK', '.KKKK...KKKK',
  ],
};
const PX = 4;
const shadows = {};
for (const [name, rows] of Object.entries(FRAMES)) {
  const parts = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (PAL[ch]) parts.push(`${x * PX}px ${y * PX}px 0 0 ${PAL[ch]}`);
  }));
  shadows[name] = parts.join(',');
}
function setFrame(name) { spriteEl.style.boxShadow = shadows[name]; }
setFrame('run1');

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const G = {
  state: 'title',         // title | playing | dying | dead | clearing | clear
  cameraX: 0,
  baseSpeed: DIFFICULTY.normal,
  running: false,
  score: 0, coins: 0, lives: 3,
  ticks: TOTAL_TICKS, tickRate: 1,
  activeCard: null,
  cards: [],              // { el, def, x, w, done, passed, warned }
  sectionStarts: [],      // world x where each section begins
  flagX: 0,
  lastFrame: 0,
  anim: 0,
  fieldPoints: 0,
  lastHurry: 0,
};
const PLAYER_X = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--player-x')) || 120;

// ---------------------------------------------------------------------------
// Build the level
// ---------------------------------------------------------------------------
function control(def) {
  const wrap = document.createElement('div');
  const n = def.key;
  switch (def.type) {
    case 'text': case 'tel': case 'date':
      wrap.innerHTML = `<input type="${def.type}" name="${n}" placeholder="${def.placeholder || ''}" aria-label="${def.label}">`;
      break;
    case 'textarea':
      wrap.innerHTML = `<textarea name="${n}" aria-label="${def.label}" placeholder="${def.placeholder || ''}"></textarea>`;
      break;
    case 'contact':
      wrap.className = 'stack';
      wrap.innerHTML = `
        <input type="text" name="${n}_name" placeholder="Name" aria-label="Emergency contact name">
        <div class="row2">
          <input type="text" name="${n}_relationship" placeholder="Relationship" aria-label="Relationship">
          <input type="tel" name="${n}_phone" placeholder="Phone" aria-label="Emergency contact phone">
        </div>`;
      break;
    case 'allergies':
      wrap.className = 'stack';
      wrap.innerHTML = `
        <input type="text" name="${n}" placeholder="e.g. penicillin, latex" aria-label="Allergies">
        <div class="choices inline"><label><input type="checkbox" name="${n}_none"> None</label></div>`;
      break;
    case 'checks':
      wrap.className = 'choices cols3';
      wrap.innerHTML = def.options.map((o) =>
        `<label><input type="checkbox" name="${n}" value="${o}"> ${o}</label>`).join('');
      break;
    case 'radio':
      wrap.className = 'stack';
      wrap.innerHTML = `<div class="choices inline">${def.options.map((o) =>
        `<label><input type="radio" name="${n}" value="${o}"> ${o}</label>`).join('')}</div>` +
        (def.extra ? `<input type="text" name="${def.extra.key}" placeholder="${def.extra.placeholder}" aria-label="${def.extra.placeholder}">` : '');
      break;
  }
  return wrap;
}

function buildCards() {
  form.innerHTML = '';
  G.cards = FIELDS.map((def) => {
    const el = document.createElement('section');
    el.className = 'card';
    el.dataset.key = def.key;
    el.style.width = def.width + 'px';
    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `<span>${def.label.toUpperCase()}${def.required ? ' <span class="req" title="required">★</span>' : ''}</span><span class="q"></span>`;
    const body = document.createElement('div');
    body.className = 'card-body';
    if (def.hint) body.innerHTML = `<p class="card-hint">${def.hint}</p>`;
    body.appendChild(control(def));
    el.append(head, body);
    form.appendChild(el);
    return { el, def, x: 0, w: def.width, done: false, passed: false, warned: false };
  });
}

function prop(cls, x, html = '') {
  const el = document.createElement('div');
  el.className = 'prop ' + cls;
  el.style.left = x + 'px';
  el.innerHTML = html;
  props.appendChild(el);
  return el;
}

function layout() {
  props.innerHTML = '';
  const vw = window.innerWidth;
  const px = PLAYER_X();
  let x = vw + 200;
  let section = -1;
  G.sectionStarts = [];

  let col = null; // the column being built: { x, w, bottom, h, tier }
  for (const c of G.cards) {
    const stacking = c.def.stack && col;
    if (!stacking && c.def.section !== section) {
      section = c.def.section;
      const s = SECTIONS[section];
      if (section === 0) {
        G.sectionStarts.push(0);
        prop('sign', px + 260, `WORLD ${s.world}<br>${s.name}`);
      } else {
        prop('pipe', x);
        x += 120;
        prop('sign', x, `WORLD ${s.world}<br>${s.name}<br><small>speed ↑</small>`);
        G.sectionStarts.push(x - px);
        x += 300;
      }
    }
    if (stacking) {
      c.x = col.x;
      c.tier = col.tier + 1;
      c.bottom = col.bottom + col.h + STACK_GAP;
      col.w = Math.max(col.w, c.w); col.bottom = c.bottom; col.h = c.el.offsetHeight; col.tier = c.tier;
    } else {
      c.x = x; c.tier = 0; c.bottom = BASE_LIFT;
      col = { x, w: c.w, bottom: BASE_LIFT, h: c.el.offsetHeight, tier: 0 };
    }
    c.el.style.left = c.x + 'px';
    c.el.style.bottom = `calc(var(--ground-h) + ${c.bottom}px)`;
    c.el.classList.toggle('stacked', c.tier > 0);
    x = col.x + col.w + SECTIONS[section].gap; // where the next column starts
  }

  x += 260;
  G.flagX = x;
  prop('flagpole', x, `<div class="flag"><span>SUBMIT</span></div>`);
  prop('castle', x + 140);

  // TIME: 400 ticks span the whole level at base (non-running) speed.
  let seconds = 0, prev = 0;
  const camEnd = G.flagX - px - 40;
  for (let i = 0; i < G.sectionStarts.length; i++) {
    const start = G.sectionStarts[i];
    const end = i + 1 < G.sectionStarts.length ? G.sectionStarts[i + 1] : camEnd;
    seconds += (end - start) / (G.baseSpeed * SECTIONS[i].speedMul);
    prev = end;
  }
  G.tickRate = TOTAL_TICKS / seconds;
}

// ---------------------------------------------------------------------------
// Field state helpers
// ---------------------------------------------------------------------------
const val = (name) => { const el = form.elements[name]; return el && 'value' in el && !(el instanceof RadioNodeList && !el.value) ? String(el.value || '').trim() : ''; };
const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

function isFilled(c) {
  const k = c.def.key;
  switch (c.def.type) {
    case 'contact':   return !!(val(k + '_name') && val(k + '_phone'));
    case 'allergies': return !!(val(k) || checked(k + '_none').length);
    case 'checks':    return checked(k).length > 0;
    case 'radio':     return checked(k).length > 0;
    default:          return !!val(k);
  }
}

function collect() {
  const out = {};
  for (const c of G.cards) {
    const k = c.def.key;
    switch (c.def.type) {
      case 'contact': {
        const parts = [val(k + '_name'), val(k + '_relationship'), val(k + '_phone')].filter(Boolean);
        out[k] = parts.join(', ');
        break;
      }
      case 'allergies': out[k] = checked(k + '_none').length ? 'None' : val(k); break;
      case 'checks':    out[k] = checked(k); break;
      case 'radio': {
        let v = checked(k)[0] || '';
        if (c.def.extra && val(c.def.extra.key)) v += ` (quit ${val(c.def.extra.key)})`;
        out[k] = v;
        break;
      }
      default: out[k] = val(k);
    }
  }
  out.date = new Date().toISOString().slice(0, 10);
  return out;
}

// ---------------------------------------------------------------------------
// Scoring, popups, HUD
// ---------------------------------------------------------------------------
const pad = (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0');

function popup(text, rect, big = false) {
  const el = document.createElement('div');
  el.className = 'popup' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = Math.max(8, rect.left + rect.width / 2 - 30) + 'px';
  el.style.top = Math.max(60, rect.top - 24) + 'px';
  popups.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function award(c) {
  const px = PLAYER_X();
  const right = c.x + c.w - G.cameraX;
  const frac = Math.min(1, Math.max(0, (right - px) / (window.innerWidth - px)));
  const pts = 100 + Math.round(frac * 20) * 10;
  G.score += pts;
  G.fieldPoints += pts;
  G.coins += 1;
  audio.coin();
  spinJump();
  popup(`+${pts}`, c.el.getBoundingClientRect());
  if (G.coins % 10 === 0) {
    G.lives += 1;
    setTimeout(() => { audio.oneUp(); popup('1-UP', player.getBoundingClientRect(), true); }, 350);
  }
}

function spinJump() {
  if (G.state !== 'playing') return;
  player.classList.remove('spin');
  void player.offsetWidth; // restart the animation if it is already running
  player.classList.add('spin');
  audio.jump();
}

function renderHUD() {
  hud.score.textContent = pad(G.score, 6);
  hud.coins.textContent = pad(G.coins, 2);
  hud.time.textContent = pad(G.ticks, 3);
  hud.lives.textContent = '×' + G.lives;
  hud.world.textContent = SECTIONS[currentSection()].world;
}

function currentSection() {
  const camPlayer = G.cameraX;
  let s = 0;
  for (let i = 0; i < G.sectionStarts.length; i++) if (G.sectionStarts[i] <= camPlayer) s = i;
  return s;
}

function fireworksShow() {
  const colors = ['#f8b800', '#e40058', '#00a800', '#5c94fc', '#ffffff'];
  const w = window.innerWidth, h = window.innerHeight;
  for (let burst = 0; burst < 6; burst++) {
    setTimeout(() => {
      const cx = 80 + Math.random() * (w - 160), cy = 100 + Math.random() * (h * 0.4);
      for (let i = 0; i < 18; i++) {
        const s = document.createElement('div');
        s.className = 'spark';
        const a = (i / 18) * Math.PI * 2, r = 60 + Math.random() * 70;
        s.style.left = cx + 'px'; s.style.top = cy + 'px';
        s.style.background = colors[(burst + i) % colors.length];
        s.style.setProperty('--dx', Math.cos(a) * r + 'px');
        s.style.setProperty('--dy', Math.sin(a) * r + 'px');
        fireworks.appendChild(s);
        setTimeout(() => s.remove(), 1200);
      }
      audio.bump();
    }, burst * 380);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - G.lastFrame) / 1000 || 0);
  G.lastFrame = now;
  if (G.state !== 'playing') return;

  const px = PLAYER_X();
  const section = currentSection();
  const speed = G.baseSpeed * SECTIONS[section].speedMul * (1 + G.coins * BLOCK_SPEEDUP) * (G.running ? RUN_MUL : 1);
  G.cameraX += speed * dt;
  G.ticks = Math.max(0, G.ticks - G.tickRate * dt);

  // run animation
  G.anim += dt * (G.running ? 14 : 7);
  setFrame(Math.floor(G.anim) % 2 ? 'run2' : 'run1');

  // scroll everything
  world.style.transform = `translate3d(${-G.cameraX}px,0,0)`;
  ground.style.backgroundPositionX = `${-G.cameraX}px`;
  hills.style.backgroundPositionX = `${-G.cameraX * 0.3}px`;
  clouds.style.backgroundPositionX = `${-G.cameraX * 0.15}px`;
  bushes.style.backgroundPositionX = `${-G.cameraX * 0.6}px`;

  // danger + kill checks
  let dangerLevel = 0;
  for (const c of G.cards) {
    if (c.passed) continue;
    const right = c.x + c.w - G.cameraX;           // screen x of the block's right edge
    const isActive = G.activeCard === c;

    if (right < px) {
      c.passed = true;
      c.el.classList.remove('danger');
      if (isActive) return die('scrolled', c);
      if (c.def.required && !c.done) return die('missed', c);
      c.el.classList.add('passed');
      c.el.querySelectorAll('input,textarea').forEach((i) => { i.disabled = true; });
      continue;
    }

    const inDanger = right < px + DANGER_PX && (isActive || (c.def.required && !c.done));
    c.el.classList.toggle('danger', inDanger);
    if (inDanger) {
      dangerLevel = Math.max(dangerLevel, 1 - (right - px) / DANGER_PX);
      if (!c.warned) { c.warned = true; if (now - G.lastHurry > 600) { G.lastHurry = now; audio.hurry(); } }
    }
  }
  danger.style.setProperty('--danger', dangerLevel.toFixed(2));
  document.documentElement.style.setProperty('--danger', dangerLevel.toFixed(2));

  // reached the flag?
  if (G.flagX - G.cameraX <= px + 40) return levelClear();

  renderHUD();
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------
function show(name) {
  for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name);
}

function resetForm() {
  form.reset();
  for (const c of G.cards) {
    c.done = c.passed = c.warned = false;
    c.el.classList.remove('done', 'danger', 'passed');
    c.el.querySelectorAll('input,textarea').forEach((i) => { i.disabled = false; });
  }
  G.activeCard = null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function start() {
  audio.resume();
  const diff = document.querySelector('input[name=difficulty]:checked')?.value || 'normal';
  G.baseSpeed = DIFFICULTY[diff];
  store.set('ci.difficulty', diff);
  resetForm();
  layout();
  G.cameraX = 0; G.score = 0; G.coins = 0; G.fieldPoints = 0;
  G.ticks = TOTAL_TICKS; G.running = false;
  player.className = 'player';
  setFrame('run1');
  document.documentElement.style.setProperty('--danger', '0');
  renderHUD();
  show(null);
  G.state = 'playing';
  // Put the player in the first block right away so keyboard users can just type.
  const first = G.cards[0].el.querySelector('input,textarea');
  if (first) first.focus({ preventScroll: true });
}

function die(reason, c) {
  G.state = 'dying';
  G.running = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  G.activeCard = null;
  for (const k of G.cards) k.el.classList.remove('danger');
  document.documentElement.style.setProperty('--danger', '1');
  setFrame('dead');
  player.classList.add('dead');
  audio.death();

  G.lives -= 1;
  const label = c.def.label;
  const msgs = {
    scrolled: `The screen scrolled past "${label}" while you were still typing in it. Crushed by the left edge.`,
    missed:   `You let "${label}" (★ required) slip by empty. Straight into the pit.`,
  };
  $('death-reason').textContent = msgs[reason];
  $('death-score').textContent = pad(G.score, 6);
  $('death-coins').textContent = G.coins;

  const gameOver = G.lives <= 0;
  $('death-title').textContent = gameOver ? 'GAME OVER' : 'YOU DIED';
  $('death-hint').textContent = gameOver
    ? 'Out of lives. The form has been reset, and so have you.'
    : `The form has been reset. All of it. ${G.lives} ${G.lives === 1 ? 'life' : 'lives'} left.`;
  renderHUD();
  if (gameOver) G.lives = 3;

  setTimeout(() => {
    G.state = 'dead';
    resetForm();
    show('death');
    $('btn-retry').focus();
  }, 1900);
}

function levelClear() {
  G.state = 'clearing';
  G.running = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  G.activeCard = null;
  document.documentElement.style.setProperty('--danger', '0');
  player.classList.add('cheer');
  audio.clear();
  fireworksShow();

  const remaining = Math.floor(G.ticks);
  const timeBonus = remaining * 50;
  G.score += timeBonus;
  renderHUD();

  const data = collect();
  const best = store.get('ci.hiscore', 0);
  const newBest = G.score > best;
  if (newBest) store.set('ci.hiscore', G.score);

  $('clear-blocks').textContent = G.coins;
  $('clear-field-pts').textContent = pad(G.fieldPoints, 6);
  $('clear-time-bonus').textContent = `${remaining} × 50 = ${pad(timeBonus, 6)}`;
  $('clear-total').textContent = pad(G.score, 6);
  $('clear-newbest').classList.toggle('hidden', !newBest);
  $('hiscore').textContent = pad(Math.max(best, G.score), 6);

  const dl = $('summary');
  dl.innerHTML = '';
  const order = ['date', ...FIELDS.map((f) => f.key)];
  const labels = Object.fromEntries(FIELDS.map((f) => [f.key, f.label]));
  labels.date = 'Date';
  for (const k of order) {
    const v = data[k];
    const text = Array.isArray(v) ? v.join(', ') : v;
    const dt = document.createElement('dt'); dt.textContent = labels[k].toUpperCase();
    const dd = document.createElement('dd'); dd.textContent = text || '—';
    if (!text) dd.className = 'empty';
    dl.append(dt, dd);
  }
  $('btn-copy').onclick = async () => {
    const json = JSON.stringify(data, null, 2);
    try { await navigator.clipboard.writeText(json); $('btn-copy').textContent = 'COPIED!'; }
    catch { window.prompt('Copy the intake JSON:', json); }
    setTimeout(() => { $('btn-copy').textContent = 'COPY JSON'; }, 1500);
  };

  setTimeout(() => {
    G.state = 'clear';
    show('clear');
    $('btn-again').focus();
  }, 2600);
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------
const isTyping = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(checkbox|radio)$/.test(a.type)));
};

form.addEventListener('submit', (e) => e.preventDefault());

form.addEventListener('focusin', (e) => {
  const el = e.target.closest('.card');
  G.activeCard = G.cards.find((c) => c.el === el) || null;
});
form.addEventListener('focusout', () => {
  setTimeout(() => {
    const el = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.card') : null;
    G.activeCard = G.cards.find((c) => c.el === el) || null;
  }, 0);
});

function onFieldChange(e) {
  if (G.state !== 'playing') return;
  const el = e.target.closest('.card');
  const c = G.cards.find((k) => k.el === el);
  if (!c || c.passed) return;
  const filled = isFilled(c);
  if (filled && !c.done) { c.done = true; c.el.classList.add('done'); award(c); }
  else if (!filled && c.done) { c.done = false; c.el.classList.remove('done'); }
}
form.addEventListener('input', onFieldChange);
form.addEventListener('change', onFieldChange);

function focusNextCard(fromEl) {
  const idx = G.cards.findIndex((c) => c.el === fromEl);
  for (let i = idx + 1; i < G.cards.length; i++) {
    if (G.cards[i].passed) continue;
    const t = G.cards[i].el.querySelector('input:not([disabled]),textarea:not([disabled])');
    if (t) { t.focus({ preventScroll: true }); return; }
  }
  if (document.activeElement) document.activeElement.blur();
}

form.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.target.blur(); e.preventDefault(); return; }
  if (e.key === 'Enter' && !(e.target.tagName === 'TEXTAREA' && e.shiftKey)) {
    e.preventDefault();
    const card = e.target.closest('.card');
    if (card) focusNextCard(card);
  }
});

window.addEventListener('keydown', (e) => {
  if (G.state === 'playing' && (e.key === 'Shift' || e.key === 'ArrowRight') && !isTyping()) {
    if (!G.running) audio.run();
    G.running = true;
    if (e.key === 'ArrowRight') e.preventDefault();
  }
  if (G.state === 'dead' && e.key === 'Enter') { start(); }
  if (G.state === 'title' && e.key === 'Enter' && !e.target.closest('button,input')) { start(); }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift' || e.key === 'ArrowRight') G.running = false;
});
window.addEventListener('blur', () => { G.running = false; });

// clicking the sky lets go of the active block
stage.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.card') && document.activeElement && document.activeElement.blur) document.activeElement.blur();
});

player.addEventListener('animationend', (e) => { if (e.animationName === 'spin') player.classList.remove('spin'); });
$('btn-start').addEventListener('click', start);
$('btn-retry').addEventListener('click', start);
$('btn-again').addEventListener('click', () => { G.state = 'title'; show('title'); player.className = 'player'; });
$('mute').addEventListener('click', (e) => {
  const m = audio.toggle();
  e.currentTarget.textContent = m ? '♪ OFF' : '♪ ON';
  e.currentTarget.setAttribute('aria-pressed', String(m));
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
if (location.hash === "#debug" || location.search.includes("debug")) window.CI = G;
buildCards();
layout();
$('hiscore').textContent = pad(store.get('ci.hiscore', 0), 6);
const savedDiff = store.get('ci.difficulty', 'normal');
const diffInput = document.querySelector(`input[name=difficulty][value="${savedDiff}"]`);
if (diffInput) diffInput.checked = true;
if (audio.muted) { $('mute').textContent = '♪ OFF'; $('mute').setAttribute('aria-pressed', 'true'); }
renderHUD();
requestAnimationFrame((t) => { G.lastFrame = t; requestAnimationFrame(frame); });

})();
