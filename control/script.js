const GameEngine = {
  grid: {
    size: 15,
    house: { x: 5, y: 9, w: 5, h: 5 },
    garage: { x: 7, y: 8, w: 2, h: 1 },
    driveway: [
      { x: 7, y: 3 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
    ],
  },
  state: {
    day: 1,
    maxDays: 30,
    phase: 'day',
    money: 0,
    privacy: 0,
    heat: 0,
    heatMultiplier: 1,
    moving: false,
    selectedClass: null,
    classLocked: false,
    player: { x: 7, y: 11 },
    cops: [{ x: 2, y: 2 }, { x: 12, y: 3 }, { x: 4, y: 1 }],
    bought: new Set(),
    jonesTriggered: false,
    classTuning: { nightlyDecay: 2, dailyHeatDrift: 0, passiveArmorBonus: 0 },
  },

  classes: {
    gated: {
      name: 'The 1% (Gated)',
      desc: '$1,000,000, Audi A5 (+15% passive Privacy Armor), Fence/Gate pre-installed, 0.55x State Heat',
      money: 1000000,
      privacy: 35,
      multiplier: 0.55,
      nightlyDecay: 3.8,
      dailyHeatDrift: 0,
      passiveArmorBonus: 15,
    },
    pro: {
      name: 'The Professional',
      desc: '$15,000, duplex + large backyard, tuned for mid-campaign survivability',
      money: 15000,
      privacy: 12,
      multiplier: 1.05,
      nightlyDecay: 3.5,
      dailyHeatDrift: 1,
      passiveArmorBonus: 0,
    },
    exposed: {
      name: 'The Exposed',
      desc: '$1,200, zero protection, accelerated surveillance profile',
      money: 1200,
      privacy: 0,
      multiplier: 2.9,
      nightlyDecay: 1,
      dailyHeatDrift: 8,
      passiveArmorBonus: 0,
    },
  },

  legalShop: [
    { id: 'fence', name: 'Fence Hardening', cost: 2500, privacy: 10 },
    { id: 'gate', name: 'Remote Gate', cost: 7000, privacy: 16 },
    { id: 'cam', name: 'Perimeter Camera Mesh', cost: 14000, privacy: 21 },
    { id: 'cell', name: 'Faraday Mailbox', cost: 22000, privacy: 28 },
  ],

  lifestyleShop: [
    { id: 'tv', name: 'Smart TV', cost: 1200, heat: 5 },
    { id: 'espresso', name: 'Espresso Machine', cost: 1800, heat: 4 },
    { id: 'sofa', name: 'Designer Sofa', cost: 3600, heat: 6 },
  ],

  surveillanceReasons: [
    'trash sifted at curb',
    'vehicle plate spotted near drop lane',
    'photos taken from street',
    'license scanner cross-match',
    'neighbor tip forwarded',
    'door camera footage subpoenaed',
  ],

  init() {
    UIController.buildGrid(this.grid);
    UIController.lockForClassSelection(true);
    UIController.renderClassSelection(this.classes, (id) => this.selectClass(id));
    UIController.renderShops(this.legalShop, this.lifestyleShop, {
      buyLegal: (id) => this.buyLegal(id),
      buyLifestyle: (id) => this.buyLifestyle(id),
    });
    UIController.bindCommute(() => this.runCommuteLoop());
    UIController.renderEntities(this.state);
    UIController.updateHUD(this.state);
    UIController.renderPropertyUpgrades(this.state, this.grid);
  },

  selectClass(id) {
    if (this.state.classLocked) return;
    const chosen = this.classes[id];
    this.state.selectedClass = id;
    this.state.classLocked = true;
    this.state.money = chosen.money;
    this.state.classTuning = {
      nightlyDecay: chosen.nightlyDecay,
      dailyHeatDrift: chosen.dailyHeatDrift,
      passiveArmorBonus: chosen.passiveArmorBonus,
    };
    this.state.privacy = Math.min(95, chosen.privacy + chosen.passiveArmorBonus);
    this.state.heatMultiplier = chosen.multiplier;
    if (id === 'gated') {
      this.state.bought.add('fence');
      this.state.bought.add('gate');
    }
    UIController.hideClassOverlay();
    UIController.lockForClassSelection(false);
    UIController.flash(`CLASS LOCKED: ${chosen.name}`);
    if (id === 'gated') UIController.flash('STARTING PERK: Audi A5 online (+15% Privacy Armor passive)', { duration: 2600 });
    UIController.enableCommute();
    UIController.updateHUD(this.state);
    UIController.refreshShops(this.state);
    UIController.renderPropertyUpgrades(this.state, this.grid);
  },

  exposureGain(y) {
    const riskBase = y >= 10 ? 0.2 : y >= 7 ? 0.5 : y >= 4 ? 0.8 : 1.2;
    const armorMitigation = (this.state.privacy / 100) * 0.75;
    return Math.max(0.25, (riskBase * this.state.heatMultiplier) * (1 - armorMitigation));
  },

  async runCommuteLoop() {
    if (!this.state.selectedClass || this.state.moving) return;

    this.state.moving = true;
    UIController.disableCommute(true);

    const toDrop = [
      { x: 7, y: 10 }, { x: 7, y: 8 }, { x: 7, y: 6 }, { x: 7, y: 4 }, { x: 7, y: 2 }, { x: 7, y: 0 },
    ];
    const toHome = [...toDrop].reverse();

    this.state.phase = 'day';
    UIController.flash('☀️ DAY COMMUTE: HOUSE → DEAD DROP');
    await this.followRoute(toDrop);
    if (this.checkArrest()) return;

    this.state.phase = 'night';
    UIController.flash('🌙 NIGHT MODE: RETURN VECTOR');
    UIController.toggleNight(true);
    await this.followRoute(toHome);
    UIController.toggleNight(false);
    if (this.checkArrest()) return;

    this.state.money += 1100;
    const nightlyCooldown = this.state.classTuning.nightlyDecay + (this.state.privacy / 30);
    this.state.heat = Math.max(0, this.state.heat - nightlyCooldown);
    this.state.heat = Math.min(100, this.state.heat + this.state.classTuning.dailyHeatDrift);
    this.state.day += 1;
    UIController.flash(`PAYMENT RECEIVED: +$1,100 // HEAT -${nightlyCooldown.toFixed(1)}%`);
    UIController.updateHUD(this.state);

    if (this.state.day > this.state.maxDays) {
      this.state.moving = false;
      UIController.disableCommute(true);
      UIController.showEnding(
        '30-DAY SURVIVAL COMPLETE // KOZINSKI RESIDENCE SECURED',
        'You survived the full 30-day pressure test at the Kozinski residence. Pattern-of-life certainty never reached arrest threshold.'
      );
      return;
    }

    this.state.moving = false;
    UIController.disableCommute(false);
  },

  async followRoute(route) {
    for (const step of route) {
      this.state.player = step;
      const gain = this.exposureGain(step.y);
      if (gain > 0) {
        this.state.heat = Math.min(100, this.state.heat + gain);
        UIController.flash(`HEAT +${gain.toFixed(1)}% // ${this.randomHeatReason()}`);
      }
      this.patrolCops();
      UIController.renderEntities(this.state);
      UIController.updateHUD(this.state);
      await this.delay(580);
      if (this.checkArrest()) break;
    }
  },

  patrolCops() {
    this.state.cops = this.state.cops.map((c) => {
      const dx = Math.sign((Math.random() > 0.6 ? this.state.player.x : 7) - c.x);
      const dy = Math.sign((Math.random() > 0.55 ? this.state.player.y : 2) - c.y);
      const nx = Math.max(0, Math.min(14, c.x + dx));
      const ny = Math.max(0, Math.min(3, c.y + dy));
      return { x: nx, y: ny };
    });
  },

  buyLegal(id) {
    const item = this.legalShop.find((i) => i.id === id);
    if (!item || this.state.bought.has(id) || this.state.money < item.cost) return;
    this.state.money -= item.cost;
    this.state.privacy = Math.min(95, this.state.privacy + item.privacy);
    this.state.bought.add(id);
    UIController.flash(`PRIVACY ARMOR +${item.privacy}%`);
    UIController.updateHUD(this.state);
    UIController.refreshShops(this.state);
    UIController.renderPropertyUpgrades(this.state, this.grid);
  },

  async buyLifestyle(id) {
    const item = this.lifestyleShop.find((i) => i.id === id);
    if (!item || this.state.money < item.cost) return;
    this.state.money -= item.cost;
    const penalty = item.heat * this.state.heatMultiplier;
    this.state.heat = Math.min(100, this.state.heat + penalty);
    this.state.bought.add(item.id);
    UIController.renderPropertyUpgrades(this.state, this.grid);
    UIController.updateHUD(this.state);
    UIController.flash(`HEAT +${penalty.toFixed(1)}% // ${this.deliveryLeakReason(item.name)}`);
    UIController.flash('> [3RD-PARTY_SNITCH]: Consumer data shared with State analytics.', { duration: 6000 });
    await UIController.deliveryEvent(item.name, this.state, this.grid, () => this.pullPoliceToVan(item.name));
    if (this.checkArrest()) return;
  },

  pullPoliceToVan(itemName) {
    this.state.cops = this.state.cops.map(() => ({
      x: 6 + Math.floor(Math.random() * 4),
      y: 2 + Math.floor(Math.random() * 2),
    }));
    UIController.renderEntities(this.state);
    UIController.policeDialogue([
      `Blue: "Kozinski just got a ${itemName}."`,
      'Red: "Log the delivery metadata and watch the route."',
    ]);
  },

  randomHeatReason() {
    const i = Math.floor(Math.random() * this.surveillanceReasons.length);
    return this.surveillanceReasons[i];
  },

  deliveryLeakReason(itemName) {
    return `${itemName} purchase metadata sold to ad broker`;
  },

  checkArrest() {
    if (this.state.heat < 100) return false;
    UIController.showEnding(
      'ARREST // SEARCH CONFIDENCE 100%',
      'Mosaic tracking reached certainty. The State now models your full pattern-of-life commute and executes arrest.'
    );
    this.state.moving = false;
    UIController.disableCommute(true);
    return true;
  },

  delay(ms) { return new Promise((r) => setTimeout(r, ms)); },
};

const UIController = {
  messageQueue: [],
  showingMessage: false,

  buildGrid(gridConfig) {
    const grid = document.getElementById('grid');
    for (let y = 0; y < gridConfig.size; y++) {
      for (let x = 0; x < gridConfig.size; x++) {
        const tile = document.createElement('div');
        tile.className = `tile ${this.zoneFor(x, y, gridConfig)}`;
        tile.id = `t-${x}-${y}`;
        grid.appendChild(tile);
      }
    }
  },

  zoneFor(x, y, gridConfig) {
    if (y <= 3) return 'public';
    const inGarage = x >= gridConfig.garage.x && x < (gridConfig.garage.x + gridConfig.garage.w)
      && y >= gridConfig.garage.y && y < (gridConfig.garage.y + gridConfig.garage.h);
    if (inGarage) return 'garage';
    if (gridConfig.driveway.some((step) => step.x === x && step.y === y)) return 'driveway';
    if (x >= gridConfig.house.x && x < (gridConfig.house.x + gridConfig.house.w)
      && y >= gridConfig.house.y && y < (gridConfig.house.y + gridConfig.house.h)) return 'home';
    return 'yard';
  },

  renderClassSelection(classes, onPick) {
    const host = document.getElementById('class-select');
    host.innerHTML = '<h2>Choose Starting Class</h2>';
    Object.entries(classes).forEach(([id, c]) => {
      const div = document.createElement('div');
      div.className = 'option';
      div.innerHTML = `<strong>${c.name}</strong><small>${c.desc}</small>`;
      div.onclick = () => onPick(id);
      host.appendChild(div);
    });
  },

  renderShops(legal, life, handlers) {
    const legalHost = document.getElementById('legal-shop');
    legalHost.innerHTML = legal.map((i) => `<div class="shop-item" data-legal="${i.id}"><strong>${i.name}</strong><small>$${i.cost.toLocaleString()} // +${i.privacy}% armor</small></div>`).join('');
    legalHost.onclick = (e) => {
      const el = e.target.closest('[data-legal]');
      if (el) handlers.buyLegal(el.dataset.legal);
    };

    const lifeHost = document.getElementById('lifestyle-shop');
    lifeHost.innerHTML = life.map((i) => `<div class="shop-item" data-life="${i.id}"><strong>${i.name}</strong><small>$${i.cost.toLocaleString()} // delivery metadata leak</small></div>`).join('');
    lifeHost.onclick = (e) => {
      const el = e.target.closest('[data-life]');
      if (el) handlers.buyLifestyle(el.dataset.life);
    };
  },

  refreshShops(state) {
    document.querySelectorAll('[data-legal]').forEach((el) => {
      if (state.bought.has(el.dataset.legal)) el.classList.add('disabled');
    });
  },

  lockForClassSelection(locked) {
    document.body.classList.toggle('class-locked', locked);
    if (locked) document.getElementById('class-overlay').classList.remove('hidden');
  },

  bindCommute(run) { document.getElementById('commute-btn').onclick = run; },
  enableCommute() { document.getElementById('commute-btn').disabled = false; },
  disableCommute(v) { document.getElementById('commute-btn').disabled = v; },

  updateHUD(state) {
    document.getElementById('day-text').textContent = `Day ${String(state.day).padStart(2, '0')} / ${state.maxDays}`;
    document.getElementById('cash-text').textContent = `$${state.money.toLocaleString()}`;
    document.getElementById('privacy-meter').style.width = `${state.privacy}%`;
    document.getElementById('privacy-text').textContent = `${state.privacy.toFixed(1)}%`;
    document.getElementById('heat-meter').style.width = `${Math.min(100, state.heat)}%`;
    document.getElementById('heat-text').textContent = `${Math.min(100, state.heat).toFixed(1)}%`;
    document.getElementById('cycle-indicator').textContent = state.phase === 'day' ? '☀️ DAY' : '🌙 NIGHT';
  },

  renderEntities(state) {
    document.querySelectorAll('.entity').forEach((e) => e.remove());
    this.place('player', state.player.x, state.player.y);
    state.cops.forEach((c) => this.place('police', c.x, c.y));
  },

  place(type, x, y) {
    const target = document.getElementById(`t-${x}-${y}`);
    if (!target) return;
    const e = document.createElement('div');
    e.className = `entity ${type}`;
    target.appendChild(e);
  },

  tagPlayerGPS() {
    const p = document.querySelector('.player');
    if (p) p.classList.add('gps-tag');
  },

  tileCenter(x, y, gridConfig) {
    const cell = 100 / gridConfig.size;
    return { left: `${((x + 0.5) * cell).toFixed(2)}%`, top: `${((y + 0.5) * cell).toFixed(2)}%` };
  },

  positionElementToTile(el, point, gridConfig) {
    const center = this.tileCenter(point.x, point.y, gridConfig);
    el.style.left = center.left;
    el.style.top = center.top;
  },

  async walkElementPath(el, path, gridConfig, stepMs) {
    for (const point of path) {
      this.positionElementToTile(el, point, gridConfig);
      await new Promise((r) => setTimeout(r, stepMs));
    }
  },

  async deliveryEvent(itemName, state, gridConfig, onInspect) {
    const van = document.getElementById('delivery-van');
    const driver = document.getElementById('delivery-driver');
    const pkg = document.getElementById('delivery-item');
    const garageDrop = { x: gridConfig.garage.x, y: gridConfig.garage.y };
    const drivewayPath = gridConfig.driveway;
    pkg.textContent = itemName;

    driver.classList.add('hidden');
    pkg.classList.add('hidden');
    van.classList.remove('hidden');
    await this.walkElementPath(van, drivewayPath, gridConfig, 210);

    driver.classList.remove('hidden');
    this.positionElementToTile(driver, drivewayPath[drivewayPath.length - 1], gridConfig);
    pkg.classList.remove('hidden');
    this.positionElementToTile(pkg, garageDrop, gridConfig);
    onInspect();
    this.flash('[DELIVERY EVENT]: TRUCK USES DRIVEWAY // PACKAGE DROPPED AT GARAGE', { duration: 6000 });
    await new Promise((r) => setTimeout(r, 2000));
    const reversePath = [...drivewayPath].reverse();
    await this.walkElementPath(van, reversePath, gridConfig, 180);

    driver.classList.add('hidden');
    pkg.classList.add('hidden');
    van.classList.add('hidden');
    state.cops = state.cops.map((c, i) => ({ x: [2, 12, 4][i] ?? c.x, y: [2, 3, 1][i] ?? c.y }));
    this.renderEntities(state);
  },

  renderPropertyUpgrades(state, gridConfig) {
    const visuals = document.getElementById('upgrade-visuals');
    const pct = 100 / gridConfig.size;
    const house = gridConfig.house;
    visuals.innerHTML = '';
    if (state.bought.has('fence')) {
      visuals.innerHTML += `<div class="viz-fence" style="left:${house.x * pct}%;top:${house.y * pct}%;width:${house.w * pct}%;height:${house.h * pct}%"></div>`;
    }
    if (state.bought.has('gate')) {
      const gateX = gridConfig.driveway[0].x;
      const gateY = gridConfig.driveway[0].y;
      visuals.innerHTML += `<div class="viz-gate" style="left:${(gateX + 0.5) * pct}%;top:${(gateY + 0.5) * pct}%">◉</div>`;
    }
    if (state.bought.has('cam')) visuals.innerHTML += '<div class="viz-cam c1"></div><div class="viz-cam c2"></div><div class="viz-cam c3"></div><div class="viz-cam c4"></div>';
    if (state.bought.has('cell')) visuals.innerHTML += '<div class="viz-cell">MAIL</div>';
    if (state.bought.has('tv')) visuals.innerHTML += '<div class="viz-item tv">TV</div>';
    if (state.bought.has('espresso')) visuals.innerHTML += '<div class="viz-item espresso">ESP</div>';
    if (state.bought.has('sofa')) visuals.innerHTML += '<div class="viz-item sofa">SOFA</div>';
  },

  hideClassOverlay() {
    document.getElementById('class-overlay').classList.add('hidden');
  },

  policeDialogue(lines) {
    const host = document.getElementById('police-chatter');
    host.innerHTML = '';
    lines.forEach((line, index) => {
      setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = line;
        host.appendChild(bubble);
        setTimeout(() => bubble.remove(), 2600);
      }, index * 400);
    });
  },

  toggleNight(on) {
    document.querySelector('.grid-wrap').classList.toggle('night', on);
  },

  flash(text) {
    const options = arguments[1] || {};
    this.messageQueue.push({ text, duration: options.duration ?? 2000 });
    if (!this.showingMessage) this.processFlashQueue();
  },

  async processFlashQueue() {
    if (!this.messageQueue.length) {
      this.showingMessage = false;
      return;
    }
    this.showingMessage = true;
    const { text, duration } = this.messageQueue.shift();
    const host = document.getElementById('alert-layer');
    const box = document.createElement('div');
    box.className = 'alert';
    box.style.setProperty('--alert-duration', `${duration}ms`);
    box.textContent = text;
    host.appendChild(box);
    await new Promise((r) => setTimeout(r, duration));
    box.remove();
    this.processFlashQueue();
  },

  showEnding(title, copy) {
    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-copy').textContent = copy;
    document.getElementById('ending-modal').classList.remove('hidden');
  },
};


GameEngine.init();
