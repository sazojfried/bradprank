const archetypes = {
  algorithm: { name: 'Algorithm', reach: 14, burnout: 6, visibility: 10, resilience: 4, news: 'Algorithm detected in endless scroll loops.' },
  platform: { name: 'Platform Culture', reach: 11, burnout: 7, visibility: 7, resilience: 6, news: 'Platform norms quietly reshape campus routines.' },
  loneliness: { name: 'Loneliness', reach: 9, burnout: 5, visibility: 5, resilience: 8, news: 'Loneliness creeps through empty lounges.' }
};

const colleges = [
  { name: 'Branford / Saybrook', population: 1200 },
  { name: 'Trumbull', population: 1200 },
  { name: 'Hopper', population: 1200 },
  { name: 'Jonathan Edwards', population: 1200 },
  { name: 'Davenport', population: 1200 },
  { name: 'Pierson', population: 1200 },
  { name: 'Berkeley', population: 1200 },
  { name: 'Timothy Dwight', population: 1200 },
  { name: 'Silliman', population: 1200 },
  { name: 'Morse / Stiles', population: 1200 },
  { name: 'Franklin / Murray', population: 1200 }
];

const upgradeGroups = {
  symptoms: [
    { id: 'doomscroll', name: 'Doomscrolling', cost: 4, effect: { reach: 2, visibility: 1 }, desc: 'Higher reach via constant feeds.' },
    { id: 'notif', name: 'Notification Checking', cost: 5, effect: { reach: 2, burnout: 1 }, desc: 'Micro-spikes of attention capture.' },
    { id: 'lateNight', name: 'Late-night Insomnia', cost: 6, effect: { reach: 3, burnout: 2 }, desc: 'Nighttime spread accelerates growth.' },
    { id: 'ghosting', name: 'Ghosting & Benching', cost: 6, effect: { visibility: 2, reach: 1 }, desc: 'Social withdrawal increases stealth.' },
    { id: 'overshare', name: 'Oversharing Regret', cost: 7, effect: { burnout: 2, visibility: 3 }, desc: 'Visible spirals raise cure response.' }
  ],
  resilience: [
    { id: 'distance1', name: 'Distance I', cost: 3, effect: { resilience: 2 }, desc: 'Small buffers against burnout.' },
    { id: 'architecture1', name: 'Architecture I', cost: 4, effect: { resilience: 2, reach: -1 }, desc: 'Maze-like dorms slow spread but protect morale.' },
    { id: 'cohesion1', name: 'Cohesion I', cost: 4, effect: { resilience: 3 }, desc: 'Peer support dampens burnout.' },
    { id: 'policy1', name: 'Policy I', cost: 5, effect: { resilience: 2, visibility: -1 }, desc: 'Quiet guardrails reduce how visible the pathogen is.' }
  ],
  transmission: [
    { id: 'foot', name: 'Foot-Traffic', cost: 5, effect: { reach: 2 }, vector: 'foot', desc: 'Unlock walking routes between colleges.' },
    { id: 'dining', name: 'Dining Hall', cost: 6, effect: { reach: 3 }, vector: 'dining', desc: 'Enable shared meal-time spread.' },
    { id: 'social', name: 'Social Media', cost: 3, effect: { reach: 1, visibility: 1 }, vector: 'social', desc: 'Always on but improves with upgrades.' }
  ]
};

const state = {
  pathogenName: 'Sickanitus',
  archetype: archetypes.algorithm,
  evolutionPoints: 12,
  day: 0,
  running: false,
  interval: null,
  cureProgress: 0,
  stats: { reach: 12, burnout: 6, visibility: 8, resilience: 5 },
  purchased: new Set(),
  vectors: { foot: false, dining: false, social: true },
  colleges: []
};

const ui = {
  pathogenInput: document.getElementById('pathogenInput'),
  archetypeSelect: document.getElementById('archetypeSelect'),
  pathogenName: document.getElementById('pathogenName'),
  evoPoints: document.getElementById('evoPoints'),
  dayCount: document.getElementById('dayCount'),
  reachVal: document.getElementById('reachVal'),
  burnoutVal: document.getElementById('burnoutVal'),
  visibilityVal: document.getElementById('visibilityVal'),
  resilienceVal: document.getElementById('resilienceVal'),
  reachBar: document.getElementById('reachBar'),
  burnoutBar: document.getElementById('burnoutBar'),
  visibilityBar: document.getElementById('visibilityBar'),
  resilienceBar: document.getElementById('resilienceBar'),
  vectorFoot: document.getElementById('vectorFoot'),
  vectorDining: document.getElementById('vectorDining'),
  vectorSocial: document.getElementById('vectorSocial'),
  newsLog: document.getElementById('newsLog'),
  curePercent: document.getElementById('curePercent'),
  collegeTable: document.getElementById('collegeTable'),
  simStatus: document.getElementById('simStatus'),
  buttons: {
    start: document.getElementById('startBtn'),
    pause: document.getElementById('pauseBtn'),
    reset: document.getElementById('resetBtn')
  },
  lists: {
    symptoms: document.getElementById('symptomList'),
    resilience: document.getElementById('resilienceList'),
    transmission: document.getElementById('transmissionList')
  }
};

function resetState() {
  state.purchased = new Set();
  state.evolutionPoints = 12;
  state.day = 0;
  state.cureProgress = 0;
  state.stats = { ...state.archetype };
  delete state.stats.name;
  delete state.stats.news;
  state.vectors = { foot: false, dining: false, social: true };
  state.colleges = colleges.map((c, idx) => ({ ...c, infected: idx === 0 ? 0.15 : 0, burnout: 0 }));
  log(`${state.archetype.name} chosen. ${state.archetype.news}`);
  renderAll();
}

function applyArchetype(key) {
  state.archetype = archetypes[key];
  ui.pathogenName.textContent = state.archetype.name;
  resetState();
}

function renderAll() {
  ui.pathogenName.textContent = state.archetype.name;
  ui.evoPoints.textContent = state.evolutionPoints.toFixed(0);
  ui.dayCount.textContent = state.day;
  ui.curePercent.textContent = `${state.cureProgress.toFixed(0)}%`;

  const { reach, burnout, visibility, resilience } = state.stats;
  ui.reachVal.textContent = reach.toFixed(0);
  ui.burnoutVal.textContent = burnout.toFixed(0);
  ui.visibilityVal.textContent = visibility.toFixed(0);
  ui.resilienceVal.textContent = resilience.toFixed(0);

  ui.reachBar.style.width = `${Math.min(100, reach * 3)}%`;
  ui.burnoutBar.style.width = `${Math.min(100, burnout * 3)}%`;
  ui.visibilityBar.style.width = `${Math.min(100, visibility * 3)}%`;
  ui.resilienceBar.style.width = `${Math.min(100, resilience * 3)}%`;

  updateVectorPills();
  renderUpgrades();
  renderTable();
  updateStatus();
}

function updateVectorPills() {
  [['vectorFoot', 'foot'], ['vectorDining', 'dining'], ['vectorSocial', 'social']].forEach(([key, vector]) => {
    const pill = ui[key];
    const active = state.vectors[vector];
    pill.classList.toggle('active', active);
    pill.textContent = `${pill.textContent.split(':')[0]}: ${active ? 'Online' : 'Offline'}`;
  });
}

function log(message) {
  const el = document.createElement('div');
  el.className = 'log-item';
  const dayLabel = `Day ${state.day}`;
  el.innerHTML = `<strong>${dayLabel}:</strong> ${message}`;
  ui.newsLog.prepend(el);
  const maxItems = 80;
  while (ui.newsLog.children.length > maxItems) ui.newsLog.removeChild(ui.newsLog.lastChild);
}

function renderUpgrades() {
  ['symptoms', 'resilience', 'transmission'].forEach((groupKey) => {
    const container = ui.lists[groupKey];
    container.innerHTML = '';
    upgradeGroups[groupKey].forEach((up) => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      const purchased = state.purchased.has(up.id);
      card.innerHTML = `
        <div class="upgrade-meta">
          <h3>${up.name}</h3>
          <span class="badge cost">-${up.cost} EP</span>
        </div>
        <p>${up.desc}</p>
        <p class="label">Impact: ${formatEffect(up.effect)}</p>
        <button ${purchased ? 'disabled' : ''} class="${purchased ? 'purchased' : ''}" data-upgrade="${up.id}">
          ${purchased ? 'Purchased' : 'Buy Upgrade'}
        </button>
      `;
      container.appendChild(card);
    });
  });
}

function formatEffect(effect) {
  const parts = [];
  Object.entries(effect).forEach(([key, val]) => {
    const label = key === 'reach' ? 'Reach' : key === 'burnout' ? 'Burnout' : key === 'visibility' ? 'Visibility' : 'Resilience';
    const prefix = val >= 0 ? '+' : '';
    parts.push(`${prefix}${val} ${label}`);
  });
  return parts.join(' · ');
}

function renderTable() {
  ui.collegeTable.innerHTML = '';
  state.colleges.forEach((c) => {
    const row = document.createElement('tr');
    const infectedPct = (c.infected * 100).toFixed(1);
    const burnoutPct = (c.burnout * 100).toFixed(1);
    row.innerHTML = `
      <td>${c.name}</td>
      <td>${c.population}</td>
      <td><div class="progress-chip"><span style="--fill:${Math.min(100, infectedPct)}%"></span>${infectedPct}%</div></td>
      <td><div class="progress-chip"><span style="--fill:${Math.min(100, burnoutPct)}%"></span>${burnoutPct}%</div></td>
    `;
    ui.collegeTable.appendChild(row);
  });
}

function handleUpgrade(id) {
  const upgrade = Object.values(upgradeGroups).flat().find((u) => u.id === id);
  if (!upgrade || state.purchased.has(id)) return;
  if (state.evolutionPoints < upgrade.cost) {
    log(`Not enough evolution points for ${upgrade.name}.`);
    return;
  }

  state.evolutionPoints -= upgrade.cost;
  state.purchased.add(id);
  Object.entries(upgrade.effect).forEach(([key, val]) => {
    state.stats[key] = Math.max(0, state.stats[key] + val);
  });
  if (upgrade.vector) state.vectors[upgrade.vector] = true;
  log(`${upgrade.name} unlocked.`);
  renderAll();
}

function tick() {
  state.day += 1;
  const infectionGain = Math.max(0.003, state.stats.reach * 0.0006);
  const burnoutGain = Math.max(0.001, (state.stats.burnout - state.stats.resilience * 0.4) * 0.0006);
  const cureGain = Math.max(0.1, state.stats.visibility * 0.12);

  state.colleges.forEach((c) => {
    const spreadBoost = (state.vectors.foot ? 1.15 : 1) + (state.vectors.dining ? 0.15 : 0) + (state.vectors.social ? 0.2 : 0);
    c.infected = Math.min(1, c.infected + infectionGain * spreadBoost);
    c.burnout = Math.min(1, c.burnout + Math.max(0, burnoutGain));
  });

  // unlock vectors as campuses heat up
  const avgInfection = state.colleges.reduce((a, c) => a + c.infected, 0) / state.colleges.length;
  if (avgInfection > 0.25) state.vectors.foot = true;
  if (avgInfection > 0.55) state.vectors.dining = true;

  // evolution points
  const pointsEarned = 1 + Math.floor(avgInfection * 10);
  state.evolutionPoints += pointsEarned;

  // cure advances
  state.cureProgress = Math.min(100, state.cureProgress + cureGain * (state.stats.visibility / 10));

  renderAll();
  checkEndgame();
}

function checkEndgame() {
  const allInfected = state.colleges.every((c) => c.infected >= 0.98);
  if (allInfected) {
    log('Every college transformed. You win!');
    stopSimulation();
    ui.simStatus.textContent = 'Victory';
    return;
  }
  if (state.cureProgress >= 100) {
    log('Cure reached 100%. Campus resists the pathogen.');
    stopSimulation();
    ui.simStatus.textContent = 'Cured';
  }
}

function startSimulation() {
  if (state.running) return;
  state.running = true;
  ui.simStatus.textContent = 'Running';
  ui.simStatus.className = 'status status--running';
  state.interval = setInterval(tick, 800);
}

function stopSimulation() {
  state.running = false;
  ui.simStatus.className = 'status status--paused';
  clearInterval(state.interval);
}

function resetSimulation() {
  clearInterval(state.interval);
  state.running = false;
  ui.simStatus.className = 'status status--idle';
  resetState();
}

function updateStatus() {
  if (!state.running && state.cureProgress === 0 && state.day === 0) {
    ui.simStatus.textContent = 'Idle';
    ui.simStatus.className = 'status status--idle';
  }
}

ui.archetypeSelect.addEventListener('change', (e) => applyArchetype(e.target.value));
ui.pathogenInput.addEventListener('input', (e) => state.pathogenName = e.target.value);
ui.buttons.start.addEventListener('click', startSimulation);
ui.buttons.pause.addEventListener('click', stopSimulation);
ui.buttons.reset.addEventListener('click', resetSimulation);

ui.pageListener = document.body;
ui.pageListener.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-upgrade]');
  if (btn) handleUpgrade(btn.dataset.upgrade);
});

resetState();
renderAll();
