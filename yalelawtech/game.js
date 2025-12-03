// Pandemic: Yale Edition - core simulation
// Framework-free, all vanilla JS. Parameters are grouped near the top for easy balancing.

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const logEl = document.getElementById('log');
const avgInfectionEl = document.getElementById('avgInfection');
const visibleCountEl = document.getElementById('visibleCount');
const cureBarEl = document.getElementById('cureBar');
const curePercentEl = document.getElementById('curePercent');
const footStatusEl = document.getElementById('footStatus');
const diningStatusEl = document.getElementById('diningStatus');
const socialStatusEl = document.getElementById('socialStatus');
const pathogenSelect = document.getElementById('pathogenSelect');
const pathogenProfileEl = document.getElementById('pathogenProfile');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// ---- Tunable parameters ----
const TICK_MS = 600;
const VISIBILITY_THRESHOLD = 0.4;
const WIN_THRESHOLD = 0.98;
const BASE_CURE_RATE = 0.0008;
const VISIBILITY_CURE_BOOST = 0.0012;
const GLOBAL_INFECTION_CURE_MULTIPLIER = 0.001;
const RESTRICTION_TRIGGER = 0.6; // cure progress point for heavy restrictions
const LOG_LIMIT = 120;

// Pathogen archetypes
const PATHOGENS = {
  algorithm: {
    name: 'Algorithm',
    growth: 0.035,
    cureResist: 0.7,
    vectors: { foot: 0.22, dining: 0.13, social: 0.25 },
    news: 'Algorithm detected in FYP scroll loops.'
  },
  platform: {
    name: 'Platform Culture',
    growth: 0.026,
    cureResist: 1,
    vectors: { foot: 0.18, dining: 0.18, social: 0.18 },
    news: 'Platform Culture shifts IRL norms.'
  },
  loneliness: {
    name: 'Loneliness',
    growth: 0.018,
    cureResist: 1.35,
    vectors: { foot: 0.12, dining: 0.1, social: 0.14 },
    news: 'Loneliness creeps through empty lounges.'
  }
};

// College map data: position + resistances
const colleges = [
  {
    id: 'branford',
    name: 'Branford / Saybrook',
    x: 360,
    y: 260,
    physicalResist: 0.3,
    architecturalResist: 0.2,
    cohesionResist: 0.35,
    hasDining: true
  },
  { id: 'trumbull', name: 'Trumbull', x: 320, y: 210, physicalResist: 0.35, architecturalResist: 0.25, cohesionResist: 0.25, hasDining: true },
  { id: 'hopper', name: 'Hopper', x: 270, y: 330, physicalResist: 0.2, architecturalResist: 0.15, cohesionResist: 0.2, hasDining: true },
  { id: 'je', name: 'Jonathan Edwards', x: 420, y: 220, physicalResist: 0.28, architecturalResist: 0.35, cohesionResist: 0.3, hasDining: true },
  { id: 'davenport', name: 'Davenport', x: 300, y: 280, physicalResist: 0.18, architecturalResist: 0.15, cohesionResist: 0.33, hasDining: true },
  { id: 'pierson', name: 'Pierson', x: 260, y: 250, physicalResist: 0.2, architecturalResist: 0.2, cohesionResist: 0.25, hasDining: true },
  { id: 'berkeley', name: 'Berkeley', x: 380, y: 190, physicalResist: 0.25, architecturalResist: 0.2, cohesionResist: 0.32, hasDining: true },
  { id: 'td', name: 'Timothy Dwight', x: 470, y: 180, physicalResist: 0.45, architecturalResist: 0.22, cohesionResist: 0.18, hasDining: true },
  { id: 'silliman', name: 'Silliman', x: 520, y: 230, physicalResist: 0.4, architecturalResist: 0.15, cohesionResist: 0.2, hasDining: true },
  { id: 'morse', name: 'Morse / Stiles', x: 450, y: 270, physicalResist: 0.42, architecturalResist: 0.4, cohesionResist: 0.22, hasDining: true },
  { id: 'franklin', name: 'Franklin / Murray', x: 650, y: 240, physicalResist: 0.55, architecturalResist: 0.25, cohesionResist: 0.2, hasDining: true }
];

// Neighbor routes for foot-traffic (undirected)
const connections = [
  ['branford', 'je'],
  ['branford', 'trumbull'],
  ['branford', 'davenport'],
  ['trumbull', 'je'],
  ['trumbull', 'berkeley'],
  ['je', 'berkeley'],
  ['davenport', 'pierson'],
  ['davenport', 'hopper'],
  ['pierson', 'hopper'],
  ['berkeley', 'td'],
  ['berkeley', 'silliman'],
  ['td', 'silliman'],
  ['silliman', 'morse'],
  ['morse', 'td'],
  ['morse', 'franklin'],
  ['silliman', 'franklin']
];

const state = {
  pathogen: PATHOGENS.algorithm,
  infection: {},
  cureProgress: 0,
  running: false,
  tickHandle: null,
  restrictionApplied: false,
  vectors: {
    footActive: false,
    diningActive: false,
    socialActive: true
  }
};

function initState() {
  state.infection = {};
  colleges.forEach((col) => {
    state.infection[col.id] = 0;
  });
  const seed = colleges[Math.floor(Math.random() * colleges.length)];
  state.infection[seed.id] = 0.2;
  addLog(`Outbreak begins in ${seed.name}. ${state.pathogen.news}`);
  state.cureProgress = 0;
  state.restrictionApplied = false;
  state.vectors.footActive = false;
  state.vectors.diningActive = false;
  state.running = false;
  updateUI();
  draw();
}

// --- Core simulation loop ---
function tick() {
  spreadInternal();
  spreadBetween();
  updateCure();
  applyRestrictions();
  draw();
  updateUI();
  checkEndgame();
}

// Internal growth within a college
function spreadInternal() {
  colleges.forEach((col) => {
    const current = state.infection[col.id];
    if (current <= 0) return;
    const growth = state.pathogen.growth * (1 - col.cohesionResist) * (Math.random() * 0.5 + 0.75);
    const newInfection = Math.min(1, current + growth);
    state.infection[col.id] = newInfection;
    maybeLogSymptom(col, newInfection);
  });
}

// Spread between colleges through vectors
function spreadBetween() {
  const avg = averageInfection();
  state.vectors.footActive = avg >= 0.1;
  state.vectors.diningActive = avg >= 0.35;

  colleges.forEach((source) => {
    const infLevel = state.infection[source.id];
    if (infLevel <= 0.02) return;

    // Social media: always active
    colleges.forEach((target) => {
      if (target.id === source.id) return;
      attemptSpread(source, target, 'social');
    });

    // Foot-traffic: only neighbors
    if (state.vectors.footActive) {
      neighborsOf(source.id).forEach((targetId) => {
        const target = colleges.find((c) => c.id === targetId);
        attemptSpread(source, target, 'foot');
      });
    }

    // Dining halls: clique among dining colleges
    if (state.vectors.diningActive) {
      const diningTargets = colleges.filter((c) => c.hasDining && c.id !== source.id);
      diningTargets.forEach((target) => attemptSpread(source, target, 'dining'));
    }
  });
}

function attemptSpread(source, target, vector) {
  const base = state.pathogen.vectors[vector];
  const infLevel = state.infection[source.id];
  const resist = vector === 'foot'
    ? (target.physicalResist + target.architecturalResist * 0.5)
    : vector === 'dining'
      ? (target.architecturalResist * 0.6)
      : target.cohesionResist;

  // Restrictions reduce effectiveness
  const restrictionPenalty = state.restrictionApplied ? 0.6 : 1;

  let probability = base * infLevel * (1 - resist) * restrictionPenalty;
  probability = Math.max(0, Math.min(probability, 0.8));

  if (Math.random() < probability) {
    const bump = 0.1 * (1 - resist) * (Math.random() * 0.5 + 0.75);
    const current = state.infection[target.id];
    const newValue = Math.min(1, current + bump);
    if (current === 0 && newValue > 0) {
      addLog(`${source.name} spread via ${vectorLabel(vector)} to ${target.name}.`);
    }
    state.infection[target.id] = newValue;
  }
}

function vectorLabel(vector) {
  if (vector === 'foot') return 'foot-traffic';
  if (vector === 'dining') return 'dining hall chatter';
  return 'social media';
}

// Cure progression scales with visibility and infection
function updateCure() {
  const visible = visibleColleges();
  const avg = averageInfection();
  const visibilityFactor = visible * VISIBILITY_CURE_BOOST;
  const infectionFactor = avg * GLOBAL_INFECTION_CURE_MULTIPLIER;
  const pathogenResist = state.pathogen.cureResist;
  const rate = (BASE_CURE_RATE + visibilityFactor + infectionFactor) / pathogenResist;
  state.cureProgress = Math.min(1, state.cureProgress + rate);
}

function applyRestrictions() {
  if (state.restrictionApplied) return;
  if (state.cureProgress >= RESTRICTION_TRIGGER) {
    state.restrictionApplied = true;
    addLog('Campus tightens movement and dining to fight the contagion.', 'status-warning');
  }
}

function checkEndgame() {
  const allInfected = colleges.every((c) => state.infection[c.id] >= WIN_THRESHOLD);
  if (allInfected) {
    endSimulation();
    addLog('Every college is transformed. You win.', 'status-win');
    return;
  }
  if (state.cureProgress >= 1) {
    endSimulation();
    addLog('Yale completes the cure. Outbreak contained.', 'status-lose');
  }
}

function endSimulation() {
  state.running = false;
  if (state.tickHandle) clearInterval(state.tickHandle);
  state.tickHandle = null;
}

function visibleColleges() {
  return colleges.filter((c) => state.infection[c.id] >= VISIBILITY_THRESHOLD).length;
}

function averageInfection() {
  const sum = colleges.reduce((acc, c) => acc + state.infection[c.id], 0);
  return sum / colleges.length;
}

// --- Rendering ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  colleges.forEach(drawCollege);
}

function drawConnections() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  connections.forEach(([aId, bId]) => {
    const a = colleges.find((c) => c.id === aId);
    const b = colleges.find((c) => c.id === bId);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
}

function infectionColor(level) {
  if (level < 0.25) return '#2563eb';
  if (level < 0.6) return '#f59e0b';
  return '#ef4444';
}

function drawCollege(col) {
  const level = state.infection[col.id];
  const radius = 34;
  ctx.beginPath();
  ctx.fillStyle = infectionColor(level);
  ctx.strokeStyle = '#0b1220';
  ctx.lineWidth = 3;
  ctx.arc(col.x, col.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0b1220';
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(col.x, col.y + 10, radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(col.name, col.x, col.y - 4);
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${Math.round(level * 100)}%`, col.x, col.y + 14);
}

// --- UI helpers ---
function updateUI() {
  const avg = averageInfection();
  avgInfectionEl.textContent = `${Math.round(avg * 100)}%`;
  visibleCountEl.textContent = `${visibleColleges()} / ${colleges.length}`;
  cureBarEl.style.width = `${(state.cureProgress * 100).toFixed(1)}%`;
  curePercentEl.textContent = `${Math.round(state.cureProgress * 100)}%`;
  pathogenProfileEl.textContent = state.pathogen.name;

  footStatusEl.textContent = state.vectors.footActive ? 'Active' : 'Locked';
  diningStatusEl.textContent = state.vectors.diningActive ? 'Active' : 'Locked';
  socialStatusEl.textContent = state.vectors.socialActive ? 'Active' : 'Disabled';
}

function addLog(message, statusClass = '') {
  const entry = document.createElement('div');
  entry.classList.add('log-entry');
  if (statusClass) entry.classList.add(statusClass);
  const time = document.createElement('span');
  time.className = 'log-time';
  const now = new Date();
  time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const text = document.createElement('span');
  text.textContent = message;
  entry.append(time, text);
  logEl.prepend(entry);
  while (logEl.children.length > LOG_LIMIT) logEl.removeChild(logEl.lastChild);
}

// Tooltip interaction
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const pointer = { x: x * scaleX, y: y * scaleY };
  const hovered = colleges.find((col) => distance(col, pointer) < 34);
  if (hovered) {
    tooltip.style.opacity = 1;
    tooltip.style.left = `${e.clientX + 12}px`;
    tooltip.style.top = `${e.clientY + 12}px`;
    tooltip.innerHTML = `<strong>${hovered.name}</strong><br />${Math.round(state.infection[hovered.id] * 100)}% infected`;
  } else {
    tooltip.style.opacity = 0;
  }
});

canvas.addEventListener('mouseleave', () => {
  tooltip.style.opacity = 0;
});

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function neighborsOf(id) {
  return connections
    .filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => (a === id ? b : a));
}

// --- Event wiring ---
startBtn.addEventListener('click', () => {
  if (state.running) return;
  state.running = true;
  state.tickHandle = setInterval(tick, TICK_MS);
  addLog(`${state.pathogen.name} simulation running.`);
});

pauseBtn.addEventListener('click', () => {
  if (!state.running) return;
  state.running = false;
  if (state.tickHandle) clearInterval(state.tickHandle);
  state.tickHandle = null;
  addLog('Simulation paused.');
});

resetBtn.addEventListener('click', () => {
  endSimulation();
  initState();
  addLog('Simulation reset.');
});

pathogenSelect.addEventListener('change', (e) => {
  const chosen = PATHOGENS[e.target.value];
  state.pathogen = chosen;
  pathogenProfileEl.textContent = chosen.name;
  addLog(`Pathogen set to ${chosen.name}.`);
});

function maybeLogSymptom(college, level) {
  if (level >= VISIBILITY_THRESHOLD && level - state.pathogen.growth < VISIBILITY_THRESHOLD) {
    addLog(`${college.name} now visibly affected.`, 'status-warning');
  }
  if (Math.random() < 0.02 && level > 0.75) {
    const symptom = symptomText();
    addLog(`${college.name}: ${symptom}`);
  }
}

function symptomText() {
  if (state.pathogen === PATHOGENS.algorithm) {
    return 'students caught doom-scrolling between classes.';
  }
  if (state.pathogen === PATHOGENS.platform) {
    return 'dating-app pings outnumber seminar questions.';
  }
  return 'common rooms sit empty as chats move online.';
}

// --- Kick things off ---
initState();
addLog('Choose your pathogen and press Start. Social media is always active.');
