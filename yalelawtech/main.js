// Pandemic: Yale Edition
// Core simulation logic

// Canvas setup
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("tooltip");

// Controls
const pathogenSelect = document.getElementById("pathogenSelect");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const infectedCountEl = document.getElementById("infectedCount");
const avgInfectionEl = document.getElementById("avgInfection");
const cureBar = document.getElementById("cureBar");
const statusText = document.getElementById("statusText");
const newsLog = document.getElementById("newsLog");

const vecFootIndicator = document.getElementById("vecFootIndicator");
const vecDiningIndicator = document.getElementById("vecDiningIndicator");
const vecSocialIndicator = document.getElementById("vecSocialIndicator");

// Simulation constants
const TICK_MS = 200; // game tick interval
const MAX_INFECTION = 1.0;
const INITIAL_INFECTION = 0.25;
const CURE_MAX = 1.0;

// Colleges = "countries"
const colleges = [
  {
    id: 1,
    name: "Branford / Saybrook",
    x: 350,
    y: 290,
    resistance: { distance: 0.2, architecture: 0.3, cohesion: 0.4 },
    // neighbors for foot-traffic
    neighborsFoot: [2, 3, 4, 5, 9],
    hasDining: true,
    remote: false
  },
  {
    id: 2,
    name: "Trumbull",
    x: 320,
    y: 250,
    resistance: { distance: 0.3, architecture: 0.6, cohesion: 0.4 },
    neighborsFoot: [1, 4],
    hasDining: false,
    remote: false
  },
  {
    id: 3,
    name: "Hopper",
    x: 380,
    y: 330,
    resistance: { distance: 0.2, architecture: 0.3, cohesion: 0.3 },
    neighborsFoot: [1, 5, 6],
    hasDining: false,
    remote: false
  },
  {
    id: 4,
    name: "Jonathan Edwards",
    x: 330,
    y: 280,
    resistance: { distance: 0.3, architecture: 0.7, cohesion: 0.4 },
    neighborsFoot: [1, 2],
    hasDining: false,
    remote: false
  },
  {
    id: 5,
    name: "Davenport",
    x: 410,
    y: 310,
    resistance: { distance: 0.2, architecture: 0.3, cohesion: 0.5 },
    neighborsFoot: [1, 3, 6, 9],
    hasDining: true,
    remote: false
  },
  {
    id: 6,
    name: "Pierson",
    x: 440,
    y: 330,
    resistance: { distance: 0.3, architecture: 0.3, cohesion: 0.4 },
    neighborsFoot: [3, 5, 9],
    hasDining: false,
    remote: false
  },
  {
    id: 7,
    name: "Berkeley",
    x: 500,
    y: 260,
    resistance: { distance: 0.3, architecture: 0.3, cohesion: 0.5 },
    neighborsFoot: [8, 9, 10],
    hasDining: true,
    remote: false
  },
  {
    id: 8,
    name: "Timothy Dwight",
    x: 540,
    y: 220,
    resistance: { distance: 0.5, architecture: 0.4, cohesion: 0.4 },
    neighborsFoot: [7, 9],
    hasDining: false,
    remote: false
  },
  {
    id: 9,
    name: "Silliman",
    x: 470,
    y: 300,
    resistance: { distance: 0.3, architecture: 0.3, cohesion: 0.2 },
    neighborsFoot: [1, 5, 6, 7, 10],
    hasDining: true,
    remote: false
  },
  {
    id: 10,
    name: "Morse / Stiles",
    x: 490,
    y: 340,
    resistance: { distance: 0.4, architecture: 0.6, cohesion: 0.4 },
    neighborsFoot: [7, 9],
    hasDining: false,
    remote: false
  },
  {
    id: 11,
    name: "Franklin / Murray",
    x: 720,
    y: 260,
    resistance: { distance: 0.7, architecture: 0.4, cohesion: 0.3 },
    neighborsFoot: [], // foot-traffic barely reaches here; mainly social media
    hasDining: true,
    remote: true
  }
];

// Mapping from id to index for convenience
const idToIndex = {};
colleges.forEach((c, idx) => {
  idToIndex[c.id] = idx;
});

// Game state
let state = {
  running: false,
  tick: 0,
  pathogen: "algorithm", // algorithm | platform | loneliness
  cureProgress: 0,
  vectors: {
    footTraffic: false,
    diningHall: false,
    socialMedia: true // always on, like air routes
  },
  collegesState: [],
  timer: null
};

function createInitialCollegeState() {
  return colleges.map((c) => ({
    id: c.id,
    infection: 0,
    visible: false,
    closedBorders: false,
    diningClosed: false
  }));
}

// Utility: random float [0,1)
function rand() {
  return Math.random();
}

// ----------------- Simulation Core ----------------- //

function resetGame() {
  state.running = false;
  state.tick = 0;
  state.cureProgress = 0;
  state.pathogen = pathogenSelect.value;
  state.vectors = {
    footTraffic: false,
    diningHall: false,
    socialMedia: true
  };
  state.collegesState = createInitialCollegeState();

  // Seed infection in a college depending on pathogen type
  let seedIndex;
  if (state.pathogen === "algorithm") {
    // Start in a dense hub
    seedIndex = idToIndex[9]; // Silliman
  } else if (state.pathogen === "platform") {
    // Start in a social nightlife hub
    seedIndex = idToIndex[3]; // Hopper
  } else {
    // loneliness: start in remote / isolated
    seedIndex = idToIndex[11]; // Franklin/Murray
  }

  state.collegesState[seedIndex].infection = INITIAL_INFECTION;
  logNews(
    `Outbreak of ${prettyPathogen(
      state.pathogen
    )} detected in ${colleges[seedIndex].name}.`
  );
  updateUI();
  draw();
}

function startGame() {
  if (state.running) return;
  state.running = true;
  statusText.textContent = "Simulation running...";
  startBtn.disabled = true;
  pathogenSelect.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  state.timer = setInterval(tick, TICK_MS);
}

function pauseGame() {
  state.running = false;
  statusText.textContent = "Paused.";
  startBtn.disabled = false;
  pathogenSelect.disabled = false;
  pauseBtn.disabled = true;
  if (state.timer) clearInterval(state.timer);
}

function stopGameTimer() {
  if (state.timer) clearInterval(state.timer);
  state.running = false;
  startBtn.disabled = true;
  pauseBtn.disabled = true;
  pathogenSelect.disabled = true;
}

// Main tick
function tick() {
  state.tick++;

  // Unlock vectors at certain infection thresholds
  const avg = getAverageInfection();
  if (avg > 0.15) state.vectors.footTraffic = true;
  if (avg > 0.35) state.vectors.diningHall = true;

  spreadInfection();
  advanceInfection();
  updateCure(avg);
  updateUI();
  draw();

  checkEndConditions();
}

function getCollegeStateById(id) {
  return state.collegesState[idToIndex[id]];
}

function spreadInfection() {
  const newInfections = new Array(state.collegesState.length).fill(0);

  state.collegesState.forEach((cs, idx) => {
    if (cs.infection <= 0) return;
    const college = colleges[idx];

    // Foot-traffic spread (land border / airborne analog)
    if (state.vectors.footTraffic && !cs.closedBorders) {
      college.neighborsFoot.forEach((nid) => {
        const nIdx = idToIndex[nid];
        const target = colleges[nIdx];
        const tState = state.collegesState[nIdx];

        const baseRate = pathogenFootRate();
        const resist = target.resistance.distance + target.resistance.architecture;
        let p = baseRate * (1 - resist);

        if (rand() < p) {
          newInfections[nIdx] += 0.05;
        }
      });
    }

    // Dining-hall spread (waterborne analog)
    if (state.vectors.diningHall && college.hasDining && !cs.diningClosed) {
      // Infect any other dining hall college
      colleges.forEach((other, oIdx) => {
        if (!other.hasDining) return;
        if (oIdx === idx) return;
        const oState = state.collegesState[oIdx];

        const baseRate = pathogenDiningRate();
        const resist = other.resistance.cohesion;
        let p = baseRate * (1 - resist);

        if (rand() < p) {
          newInfections[oIdx] += 0.04;
        }
      });
    }

    // Social media spread (air routes analog)
    if (state.vectors.socialMedia) {
      colleges.forEach((other, oIdx) => {
        if (oIdx === idx) return;
        const otherState = state.collegesState[oIdx];
        const baseRate = pathogenSocialRate();
        const resist = other.resistance.cohesion * 0.5;
        const p = baseRate * (1 - resist);

        if (rand() < p) {
          newInfections[oIdx] += 0.02;
        }
      });
    }
  });

  // Apply new infections
  state.collegesState.forEach((cs, idx) => {
    cs.infection = Math.min(
      MAX_INFECTION,
      cs.infection + newInfections[idx]
    );
  });
}

// Infection growth within a college
function advanceInfection() {
  state.collegesState.forEach((cs, idx) => {
    if (cs.infection <= 0) return;

    const college = colleges[idx];
    // Base growth depends on pathogen
    const growth = pathogenGrowthRate() * (1 - college.resistance.cohesion);
    cs.infection = Math.min(MAX_INFECTION, cs.infection + growth);

    // Visibility threshold
    if (!cs.visible && cs.infection > 0.4) {
      cs.visible = true;
      // News item
      logNews(`Symptoms reported in ${college.name}.`);
    }
  });
}

// Cure progress
function updateCure(avgInfection) {
  // Cure grows faster the more visible infections there are
  const visibleCount = state.collegesState.filter((c) => c.visible).length;
  const visibilityFactor = visibleCount / state.collegesState.length;

  // Slow government (Newsweek), but accelerating over time
  let base = 0.0005; // very slow
  base += visibilityFactor * 0.001;
  base += avgInfection * 0.0005;

  // Loneliness is harder to cure; Algorithm is easier
  if (state.pathogen === "loneliness") base *= 0.6;
  if (state.pathogen === "algorithm") base *= 1.3;

  state.cureProgress = Math.min(CURE_MAX, state.cureProgress + base);
}

// End conditions
function checkEndConditions() {
  const allInfected = state.collegesState.every(
    (cs) => cs.infection >= MAX_INFECTION * 0.98
  );

  if (allInfected) {
    logNews("All colleges fully infected. You win.");
    statusText.textContent = "You win. The campus has been fully reshaped.";
    stopGameTimer();
    return;
  }

  if (state.cureProgress >= CURE_MAX) {
    logNews("Cure completed. Outbreak contained.");
    statusText.textContent =
      "Cure completed. Your social pathogen has been contained.";
    stopGameTimer();
  }
}

// Pathogen-specific parameters

function prettyPathogen(type) {
  if (type === "algorithm") return "Algorithm";
  if (type === "platform") return "Platform Culture";
  return "Loneliness";
}

function pathogenGrowthRate() {
  if (state.pathogen === "algorithm") return 0.01;
  if (state.pathogen === "platform") return 0.007;
  return 0.004; // loneliness
}

function pathogenFootRate() {
  if (state.pathogen === "algorithm") return 0.35;
  if (state.pathogen === "platform") return 0.25;
  return 0.18;
}

function pathogenDiningRate() {
  if (state.pathogen === "algorithm") return 0.25;
  if (state.pathogen === "platform") return 0.20;
  return 0.15;
}

function pathogenSocialRate() {
  if (state.pathogen === "algorithm") return 0.18;
  if (state.pathogen === "platform") return 0.16;
  return 0.12;
}

// ----------------- UI & Drawing ----------------- //

function updateUI() {
  const infectedCount = state.collegesState.filter(
    (c) => c.infection > 0.01
  ).length;
  infectedCountEl.textContent = infectedCount.toString();

  const avg = getAverageInfection();
  avgInfectionEl.textContent = `${Math.round(avg * 100)}%`;

  const curePct = state.cureProgress * 100;
  cureBar.style.width = `${curePct}%`;

  // Vector indicators
  vecFootIndicator.classList.toggle("active", state.vectors.footTraffic);
  vecDiningIndicator.classList.toggle("active", state.vectors.diningHall);
  vecSocialIndicator.classList.toggle("active", state.vectors.socialMedia);

  if (!state.running && state.tick === 0) {
    statusText.textContent = "Choose a pathogen and press Start.";
  }
}

function getAverageInfection() {
  const total = state.collegesState.reduce(
    (acc, c) => acc + c.infection,
    0
  );
  return total / state.collegesState.length;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw connections (foot-traffic)
  ctx.lineWidth = 1;
  colleges.forEach((c) => {
    const cs = getCollegeStateById(c.id);
    c.neighborsFoot.forEach((nid) => {
      const n = colleges[idToIndex[nid]];
      ctx.beginPath();
      ctx.strokeStyle = state.vectors.footTraffic ? "#64748b" : "#1e293b";
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });
  });

  // Draw colleges
  colleges.forEach((c, idx) => {
    const cs = state.collegesState[idx];

    const radius = 18;
    const x = c.x;
    const y = c.y;

    // Infection color from blue → orange → red
    const inf = cs.infection;
    let fillStyle = "#0f172a"; // healthy
    if (inf > 0) {
      const r = Math.floor(30 + inf * 180);
      const g = Math.floor(64 + (1 - inf) * 80);
      const b = 100;
      fillStyle = `rgb(${r},${g},${b})`;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e5e7eb";
    ctx.stroke();

    // Name / abbreviation
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.name.split(" ")[0], x, y - 24);

    // Infection percentage
    if (inf > 0.01) {
      ctx.font = "9px system-ui";
      ctx.fillStyle = "#facc15";
      ctx.fillText(`${Math.round(inf * 100)}%`, x, y + 2);
    }
  });
}

function logNews(text) {
  const div = document.createElement("div");
  div.className = "news-item";
  const t = new Date();
  const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  div.textContent = `[${time}] ${text}`;
  newsLog.prepend(div);
}

// Tooltip handling
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const hit = colleges.find((c) => {
    const dx = c.x - mx;
    const dy = c.y - my;
    return Math.sqrt(dx * dx + dy * dy) <= 18;
  });

  if (hit) {
    const cs = getCollegeStateById(hit.id);
    tooltip.style.display = "block";
    tooltip.style.left = `${e.clientX - rect.left + 12}px`;
    tooltip.style.top = `${e.clientY - rect.top + 12}px`;
    tooltip.textContent = `${hit.name} — Infection: ${Math.round(
      cs.infection * 100
    )}%`;
  } else {
    tooltip.style.display = "none";
  }
});

// ----------------- Event Listeners ----------------- //

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
resetBtn.addEventListener("click", () => {
  pauseGame();
  resetGame();
  startBtn.disabled = false;
  pathogenSelect.disabled = false;
});

// Initialize
resetGame();
pauseBtn.disabled = true;
resetBtn.disabled = false;
