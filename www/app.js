// ============================================================
// AUTHENTICATION
// ============================================================
function checkAuth() {
    const isLoggedIn = localStorage.getItem('ck_logged_in') === 'true';
    if (isLoggedIn) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        initApp(); // Load the app data once logged in
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
}

function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function login() {
    const phone = document.getElementById('loginPhone').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!phone || !pass) return alert('Please fill in all fields');
    
    localStorage.setItem('ck_logged_in', 'true');
    checkAuth();
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    if (!name || !email) return alert('Please fill in all required fields');
    if (!email.includes('@gmail.com') && !email.includes('@outlook.com')) {
        return alert('Please use a valid @gmail.com or @outlook.com address');
    }
    
    localStorage.setItem('ck_logged_in', 'true');
    localStorage.setItem('ck_user', JSON.stringify({ name, email }));
    checkAuth();
}

function confirmLogout() {
    if (confirm('Are you sure you want to log out? Your local data will be safe.')) {
        localStorage.removeItem('ck_logged_in');
        checkAuth();
    }
}

// ============================================================
// APP INITIALIZATION (Runs after login)
// ============================================================
const CK = {
    automationPower: localStorage.getItem('ck_automation') === '1',
    currentSellTab: 'data',
    selectedOffer: null,
    transactions: JSON.parse(localStorage.getItem('ck_txns') || '[]'),
    offers: JSON.parse(localStorage.getItem('ck_offers') || 'null') || getDefaultOffers()
};

function getDefaultOffers() {
    return {
        data: [
            { id: 'd1', name: 'Sh20=1GB,1hr', price: 19 },
            { id: 'd2', name: 'Sh20=250MB,24hr', price: 20 },
            { id: 'd3', name: 'Sh50=750MB+50SMS,24hr', price: 50 },
            { id: 'd4', name: 'Sh50=400MB,7days', price: 50 },
            { id: 'd5', name: 'Sh99=1.5GB,24hr', price: 99 },
            { id: 'd6', name: 'Sh55=1GB till midnight', price: 55 },
            { id: 'd7', name: 'Sh50=1.5GB,3hr', price: 50 }
        ],
        sms: [],
        advanced: []
    };
}

function initApp() {
    const toggle = document.getElementById('automationToggle');
    const status = document.getElementById('automationStatus');
    const content = document.querySelector('.content');

    // Set initial toggle state
    toggle.checked = CK.automationPower;
    updateToggleUI();

    // Attach the event listener
    toggle.addEventListener('change', function() {
        CK.automationPower = this.checked;
        localStorage.setItem('ck_automation', CK.automationPower ? '1' : '0');
        updateToggleUI();
        
        if (CK.automationPower) {
            alert('Automation turned ON (1). Background monitoring would start here.');
        } else {
            alert('Automation turned OFF (0). Background monitoring stopped.');
        }
    });

    function updateToggleUI() {
        if (CK.automationPower) {
            status.innerText = 'App is ON (1)';
            status.classList.remove('off');
            content.classList.remove('greyed-out');
        } else {
            status.innerText = 'App is OFF (0)';
            status.classList.add('off');
            content.classList.add('greyed-out');
        }
    }

    renderRecentActivity();
    renderOffers();
    renderSalesByOffer();
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
    CK.selectedOffer = null;
}

function navTo(section) {
    toggleDrawer();
    const map = { tokens: 'you', sendmoney: 'sell', airtime: 'home', settings: 'you', about: 'you' };
    if (map[section]) switchTab(map[section]);
    else alert(`Opening ${section}...`);
}

// ============================================================
// UI HELPERS
// ============================================================
function toggleVisibility(elementId, iconEl) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const hidden = el.innerText.includes('****');
    if (hidden) {
        iconEl.classList.remove('fa-eye');
        iconEl.classList.add('fa-eye-slash');
        el.innerText = elementId === 'tokenDisplay' ? '50' : 'Ksh 74.53';
    } else {
        iconEl.classList.remove('fa-eye-slash');
        iconEl.classList.add('fa-eye');
        el.innerText = elementId === 'tokenDisplay' ? '****' : 'Ksh ****';
    }
}

function renderRecentActivity() {
    const list = document.getElementById('recentActivityList');
    if (!list) return;
    if (!CK.transactions.length) {
        list.innerHTML = '<p style="color:#888;font-size:13px;text-align:center;padding:20px;">No activity yet.</p>';
        return;
    }
    list.innerHTML = CK.transactions.slice(0, 6).map(t => `
        <div class="activity-item" onclick="alert('Details for ${t.name}')">
            <div class="act-left"><h4>${t.name || 'CUSTOMER'}</h4><p>${t.phone}</p></div>
            <div class="act-right"><h4>Ksh ${t.amount}</h4><span class="badge success">${t.status}</span></div>
        </div>
    `).join('');
}

function renderOffers() {
    const list = document.getElementById('offerList');
    if (!list) return;
    const offers = CK.offers[CK.currentSellTab] || [];
    list.innerHTML = offers.map(o => `
        <div class="offer-item ${CK.selectedOffer === o.id ? 'selected' : ''}" onclick="selectOffer('${o.id}')">
            <span>${o.name}</span><b>Ksh ${o.price}</b>
        </div>
    `).join('');
}

function switchSellTab(tab) {
    CK.currentSellTab = tab;
    document.querySelectorAll('#tab-sell .tab-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
    renderOffers();
}

function selectOffer(id) { CK.selectedOffer = id; renderOffers(); }
function confirmSale() { alert('Dialing *180*5*2#... (Native plugin required)'); }
function openContacts() { alert('Opening contacts...'); }
function saveProfile() { alert('Profile saved.'); }
function changePassword() { alert('Password changed.'); }
function changePhoto() { alert('Requesting file manager permission...'); }
function emailBackup() { alert('Generating backup email...'); }
function restoreBackup() { if(confirm('Overwrite all data?')) alert('Restored.'); }

function renderSalesByOffer() {
    const el = document.getElementById('salesByOfferList');
    if (!el) return;
    const sample = [{ name: 'Sh20=250MB,24hr', count: 11 }, { name: 'Ksh 20', count: 3 }];
    el.innerHTML = sample.map(s => `
        <div class="offer-item" style="flex-direction:column;align-items:flex-start;gap:5px;">
            <div style="display:flex;justify-content:space-between;width:100%;"><span>${s.name}</span><b>${s.count}</b></div>
            <div style="width:100%;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden;"><div style="width:${(s.count/11)*100}%;height:100%;background:#4caf50;"></div></div>
        </div>
    `).join('');
}

// Start the app by checking auth status
document.addEventListener('DOMContentLoaded', checkAuth);
