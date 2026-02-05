const GameEngine = {
  baseGrid: {
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
  grid: null,
  state: {
    day: 1,
    maxDays: 30,
    fastForwardEndDay: 28,
    phase: 'day',
    money: 0,
    privacy: 0,
    policeHeat: 0,
    policeHeatMultiplier: 1,
    moving: false,
    selectedClass: null,
    classLocked: false,
    player: { x: 7, y: 11 },
    trashCan: { x: 7, y: 3 },
    cops: [{ x: 6, y: 2 }, { x: 8, y: 2 }, { x: 7, y: 1 }],
    stash: { x: 7, y: 11, label: 'ENCRYPTED_DATA_CACHE' },
    bought: new Set(),
    classTuning: { passiveArmorBonus: 0, dailyStipend: 1100 },
    fastForwarding: false,
    arrestTriggered: false,
    gameEnded: false,
  },

  classes: {
    gated: {
      name: 'The 1% (GATED)',
      desc: '$1,000,000 start, Audi A5 (+15% passive Privacy Armor), fence/gate pre-installed, stipend $15,000/day',
      money: 1000000,
      privacy: 35,
      multiplier: 0.55,
      passiveArmorBonus: 15,
      dailyStipend: 15000,
    },
    pro: {
      name: 'The Professional (DUPLEX)',
      desc: '$15,000 start, duplex with large backyard, stipend $1,800/day',
      money: 15000,
      privacy: 12,
      multiplier: 1.05,
      passiveArmorBonus: 0,
      dailyStipend: 1800,
    },
    exposed: {
      name: 'The Exposed (GRIND)',
      desc: '$1,200 start, zero protection, stipend $750/day',
      money: 1200,
      privacy: 0,
      multiplier: 2.9,
      passiveArmorBonus: 0,
      dailyStipend: 750,
    },
  },

  legalShop: [
    { id: 'fence', name: 'Fence Hardening', cost: 2500, privacy: 10 },
    { id: 'gate', name: 'Remote Gate', cost: 7000, privacy: 16 },
    { id: 'cam', name: 'Perimeter Camera Mesh', cost: 14000, privacy: 21 },
    { id: 'cell', name: 'Faraday Mailbox', cost: 22000, privacy: 28 },
  ],

  lifestyleShop: [
    {
      id: 'tv',
      name: 'Smart TV',
      cost: 1200,
      leakMessage: '> [LEAK]: Viewing habits analyzed. Late-night connectivity at [House_Coords] suggests illicit server hosting.',
    },
    {
      id: 'espresso',
      name: 'Espresso Machine',
      cost: 1800,
      leakMessage: '> [LEAK]: IoT arousal patterns logged. Daily routine suggests professional fix-it activity.',
    },
    {
      id: 'sofa',
      name: 'Designer Sofa',
      cost: 3600,
      leakMessage: '> [LEAK]: Financial flag: High-value asset purchase does not match reported income.',
    },
  ],

  policeHeatReasons: [
    'trash sifted at curb',
    'vehicle plate spotted near drop lane',
    'photos taken from street',
    'license scanner cross-match',
    'neighbor tip forwarded',
    'door camera footage surveillance logged',
  ],

  init() {
    this.grid = this.createGridForClass(null);
    this.state.stash = this.centerStashForGrid(this.grid);
    UIController.buildGrid(this.grid);
    UIController.lockForClassSelection(true);
    UIController.renderClassSelection(this.classes, (id) => this.selectClass(id));
    UIController.renderShops(this.legalShop, this.lifestyleShop, {
      buyLegal: (id) => this.buyLegal(id),
      buyLifestyle: (id) => this.buyLifestyle(id),
    });
    UIController.bindCommute(() => this.runCommuteLoop());
    UIController.bindFastForward(() => this.runSecureFastForward());
    UIController.renderEntities(this.state);
    UIController.updateHUD(this.state);
    UIController.renderPropertyUpgrades(this.state, this.grid);
    UIController.placeTrashCan(this.state.trashCan, this.grid);
    UIController.placeStash(this.state.stash, this.grid);
    UIController.bindEndingActions({
      relitigate: () => location.reload(),
      retainCounsel: () => this.retainEliteCounsel(),
    });
  },

  selectClass(id) {
    if (this.state.classLocked) return;
    const chosen = this.classes[id];
    this.grid = this.createGridForClass(id);
    this.state.stash = this.centerStashForGrid(this.grid);
    UIController.buildGrid(this.grid);
    this.state.selectedClass = id;
    this.state.classLocked = true;
    this.state.money = chosen.money;
    this.state.classTuning = {
      passiveArmorBonus: chosen.passiveArmorBonus,
      dailyStipend: chosen.dailyStipend,
    };
    this.state.privacy = Math.min(95, chosen.privacy + chosen.passiveArmorBonus);
    this.state.policeHeatMultiplier = chosen.multiplier;
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
    UIController.placeTrashCan(this.state.trashCan, this.grid);
    UIController.placeStash(this.state.stash, this.grid);
    UIController.setFastForwardVisible(false);
  },

  createGridForClass(classId) {
    const grid = JSON.parse(JSON.stringify(this.baseGrid));
    if (classId === 'pro') {
      grid.house = { x: 5, y: 8, w: 5, h: 4 };
      grid.garage = { x: 7, y: 7, w: 2, h: 1 };
      grid.driveway = [
        { x: 7, y: 3 },
        { x: 7, y: 4 },
        { x: 7, y: 5 },
        { x: 7, y: 6 },
        { x: 7, y: 7 },
      ];
    }
    return grid;
  },

  centerStashForGrid(grid) {
    return {
      x: grid.house.x + Math.floor(grid.house.w / 2),
      y: grid.house.y + Math.floor(grid.house.h / 2),
      label: 'ENCRYPTED_DATA_CACHE',
    };
  },

  exposureGain(y) {
    const riskBase = y >= 10 ? 0.2 : y >= 7 ? 0.5 : y >= 4 ? 0.8 : 1.2;
    const armorMitigation = (this.state.privacy / 100) * 0.75;
    return Math.max(0.25, (riskBase * this.state.policeHeatMultiplier) * (1 - armorMitigation));
  },

  async runCommuteLoop() {
    if (!this.state.selectedClass || this.state.moving || this.state.fastForwarding) return;

    this.state.moving = true;
    UIController.disableCommute(true);

    const toDrop = [
      { x: 7, y: 10 }, { x: 7, y: 8 }, { x: 7, y: 6 }, { x: 7, y: 4 }, { x: 7, y: 2 }, { x: 7, y: 0 },
    ];
    const toHome = [...toDrop].reverse();

    this.state.phase = 'day';
    UIController.toggleNight(false);
    UIController.updateHUD(this.state);
    UIController.flash('☀️ ARRIVING AT WORK');
    await this.followRoute(toDrop);
    if (this.checkArrest()) return;

    const stipend = this.state.classTuning.dailyStipend;
    await UIController.runWorkdayProgress(stipend);

    this.state.phase = 'night';
    UIController.toggleNight(true);
    UIController.updateHUD(this.state);
    UIController.flash('🌙 COMMUTING HOME');
    await this.followRoute(toHome);
    UIController.toggleNight(false);
    if (this.checkArrest()) return;

    this.state.money += stipend;
    this.state.day += 1;
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
    this.checkFastForwardAvailability();
  },

  async followRoute(route) {
    for (const step of route) {
      this.state.player = step;
      if (UIController.zoneFor(step.x, step.y, this.grid) === 'public') {
        const gain = this.exposureGain(step.y);
        this.state.policeHeat = Math.min(100, this.state.policeHeat + gain);
        UIController.flash(`POLICE HEAT +${gain.toFixed(1)}% // ${this.randomPoliceHeatReason()}`);
      }
      this.patrolCops();
      UIController.renderEntities(this.state);
      UIController.updateHUD(this.state);
      await this.delay(580);
      if (this.checkArrest()) break;
    }
  },

  patrolCops() {
    const trash = this.state.trashCan;
    this.state.cops = this.state.cops.map((c) => {
      const anchor = { x: trash.x + Math.floor(Math.random() * 3) - 1, y: trash.y + Math.floor(Math.random() * 2) - 1 };
      const dx = Math.sign(anchor.x - c.x);
      const dy = Math.sign(anchor.y - c.y);
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
    if (!item || this.state.money < item.cost || this.state.bought.has(item.id)) return;
    this.state.money -= item.cost;
    UIController.updateHUD(this.state);
    await UIController.deliveryEvent(item.name, this.state, this.grid, () => {
      this.state.bought.add(item.id);
      this.state.policeHeat = Math.min(100, this.state.policeHeat + 8);
      UIController.flash(item.leakMessage, { duration: 6200 });
      UIController.flash('> [MOSAIC_THEORY]: Third-party snitch signal adds +8% Police Heat.', { duration: 4300 });
      UIController.renderPropertyUpgrades(this.state, this.grid);
      UIController.refreshShops(this.state);
      UIController.updateHUD(this.state);
      this.pullPoliceToTrash(item.name);
    });
    if (this.checkArrest()) return;
  },

  pullPoliceToTrash(itemName) {
    const t = this.state.trashCan;
    this.state.cops = this.state.cops.map(() => ({
      x: Math.max(0, Math.min(14, t.x - 1 + Math.floor(Math.random() * 3))),
      y: Math.max(0, Math.min(3, t.y - 1 + Math.floor(Math.random() * 2))),
    }));
    UIController.renderEntities(this.state);
    UIController.policeDialogue([
      `Blue: "Kozinski just got a ${itemName}."`,
      'Red: "Check the curbside trash pull first."',
    ]);
    UIController.flash('> [GREENWOOD_DOCTRINE]: No expectation of privacy in abandoned property at the curb.', { duration: 5200 });
  },

  checkFastForwardAvailability() {
    const canEngage = this.state.privacy >= 95 && this.state.day <= this.state.fastForwardEndDay && !this.state.fastForwarding;
    UIController.setFastForwardVisible(canEngage);
  },

  async runSecureFastForward() {
    if (this.state.fastForwarding || this.state.privacy < 95) return;
    this.state.fastForwarding = true;
    this.state.moving = true;
    UIController.setFastForwardVisible(false);
    UIController.disableCommute(true);
    UIController.disableFastForward(true);
    UIController.lockUI('fast-forward');
    UIController.setInteractionDisabled(true);
    UIController.flash('SECURE FAST FORWARD ENGAGED // COMMUTE ANIMATIONS BYPASSED', { duration: 2200 });

    while (this.state.day <= this.state.fastForwardEndDay) {
      const stipend = this.state.classTuning.dailyStipend;
      this.state.money += stipend;
      UIController.flash(`FAST FORWARD DAY ${String(this.state.day).padStart(2, '0')} // +$${stipend.toLocaleString()}`);
      this.state.day += 1;
      UIController.updateHUD(this.state);
      await this.delay(50);
    }

    this.state.fastForwarding = false;
    this.state.moving = false;
    UIController.unlockUI('fast-forward');
    UIController.setInteractionDisabled(false);
    this.executeSearchWarrant();
  },

  async executeSearchWarrant() {
    if (this.state.arrestTriggered) return;
    this.state.arrestTriggered = true;
    this.state.gameEnded = true;
    UIController.disableCommute(true);
    UIController.disableFastForward(true);
    await UIController.runArrestSeizure(this.state, this.grid);
    UIController.showEnding(
      'SEARCH WARRANT EXECUTED // CACHE SEIZED',
      'The State used cumulative search confidence to execute a final raid, moving from the curbside trash pull to your ENCRYPTED_DATA_CACHE.',
      { mode: 'raid', state: this.state }
    );
  },

  randomPoliceHeatReason() {
    const i = Math.floor(Math.random() * this.policeHeatReasons.length);
    return this.policeHeatReasons[i];
  },

  checkArrest() {
    if (this.state.policeHeat < 100) return false;
    if (this.state.arrestTriggered) return true;
    this.state.moving = false;
    this.executeSearchWarrant();
    return true;
  },

  retainEliteCounsel() {
    if (!this.state.gameEnded || this.state.money < 100000) return;
    this.state.money -= 100000;
    UIController.updateHUD(this.state);
    UIController.showEnding(
      '[VERDICT]: CASE DISMISSED',
      'Your elite legal team successfully filed a Motion to Suppress. The court ruled that the State’s use of a GPS tracker on your Audi A5 constituted a physical trespass into your constitutionally protected space (U.S. v. Jones). Because the initial "Mosaic" data point was gathered illegally, all subsequent evidence—including the discovery of your Encrypted Data Cache—was ruled "Fruit of the Poisonous Tree."\n\nYou have walked on a technicality.',
      { mode: 'win', state: this.state }
    );
  },

  delay(ms) { return new Promise((r) => setTimeout(r, ms)); },
};

const UIController = {
  messageQueue: [],
  showingMessage: false,
  activeLocks: new Set(),

  buildGrid(gridConfig) {
    const grid = document.getElementById('grid-canvas');
    if (!grid) return;
    grid.innerHTML = '';
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
    legalHost.innerHTML = legal.map((i) => `<button class="shop-item buy-btn" data-legal="${i.id}"><strong>${i.name}</strong><small>$${i.cost.toLocaleString()} // +${i.privacy}% armor</small></button>`).join('');
    legalHost.onclick = (e) => {
      const el = e.target.closest('[data-legal]');
      if (el) handlers.buyLegal(el.dataset.legal);
    };

    const lifeHost = document.getElementById('lifestyle-shop');
    lifeHost.innerHTML = life.map((i) => `<button class="shop-item buy-btn" data-life="${i.id}"><strong>${i.name}</strong><small>$${i.cost.toLocaleString()} // delivery metadata leak</small></button>`).join('');
    lifeHost.onclick = (e) => {
      const el = e.target.closest('[data-life]');
      if (el) handlers.buyLifestyle(el.dataset.life);
    };
  },

  refreshShops(state) {
    document.querySelectorAll('[data-legal]').forEach((el) => {
      if (state.bought.has(el.dataset.legal)) el.classList.add('disabled');
    });
    document.querySelectorAll('[data-life]').forEach((el) => {
      if (state.bought.has(el.dataset.life)) el.classList.add('disabled');
    });
  },

  lockForClassSelection(locked) {
    document.body.classList.toggle('class-locked', locked);
    if (locked) document.getElementById('class-overlay').classList.remove('hidden');
  },

  lockUI(reason) {
    if (reason) this.activeLocks.add(reason);
    document.body.classList.add('ui-locked');
  },

  unlockUI(reason) {
    if (reason) this.activeLocks.delete(reason);
    if (!this.activeLocks.size && !this.messageQueue.length && !this.showingMessage) {
      document.body.classList.remove('ui-locked');
    }
  },

  bindCommute(run) { document.getElementById('commute-btn').onclick = run; },
  bindFastForward(run) {
    const btn = document.getElementById('fast-forward-btn');
    if (btn) btn.onclick = run;
  },
  enableCommute() { document.getElementById('commute-btn').disabled = false; },
  disableCommute(v) { document.getElementById('commute-btn').disabled = v; },
  disableFastForward(v) {
    const btn = document.getElementById('fast-forward-btn');
    if (btn) btn.disabled = v;
  },
  setFastForwardVisible(visible) {
    const btn = document.getElementById('fast-forward-btn');
    if (!btn) return;
    btn.classList.toggle('hidden', !visible);
    btn.disabled = false;
  },

  setInteractionDisabled(disabled) {
    document.querySelectorAll('.buy-btn, #commute-btn').forEach((el) => {
      el.disabled = disabled;
      el.classList.toggle('disabled', disabled);
    });
  },

  updateHUD(state) {
    document.getElementById('day-text').textContent = `Day ${String(state.day).padStart(2, '0')} / ${state.maxDays}`;
    document.getElementById('cash-text').textContent = `$${state.money.toLocaleString()}`;
    document.getElementById('privacy-meter').style.width = `${state.privacy}%`;
    document.getElementById('privacy-text').textContent = `${state.privacy.toFixed(1)}%`;
    document.getElementById('heat-meter').style.width = `${Math.min(100, state.policeHeat)}%`;
    document.getElementById('heat-text').textContent = `${Math.min(100, state.policeHeat).toFixed(1)}%`;
    document.getElementById('cycle-indicator').textContent = state.phase === 'day' ? '☀️' : '🌙';
    const buff = document.getElementById('passive-buff-text');
    if (buff) {
      buff.textContent = state.selectedClass === 'gated'
        ? 'Audi A5 Passive Buff: +15% Privacy Armor'
        : 'Passive Buff: none';
    }
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

  placeTrashCan(point, gridConfig) {
    const can = document.getElementById('trash-can');
    this.positionElementToTile(can, point, gridConfig);
  },

  placeStash(stash, gridConfig) {
    const marker = document.getElementById('encrypted-cache');
    if (!marker) return;
    marker.textContent = stash.label;
    this.positionElementToTile(marker, stash, gridConfig);
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

  pathBetween(start, end) {
    const path = [];
    let cursor = { ...start };
    while (cursor.x !== end.x) {
      cursor = { ...cursor, x: cursor.x + Math.sign(end.x - cursor.x) };
      path.push({ ...cursor });
    }
    while (cursor.y !== end.y) {
      cursor = { ...cursor, y: cursor.y + Math.sign(end.y - cursor.y) };
      path.push({ ...cursor });
    }
    return path;
  },

  async runArrestSeizure(state, gridConfig) {
    this.lockUI('ending');
    this.flash('> [AUDIT]: Trash pull complete. Advancing to internal STASH tile for seizure.', { duration: 4200 });
    const trash = state.trashCan;
    const stash = state.stash;
    state.cops = state.cops.map(() => ({ x: trash.x, y: trash.y }));
    this.renderEntities(state);
    await new Promise((r) => setTimeout(r, 450));

    const policeEls = [...document.querySelectorAll('.entity.police')];
    const seizurePath = this.pathBetween(trash, stash);
    await Promise.all(policeEls.map((el, index) => {
      const staggered = seizurePath.map((p, i) => ({
        x: Math.max(0, Math.min(14, p.x + ((index - 1) * ((i % 2) ? 0 : 1)))),
        y: p.y,
      }));
      return this.walkElementPath(el, staggered, gridConfig, 170);
    }));
    state.cops = state.cops.map(() => ({ x: stash.x, y: stash.y }));
    this.renderEntities(state);
  },

  async deliveryEvent(itemName, state, gridConfig, onInspect) {
    const truck = document.getElementById('delivery-truck');
    const driver = document.getElementById('delivery-driver');
    const pkg = document.getElementById('delivery-item');
    const garageDrop = { x: gridConfig.garage.x, y: gridConfig.garage.y };
    const spawn = { x: gridConfig.driveway[0].x, y: 2 };
    const drivewayPath = [spawn, ...gridConfig.driveway];
    pkg.textContent = itemName;

    this.lockUI('delivery');
    driver.classList.add('hidden');
    pkg.classList.add('hidden');
    truck.classList.remove('hidden');
    await this.walkElementPath(truck, drivewayPath, gridConfig, 210);

    driver.classList.remove('hidden');
    this.positionElementToTile(driver, drivewayPath[drivewayPath.length - 1], gridConfig);
    pkg.classList.remove('hidden');
    this.positionElementToTile(pkg, garageDrop, gridConfig);
    onInspect();
    this.flash('[DELIVERY EVENT]: TRUCK USES DRIVEWAY // PACKAGE DROPPED AT GARAGE', { duration: 6000 });
    await new Promise((r) => setTimeout(r, 2000));
    const reversePath = [...drivewayPath].reverse();
    await this.walkElementPath(truck, reversePath, gridConfig, 180);

    driver.classList.add('hidden');
    pkg.classList.add('hidden');
    truck.classList.add('hidden');
    state.cops = state.cops.map((c, i) => ({ x: [6, 8, 7][i] ?? c.x, y: [2, 2, 1][i] ?? c.y }));
    this.renderEntities(state);
    this.unlockUI('delivery');
  },

  async runWorkdayProgress(stipend) {
    const overlay = document.getElementById('workday-overlay');
    const fill = document.getElementById('workday-meter-fill');
    const text = document.getElementById('workday-text');
    const payment = document.getElementById('workday-payment');
    overlay.classList.remove('hidden');
    fill.style.width = '0%';
    text.textContent = '0%';
    payment.textContent = '';
    this.lockUI('workday');
    for (let pct = 0; pct <= 100; pct += 5) {
      fill.style.width = `${pct}%`;
      text.textContent = `${pct}%`;
      await new Promise((r) => setTimeout(r, 120));
    }
    payment.textContent = `PAYMENT RELEASED: +$${stipend.toLocaleString()}`;
    await new Promise((r) => setTimeout(r, 800));
    overlay.classList.add('hidden');
    this.unlockUI('workday');
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
      this.unlockUI('messages');
      return;
    }
    this.showingMessage = true;
    this.lockUI('messages');
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

  bindEndingActions(handlers) {
    const relitigateBtn = document.getElementById('re-litigate-btn');
    const counselBtn = document.getElementById('retain-counsel-btn');
    if (relitigateBtn) relitigateBtn.onclick = handlers.relitigate;
    if (counselBtn) counselBtn.onclick = handlers.retainCounsel;
  },

  showEnding(title, copy, options = {}) {
    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-copy').textContent = copy;
    const relitigateBtn = document.getElementById('re-litigate-btn');
    const counselBtn = document.getElementById('retain-counsel-btn');
    const mode = options.mode || 'default';
    relitigateBtn.textContent = 'RE-LITIGATE';
    if (mode === 'raid' && options.state && options.state.money >= 100000) {
      counselBtn.textContent = 'RETAIN ELITE COUNSEL ($100,000)';
      counselBtn.classList.remove('hidden');
      counselBtn.disabled = false;
    } else {
      counselBtn.classList.add('hidden');
    }
    document.body.classList.add('game-ended');
    document.getElementById('ending-modal').classList.remove('hidden');
  },
};

GameEngine.init();
