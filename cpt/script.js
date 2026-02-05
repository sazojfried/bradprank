const GRID = 10;
const tileLayer = document.getElementById("tileLayer");
const viewport = document.getElementById("viewport");
const player = document.getElementById("player");
const van = document.getElementById("van");
const house = document.getElementById("house");
const car = document.getElementById("car");
const agentsLayer = document.getElementById("agentsLayer");
const blueprint = document.getElementById("blueprintOverlay");
const dialogue = document.getElementById("dialogue");
const dialogueText = document.getElementById("dialogueText");
const endingOverlay = document.getElementById("endingOverlay");

const ui = {
  day: document.getElementById("dayStat"),
  capital: document.getElementById("capitalStat"),
  privacy: document.getElementById("privacyStat"),
  search: document.getElementById("searchStat"),
  privacyBar: document.getElementById("privacyBar"),
  searchBar: document.getElementById("searchBar"),
  market: document.getElementById("marketList"),
  log: document.getElementById("log"),
  workBtn: document.getElementById("workBtn"),
  resetBtn: document.getElementById("resetBtn"),
  shell: document.getElementById("shell")
};

const sidewalks = new Set(["0,8", "1,8", "2,8", "3,8", "4,8", "5,8", "6,8", "7,8", "8,8", "9,8"]);
const road = new Set(["0,9", "1,9", "2,9", "3,9", "4,9", "5,9", "6,9", "7,9", "8,9", "9,9"]);
const driveway = new Set(["5,6", "5,7"]);

const state = {
  day: 1,
  capital: 2500,
  privacy: 80,
  search: 0,
  lock: false,
  playerPos: { x: 5, y: 5 },
  agents: [
    { x: 2, y: 8, angle: 0, el: null, cone: null },
    { x: 5, y: 8, angle: 0, el: null, cone: null },
    { x: 8, y: 8, angle: 0, el: null, cone: null }
  ]
};

const marketItems = [
  { id: "fence", name: "6ft Fence", cost: 500, privacy: 10, type: "build", footprint: { x: 2, y: 2, w: 6, h: 6 } },
  { id: "gate", name: "Auto Gate", cost: 800, privacy: 10, type: "build", footprint: { x: 5, y: 7, w: 1, h: 1 } },
  { id: "espresso", name: "Espresso Machine", cost: 700, privacy: 3, type: "aesthetic", footprint: { x: 4, y: 4, w: 2, h: 1 } },
  { id: "lights", name: "Architectural Lights", cost: 600, privacy: 2, type: "aesthetic", footprint: { x: 3, y: 3, w: 4, h: 1 } }
];
const owned = new Set();

function key(x, y) { return `${x},${y}`; }

function toPx(cellX, cellY) {
  const size = viewport.clientWidth / GRID;
  return { x: (cellX + 0.5) * size, y: (cellY + 0.5) * size, size };
}

function placeEntity(el, cellX, cellY) {
  const pt = toPx(cellX, cellY);
  el.style.left = `${pt.x}px`;
  el.style.top = `${pt.y}px`;
}

function buildTiles() {
  tileLayer.innerHTML = "";
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const tile = document.createElement("div");
      tile.className = "tile ";
      if (road.has(key(x, y)) || sidewalks.has(key(x, y))) tile.className += "asphalt";
      else if (driveway.has(key(x, y))) tile.className += "driveway";
      else tile.className += "grass";
      tileLayer.appendChild(tile);
    }
  }
}

function buildAgents() {
  agentsLayer.innerHTML = "";
  state.agents.forEach((agent) => {
    agent.cone = document.createElement("div");
    agent.cone.className = "vision";
    agentsLayer.appendChild(agent.cone);

    agent.el = document.createElement("div");
    agent.el.className = "entity agent";
    agentsLayer.appendChild(agent.el);
    placeEntity(agent.el, agent.x, agent.y);
    placeEntity(agent.cone, agent.x, agent.y);
  });
}

function log(msg, cls = "") {
  const p = document.createElement("p");
  if (cls) p.className = cls;
  p.textContent = `[Day ${String(state.day).padStart(2, "0")}] ${msg}`;
  ui.log.prepend(p);
}

function renderStats() {
  ui.day.textContent = `${String(state.day).padStart(2, "0")} / 28`;
  ui.capital.textContent = `$${state.capital}`;
  ui.privacy.textContent = `${Math.max(0, Math.round(state.privacy))}`;
  ui.search.textContent = `${Math.min(100, Math.round(state.search))}%`;
  ui.privacyBar.style.width = `${Math.max(0, state.privacy)}%`;
  ui.searchBar.style.width = `${Math.min(100, state.search)}%`;
}

function renderMarket() {
  ui.market.innerHTML = "";
  marketItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "market-item";
    const canBuy = !owned.has(item.id) && state.capital >= item.cost && !state.lock;
    div.innerHTML = `<strong>${item.name}</strong> ($${item.cost}) <button ${canBuy ? "" : "disabled"}>${owned.has(item.id) ? "OWNED" : "BUY"}</button>`;
    div.addEventListener("mouseenter", () => showBlueprint(item));
    div.addEventListener("mouseleave", hideBlueprint);
    div.querySelector("button").addEventListener("click", () => buyItem(item));
    ui.market.appendChild(div);
  });
}

function showBlueprint(item) {
  const p = item.footprint;
  const cell = toPx(0, 0).size;
  blueprint.classList.remove("hidden");
  blueprint.style.left = `${p.x * cell}px`;
  blueprint.style.top = `${p.y * cell}px`;
  blueprint.style.width = `${p.w * cell}px`;
  blueprint.style.height = `${p.h * cell}px`;
}
function hideBlueprint() { blueprint.classList.add("hidden"); }

async function buyItem(item) {
  if (owned.has(item.id) || state.capital < item.cost || state.lock) return;
  owned.add(item.id);
  state.capital -= item.cost;
  state.privacy = Math.min(100, state.privacy + item.privacy);
  log(`${item.name} acquired.`);

  if (item.type === "aesthetic") {
    await deliverySequence();
    state.privacy -= 5;
    log("Third-Party Doctrine: delivery metadata seized. Privacy -5.", "warn");
    if (state.privacy <= 0) {
      ui.shell.classList.add("screen-shake");
      setTimeout(() => ui.shell.classList.remove("screen-shake"), 600);
    }
  }
  renderStats();
  renderMarket();
}

function interpolate(start, end, t) {
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}

async function moveEntity(el, start, end, duration = 500, walking = false, onStep) {
  return new Promise((resolve) => {
    const started = performance.now();
    if (walking) player.classList.add("walking");

    function frame(now) {
      const t = Math.min(1, (now - started) / duration);
      const p = interpolate(start, end, t);
      placeEntity(el, p.x, p.y);
      if (onStep) onStep(p);
      if (t < 1) requestAnimationFrame(frame);
      else {
        if (walking) player.classList.remove("walking");
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function isPublic(x, y) {
  return sidewalks.has(key(Math.round(x), Math.round(y))) || road.has(key(Math.round(x), Math.round(y)));
}

function checkVisionCollision(playerPos) {
  const pPx = toPx(playerPos.x, playerPos.y);
  return state.agents.some((a) => {
    const aPx = toPx(a.x, a.y);
    const dx = pPx.x - aPx.x;
    const dy = pPx.y - aPx.y;
    const dist = Math.hypot(dx, dy);
    return dist < toPx(0, 0).size * 2;
  });
}

async function walkPath(points) {
  for (let i = 0; i < points.length - 1; i++) {
    await moveEntity(player, points[i], points[i + 1], 480, true, (p) => {
      state.playerPos = p;
      if (isPublic(p.x, p.y) && checkVisionCollision(p)) {
        if (!viewport.classList.contains("search-pulse")) {
          state.search = Math.min(100, state.search + 15);
          viewport.classList.add("search-pulse");
          setTimeout(() => viewport.classList.remove("search-pulse"), 800);
          log("Vision cone breach on public tile. Search +15.", "warn");
          renderStats();
        }
      }
    });
  }
}

async function deliverySequence() {
  van.classList.remove("hidden");
  await moveEntity(van, { x: 10.5, y: 7 }, { x: 5.9, y: 7 }, 1200);

  const targets = [{ x: 5.2, y: 7.5 }, { x: 6.6, y: 7.5 }, { x: 5.9, y: 8.2 }];
  for (let i = 0; i < state.agents.length; i++) {
    const a = state.agents[i];
    await moveEntity(a.el, { x: a.x, y: a.y }, targets[i], 700);
    placeEntity(a.cone, targets[i].x, targets[i].y);
    a.x = targets[i].x;
    a.y = targets[i].y;
  }

  dialogueText.textContent = "Nice Espresso Machine. We've logged your high-caffeine lifestyle.";
  dialogue.classList.remove("hidden");
  await new Promise((r) => setTimeout(r, 2600));
  dialogue.classList.add("hidden");
  await moveEntity(van, { x: 5.9, y: 7 }, { x: 10.5, y: 7 }, 1000);
  van.classList.add("hidden");
}

async function goToWork() {
  if (state.lock) return;
  if (state.day >= 28) {
    state.lock = true;
    ui.workBtn.disabled = true;
    log("Day 28 trigger: commute blocked.", "warn");
    await jonesEnding();
    return;
  }

  ui.workBtn.disabled = true;
  const path = [
    { x: 5, y: 5 }, // front door
    { x: 5, y: 6 }, // driveway
    { x: 5, y: 8 }, // public sidewalk
    { x: 5, y: 9 }, // edge of screen
  ];
  await walkPath(path);

  state.capital += 450;
  state.day += 1;
  state.search += 4;
  state.privacy -= 1;
  log("Work commute logged through public exposure channels.");

  renderStats();
  renderMarket();
  ui.workBtn.disabled = false;
}

async function jonesEnding() {
  viewport.classList.add("zoom-car");
  const dot = document.createElement("div");
  dot.className = "gps-dot";
  const carPt = toPx(4, 6);
  dot.style.left = `${carPt.x + 8}px`;
  dot.style.top = `${carPt.y - 8}px`;
  viewport.appendChild(dot);
  await new Promise((r) => setTimeout(r, 2500));
  endingOverlay.classList.remove("hidden");
}

function reset() {
  state.day = 1;
  state.capital = 2500;
  state.privacy = 80;
  state.search = 0;
  state.lock = false;
  owned.clear();
  endingOverlay.classList.add("hidden");
  viewport.classList.remove("zoom-car");
  viewport.querySelector(".gps-dot")?.remove();
  ui.log.innerHTML = "";

  placeEntity(house, 5, 4);
  placeEntity(car, 4, 6);
  placeEntity(player, 5, 5);
  state.playerPos = { x: 5, y: 5 };

  state.agents = [
    { x: 2, y: 8, angle: 0, el: null, cone: null },
    { x: 5, y: 8, angle: 0, el: null, cone: null },
    { x: 8, y: 8, angle: 0, el: null, cone: null }
  ];
  buildAgents();

  renderStats();
  renderMarket();
  ui.workBtn.disabled = false;
  log("Simulation rebooted. Curtilage aesthetics loaded.");
}

ui.workBtn.addEventListener("click", goToWork);
ui.resetBtn.addEventListener("click", reset);

buildTiles();
reset();
window.addEventListener("resize", () => {
  placeEntity(house, 5, 4);
  placeEntity(car, 4, 6);
  placeEntity(player, state.playerPos.x, state.playerPos.y);
  state.agents.forEach((a) => {
    placeEntity(a.el, a.x, a.y);
    placeEntity(a.cone, a.x, a.y);
  });
});
