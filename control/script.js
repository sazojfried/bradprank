// --- GAME STATE ---
const G = {
    day: 1, capital: 1200, privacy: 0, search: 0,
    upgrades: [], pos: {x: 7, y: 8}, isMoving: false,
    history: [], audit: []
};

// --- DATABASE ---
const LEGAL_DB = [
    {id:'fence', name:'6FT FENCE', cost:2200, ps:20, lore:'Florida v. Jardines', type:'boundary'},
    {id:'gate', name:'STEEL GATE', cost:5000, ps:25, lore:'Pineda-Moreno', type:'entry'},
    {id:'garage', name:'ATTACHED GARAGE', cost:12000, ps:45, lore:'U.S. v. Knotts', type:'transit'}
];

const LIFE_DB = [
    {id:'tv', name:'85" SMART TV', cost:1500, snitch:'Connected TV data shared with state analytics.', lore:'3rd-Party Doctrine'},
    {id:'coffee', name:'ESPRESSO MACHINE', cost:600, snitch:'Pattern-of-life: Early morning arousal logged.', lore:'Consumer Profile'},
    {id:'couch', name:'DESIGNER SOFA', cost:4000, snitch:'Luxury spend flag triggered in financial database.', lore:'Financial Surveillance'}
];

// --- INITIALIZATION ---
function init() {
    const grid = document.getElementById('grid-canvas');
    for(let y=0; y<15; y++) {
        for(let x=0; x<15; x++) {
            const t = document.createElement('div');
            t.id = `t-${x}-${y}`;
            t.className = 'tile';
            if (y < 4) t.classList.add('public');
            else if (x >= 6 && x <= 9 && y >= 7 && y <= 10) t.classList.add('home');
            else t.classList.add('yard');
            grid.appendChild(t);
        }
    }
    setupTabs();
    refreshShops();
    updateUI();
    renderPlayer();
    addLog("Tactical Terminal Online. Simulation started.", "green");
}

// --- LOGIC: PRIVACY & SEARCH ---
function calculateExposure(y) {
    if (y > 3) return 0; // Inside property
    
    // Privacy acts as "Armor" against Search growth
    const baseSearch = 18;
    const mitigation = (G.privacy / 100) * baseSearch;
    return Math.max(2, baseSearch - mitigation);
}

// --- LOGIC: MOVEMENT ---
async function commute() {
    if (G.isMoving) return;
    G.isMoving = true;
    document.getElementById('action-btn').disabled = true;

    const route = [
        {x:7, y:7}, {x:7, y:6}, {x:7, y:5}, {x:7, y:3}, {x:7, y:1} // To work
    ];

    for (let step of route) {
        G.pos = step;
        renderPlayer();
        const hit = calculateExposure(step.y);
        if (hit > 0) {
            G.search += hit;
            addLog(`Public exposure at [${step.x},${step.y}]. State Confidence +${hit.toFixed(1)}%.`, "red");
            shakeScreen();
        }
        await new Promise(r => setTimeout(r, 450));
        updateUI();
        if (G.search >= 100) return arrest();
    }

    // Return & Progress
    G.pos = {x: 7, y: 8};
    renderPlayer();
    G.day++;
    G.capital += 900;
    addLog(`Day ${G.day-1} loop closed. Liquid capital +$900.`);
    
    if (G.day === 28) return arrest(true);
    
    G.isMoving = false;
    document.getElementById('action-btn').disabled = false;
    updateUI();
}

// --- LOGIC: CONSUMER SNITCH ---
function buyLifestyle(item) {
    if (G.capital < item.cost) return addLog("INSUFFICIENT FUNDS.", "red");
    
    G.capital -= item.cost;
    G.search += 8; // Third-party doctrine penalty
    G.audit.push({name: item.name, fact: item.snitch});
    
    addLog(`PURCHASED: ${item.name}.`);
    addLog(`[STATE_LOG]: ${item.snitch}`, "red");
    
    // Trigger "Delivery Truck" visual logic here if needed
    updateUI();
    refreshShops();
}

// --- UI HELPERS ---
function updateUI() {
    document.getElementById('day-display').innerText = `${String(G.day).padStart(2,'0')} / 28`;
    document.getElementById('capital-display').innerText = `$${G.capital.toLocaleString()}`;
    document.getElementById('privacy-meter').style.width = `${G.privacy}%`;
    document.getElementById('ps-text').innerText = `${G.privacy}% OBFUSCATED`;
    document.getElementById('search-meter').style.width = `${G.search}%`;
    document.getElementById('sm-text').innerText = `${G.search.toFixed(1)}% KNOWN`;
}

function addLog(msg, color = "") {
    const flow = document.getElementById('log-flow');
    const div = document.createElement('div');
    div.className = `log-entry ${color}`;
    div.innerText = `> ${msg}`;
    flow.appendChild(div);
}

function arrest(isJones = false) {
    const modal = document.getElementById('audit-modal');
    const report = document.getElementById('audit-report');
    modal.classList.remove('hidden');
    
    let html = `<h3>MOSAIC_DATA_POINTS:</h3>`;
    G.audit.forEach(a => html += `<div class="audit-item"><span>${a.name}</span><span>${a.fact}</span></div>`);
    report.innerHTML = html;

    const verdict = isJones 
        ? "THE 28-DAY GPS RULE (U.S. v. Jones): While you built your walls, the State physically trespassed on your car on Day 01. Your wealth-based privacy was an illusion; the tag was already inside the perimeter." 
        : "SEARCH_WARRANT: Your public exposure and consumer footprint reached critical mass. The State has achieved 100% confidence in your pattern of life.";
    
    document.getElementById('jones-verdict').innerText = verdict;
}

// --- CORE UTILS ---
function renderPlayer() {
    const old = document.querySelector('.player');
    if (old) old.remove();
    const p = document.createElement('div');
    p.className = 'player';
    document.getElementById(`t-${G.pos.x}-${G.pos.y}`).appendChild(p);
}

function refreshShops() {
    const legal = document.getElementById('legal-shop');
    legal.innerHTML = '';
    LEGAL_DB.forEach(i => {
        const bought = G.upgrades.includes(i.id);
        const card = document.createElement('div');
        card.className = `item-card ${bought ? 'bought' : ''}`;
        card.innerHTML = `<strong>${i.name}</strong><br><small>${i.lore}</small><span class="price">$${i.cost}</span>`;
        if(!bought) card.onclick = () => {
            if(G.capital >= i.cost) {
                G.capital -= i.cost;
                G.privacy = Math.min(100, G.privacy + i.ps);
                G.upgrades.push(i.id);
                addLog(`FORTIFIED: ${i.name} deployed. Armor +${i.ps}.`);
                refreshShops(); updateUI();
            }
        };
        legal.appendChild(card);
    });

    const life = document.getElementById('life-shop');
    life.innerHTML = '';
    LIFE_DB.forEach(i => {
        const card = document.createElement('div');
        card.className = `item-card`;
        card.innerHTML = `<strong>${i.name}</strong><br><small>${i.lore}</small><span class="price">$${i.cost}</span>`;
        card.onclick = () => buyLifestyle(i);
        life.appendChild(card);
    });
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
            document.querySelectorAll('.shop-page').forEach(x => x.classList.add('hidden'));
            b.classList.add('active');
            document.getElementById(`${b.dataset.tab}-shop`).classList.remove('hidden');
        };
    });
}

function shakeScreen() {
    const v = document.getElementById('viewport-container');
    v.style.animation = 'shake 0.1s linear 2';
    setTimeout(() => v.style.animation = '', 200);
}

document.getElementById('action-btn').onclick = commute;

init();
