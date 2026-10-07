// ============================================================
// CK AUTO - CORE LOGIC ENGINE
// ============================================================

// ---------- GLOBAL STATE ----------
const CK = {
    automationPower: localStorage.getItem('ck_automation') === '1',
    visibility: {
        airtimeBalance: false,
        commissionBalance: false,
        tokenDisplay: false,
        statsCommission: false,
        trueProfit: false
    },
    currentSellTab: 'data',
    selectedOffer: null,
    transactions: JSON.parse(localStorage.getItem('ck_txns') || '[]'),
    contacts: JSON.parse(localStorage.getItem('ck_contacts') || '[]'),
    offers: JSON.parse(localStorage.getItem('ck_offers') || 'null') || getDefaultOffers(),
    user: JSON.parse(localStorage.getItem('ck_user') || 'null')
};

// ---------- DEFAULT OFFERS (Data Deals - Fixed) ----------
function getDefaultOffers() {
    return {
        data: [
            { id: 'd1', name: 'Sh20=1GB,1hr', price: 19, on: true, verified: true },
            { id: 'd2', name: 'Sh20=250MB,24hr', price: 20, on: true, verified: true },
            { id: 'd3', name: 'Sh50=750MB+50SMS,24hr', price: 50, on: true, verified: true },
            { id: 'd4', name: 'Sh50=400MB,7days', price: 50, on: true, verified: true },
            { id: 'd5', name: 'Sh99=1.5GB,24hr', price: 99, on: true, verified: true },
            { id: 'd6', name: 'Sh55=1GB till midnight', price: 55, on: true, verified: true },
            { id: 'd7', name: 'Sh50=1.5GB,3hr', price: 50, on: true, verified: true }
        ],
        sms: [],
        advanced: []
    };
}

// ============================================================
// NAVIGATION
// ============================================================
function toggleDrawer() {
    document.getElementById('sideDrawer').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.querySelector(`.nav-item[onclick="switchTab('${tabId}')"]`).classList.add('active');
    // Accordion reset rule
    CK.selectedOffer = null;
}

function navTo(section) {
    toggleDrawer();
    // Route drawer items to their tabs/pages
    const map = {
        tokens: 'you',
        sendmoney: 'sell',
        airtime: 'home',
        settings: 'you',
        about: 'you'
    };
    if (map[section]) switchTab(map[section]);
    else alert(`Opening ${section}...`);
}

// ============================================================
// HIDE / UNHIDE EYE ICONS
// ============================================================
function toggleVisibility(elementId, iconEl) {
    CK.visibility[elementId] = !CK.visibility[elementId];
    const el = document.getElementById(elementId);
    if (!el) return;

    if (CK.visibility[elementId]) {
        iconEl.classList.remove('fa-eye');
        iconEl.classList.add('fa-eye-slash');
        // Show real values (would come from server/storage later)
        const values = {
            airtimeBalance: 'Ksh 74.53',
            commissionBalance: 'Ksh 112.20',
            tokenDisplay: '50',
            statsCommission: 'Ksh 60.70',
            trueProfit: 'Ksh 25.30'
        };
        el.innerText = values[elementId] || el.innerText;
    } else {
        iconEl.classList.remove('fa-eye-slash');
        iconEl.classList.add('fa-eye');
        el.innerText = elementId === 'tokenDisplay' ? '****' : 'Ksh ****';
    }
}

// ============================================================
// AUTOMATION POWER TOGGLE (0 = OFF, 1 = ON)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('automationToggle');
    const status = document.getElementById('automationStatus');
    const content = document.querySelector('.content');

    // Restore saved state
    toggle.checked = CK.automationPower;
    updateAutomationUI();

    toggle.addEventListener('change', () => {
        CK.automationPower = toggle.checked;
        localStorage.setItem('ck_automation', CK.automationPower ? '1' : '0');
        updateAutomationUI();

        if (CK.automationPower) {
            startBackgroundService();
        } else {
            stopBackgroundService();
        }
    });

    function updateAutomationUI() {
        if (CK.automationPower) {
            status.innerText = 'App is ON (1)';
            status.classList.remove('off');
            content.classList.remove('greyed-out');
            // Default hide balances on turn ON
            hideAllBalances();
        } else {
            status.innerText = 'App is OFF (0)';
            status.classList.add('off');
            content.classList.add('greyed-out');
            hideAllBalances();
        }
    }

    renderRecentActivity();
    renderOffers();
    renderSalesByOffer();
});

function hideAllBalances() {
    ['airtimeBalance', 'commissionBalance', 'statsCommission', 'trueProfit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = 'Ksh ****';
    });
    const tok = document.getElementById('tokenDisplay');
    if (tok) tok.innerText = '****';
}

// ============================================================
// FOREGROUND SERVICE (Background Notification)
// ============================================================
function startBackgroundService() {
    console.log('[SERVICE] Starting background monitoring...');
    // In Capacitor: this triggers the persistent notification
    // ForegroundService.start({
    //   id: 1,
    //   title: 'CK Auto is running',
    //   body: 'Automation is ON · Sync is active · Monitoring payments and messages',
    //   smallIcon: 'ic_stat_ck' // monochrome
    // });
}

function stopBackgroundService() {
    console.log('[SERVICE] Stopping background monitoring...');
    // ForegroundService.stop({ id: 1 });
}

// ============================================================
// SMS PARSING ENGINE
// ============================================================
function processIncomingSMS(messageBody, sender = 'Safaricom') {
    if (!CK.automationPower) return;
    const msg = messageBody.toLowerCase();

    // --- P2P Send Money ---
    const p2pRegex = /you have received ksh([\d.]+) from ([a-z\s]+) ([\d\*]+)/i;
    const p2pMatch = messageBody.match(p2pRegex);
    if (p2pMatch) {
        addTransaction({
            type: 'MANUAL SALE',
            amount: p2pMatch[1],
            name: p2pMatch[2].trim(),
            phone: p2pMatch[3],
            status: 'SUCCESS',
            mpesaCode: extractCode(messageBody)
        });
        silentAirtimeSync();
        return;
    }

    // --- Till Payment ---
    const tillRegex = /ksh([\d.]+) received from ([\d]+) ([a-z\s]+)/i;
    const tillMatch = messageBody.match(tillRegex);
    if (tillMatch) {
        addTransaction({
            type: 'TILL PAYMENT',
            amount: tillMatch[1],
            name: tillMatch[3].trim(),
            phone: tillMatch[2],
            status: 'SUCCESS',
            mpesaCode: extractCode(messageBody)
        });
        silentAirtimeSync();
        return;
    }

    // --- Commission ---
    const commRegex = /total commission this week is ksh\.?([\d.]+)/i;
    const commMatch = messageBody.match(commRegex);
    if (commMatch) {
        const el = document.getElementById('commissionBalance');
        if (el) el.innerText = `Ksh ${commMatch[1]}`;
        document.getElementById('commissionSync').innerText = `Synced ${nowTime()}`;
        silentAirtimeSync();
        return;
    }

    console.log('[SMS] Unrecognized message:', messageBody);
}

function extractCode(msg) {
    const m = msg.match(/^([A-Z0-9]{10})/);
    return m ? m[1] : '';
}

function nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function silentAirtimeSync() {
    // Dial *144# silently (Accessibility Service reads the response, no toast)
    console.log('[USSD] Silent airtime sync via *144#');
    // USSD.request({ code: '*144#', showDialog: false })
    //   .then(res => { parseAirtimeResponse(res); });
    const el = document.getElementById('airtimeBalance');
    const sync = document.getElementById('airtimeSync');
    if (sync) sync.innerText = `Synced ${nowTime()}`;
}

// ============================================================
// TRANSACTIONS
// ============================================================
function addTransaction(txn) {
    txn.id = Date.now().toString();
    txn.time = new Date().toISOString();
    // Auto-save masked contact as "CK @name"
    if (txn.phone && txn.phone.includes('*')) {
        autoSaveMaskedContact(txn.name, txn.phone);
    }
    CK.transactions.unshift(txn);
    localStorage.setItem('ck_txns', JSON.stringify(CK.transactions));
    renderRecentActivity();
}

function autoSaveMaskedContact(name, maskedPhone) {
    const fullName = `CK ${name.toUpperCase()}`;
    if (!CK.contacts.find(c => c.phone === maskedPhone)) {
        CK.contacts.push({ name: fullName, phone: maskedPhone });
        localStorage.setItem('ck_contacts', JSON.stringify(CK.contacts));
    }
}

function renderRecentActivity() {
    const list = document.getElementById('recentActivityList');
    const fullList = document.getElementById('fullActivityList');
    if (!list) return;

    const recent = CK.transactions.slice(0, 6); // Max 6 on home

    list.innerHTML = recent.map(t => activityHTML(t)).join('') ||
        '<p style="color:#888;font-size:13px;text-align:center;padding:20px;">No activity yet.</p>';

    if (fullList) {
        fullList.innerHTML = CK.transactions.map(t => activityHTML(t, true)).join('') ||
            '<p style="color:#888;font-size:13px;text-align:center;padding:20px;">No transactions.</p>';
    }
}

function activityHTML(t, full = false) {
    const badgeClass = t.status === 'SUCCESS' ? 'success'
        : t.status === 'FAILED' ? 'failed'
        : t.status === 'NEEDS NUMBER' ? 'warning' : 'neutral';
    const time = new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(t.time).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return `
        <div class="activity-item" onclick="expandTxn('${t.id}')">
            <div class="act-left">
                <h4>${t.name || 'CUSTOMER'}</h4>
                <p>${t.phone || 'no number'} · ${date}, ${time}</p>
            </div>
            <div class="act-right">
                <h4>Ksh ${t.amount}</h4>
                <span class="badge ${badgeClass}">${t.status}</span>
            </div>
        </div>
    `;
}

function expandTxn(id) {
    const t = CK.transactions.find(x => x.id === id);
    if (!t) return;
    const lastName = (t.name || '').split(' ').pop();
    alert(`Transaction Details:\n\nPhone: ${t.phone}\nM-PESA Code: ${t.mpesaCode || 'N/A'}\nType: ${t.type}\nAmount: Ksh ${t.amount}\n\nActions:\n• Call ${lastName}\n• SMS ${lastName}\n• Retry\n• Schedule\n• Mark Success`);
    // In full build: render accordion expanded view inline
}

// ============================================================
// SELL PAGE
// ============================================================
function switchSellTab(tab) {
    CK.currentSellTab = tab;
    document.querySelectorAll('#tab-sell .tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderOffers();
}

function renderOffers() {
    const list = document.getElementById('offerList');
    if (!list) return;
    const offers = CK.offers[CK.currentSellTab] || [];
    if (!offers.length) {
        list.innerHTML = '<p style="color:#888;font-size:13px;padding:10px;">No offers yet. Tap + to add one.</p>';
        return;
    }
    list.innerHTML = offers.map(o => `
        <div class="offer-item ${CK.selectedOffer === o.id ? 'selected' : ''}" onclick="selectOffer('${o.id}')">
            <span>${o.name}</span>
            <b>Ksh ${o.price}</b>
        </div>
    `).join('');
}

function selectOffer(id) {
    CK.selectedOffer = id;
    renderOffers();
}

function confirmSale() {
    const phone = document.getElementById('customerNumber').value.trim();
    if (!phone) return alert('Please enter customer number');
    if (!CK.selectedOffer) return alert('Please select an offer');
    if (phone.startsWith('254')) phone = '0' + phone.slice(3);
    // 10-min duplicate check
    const dup = CK.transactions.find(t =>
        t.phone === phone && t.offerId === CK.selectedOffer &&
        (Date.now() - new Date(t.time).getTime()) < 600000
    );
    if (dup) return alert('Duplicate sale detected. Please wait 10 minutes.');

    const offer = (CK.offers[CK.currentSellTab] || []).find(o => o.id === CK.selectedOffer);
    if (confirm(`Confirm Sale:\n\nSelling: ${offer.name}\nTo: ${phone}\nFor: Ksh ${offer.price}`)) {
        dialUSSD(`*180*5*2*${phone}#`);
    }
}

// ============================================================
// USSD AUTOMATION (Keyword Parser)
// ============================================================
function dialUSSD(code) {
    console.log('[USSD] Dialing:', code, '(silent, no toast)');
    // USSD.request({ code, showDialog: false })
}

function readMenuAndSelect(keyword, responseText) {
    // Case-insensitive keyword matching
    const lines = responseText.split('\n');
    const kw = keyword.toLowerCase();
    for (let line of lines) {
        if (line.toLowerCase().includes(kw)) {
            const m = line.match(/(\d+)/);
            if (m) return m[1];
        }
    }
    return null;
}

// ============================================================
// SEND MONEY / SEND FROM TILL
// ============================================================
function sendFromTill(recipient, amount, userId, pin) {
    dialUSSD(`*234*2*5822712*2*3*${recipient}*${amount}#`);
    // Then: input userId, then pin, then STOP for user to press 1
}

function sendP2P(recipient, amount, pin) {
    dialUSSD('*334#');
    // readMenuAndSelect('send money', ...) -> then 'any network' -> phone -> amount -> pin -> STOP
}

// ============================================================
// TOKEN PURCHASE (Blocked amounts +1)
// ============================================================
function adjustTillAmount(amount) {
    const blocked = [10, 20, 30, 55];
    return blocked.includes(Number(amount)) ? Number(amount) + 1 : Number(amount);
}

function buyTokenWithAirtime(amount) {
    dialUSSD(`*140*${amount}*0757929759#`); // silent
}

function buyTokenWithMpesa(amount) {
    const adj = adjustTillAmount(amount);
    console.log(`[TOKEN] Adjusted amount: ${adj}`);
    dialUSSD('*334#');
    // Read menu -> 6 (Lipa na M-PESA) -> 2 (Buy Goods) -> 3661950 -> amount -> STOP at PIN
}

// ============================================================
// PROFILE / BACKUP
// ============================================================
function saveProfile() { alert('Profile saved successfully.'); }
function changePassword() { alert('Password changed.'); }
function changePhoto() { alert('Requesting file manager permission...'); }
function confirmLogout() {
    if (confirm('Are you sure you want to log out? Your local data will be safe.')) {
        alert('Logged out.');
    }
}
function emailBackup() {
    const data = {
        user: CK.user,
        offers: CK.offers,
        contacts: CK.contacts,
        txns: CK.transactions
    };
    const text = btoa(JSON.stringify(data));
    window.location.href = `mailto:kimutaic822@gmail.com?subject=CK Auto Backup&body=${text}`;
}
function restoreBackup() {
    if (confirm('Warning: This will overwrite all your current settings, offers, contacts, tokens, and time. Are you sure?')) {
        alert('Restoring backup...');
    }
}

// ============================================================
// STATS - Sales by Offer
// ============================================================
function renderSalesByOffer() {
    const el = document.getElementById('salesByOfferList');
    if (!el) return;
    const sample = [
        { name: 'Sh20=250MB,24hr', count: 11 },
        { name: 'Ksh 20', count: 3 },
        { name: 'Sh20=1GB,1hr', count: 1 },
        { name: 'Ksh 75', count: 1 },
        { name: 'Daily Sh10 (200 SMS daily)', count: 1 },
        { name: 'Daily Sh5 (20 SMS daily)', count: 1 },
        { name: 'Ksh 99', count: 1 }
    ];
    const max = Math.max(...sample.map(s => s.count));
    el.innerHTML = sample.map(s => `
        <div class="offer-item" style="flex-direction:column;align-items:flex-start;gap:5px;">
            <div style="display:flex;justify-content:space-between;width:100%;">
                <span>${s.name}</span><b>${s.count}</b>
            </div>
            <div style="width:100%;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden;">
                <div style="width:${(s.count/max)*100}%;height:100%;background:#4caf50;"></div>
            </div>
        </div>
    `).join('');
}

console.log('CK Auto Engine Loaded. Automation:', CK.automationPower ? 'ON' : 'OFF');
