// --- INITIAL STATE ---
let state = {
    day: 1,
    capital: 500,
    privacyScore: 100,
    searchMeter: 0,
    upgrades: [],
    isGameOver: false
};

// --- ITEM DATABASE ---
const SHOP_ITEMS = [
    {
        id: 'fence',
        name: '6FT PRIVACY FENCE',
        cost: 1200,
        description: 'Creates a curtilage boundary. Limits ground-level surveillance.',
        lore: 'Florida v. Jardines: The porch is part of the home.',
        impact: { psRecover: 5, searchReduction: 2 }
    },
    {
        id: 'gate',
        name: 'AUTOMATED STEEL GATE',
        cost: 5000,
        description: 'Neutralizes "Driveway Exposure." Police need a warrant to enter.',
        lore: 'Pineda-Moreno Dissent: Rich men have gates; poor men have police.',
        impact: { psRecover: 15, searchReduction: 5 }
    },
    {
        id: 'phone',
        name: 'ENCRYPTED "BLACK" PHONE',
        cost: 3000,
        description: 'Stops location data "Mosaics" from being built.',
        lore: 'Carpenter v. U.S.: Cell site data is a detailed chronicle of life.',
        impact: { psRecover: 0, searchReduction: 10 }
    },
    {
        id: 'garage',
        name: 'PRIVATE PARKING GARAGE',
        cost: 15000,
        description: 'Total commute invisibility. No public road exposure.',
        lore: 'U.S. v. Knotts: Public movements have no privacy expectation.',
        impact: { psRecover: 10, searchReduction: 15 }
    }
];

// --- DOM ELEMENTS ---
const logEntries = document.getElementById('log-entries');
const itemList = document.getElementById('item-list');
const nextDayBtn = document.getElementById('next-day-btn');

// --- CORE FUNCTIONS ---

function init() {
    renderShop();
    updateUI();
    addLog("System Online. Day 1: You are currently unfenced and exposed.");
}

function renderShop() {
    itemList.innerHTML = '';
    SHOP_ITEMS.forEach(item => {
        const isOwned = state.upgrades.includes(item.id);
        const div = document.createElement('div');
        div.className = `shop-item ${isOwned ? 'owned' : ''}`;
        div.onclick = () => buyItem(item);
        
        div.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-cost">${isOwned ? 'OWNED' : '$' + item.cost}</span>
            <p style="font-size:0.7rem; color:#888; margin-top:5px;">${item.description}</p>
        `;
        itemList.appendChild(div);
    });
}

function buyItem(item) {
    if (state.capital >= item.cost && !state.upgrades.includes(item.id)) {
        state.capital -= item.cost;
        state.upgrades.push(item.id);
        addLog(`PURCHASED: ${item.name}. ${item.lore}`);
        renderShop();
        updateUI();
    } else if (state.capital < item.cost) {
        addLog("INSUFFICIENT CAPITAL. Continue the grind.", "alert-msg");
    }
}

function updateUI() {
    document.getElementById('day-count').innerText = `DAY ${String(state.day).padStart(2, '0')}/28`;
    document.getElementById('capital-amount').innerText = `$${state.capital}`;
    document.getElementById('privacy-bar').style.width = `${state.privacyScore}%`;
    document.getElementById('search-bar').style.width = `${state.searchMeter}%`;

    if (state.searchMeter >= 100) triggerGameOver("SEARCH WARRANT EXECUTED: Your digital and physical footprint became too large to ignore.");
}

function addLog(msg, className = "system-msg") {
    const p = document.createElement('p');
    p.className = className;
    p.innerText = `[${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] ${msg}`;
    logEntries.prepend(p);
}

// --- THE GAME LOOP ---

nextDayBtn.onclick = () => {
    if (state.isGameOver) return;

    // Day 28 Hard-Coded Twist (U.S. v. Jones)
    if (state.day === 28) {
        triggerGameOver("THE 28-DAY RULE (U.S. v. Jones): While you built your walls, the police GPS was attached to your bumper since Day 1. The physical trespass happened before you even earned your first dollar. Wealth cannot hide a pre-existing tag.");
        return;
    }

    // Daily Grind Logic
    state.day++;
    state.capital += 800 + (Math.random() * 400); // Daily income

    // Privacy Decay Logic
    let dailyDecay = 20;
    let dailySearch = 12;

    // Mitigations
    if (state.upgrades.includes('fence')) { dailyDecay -= 5; dailySearch -= 2; }
    if (state.upgrades.includes('gate')) { dailyDecay -= 10; dailySearch -= 3; }
    if (state.upgrades.includes('phone')) { dailySearch -= 5; }
    if (state.upgrades.includes('garage')) { dailyDecay -= 15; dailySearch -= 4; }

    state.privacyScore = Math.max(0, state.privacyScore - dailyDecay);
    state.searchMeter = Math.min(100, state.searchMeter + dailySearch);

    // Logging daily events
    addLog(`DAY ${state.day}: Commuted via public roads. Phone pinged 48 cell towers.`);
    if (!state.upgrades.includes('gate')) addLog("Police observed your vehicle in an open driveway.", "alert-msg");

    updateUI();
};

function triggerGameOver(verdict) {
    state.isGameOver = true;
    document.getElementById('game-over-modal').classList.remove('hidden');
    document.getElementById('verdict-text').innerText = verdict;
}

init();
