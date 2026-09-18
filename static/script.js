// Minimal JS for Cursed Intake Form + Pachinko Component

document.addEventListener('DOMContentLoaded', () => {
  initDOB();
  initPhone();
  initRhymeChecker();
  initHaikuChecker();
  initSurgeryCharCounter();
  initPachinko();
});

// 1. Cursed Date of Birth
function initDOB() {
  const birthstoneSelect = document.getElementById('dob_birthstone');
  const dayInput = document.getElementById('dob_day');
  const bookInput = document.getElementById('dob_book');
  const yearHiddenInput = document.getElementById('dob_year');
  const dobComputedDisplay = document.getElementById('dob-computed-display');
  const dateOfBirthHiddenInput = document.getElementById('date_of_birth');
  const bookStatusSpan = document.getElementById('book-lookup-status');

  let lookupTimeout = null;

  function updateDOB() {
    const m = birthstoneSelect ? birthstoneSelect.value : '';
    const d = dayInput ? dayInput.value.trim() : '';
    const y = yearHiddenInput ? yearHiddenInput.value.trim() : '';

    if (m && d && y) {
      const formatted = `${y.padStart(4, '0')}-${m}-${d.padStart(2, '0')}`;
      if (dobComputedDisplay) dobComputedDisplay.innerText = formatted;
      if (dateOfBirthHiddenInput) dateOfBirthHiddenInput.value = formatted;
    }
  }

  if (bookInput) {
    bookInput.addEventListener('input', (e) => {
      clearTimeout(lookupTimeout);
      const title = e.target.value.trim();
      if (!title) {
        if (yearHiddenInput) yearHiddenInput.value = '';
        if (bookStatusSpan) bookStatusSpan.innerText = '';
        updateDOB();
        return;
      }
      lookupTimeout = setTimeout(() => {
        if (bookStatusSpan) bookStatusSpan.innerText = 'Looking up book...';
        fetch(`/api/lookup-book?title=${encodeURIComponent(title)}`)
          .then(r => r.json())
          .then(data => {
            if (data.found && data.year) {
              if (yearHiddenInput) yearHiddenInput.value = data.year;
              if (bookStatusSpan) bookStatusSpan.innerText = `Book: ${data.title} (${data.year})`;
            } else {
              if (yearHiddenInput) yearHiddenInput.value = '';
              if (bookStatusSpan) bookStatusSpan.innerText = 'Book not found';
            }
            updateDOB();
          })
          .catch(() => {
            if (bookStatusSpan) bookStatusSpan.innerText = '';
          });
      }, 400);
    });
  }

  if (birthstoneSelect) birthstoneSelect.addEventListener('change', updateDOB);
  if (dayInput) dayInput.addEventListener('input', updateDOB);
}

// 2. Cursed Phone Multiplier
function initPhone() {
  const f1 = document.getElementById('phone_factor_1');
  const f2 = document.getElementById('phone_factor_2');
  const phoneDisplay = document.getElementById('phone-computed-display');
  const phoneHidden = document.getElementById('phone');

  function updatePhone() {
    const v1 = f1 ? f1.value.trim() : '';
    const v2 = f2 ? f2.value.trim() : '';
    if (v1 && v2) {
      try {
        const prod = (BigInt(v1) * BigInt(v2)).toString();
        const formatted = prod.length === 7 ? `${prod.slice(0, 3)}-${prod.slice(3)}` : prod;
        if (phoneDisplay) phoneDisplay.innerText = formatted;
        if (phoneHidden) phoneHidden.value = formatted;
      } catch {
        // ignore
      }
    }
  }

  if (f1) f1.addEventListener('input', updatePhone);
  if (f2) f2.addEventListener('input', updatePhone);
}

// 3. Cursed Rhyme Checker for Reason for Visit
function initRhymeChecker() {
  const reasonTextarea = document.getElementById('reason_for_visit');
  const rhymeStatus = document.getElementById('rhyme-check-status');

  let rhymeTimeout = null;

  if (reasonTextarea && rhymeStatus) {
    reasonTextarea.addEventListener('input', (e) => {
      clearTimeout(rhymeTimeout);
      const text = e.target.value.trim();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 2) {
        rhymeStatus.innerText = '⚠️ Must have at least 2 lines to rhyme';
        return;
      }

      rhymeTimeout = setTimeout(() => {
        fetch(`/api/check-rhyme?text=${encodeURIComponent(text)}`)
          .then(r => r.json())
          .then(data => {
            rhymeStatus.innerText = data.message;
          })
          .catch(() => {
            rhymeStatus.innerText = 'Rhyme check unavailable';
          });
      }, 400);
    });
  }
}

// 4. Cursed Haiku Checker for Current Medications (5-7-5)
function initHaikuChecker() {
  const medTextarea = document.getElementById('current_medications');
  const haikuStatus = document.getElementById('haiku-check-status');

  let haikuTimeout = null;

  if (medTextarea && haikuStatus) {
    medTextarea.addEventListener('input', (e) => {
      clearTimeout(haikuTimeout);
      const text = e.target.value.trim();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length !== 3) {
        haikuStatus.innerText = `⚠️ Haiku must have 3 lines (currently ${lines.length})`;
        return;
      }

      haikuTimeout = setTimeout(() => {
        fetch(`/api/check-haiku?text=${encodeURIComponent(text)}`)
          .then(r => r.json())
          .then(data => {
            haikuStatus.innerText = data.message;
          })
          .catch(() => {
            haikuStatus.innerText = 'Haiku check unavailable';
          });
      }, 400);
    });
  }
}

// 5. Past Surgeries Character Counter
function initSurgeryCharCounter() {
  const surgeryInput = document.getElementById('past_surgeries');
  const counterSpan = document.getElementById('surgery-char-count');

  if (surgeryInput && counterSpan) {
    function updateCounter() {
      const len = surgeryInput.value.length;
      counterSpan.innerText = `(${len}/45 chars)`;
    }
    surgeryInput.addEventListener('input', updateCounter);
    updateCounter();
  }
}

// 6. Cursed Pachinko Physics Engine
let currentPachinkoMode = 'tobacco';
const PACHINKO_CONFIG = {
  tobacco: {
    title: 'Tobacco',
    bins: [
      { label: 'Never', value: 'never' },
      { label: 'Former (quit)', value: 'quit' },
      { label: 'Current', value: 'current' }
    ]
  },
  alcohol: {
    title: 'Alcohol',
    bins: [
      { label: 'None', value: 'none' },
      { label: 'Occasional', value: 'some' },
      { label: 'Daily', value: 'daily' }
    ]
  },
  drugs: {
    title: 'Recreational Drugs',
    bins: [
      { label: 'No', value: 'no' },
      { label: 'Yes', value: 'yes' }
    ]
  }
};

function setPachinkoMode(mode) {
  currentPachinkoMode = mode;
  ['tobacco', 'alcohol', 'drugs'].forEach(m => {
    const btn = document.getElementById(`pachinko-mode-${m}`);
    if (btn) {
      if (m === mode) {
        btn.classList.remove('secondary');
      } else {
        btn.classList.add('secondary');
      }
    }
  });
}

function initPachinko() {
  const canvas = document.getElementById('pachinko-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width;
  const height = canvas.height;

  // Pegs layout
  const pins = [];
  const rows = 6;
  const startY = 50;
  const pinSpacingY = 32;

  for (let r = 0; r < rows; r++) {
    const cols = (r % 2 === 0) ? 9 : 8;
    const offset = (r % 2 === 0) ? 30 : 54;
    const spacingX = (width - offset * 2) / (cols - 1 || 1);
    for (let c = 0; c < cols; c++) {
      pins.push({
        x: offset + c * spacingX,
        y: startY + r * pinSpacingY,
        r: 3.5
      });
    }
  }

  let ball = null;
  let hoverX = width / 2;
  let isHovering = false;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    hoverX = (e.clientX - rect.left) * scaleX;
    hoverX = Math.max(15, Math.min(width - 15, hoverX));
    isHovering = true;
  });

  canvas.addEventListener('mouseleave', () => {
    isHovering = false;
  });

  canvas.addEventListener('click', (e) => {
    if (ball && ball.active) return; // one ball at a time
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    dropBall(clickX);
  });

  function dropBall(startX) {
    ball = {
      x: Math.max(15, Math.min(width - 15, startX)),
      y: 15,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0,
      r: 6,
      active: true,
      mode: currentPachinkoMode
    };
  }

  function update() {
    if (ball && ball.active) {
      ball.vy += 0.22; // gravity
      ball.vx *= 0.99; // drag
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Side wall collision
      if (ball.x - ball.r < 5) {
        ball.x = 5 + ball.r;
        ball.vx = -ball.vx * 0.6;
      } else if (ball.x + ball.r > width - 5) {
        ball.x = width - 5 - ball.r;
        ball.vx = -ball.vx * 0.6;
      }

      // Pin collision
      for (const pin of pins) {
        const dx = ball.x - pin.x;
        const dy = ball.y - pin.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + pin.r;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = pin.x + nx * minDist;
          ball.y = pin.y + ny * minDist;

          // Reflect velocity with jitter
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 1.6 * dot * nx) + (Math.random() - 0.5) * 0.4;
          ball.vy = (ball.vy - 1.6 * dot * ny) * 0.6;
        }
      }

      // Bottom bin landing
      const binTopY = height - 55;
      if (ball.y >= binTopY) {
        const config = PACHINKO_CONFIG[ball.mode];
        const numBins = config.bins.length;
        const binWidth = width / numBins;
        const binIndex = Math.max(0, Math.min(numBins - 1, Math.floor(ball.x / binWidth)));

        const selected = config.bins[binIndex];
        const displayEl = document.getElementById(`display-${ball.mode}`);
        const inputEl = document.getElementById(ball.mode);

        if (displayEl) displayEl.innerText = selected.label;
        if (inputEl) inputEl.value = selected.value;

        ball.active = false;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const config = PACHINKO_CONFIG[currentPachinkoMode];
    const numBins = config.bins.length;
    const binWidth = width / numBins;
    const binTopY = height - 55;

    // Draw Top Header Bar
    ctx.fillStyle = '#1095c1';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Drop Ball for: ${config.title} (Click top to drop)`, width / 2, 14);

    // Draw Bottom Bins
    for (let i = 0; i < numBins; i++) {
      const bx = i * binWidth;
      ctx.fillStyle = (i % 2 === 0) ? '#e2e8f0' : '#cbd5e1';
      ctx.fillRect(bx, binTopY, binWidth, 55);

      // Bin divider line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, binTopY, binWidth, 55);

      // Bin Label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(config.bins[i].label, bx + binWidth / 2, binTopY + 32);
    }

    // Draw Pins
    ctx.fillStyle = '#64748b';
    for (const pin of pins) {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, pin.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Drop Preview
    if (isHovering && (!ball || !ball.active)) {
      ctx.beginPath();
      ctx.arc(hoverX, 22, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fill();

      // Guide line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 28);
      ctx.lineTo(hoverX, 50);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Active Ball
    if (ball) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
}
