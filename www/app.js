// ============================================================
// TOAST NOTIFICATIONS (Green = Success, Red = Error)
// ============================================================
function showToast(message, type) {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-message ' + (type || 'green');
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================================
// PASSWORD VALIDATION
// ============================================================
function validatePassword(pass) {
    if (!pass || pass.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-zA-Z]/.test(pass)) return 'Password must contain at least one letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number';
    if (!/^[a-zA-Z0-9!@#$%^&*_\-]+$/.test(pass)) return 'Password can only contain letters, numbers and symbols';
    return null;
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
    const identifier = document.getElementById('loginPhone').value.trim();
    const pass = document.getElementById('loginPassword').value;

    if (!identifier || !pass) {
        showToast('Please fill in all fields', 'red');
        return;
    }

    const user = JSON.parse(localStorage.getItem('ck_user') || 'null');
    if (!user) {
        showToast('No account found. Please Sign Up first.', 'red');
        return;
    }

    const matchPhone = user.phone === identifier;
    const matchEmail = user.email === identifier;
    if (!matchPhone && !matchEmail) {
        showToast('Account not found for this phone/email.', 'red');
        return;
    }

    if (user.password !== pass) {
        showToast('Incorrect password. Try again.', 'red');
        return;
    }

    showToast('Login successful! Welcome back, ' + user.name.split(' ')[0] + '.', 'green');
    localStorage.setItem('ck_logged_in', 'true');
    setTimeout(enterApp, 900);
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const business = document.getElementById('signupBusiness').value.trim() || 'Not set';
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPassword').value;
    const confirmPass = document.getElementById('signupPasswordConfirm').value;

    if (!name || !phone || !email || !pass) {
        showToast('Please fill in all required fields', 'red');
        return;
    }

    const passError = validatePassword(pass);
    if (passError) {
        showToast(passError, 'red');
        return;
    }

    if (pass !== confirmPass) {
        showToast('Passwords do not match', 'red');
        return;
    }

    if (!email.includes('@gmail.com') && !email.includes('@outlook.com')) {
        showToast('Email must end with @gmail.com or @outlook.com', 'red');
        return;
    }

    if (phone.length < 10) {
        showToast('Please enter a valid phone number', 'red');
        return;
    }

    const userData = { name, business, phone, email, password: pass };
    localStorage.setItem('ck_user', JSON.stringify(userData));
    localStorage.setItem('ck_logged_in', 'true');
    showToast('Account created! Welcome ' + name.split(' ')[0] + '.', 'green');
    setTimeout(enterApp, 900);
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

async function requestAllPermissions() {
    if (typeof Capacitor === 'undefined') return;
    try {
        const notif = Capacitor.Plugins.LocalNotifications;
        if (notif) await notif.requestPermissions();
    } catch (e) { console.log('Permission error:', e); }
}

function openAccessibilitySettings() {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins.NativeSettings) {
        try {
            Capacitor.Plugins.NativeSettings.openAndroidSettings({ setting: 'accessibility' });
            return;
        } catch (e) {}
    }
    alert('Go to: Settings > Accessibility > CK Auto > Toggle ON');
}

function requestBatteryOptimization() {
    alert('Go to: Settings > Battery > Battery Optimization > CK Auto > Unrestricted');
}

// ============================================================
// APP STATE
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
        if (toggle) {
            toggle.checked = CK.automationPower;
            updateToggleUI(CK.automationPower);
        }
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
    else alert('Opening ' + section + '...');
}

// ============================================================
// AUTOMATION TOGGLE
// ============================================================
function toggleAutomation(el) {
    if (!el) return;
    CK.automationPower = el.checked;
    localStorage.setItem('ck_automation', CK.automationPower ? '1' : '0');
    updateToggleUI(CK.automationPower);
    if (CK.automationPower) {
        startBackgroundService();
        showToast('Automation ON (1)', 'green');
    } else {
        stopBackgroundService();
        showToast('Automation OFF (0)', 'red');
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
        </div>`).join('');
}

// ============================================================
// SELL
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
        </div>`).join('');
}

function selectOffer(id) { CK.selectedOffer = id; renderOffers(); }
function confirmSale() { dialUSSD('*180*5*2#'); }
function openContacts() { alert('Opening contacts...'); }
function changePhoto() { alert('Requesting file manager permission...'); }
function emailBackup() { alert('Generating backup email...'); }
function restoreBackup() { if (confirm('Overwrite all data?')) alert('Restored.'); }
function changePassword() { alert('Password changed.'); }

function saveProfile() {
    const user = JSON.parse(localStorage.getItem('ck_user') || '{}');
    user.name = document.getElementById('editName').value;
    user.business = document.getElementById('editBusiness').value || 'Not set';
    user.phone = document.getElementById('editPhone').value;
    localStorage.setItem('ck_user', JSON.stringify(user));
    showToast('Profile saved successfully', 'green');
    initApp();
}

function renderSalesByOffer() {
    const el = document.getElementById('salesByOfferList');
    if (!el) return;
    const sample = [
        { name: 'Sh20=250MB,24hr', count: 11 },
        { name: 'Ksh 20', count: 3 },
        { name: 'Sh20=1GB,1hr', count: 1 }
    ];
    const max = Math.max(...sample.map(s => s.count));
    el.innerHTML = sample.map(s => `
        <div class="offer-item" style="flex-direction:column;align-items:flex-start;gap:5px;">
            <div style="display:flex;justify-content:space-between;width:100%;"><span>${s.name}</span><b>${s.count}</b></div>
            <div style="width:100%;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden;"><div style="width:${(s.count/max)*100}%;height:100%;background:#4caf50;"></div></div>
        </div>`).join('');
}

function dialUSSD(code) {
    console.log('[USSD] Dialing:', code);
    alert('Dialing: ' + code);
}

document.addEventListener('DOMContentLoaded', checkAuth);
