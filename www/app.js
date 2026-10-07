// ============================================================
// PERMISSION MANAGEMENT (Using NativeSettings & Device)
// ============================================================
async function requestAllPermissions() {
    if (typeof Capacitor === 'undefined') return;
    try {
        // Open App Details settings so user can grant permissions manually
        const settings = Capacitor.Plugins.NativeSettings;
        if (settings) {
            await settings.openAndroidSettings({ setting: 'app_details' });
        }
    } catch (e) {
        console.log('Permission error:', e);
        alert('Please go to Settings > Apps > CK Auto > Permissions to grant them manually.');
    }
}

async function openAccessibilitySettings() {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins.NativeSettings) {
        try {
            await Capacitor.Plugins.NativeSettings.openAndroidSettings({ setting: 'accessibility' });
        } catch (e) {
            alert('Please go to Settings > Accessibility > CK Auto and enable it.');
        }
    } else {
        alert('Please go to Settings > Accessibility > CK Auto and enable it.');
    }
}

async function requestBatteryOptimization() {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins.NativeSettings) {
        try {
            await Capacitor.Plugins.NativeSettings.openAndroidSettings({ setting: 'battery_optimization' });
        } catch (e) {
            alert('Please go to Settings > Battery > Battery Optimization and set CK Auto to Unrestricted.');
        }
    } else {
        alert('Please go to Settings > Battery > Battery Optimization and set CK Auto to Unrestricted.');
    }
}

// ============================================================
// AUTHENTICATION
// ============================================================
function checkAuth() {
    try {
        const loggedIn = localStorage.getItem('ck_logged_in') === 'true';
        if (loggedIn) {
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            initApp();
        } else {
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('main-app').style.display = 'none';
        }
    } catch (e) { console.log('checkAuth error', e); }
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
    const savedUser = JSON.parse(localStorage.getItem('ck_user') || '{}');
    if (!savedUser.name) localStorage.setItem('ck_user', JSON.stringify({ name: 'Collins Kimutai', phone: phone, email: 'user@example.com' }));
    localStorage.setItem('ck_logged_in', 'true');
    enterApp();
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const business = document.getElementById('signupBusiness').value.trim() || 'Not set';
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPassword').value;
    const confirmPass = document.getElementById('signupPasswordConfirm').value;
    if (!name || !phone || !email || !pass) return alert('Please fill in all required fields');
    if (pass !== confirmPass) return alert('Passwords do not match!');
    if (!email.includes('@gmail.com') && !email.includes('@outlook.com')) return alert('Please use @gmail.com or @outlook.com');
    localStorage.setItem('ck_user', JSON.stringify({ name, business, phone, email }));
    localStorage.setItem('ck_logged_in', 'true');
    enterApp();
}

function enterApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    requestAllPermissions();
    initApp();
}

function confirmLogout() {
    if (confirm('Are you sure you want to log out? Your local data will be safe.')) {
        localStorage.removeItem('ck_logged_in');
        checkAuth();
    }
}

// ============================================================
// APP INIT
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
        ], sms: [], advanced: []
    };
}

function initApp() {
    try {
        const user = JSON.parse(localStorage.getItem('ck_user') || '{}');
        if (user.name) {
            const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
            const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
            set('profileName', user.name);
            set('profileDetailName', user.name);
            set('drawerUserName', user.name);
            set('profileBusinessName', user.business || 'Not set');
            set('profilePhone', user.phone || 'Not set');
            set('profileEmail', user.email || 'Not set');
            setVal('editName', user.name);
            setVal('editBusiness', user.business === 'Not set' ? '' : user.business);
            setVal('editPhone', user.phone || '');
        }
        const toggle = document.getElementById('automationToggle');
        if (toggle) { toggle.checked = CK.automationPower; updateToggleUI(CK.automationPower); }
        renderRecentActivity();
        renderOffers();
        renderSalesByOffer();
    } catch (e) { console.log('initApp error', e); }
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
// AUTOMATION TOGGLE + FOREGROUND SERVICE
// ============================================================
function toggleAutomation(el) {
    if (!el) return;
    CK.automationPower = el.checked;
    localStorage.setItem('ck_automation', CK.automationPower ? '1' : '0');
    updateToggleUI(CK.automationPower);

    if (CK.automationPower) {
        startBackgroundService();
    } else {
        stopBackgroundService();
    }
}

function updateToggleUI(isOn) {
    const status = document.getElementById('automationStatus');
    const content = document.querySelector('.content');
    if (!status) return;
    if (isOn) {
        status.innerText = 'App is ON (1)';
        status.classList.remove('off');
        if (content) content.classList.remove('greyed-out');
    } else {
        status.innerText = 'App is OFF (0)';
        status.classList.add('off');
        if (content) content.classList.add('greyed-out');
    }
}

async function startBackgroundService() {
    if (typeof Capacitor === 'undefined') return;
    try {
        const bg = Capacitor.Plugins.BackgroundMode;
        if (bg) await bg.enable();
        const notif = Capacitor.Plugins.LocalNotifications;
        if (notif) {
            await notif.requestPermissions();
            await notif.schedule({
                notifications: [{
                    id: 1,
                    title: 'CK Auto is running',
                    body: 'Automation is ON · Sync is active · Monitoring payments and messages',
                    ongoing: true,
                    autoCancel: false
                }]
            });
        }
    } catch (e) { console.log('Background service error:', e); }
}

async function stopBackgroundService() {
    if (typeof Capacitor === 'undefined') return;
    try {
        const bg = Capacitor.Plugins.BackgroundMode;
        if (bg) await bg.disable();
        const notif = Capacitor.Plugins.LocalNotifications;
        if (notif) await notif.cancel({ notifications: [{ id: 1 }] });
    } catch (e) { console.log('Stop service error:', e); }
}

// ============================================================
// HIDE / UNHIDE
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
// TRANSACTIONS & OFFERS
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
        </div>`).join('');
}

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
        </div>`).join('');
}

function selectOffer(id) { CK.selectedOffer = id; renderOffers(); }
function confirmSale() { dialUSSD('*180*5*2#'); }
function openContacts() { alert('Opening contacts...'); }
function changePhoto() { alert('Requesting file manager permission...'); }
function emailBackup() { alert('Generating backup email...'); }
function restoreBackup() { if(confirm('Overwrite all data?')) alert('Restored.'); }
function changePassword() { alert('Password changed.'); }

function saveProfile() {
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}');
    user.name = document.getElementById('editName').value;
    user.business = document.getElementById('editBusiness').value || 'Not set';
    user.phone = document.getElementById('editPhone').value;
    localStorage.setItem('ck_user', JSON.stringify(user));
    alert('Profile saved successfully.');
    initApp();
}

function renderSalesByOffer() {
    const el = document.getElementById('salesByOfferList');
    if (!el) return;
    const sample = [{ name: 'Sh20=250MB,24hr', count: 11 }, { name: 'Ksh 20', count: 3 }];
    el.innerHTML = sample.map(s => `
        <div class="offer-item" style="flex-direction:column;align-items:flex-start;gap:5px;">
            <div style="display:flex;justify-content:space-between;width:100%;"><span>${s.name}</span><b>${s.count}</b></div>
            <div style="width:100%;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden;"><div style="width:${(s.count/11)*100}%;height:100%;background:#4caf50;"></div></div>
        </div>`).join('');
}

// ============================================================
// USSD AUTOMATION (via Accessibility Service)
// ============================================================
function dialUSSD(code) {
    console.log('[USSD] Would dial:', code);
    alert('Dialing: ' + code + '\n\n(Accessibility Service will read the menu and click buttons silently)');
}

document.addEventListener('DOMContentLoaded', checkAuth);
