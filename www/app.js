// ============================================================
// AUTHENTICATION & USER DATA
// ============================================================
function checkAuth() {
    const isLoggedIn = localStorage.getItem('ck_logged_in') === 'true';
    if (isLoggedIn) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        initApp(); 
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
}

function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('auth-title').innerText = 'Create Your Profile';
}

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('auth-title').innerText = 'Welcome to CK Auto';
}

function login() {
    const phone = document.getElementById('loginPhone').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if (!phone || !pass) return alert('Please fill in all fields');
    
    // If logging in, try to load saved user data
    const savedUser = JSON.parse(localStorage.getItem('ck_user') || '{}');
    if (!savedUser.name) {
        // Fallback if no user exists yet
        localStorage.setItem('ck_user', JSON.stringify({ name: 'Collins Kimutai', phone: phone, email: 'user@example.com' }));
    }
    localStorage.setItem('ck_logged_in', 'true');
    checkAuth();
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const business = document.getElementById('signupBusiness').value.trim() || 'Not set';
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPassword').value;
    const confirmPass = document.getElementById('signupPasswordConfirm').value;

    if (!name || !phone || !email || !pass) {
        return alert('Please fill in all required fields');
    }
    if (pass !== confirmPass) {
        return alert('Passwords do not match!');
    }
    if (!email.includes('@gmail.com') && !email.includes('@outlook.com')) {
        return alert('Please use a valid @gmail.com or @outlook.com address');
    }

    const userData = { name, business, phone, email };
    localStorage.setItem('ck_user', JSON.stringify(userData));
    localStorage.setItem('ck_logged_in', 'true');
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
    // 1. Load User Data into Profile
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}');
    if (user.name) {
        document.getElementById('profileName').innerText = user.name;
        document.getElementById('profileDetailName').innerText = user.name;
        document.getElementById('drawerUserName').innerText = user.name;
        document.getElementById('profileBusinessName').innerText = user.business || 'Not set';
        document.getElementById('profilePhone').innerText = user.phone || 'Not set';
        document.getElementById('profileEmail').innerText = user.email || 'Not set';
        // Auto-fill edit fields
        document.getElementById('editName').value = user.name;
        document.getElementById('editBusiness').value = user.business === 'Not set' ? '' : user.business;
        document.getElementById('editPhone').value = user.phone || '';
    }

    // 2. Set Automation Toggle State
    const toggle = document.getElementById('automationToggle');
    toggle.checked = CK.automationPower;
    updateToggleUI(CK.automationPower);

    renderRecentActivity();
    renderOffers();
    renderSalesByOffer();
}

// ============================================================
// NAVIGATION & UI
// ============================================================
function toggleDrawer() {
    document.getElementById('sideDrawer').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const navBtn = document.querySelector(`.nav-item[onclick="switchTab('${tabId}')"]`);
    if (navBtn) navBtn.classList.add('active');
    CK.selectedOffer = null;
}

function navTo(section) {
    toggleDrawer();
    const map = { tokens: 'you', sendmoney: 'sell', airtime: 'home', settings: 'you', about: 'you' };
    if (map[section]) switchTab(map[section]);
    else alert(`Opening ${section}...`);
}

// ============================================================
// AUTOMATION POWER TOGGLE (FIXED)
// ============================================================
function toggleAutomation(el) {
    CK.automationPower = el.checked;
    localStorage.setItem('ck_automation', CK.automationPower ? '1' : '0');
    updateToggleUI(CK.automationPower);

    if (CK.automationPower) {
        alert('Automation turned ON (1). Background monitoring started.');
    } else {
        alert('Automation turned OFF (0). Background monitoring stopped.');
    }
}

function updateToggleUI(isOn) {
    const status = document.getElementById('automationStatus');
    const content = document.querySelector('.content');
    if (isOn) {
        status.innerText = 'App is ON (1)';
        status.classList.remove('off');
        content.classList.remove('greyed-out');
    } else {
        status.innerText = 'App is OFF (0)';
        status.classList.add('off');
        content.classList.add('greyed-out');
    }
}

// ============================================================
// HIDE / UNHIDE EYE ICONS
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

// ============================================================
// TRANSACTIONS
// ============================================================
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

// ============================================================
// SELL PAGE
// ============================================================
function switchSellTab(tab) {
    CK.currentSellTab = tab;
    document.querySelectorAll('#tab-sell .tab-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');
    renderOffers();
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

function selectOffer(id) { CK.selectedOffer = id; renderOffers(); }
function confirmSale() { alert('Dialing *180*5*2#... (Native plugin required)'); }
function openContacts() { alert('Opening contacts...'); }
function changePhoto() { alert('Requesting file manager permission...'); }
function emailBackup() { alert('Generating backup email...'); }
function restoreBackup() { if(confirm('Overwrite all data?')) alert('Restored.'); }

function saveProfile() {
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}');
    user.name = document.getElementById('editName').value;
    user.business = document.getElementById('editBusiness').value || 'Not set';
    user.phone = document.getElementById('editPhone').value;
    localStorage.setItem('ck_user', JSON.stringify(user));
    alert('Profile saved successfully.');
    initApp(); // Refresh profile display
}

function changePassword() { alert('Password changed.'); }

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
