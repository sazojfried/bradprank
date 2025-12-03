// Super simple Yale contagion viz
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("tooltip");

const pathogenSelect = document.getElementById("pathogenSelect");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const infectedCountEl = document.getElementById("infectedCount");
const avgInfectionEl = document.getElementById("avgInfection");
const spreadBar = document.getElementById("spreadBar");
const statusText = document.getElementById("statusText");
const pathogenNameEl = document.getElementById("pathogenName");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
let running = false;
let lastTime = 0;

// Hard-coded node layout (rough campus shape)
const colleges = [
  { id: 1, name: "Branford/Saybrook", short: "Branford", x: 260, y: 320, neighbors: [2, 3, 5] },
  { id: 2, name: "Trumbull",          short: "Trumbull", x: 220, y: 280, neighbors: [1, 4] },
  { id: 3, name: "Hopper",            short: "Hopper",   x: 290, y: 360, neighbors: [1, 5, 6] },
  { id: 4, name: "Jonathan Edwards",  short: "JE",       x: 230, y: 330, neighbors: [2, 1] },
  { id: 5, name: "Davenport",         short: "Davenport",x: 330, y: 340, neighbors: [1, 3, 6, 9] },
  { id: 6, name: "Pierson",           short: "Pierson",  x: 360, y: 360, neighbors: [3, 5, 9] },
  { id: 7, name: "Berkeley",          short: "Berkeley", x: 430, y: 300, neighbors: [8, 9, 10] },
  { id: 8, name: "Timothy Dwight",    short: "Timothy",  x: 470, y: 260, neighbors: [7, 9] },
  { id: 9, name: "Silliman",          short: "Silliman", x: 400, y: 330, neighbors: [5, 6, 7, 10] },
  { id: 10,name: "Morse/Stiles",      short: "Morse",    x: 430, y: 380, neighbors: [7, 9] },
  { id: 11,name: "Franklin/Murray",   short: "Franklin", x: 700, y: 300, neighbors: [] } // remote
];

// Per-college infection state
let infection = colleges.map(() => 0); // 0..1

// Pathogen presets – deliberately simple
const pathogenConfigs = {
  algorithm: {
    label: "Algorithm",
    internalGrowth: 0.024,
    edgeSpreadBase: 0.023,
    socialSpreadBase: 0.02
  },
  platform: {
    label: "Platform Culture",
    internalGrowth: 0.017,
    edgeSpreadBase: 0.017,
    socialSpreadBase: 0.015
  },
  loneliness: {
    label: "Loneliness",
    internalGrowth: 0.011,
    edgeSpreadBase: 0.010,
    socialSpreadBase: 0.012
  }
};

let currentConfig = pathogenConfigs.algorithm;

// Seed infection in one or two starting colleges
function seedInfection() {
  infection = colleges.map(() => 0);
  const type = pathogenSelect.value;
  currentConfig = pathogenConfigs[type];
  pathogenNameEl.textContent = currentConfig.label;

  if (type === "algorithm") {
    // dense hotspot
    setInfectionByName("Silliman", 0.35);
  } else if (type === "platform") {
    // social/nightlife hub
    setInfectionByName("Hopper", 0.35);
  } else {
    // remote + isolated
    setInfectionByName("Franklin/Murray", 0.35);
  }
}

function setInfectionByName(name, value) {
  const idx = colleges.findIndex((c) => c.name === name);
  if (idx >= 0) infection[idx] = value;
}

// Spread logic – very light
function step(dt) {
  if (!running) return;

  const cfg = currentConfig;

  // copy for simultaneous update
  const next = infection.slice();

  colleges.forEach((col, i) => {
    const level = infection[i];
    if (level <= 0) return;

    // Internal growth
    next[i] = Math.min(1, next[i] + cfg.internalGrowth * dt);

    // Spread along foot-traffic edges
    col.neighbors.forEach((nid) => {
      const j = colleges.findIndex((c) => c.id === nid);
      if (j === -1) return;

      const prob = cfg.edgeSpreadBase * level * dt;
      if (Math.random() < prob) {
        next[j] = Math.min(1, next[j] + 0.04);
      }
    });

    // Social media spread – low chance to all
    const socialProb = cfg.socialSpreadBase * level * dt;
    colleges.forEach((other, j) => {
      if (j === i) return;
      if (Math.random() < socialProb * 0.15) {
        next[j] = Math.min(1, next[j] + 0.02);
      }
    });
  });

  infection = next;
}

// Rendering

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Background halo
  const grad = ctx.createRadialGradient(
    WIDTH * 0.4,
    HEIGHT * 0.4,
    80,
    WIDTH * 0.4,
    HEIGHT * 0.4,
    420
  );
  grad.addColorStop(0, "#020617");
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Edges
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = "#475569";
  colleges.forEach((c) => {
    c.neighbors.forEach((nid) => {
      const n = colleges.find((cc) => cc.id === nid);
      if (!n) return;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });
  });

  // Nodes
  colleges.forEach((c, i) => {
    const level = infection[i]; // 0..1
    const r = 20;

    // Glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, r + 6, 0, Math.PI * 2);
    const glowAlpha = 0.2 + level * 0.4;
    ctx.fillStyle = `rgba(248, 113, 113, ${glowAlpha})`;
    ctx.fill();
    ctx.restore();

    // Circle fill – cool → warm
    const t = level;
    const rCol = Math.round(56 + t * 180);
    const gCol = Math.round(189 - t * 90);
    const bCol = Math.round(248 - t * 140);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
    ctx.fill();

    // Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e5e7eb";
    ctx.stroke();

    // Short label above
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(c.short, c.x, c.y - r - 4);

    // Percentage inside
    if (level > 0.01) {
      ctx.font = "9px system-ui";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#facc15";
      ctx.fillText(`${Math.round(level * 100)}%`, c.x, c.y + 1);
    }
  });

  updateStats();
}

// Stats / UI

function updateStats() {
  const infectedCount = infection.filter((v) => v > 0.01).length;
  infectedCountEl.textContent = infectedCount.toString();

  const avg =
    infection.reduce((sum, v) => sum + v, 0) / infection.length || 0;
  avgInfectionEl.textContent = `${Math.round(avg * 100)}%`;
  spreadBar.style.width = `${Math.round(avg * 100)}%`;

  if (!running) return;
  if (infection.every((v) => v >= 0.98)) {
    statusText.textContent = "All colleges saturated. Simulation complete.";
    running = false;
  } else {
    statusText.textContent = "Infection spreading across campus…";
  }
}

// Animation loop

function loop(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0;
  lastTime = timestamp;

  if (running) {
    step(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

// Tooltip hit detection

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  let found = null;
  colleges.forEach((c, i) => {
    const dx = mx - c.x;
    const dy = my - c.y;
    if (Math.sqrt(dx * dx + dy * dy) <= 20) {
      found = { college: c, value: infection[i] };
    }
  });

  if (found) {
    tooltip.style.display = "block";
    tooltip.style.left = `${mx + 14}px`;
    tooltip.style.top = `${my + 10}px`;
    tooltip.textContent = `${found.college.name}: ${Math.round(
      found.value * 100
    )}%`;
  } else {
    tooltip.style.display = "none";
  }
});

canvas.addEventListener("mouseleave", () => {
  tooltip.style.display = "none";
});

// Controls

startBtn.addEventListener("click", () => {
  seedInfection();
  running = true;
  statusText.textContent = "Infection spreading across campus…";
});

resetBtn.addEventListener("click", () => {
  infection = colleges.map(() => 0);
  running = false;
  lastTime = 0;
  statusText.textContent = "Click Start to seed the outbreak.";
  draw();
});

// Init
seedInfection();
draw();
requestAnimationFrame(loop);
