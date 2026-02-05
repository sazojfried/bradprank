const upgradesCatalog = [
  {
    id: "fence",
    name: "6ft Privacy Fence",
    cost: 2200,
    privacyGain: 20,
    searchReduction: 8,
    caseRef: "Florida v. Jardines",
    detail: "Creates curtilage boundary and blocks visual snooping."
  },
  {
    id: "tint",
    name: "Window Tint",
    cost: 1600,
    privacyGain: 12,
    searchReduction: 5,
    caseRef: "U.S. v. Karo",
    detail: "Protects the sacred interior from enhanced sensing."
  },
  {
    id: "gate",
    name: "Automated Steel Gate",
    cost: 10000,
    privacyGain: 28,
    searchReduction: 12,
    caseRef: "Pineda-Moreno",
    detail: "Restricts driveway walk-up access to state agents."
  },
  {
    id: "garage",
    name: "Attached Garage",
    cost: 24000,
    privacyGain: 40,
    searchReduction: 18,
    caseRef: "U.S. v. Knotts",
    detail: "Minimizes public-road exposure with private-to-private transfer."
  }
];

const ui = {
  dayLabel: document.getElementById("dayLabel"),
  capitalLabel: document.getElementById("capitalLabel"),
  privacyLabel: document.getElementById("privacyLabel"),
  searchLabel: document.getElementById("searchLabel"),
  privacyBar: document.getElementById("privacyBar"),
  searchBar: document.getElementById("searchBar"),
  shopList: document.getElementById("shopList"),
  workBtn: document.getElementById("workBtn"),
  log: document.getElementById("log"),
  trustToggle: document.getElementById("trustToggle"),
  restartBtn: document.getElementById("restartBtn"),
  player: document.getElementById("player"),
  fenceLayer: document.getElementById("fenceLayer"),
  gateLayer: document.getElementById("gateLayer"),
  garageLayer: document.getElementById("garageLayer"),
  gameOverDialog: document.getElementById("gameOverDialog"),
  gameOverTitle: document.getElementById("gameOverTitle"),
  gameOverText: document.getElementById("gameOverText"),
  closeDialog: document.getElementById("closeDialog")
};

let state = {};

const pathPoints = {
  home: { x: 50, y: 43 },
  drivewayMid: { x: 50, y: 58 },
  propertyLine: { x: 50, y: 72 },
  sidewalk: { x: 50, y: 79 }
};

function createInitialState(trustFund = false) {
  return {
    day: 1,
    capital: trustFund ? 1000000 : 1200,
    privacyScore: 0,
    searchMeter: 0,
    trustFund,
    gameOver: false,
    owned: new Set(),
    gpsAttachedDay1: true
  };
}

function currency(amount) {
  return `$${Math.round(amount).toLocaleString()}`;
}

function addLog(message, tone = "") {
  const line = document.createElement("p");
  line.className = tone;
  line.textContent = `> ${message}`;
  ui.log.prepend(line);
}

function setPlayerPosition(x, y) {
  ui.player.style.left = `${x}%`;
  ui.player.style.top = `${y}%`;
}

function render() {
  ui.dayLabel.textContent = `${String(state.day).padStart(2, "0")} / 28`;
  ui.capitalLabel.textContent = currency(state.capital);
  ui.privacyLabel.textContent = `${Math.round(state.privacyScore)}`;
  ui.searchLabel.textContent = `${Math.round(state.searchMeter)}%`;

  ui.privacyBar.style.width = `${Math.min(100, state.privacyScore)}%`;
  ui.searchBar.style.width = `${Math.min(100, state.searchMeter)}%`;

  ui.fenceLayer.classList.toggle("hidden", !state.owned.has("fence"));
  ui.gateLayer.classList.toggle("hidden", !state.owned.has("gate"));
  ui.garageLayer.classList.toggle("hidden", !state.owned.has("garage"));

  renderShop();
}

function renderShop() {
  ui.shopList.innerHTML = "";

  upgradesCatalog.forEach((item) => {
    const owned = state.owned.has(item.id);
    const canBuy = !owned && !state.gameOver && state.capital >= item.cost;
    const card = document.createElement("article");
    card.className = `shop-item ${owned ? "owned" : ""}`;

    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>${item.detail}</p>
      <p><strong>${item.caseRef}</strong></p>
      <div class="shop-foot">
        <span>${owned ? "OWNED" : currency(item.cost)}</span>
        <button class="btn btn-muted buy-btn" ${canBuy ? "" : "disabled"}>${owned ? "Installed" : "Acquire"}</button>
      </div>
    `;

    card.querySelector(".buy-btn")?.addEventListener("click", () => buyUpgrade(item.id));
    ui.shopList.append(card);
  });
}

function buyUpgrade(id) {
  const item = upgradesCatalog.find((upgrade) => upgrade.id === id);
  if (!item || state.owned.has(item.id) || state.capital < item.cost || state.gameOver) {
    return;
  }

  state.capital -= item.cost;
  state.owned.add(item.id);
  state.privacyScore = Math.min(100, state.privacyScore + item.privacyGain);
  addLog(`${item.name} installed. ${item.caseRef} doctrine now leveraged.`, "good");
  render();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function movePlayerAlong(points, stepDelay = 290) {
  ui.player.classList.add("walking");

  for (const point of points) {
    setPlayerPosition(point.x, point.y);
    await sleep(stepDelay);
  }

  ui.player.classList.remove("walking");
}

async function commuteAnimation() {
  if (state.owned.has("garage")) {
    await movePlayerAlong([
      pathPoints.home,
      { x: 61, y: 45 },
      { x: 63, y: 50 },
      { x: 61, y: 45 },
      pathPoints.home
    ], 220);
    addLog(`Day ${state.day}: Garage transfer minimized exposure time.`, "good");
    return;
  }

  await movePlayerAlong([
    pathPoints.home,
    pathPoints.drivewayMid,
    pathPoints.propertyLine,
    pathPoints.sidewalk,
    { x: 48, y: 82 },
    pathPoints.sidewalk,
    pathPoints.propertyLine,
    pathPoints.drivewayMid,
    pathPoints.home
  ]);
}

function computeDailySearchIncrease() {
  const base = 10;
  const privacyPenalty = (100 - state.privacyScore) * 0.08;
  const reduction = upgradesCatalog
    .filter((item) => state.owned.has(item.id))
    .reduce((sum, item) => sum + item.searchReduction, 0);

  let increase = base + privacyPenalty - reduction;

  if (state.day % 7 === 0) {
    increase += 12;
    addLog(`Day ${state.day}: Trash day search event. Curbside garbage inspected. Search +12.`, "warn");
  }

  if (!state.owned.has("gate")) {
    addLog(`Day ${state.day}: Open driveway walk-up permitted. Pineda-Moreno disadvantage.`, "warn");
  }

  if (!state.owned.has("garage")) {
    addLog(`Day ${state.day}: Public road commute observed. Knotts doctrine applied.`, "warn");
  }

  if (!state.owned.has("tint")) {
    addLog(`Day ${state.day}: Untinted windows exposed interior clues.`, "warn");
  }

  return Math.max(2, increase);
}

function endGame(title, message) {
  state.gameOver = true;
  ui.workBtn.disabled = true;
  ui.gameOverTitle.textContent = title;
  ui.gameOverText.textContent = message;
  if (!ui.gameOverDialog.open) {
    ui.gameOverDialog.showModal();
  }
}

async function processDay() {
  if (state.gameOver) return;

  ui.workBtn.disabled = true;
  await commuteAnimation();

  if (state.day === 28) {
    addLog("Day 28: Trespass reveal activated. U.S. v. Jones lock-in.", "danger");
    endGame(
      "THE 28-DAY RULE (U.S. v. Jones)",
      "You built a fortress, but police physically touched your vehicle and attached a GPS device on Day 1. Wealth can buy expectation privacy, but it cannot erase an early physical trespass."
    );
    return;
  }

  const wage = state.trustFund ? 0 : 900 + Math.floor(Math.random() * 500);
  if (!state.trustFund) {
    state.capital += wage;
  }

  const searchIncrease = computeDailySearchIncrease();
  state.searchMeter = Math.min(100, state.searchMeter + searchIncrease);
  state.privacyScore = Math.min(100, state.privacyScore + (state.owned.size ? 1.2 : 0));

  addLog(
    `Day ${state.day}: Work cycle complete. ${state.trustFund ? "Trust fund mode suppressed wage dependence." : `Earned ${currency(wage)}.`} Search +${searchIncrease.toFixed(1)}.`
  );

  if (state.searchMeter >= 100) {
    addLog(`Day ${state.day}: Search meter reached 100%. Arrest sequence executed.`, "danger");
    endGame(
      "WARRANT CASCADE",
      "Your mosaic profile reached operational certainty. Surveillance plus exposure triggered a full enforcement cascade."
    );
    return;
  }

  state.day += 1;
  render();
  ui.workBtn.disabled = false;
}

function resetGame() {
  if (ui.gameOverDialog.open) {
    ui.gameOverDialog.close();
  }

  state = createInitialState(ui.trustToggle.checked);
  setPlayerPosition(pathPoints.home.x, pathPoints.home.y);
  ui.log.innerHTML = "";
  ui.workBtn.disabled = false;

  addLog("Simulation online. Fourth Amendment protection sold as a lifestyle product.");
  addLog(
    state.trustFund
      ? "Born Gated mode active: Trust seeded at $1,000,000."
      : "Standard mode active: Unfenced, exposed, and commuting through public doctrine."
  );

  render();
}

ui.workBtn.addEventListener("click", processDay);
ui.restartBtn.addEventListener("click", resetGame);
ui.trustToggle.addEventListener("change", resetGame);
ui.closeDialog.addEventListener("click", resetGame);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    addLog("Service worker unavailable in this environment.", "warn");
  });
}

resetGame();
