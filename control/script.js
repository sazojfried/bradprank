const GameEngine = {
  state: {
    day: 1,
    maxDays: 28,
    phase: 'day',
    money: 0,
    privacy: 0,
    heat: 0,
    heatMultiplier: 1,
    moving: false,
    selectedClass: null,
    player: { x: 7, y: 11 },
    cops: [{ x: 2, y: 2 }, { x: 12, y: 3 }, { x: 4, y: 1 }],
    bought: new Set(),
    jonesTriggered: false,
  },

  classes: {
    gated: {
      name: 'The 1% (Gated)',
      desc: '$1,000,000, Audi A5, Fence/Gate pre-installed, 0.5x State Heat',
      money: 1000000,
      privacy: 35,
      multiplier: 0.5,
    },
    pro: {
      name: 'The Professional',
      desc: '$15,000, duplex + large backyard, 1.0x State Heat',
      money: 15000,
      privacy: 5,
      multiplier: 1,
    },
    exposed: {
      name: 'The Exposed',
      desc: '$1,200, zero protection, 2.2x State Heat',
      money: 1200,
      privacy: 0,
      multiplier: 2.2,
    },
  },

  legalShop: [
    { id: 'fence', name: 'Fence Hardening', cost: 2500, privacy: 10 },
    { id: 'gate', name: 'Remote Gate', cost: 7000, privacy: 16 },
    { id: 'cam', name: 'Perimeter Camera Mesh', cost: 14000, privacy: 21 },
    { id: 'cell', name: 'Faraday Mailbox', cost: 22000, privacy: 28 },
  ],

  lifestyleShop: [
    { id: 'tv', name: 'Smart TV', cost: 1200, heat: 11 },
    { id: 'espresso', name: 'Espresso Machine', cost: 1800, heat: 9 },
    { id: 'sofa', name: 'Designer Sofa', cost: 3600, heat: 13 },
  ],

  init() {
    UIController.buildGrid();
    UIController.renderClassSelection(this.classes, (id) => this.selectClass(id));
    UIController.renderShops(this.legalShop, this.lifestyleShop, {
      buyLegal: (id) => this.buyLegal(id),
      buyLifestyle: (id) => this.buyLifestyle(id),
    });
    UIController.bindCommute(() => this.runCommuteLoop());
    UIController.renderEntities(this.state);
    UIController.updateHUD(this.state);
  },

  selectClass(id) {
    const chosen = this.classes[id];
    this.state.selectedClass = id;
    this.state.money = chosen.money;
    this.state.privacy = chosen.privacy;
    this.state.heatMultiplier = chosen.multiplier;
    UIController.flash(`CLASS LOCKED: ${chosen.name}`);
    UIController.enableCommute();
    UIController.updateHUD(this.state);
    UIController.refreshShops(this.state);
  },

  exposureGain(y) {
    if (y >= 4) return 0;
    const base = 16 * this.state.heatMultiplier;
    const armor = this.state.privacy / 100;
    return Math.max(1, base * (1 - armor));
  },

  async runCommuteLoop() {
    if (!this.state.selectedClass || this.state.moving) return;
    if (this.state.day === 28) return this.triggerJonesVerdict();

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

    this.state.money += 900;
    this.state.day += 1;
    UIController.flash('PAYMENT RECEIVED: +$900');
    UIController.updateHUD(this.state);

    this.state.moving = false;
    UIController.disableCommute(false);
  },

  async followRoute(route) {
    for (const step of route) {
      this.state.player = step;
      const gain = this.exposureGain(step.y);
      if (gain > 0) {
        this.state.heat = Math.min(100, this.state.heat + gain);
        UIController.flash(`HEAT +${gain.toFixed(1)}%`);
      }
      this.patrolCops();
      UIController.renderEntities(this.state);
      UIController.updateHUD(this.state);
      await this.delay(420);
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
  },

  async buyLifestyle(id) {
    const item = this.lifestyleShop.find((i) => i.id === id);
    if (!item || this.state.money < item.cost) return;
    this.state.money -= item.cost;
    const penalty = item.heat * this.state.heatMultiplier;
    this.state.heat = Math.min(100, this.state.heat + penalty);
    UIController.updateHUD(this.state);
    UIController.flash('> [3RD-PARTY_SNITCH]: Consumer data shared with State analytics.');
    await UIController.deliveryEvent(this.state, () => this.pullPoliceToVan());
    if (this.checkArrest()) return;
  },

  pullPoliceToVan() {
    this.state.cops = this.state.cops.map(() => ({ x: 8 + Math.floor(Math.random() * 2), y: 8 + Math.floor(Math.random() * 3) }));
    UIController.renderEntities(this.state);
  },

  triggerJonesVerdict() {
    if (this.state.jonesTriggered) return;
    this.state.jonesTriggered = true;
    UIController.disableCommute(true);
    UIController.flash('COMMUTE FAILURE: DAY 28');
    UIController.tagPlayerGPS();
    UIController.showEnding(
      'JONES VERDICT // PHYSICAL TRESPASS CONFIRMED',
      'A GPS tag was physically placed on Day 1. All later Privacy Armor calculations were rendered moot by the initial trespass into your curtilage.'
    );
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
  buildGrid() {
    const grid = document.getElementById('grid');
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        const tile = document.createElement('div');
        tile.className = `tile ${this.zoneFor(x, y)}`;
        tile.id = `t-${x}-${y}`;
        grid.appendChild(tile);
      }
    }
  },

  zoneFor(x, y) {
    if (y <= 3) return 'public';
    if (x >= 5 && x <= 9 && y >= 9 && y <= 13) return 'home';
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

  async deliveryEvent(state, onInspect) {
    const van = document.getElementById('delivery-van');
    van.classList.remove('hidden');
    van.classList.add('slide');
    onInspect();
    this.flash('DELIVERY EVENT: POLICE DIVERT TO INSPECTION');
    await new Promise((r) => setTimeout(r, 2100));
    van.classList.remove('slide');
    van.classList.add('hidden');
    state.cops = state.cops.map((c, i) => ({ x: [2, 12, 4][i] ?? c.x, y: [2, 3, 1][i] ?? c.y }));
    this.renderEntities(state);
  },

  toggleNight(on) {
    document.querySelector('.grid-wrap').classList.toggle('night', on);
  },

  flash(text) {
    const host = document.getElementById('alert-layer');
    const box = document.createElement('div');
    box.className = 'alert';
    box.textContent = text;
    host.appendChild(box);
    setTimeout(() => box.remove(), 2000);
  },

  showEnding(title, copy) {
    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-copy').textContent = copy;
    document.getElementById('ending-modal').classList.remove('hidden');
  },
};

GameEngine.init();
